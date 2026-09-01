import React, { useState, useEffect } from 'react';
import { db, doc, getDoc, setDoc, auth, collection } from '../firebase';
import { Resume, ResumeContent, Experience, Education, Project } from '../types';
import { analyzeResumeATS, enhanceAchievement, generateResumeContent, generateProjectFeatures, generateSummary, parseResumeText, parseResumeFromImage, improveGrammar, optimizeResumeATS, importFromGitHub, importFromLinkedIn } from '../services/aiService';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { 
  Save, ArrowLeft, Plus, Minus, Trash2, Wand2, 
  ChevronRight, AlertTriangle, CheckCircle2, 
  X, User, EyeOff, Info, Download, Loader2, Search, Sparkles,
  FileText, GraduationCap, Eye, Edit3, Briefcase, Lightbulb, Lock, Upload, Github, Linkedin, Activity, Target, TrendingUp, AlertCircle, Camera, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResumePreview } from './ResumePreview';
import Cropper, { Point, Area } from 'react-easy-crop';

interface ResumeEditorProps {
  resumeId: string | null;
  onBack: () => void;
}

const INITIAL_CONTENT: ResumeContent = {
  personalInfo: { fullName: '', email: '', phone: '', location: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: []
};

// --- START: PHOTO CROP HELPERS ---
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return canvas.toDataURL('image/jpeg');
}
// --- END: PHOTO CROP HELPERS ---

export function ResumeEditor({ resumeId, onBack }: ResumeEditorProps) {
  const [resume, setResume] = useState<Partial<Resume>>({
    title: 'New Resume',
    templateType: 'modern-professional',
    content: INITIAL_CONTENT,
    settings: {
      primaryColor: '#2563eb',
      fontFamily: 'Inter',
      fontSize: 'medium',
      spacing: 'normal'
    },
    atsScore: 0
  });
  const [loading, setLoading] = useState(!!resumeId);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [atsAnalysis, setAtsAnalysis] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'templates' | 'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'declaration' | 'settings'>('personal');
  const [jobDescription, setJobDescription] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [showAtsPanel, setShowAtsPanel] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<'edit' | 'preview' | 'ats'>('edit');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const previewContainerRef = React.useRef<HTMLDivElement>(null);
  const autoFillInputRef = React.useRef<HTMLInputElement>(null);

  // --- PHOTO CROP STATE ---
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  // -------------------------

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSaveCroppedImage = async () => {
    if (cropImage && croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(cropImage, croppedAreaPixels, 0);
        if (croppedImage) {
          updateContent('personalInfo.photo', croppedImage);
          setShowCropModal(false);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const updateScale = () => {
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const padding = isPreviewMode ? 48 : 32; 
      const availableWidth = containerWidth - padding;
      const availableHeight = containerHeight - padding;
      
      const scaleWidth = availableWidth / 850;
      const scaleHeight = availableHeight / 1100;
      
      let scale = isPreviewMode 
        ? Math.min(scaleWidth, scaleHeight)
        : scaleWidth;
      
      scale = Math.max(0.15, Math.min(1.5, scale));
        
      setPreviewScale(scale);
    };

    const observer = new ResizeObserver(() => {
      if (manualScale === null) {
        requestAnimationFrame(updateScale);
      }
    });

    observer.observe(container);
    if (manualScale === null) {
      updateScale();
    }

    return () => observer.disconnect();
  }, [isPreviewMode, resume.templateType, showLivePreview, manualScale]);

  const [resumeContext, setResumeContext] = useState<'private' | 'govt'>('private');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(0);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [importStep, setImportStep] = useState<'idle' | 'extracting' | 'review' | 'filling'>('idle');
  const [isImporting, setIsImporting] = useState(false);
  const [targetIndustry, setTargetIndustry] = useState('Technology');
  const [enhancingBullet, setEnhancingBullet] = useState<string | null>(null);
  
  const [isSocialSyncOpen, setIsSocialSyncOpen] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const templates = [
    { id: 'modern-professional', name: 'Modern', icon: Sparkles, color: 'brand' },
    { id: 'classic-chronological', name: 'Classic', icon: FileText, color: 'slate' },
    { id: 'student-entry', name: 'Student', icon: GraduationCap, color: 'emerald' },
    { id: 'creative-vibrant', name: 'Creative', icon: Wand2, color: 'violet' },
    { id: 'executive-minimal', name: 'Executive', icon: Briefcase, color: 'indigo' },
    { id: 'minimalist-clean', name: 'Minimalist', icon: CheckCircle2, color: 'slate' },
    { id: 'tech-focused', name: 'Tech Focused', icon: Search, color: 'emerald' },
    { id: 'modern-creative', name: 'Modern Creative', icon: Sparkles, color: 'brand' },
    { id: 'modern-photo', name: 'Professional Photo', icon: User, color: 'brand' },
    { id: 'executive-pro', name: 'Executive Pro', icon: TrendingUp, color: 'slate' },
  ];

  useEffect(() => {
    if (resumeId) {
      const fetchResume = async () => {
        const docRef = doc(db, 'resumes', resumeId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Resume;
          const currentViews = data.views || 0;
          await setDoc(docRef, { views: currentViews + 1 }, { merge: true });
          setResume({ id: docSnap.id, ...data, views: currentViews + 1 });
        }
        setLoading(false);
      };
      fetchResume();
    }
  }, [resumeId]);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const generatedContent = await generateResumeContent(aiPrompt);
      if (generatedContent && generatedContent.personalInfo) {
        setResume(prev => ({
          ...prev,
          content: {
            ...prev.content,
            ...generatedContent,
            declaration: generatedContent.declaration || prev.content?.declaration || ''
          }
        }));
        setIsAiModalOpen(false);
        setAiPrompt('');
      }
    } catch (error) {
      console.error("AI Generation failed", error);
      alert("AI Fail! Please check your Gemini API key limit or internet connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setResume(prev => ({ ...prev, templateType: templateId }));
  };

  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [improvingGrammar, setImprovingGrammar] = useState(false);

  const handleImproveGrammar = async () => {
    if (!resume.content?.summary) return;
    setImprovingGrammar(true);
    try {
      const improved = await improveGrammar(resume.content.summary);
      updateContent('summary', improved);
    } catch (error) {
      console.error("Error improving grammar:", error);
      alert("Failed to improve tone. Check your API key limit.");
    } finally {
      setImprovingGrammar(false);
    }
  };

  const incrementDownloads = async () => {
    if (!resumeId || !auth.currentUser) return;
    try {
      const resumeRef = doc(db, 'resumes', resumeId);
      const currentDownloads = resume.downloads || 0;
      await setDoc(resumeRef, { downloads: currentDownloads + 1 }, { merge: true });
      setResume(prev => ({ ...prev, downloads: currentDownloads + 1 }));
    } catch (error) {}
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    if (autoFillInputRef.current) autoFillInputRef.current.value = '';
    setIsImporting(true);
    try {
      let parsedContent: any = null;

      if (file.type === 'application/pdf') {
        // ✅ FIX: Use file.arrayBuffer() directly (Promise-based) to avoid
        // the FileReader.onload async race where `finally` ran before parsing.
        const arrayBuffer = await file.arrayBuffer();
        const typedarray = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        if (!text.trim()) throw new Error('No text found in PDF. Try uploading an image version.');
        parsedContent = await parseResumeText(text);
      } else if (file.type.startsWith('image/')) {
        // ✅ FIX: Convert image to base64 properly using Promise, and pass
        // the actual file.type so PNG/WEBP/GIF work correctly with Gemini Vision.
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const mimeType = file.type || 'image/jpeg';
        parsedContent = await parseResumeFromImage(base64, mimeType);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or image (JPG, PNG, WEBP).');
      }

      if (parsedContent && parsedContent.personalInfo) {
        setResume(prev => ({
          ...prev,
          content: { ...INITIAL_CONTENT, ...parsedContent }
        }));
        // ✅ Navigate to personal section so user sees the filled data
        setActiveSection('personal');
        setIsPreviewMode(false);
        // ✅ Always open ATS panel after import; auto-analyze if JD present
        setShowAtsPanel(true);
        if (jobDescription.trim()) {
          setTimeout(() => runAnalysis(parsedContent), 500);
        }
        // Show success toast
        setImportSuccessMsg(`✅ Resume imported! ${parsedContent.personalInfo.fullName ? `Welcome, ${parsedContent.personalInfo.fullName}!` : 'Form filled successfully.'}`);
        setTimeout(() => setImportSuccessMsg(null), 5000);
      } else {
        throw new Error('Could not extract data from the file. Please try a clearer document.');
      }
    } catch (error: any) {
      console.error('Resume import failed:', error);
      alert(`Import failed: ${error.message || 'Please try a clearer document or different format.'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // handlePdfUpload delegates to the unified handleResumeUpload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleResumeUpload(e);

  const [showSuggestions, setShowSuggestions] = useState(true);

  const handleDownloadPdf = async () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      alert("Mobile Guide: On the next screen, select 'Save as PDF' from the printer dropdown.");
    }
    window.print();
    incrementDownloads();
  };

  const handleDownloadDocx = () => {
    const content = document.getElementById('resume-preview-content')?.innerHTML;
    if (!content) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Resume</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + content + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${resume.content?.personalInfo?.fullName || 'Resume'}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    incrementDownloads();
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const summary = await generateSummary(resume.content);
      updateContent('summary', summary);
    } catch (error) {
      console.error("Error generating summary:", error);
      alert("Summary generation failed. Check API key limit.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleSocialSync = async () => {
    if (!githubUsername && !linkedinUrl) return;
    setIsSyncing(true);
    try {
      let newContent = { ...resume.content } as ResumeContent;
      if (githubUsername) {
        try {
          const ghData = await importFromGitHub(githubUsername);
          newContent = { ...newContent, personalInfo: { ...newContent.personalInfo, ...ghData.personalInfo }, summary: newContent.summary || ghData.summary, projects: [...(newContent.projects || []), ...ghData.projects] };
        } catch (error) {}
      }
      if (linkedinUrl) {
        try {
          const liData = await importFromLinkedIn(linkedinUrl);
          newContent = { ...newContent, personalInfo: { ...newContent.personalInfo, ...liData.personalInfo }, summary: liData.summary || newContent.summary, experience: [...(newContent.experience || []), ...(liData.experience || [])], education: [...(newContent.education || []), ...(liData.education || [])] };
        } catch (error) {}
      }
      setResume(prev => ({ ...prev, content: newContent }));
      setIsSocialSyncOpen(false);
    } catch (error) {} finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        setImportText(fullText);
      } else {
        const text = await file.text();
        setImportText(text);
      }
    } catch (error) {} finally {
      setIsImporting(false);
    }
  };

  const handleOptimizeResume = async () => {
    if (!resume.content) return;
    setIsOptimizing(true);
    try {
      const optimizedContent = await optimizeResumeATS(resume.content);
      setResume(prev => ({ ...prev, content: { ...prev.content, ...optimizedContent } }));
      alert("Resume successfully optimized for ATS!");
    } catch (error) {
      console.error("Optimize failed:", error);
      alert("Optimization Failed! API Key limit ho sakti hai.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleImportResume = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    try {
      const parsedContent = await parseResumeText(importText);
      setResume(prev => ({ ...prev, content: { ...prev.content, ...parsedContent } }));
      setIsImportModalOpen(false);
      setImportText('');
    } catch (error) {
      alert("Import fail ho gaya. API Key check karein.");
    } finally {
      setIsImporting(false);
    }
  };

  const calculateProfileStrength = () => {
    let score = 0;
    const c = resume.content;
    if (!c) return 0;
    if (c.personalInfo?.fullName) score += 5;
    if (c.personalInfo?.email) score += 5;
    if (c.personalInfo?.phone) score += 5;
    if (c.personalInfo?.location) score += 5;
    if (c.summary && c.summary.length > 50) score += 15;
    if (c.experience && c.experience.length > 0) {
      score += 10;
      if (c.experience[0].description && c.experience[0].description.length > 0) score += 15;
    }
    if (c.education && c.education.length > 0) score += 15;
    if (c.skills && c.skills.length >= 3) score += 10;
    if (c.projects && c.projects.length > 0) score += 15;
    return Math.min(100, score);
  };

  const handleSave = async () => {
    if (!auth.currentUser) {
      alert("Please Login First to Save your Resume! Click the back button and login.");
      return;
    }
    setSaving(true);
    try {
      const id = resumeId || doc(collection(db, 'resumes')).id;
      const data = {
        ...resume,
        userId: auth.currentUser.uid,
        updatedAt: new Date().toISOString(),
        version: (resume.version || 0) + 1
      };
      await setDoc(doc(db, 'resumes', id), data);
      alert("Resume Saved Successfully! ✅");
      if (!resumeId) onBack(); 
    } catch (error) {
      console.error("Save failed", error);
      alert("Save Failed! Please check your internet connection.");
    } finally {
      setSaving(false);
    }
  };

  const runAnalysis = async (specificContent?: any) => {
    if (!jobDescription.trim()) {
      alert("Please paste a Job Description first!");
      return;
    }
    const now = Date.now();
    if (now - lastAnalysisTime < 2000) return; // Reduced cooldown for better UX
    
    setAnalyzing(true);
    setLastAnalysisTime(now);
    try {
      const contentToAnalyze = specificContent || resume.content;
      const analysis = await analyzeResumeATS(contentToAnalyze, jobDescription);
      setAtsAnalysis(analysis);
      setResume(prev => ({ ...prev, atsScore: analysis.score }));
    } catch (error) {
      console.error("ATS Analysis failed", error);
      alert("ATS Scan Failed! API Key check karo ya limit renew hone ka wait karo.");
    } finally {
      setAnalyzing(false);
    }
  };

  const updateContent = (path: string, value: any) => {
    setResume(prev => {
      const newContent = { ...prev.content } as any;
      const keys = path.split('.');
      let current = newContent;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return { ...prev, content: newContent };
    });
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: Math.random().toString(36).substr(2, 9),
      company: '', position: '', startDate: '', endDate: '', current: false, description: ['']
    };
    updateContent('experience', [...(resume.content?.experience || []), newExp]);
  };

  const addProject = () => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: '', description: '', technologies: [], link: '', keyFeatures: []
    };
    updateContent('projects', [...(resume.content?.projects || []), newProject]);
  };

  const handleGenerateFeatures = async (projectId: string) => {
    const project = resume.content?.projects.find(p => p.id === projectId);
    if (!project || !project.name) return;
    try {
      const features = await generateProjectFeatures(project.name, project.description, project.technologies);
      const newProjects = (resume.content?.projects || []).map(p => {
        if (p.id === projectId) return { ...p, keyFeatures: [...(p.keyFeatures || []), ...features] };
        return p;
      });
      updateContent('projects', newProjects);
    } catch (error) {
      alert("Features Generate failed. API Limit Check!");
    }
  };

  const handleEnhance = async (expId: string, bulletIndex: number) => {
    const exp = resume.content?.experience.find(e => e.id === expId);
    if (!exp) return;
    const original = exp.description[bulletIndex];
    if (!original) return;
    const bulletKey = `${expId}-${bulletIndex}`;
    setEnhancingBullet(bulletKey);
    try {
      const enhanced = await enhanceAchievement(original, targetIndustry);
      const newExp = (resume.content?.experience || []).map(e => {
        if (e.id === expId) {
          const newDesc = [...e.description];
          newDesc[bulletIndex] = enhanced;
          return { ...e, description: newDesc };
        }
        return e;
      });
      updateContent('experience', newExp);
    } catch (error) {
      alert("Bullet enhance failed. API Limit Check!");
    } finally {
      setEnhancingBullet(null);
    }
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 bg-slate-50">
      <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Initializing Editor...</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 print:bg-none print:bg-white overflow-hidden">

      {/* ✅ Import Success Toast */}
      {importSuccessMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-3 animate-bounce-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {importSuccessMsg}
        </div>
      )}
      
      {/* 🚀 Compact Responsive Header */}
      <header className="print:hidden bg-gradient-to-r from-slate-900 via-brand-900 to-slate-900 border-b border-white/10 px-3 md:px-6 py-2 flex justify-between items-center shrink-0 z-50 sticky top-0 shadow-2xl gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={onBack}
            title="Back"
            className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl transition-all hover:scale-110 active:scale-95 text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-black text-white tracking-tighter leading-none flex items-center gap-1.5">
              ResuSmart <span className="text-[8px] font-black px-1.5 py-0.5 bg-brand-500 rounded-full text-white uppercase">PRO</span>
            </span>
            <input 
              value={resume.title}
              onChange={(e) => setResume(prev => ({ ...prev, title: e.target.value }))}
              className="text-[9px] font-bold text-white/40 uppercase tracking-widest bg-transparent border-none focus:ring-0 p-0 placeholder-white/20 focus:text-white/80 transition-colors w-28"
              placeholder="Untitled Resume"
            />
          </div>
        </div>

        {/* Action buttons — compact on mobile, progressive labels on larger screens */}
        <div className="flex items-center gap-1 md:gap-1.5">

          {/* Desktop only: preview + tips */}
          <div className="hidden lg:flex items-center gap-1 pr-2 mr-1 border-r border-white/10">
            <button onClick={() => setIsPreviewMode(true)} title="Full Preview"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white/80 hover:text-white transition-all hover:scale-105">
              <Eye className="w-3.5 h-3.5" /><span className="hidden md:inline">PREVIEW</span>
            </button>
            <button onClick={() => setShowSuggestions(!showSuggestions)} title="Tips"
              className={cn("p-1.5 border rounded-xl transition-all hover:scale-105",
                showSuggestions ? "bg-amber-500 text-white border-amber-400" : "bg-white/5 text-white/60 border-white/10 hover:text-white")}>
              <Lightbulb className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ATS — always visible on ALL screen sizes */}
          <button onClick={() => setShowAtsPanel(!showAtsPanel)} title="ATS Analysis"
            className={cn("flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[11px] font-black transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]",
              showAtsPanel ? "bg-brand-600 text-white border-brand-500 shadow-md" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10")}>
            <Activity className="w-4 h-4" />
            <span className="hidden md:inline text-brand-300 font-black">{resume.atsScore}%</span>
          </button>

          {/* AI Fill */}
          <button onClick={() => setIsAiModalOpen(true)} title="AI Magic Fill"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-brand-600 text-white shadow-md hover:scale-105 active:scale-95 transition-all animate-gradient-x hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            <Sparkles className="w-4 h-4" />
            <span className="hidden md:inline">AI</span>
          </button>

          {/* Import — opens modal with text preview box */}
          <input ref={autoFillInputRef} type="file" className="hidden"
            accept=".pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff"
            onChange={handleResumeUpload} />
          <button onClick={() => setIsImportModalOpen(true)} disabled={isImporting} title="Import Resume (PDF or Photo)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 hover:shadow-[0_0_15px_rgba(255,255,255,0.15)]">
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin text-brand-400" /> : <Upload className="w-4 h-4 text-brand-400" />}
            <span className="hidden md:inline">{isImporting ? 'PARSING' : 'IMPORT'}</span>
          </button>


          <div className="h-5 w-px bg-white/15 mx-0.5" />

          {/* Save */}
          <button onClick={handleSave} disabled={saving} title="Save"
            className="flex items-center gap-1.5 px-3 py-2 bg-white/90 text-slate-900 rounded-xl text-[11px] font-black hover:bg-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-brand-600" /> : <Save className="w-4 h-4 text-brand-700" />}
            <span className="hidden md:inline">{saving ? 'SAVING' : 'SAVE'}</span>
          </button>

          {/* Download — ALWAYS visible, even on smallest screen */}
          <button onClick={handleDownloadPdf} title="Download PDF"
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-xl text-[11px] font-black hover:bg-brand-500 transition-all hover:scale-105 active:scale-95 shadow-md shadow-brand-600/30 hover:shadow-[0_0_20px_rgba(37,99,235,0.6)]">
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">PDF</span>
          </button>
        </div>
      </header>


      <div className="flex-1 flex overflow-hidden flex-col lg:flex-row relative bg-slate-50/30">
        
        <div className="lg:hidden fixed bottom-6 left-0 right-0 px-6 flex justify-between items-center z-[999] pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-white/80 backdrop-blur-xl p-2 rounded-3xl shadow-2xl border border-white/20 mx-auto">
            {(['edit', 'preview', 'ats'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setMobileView(view)}
                className={cn(
                  "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                  mobileView === view ? "bg-brand-600 text-white shadow-xl shadow-brand-500/20 scale-105" : "text-slate-400 hover:bg-white/50"
                )}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        <div className={cn(
          "print:hidden w-full lg:w-72 bg-white/60 backdrop-blur-2xl border-r border-slate-200/50 p-4 md:p-6 space-y-8 overflow-y-auto shrink-0 scrollbar-hide z-40",
          mobileView === 'edit' ? "flex flex-col" : "hidden lg:flex lg:flex-col"
        )}>
          <div className="space-y-2 pb-6 lg:pb-0 w-full">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:block pb-2">Sections</p>
            <div className="flex flex-wrap lg:flex-col gap-1.5 lg:overflow-x-visible pb-4 lg:pb-0">
              {(['templates', 'personal', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'declaration', 'settings'] as const).map((section, idx) => (
                <button
                  key={section}
                  onClick={() => { setActiveSection(section); setIsPreviewMode(false); }}
                  className={cn(
                    "flex-1 lg:flex-none flex items-center gap-3 px-5 py-3.5 text-xs font-black uppercase tracking-widest rounded-2xl transition-all duration-300 group relative",
                    activeSection === section && !isPreviewMode
                      ? "bg-brand-600 text-white shadow-xl shadow-brand-500/30 scale-105" 
                      : "bg-transparent text-slate-500 hover:bg-white hover:text-brand-600 hover:shadow-lg hover:shadow-slate-200/50"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    activeSection === section && !isPreviewMode ? "bg-white/20" : "bg-slate-100 group-hover:bg-brand-50"
                  )}>
                    {section === 'templates' && <FileText className="w-4 h-4" />}
                    {section === 'personal' && <User className="w-4 h-4" />}
                    {section === 'summary' && <Edit3 className="w-4 h-4" />}
                    {section === 'experience' && <Briefcase className="w-4 h-4" />}
                    {section === 'education' && <GraduationCap className="w-4 h-4" />}
                    {section === 'skills' && <Activity className="w-4 h-4" />}
                    {section === 'projects' && <Target className="w-4 h-4" />}
                    {section === 'certifications' && <Award className="w-4 h-4" />}
                    {section === 'declaration' && <CheckCircle2 className="w-4 h-4" />}
                    {section === 'settings' && <TrendingUp className="w-4 h-4" />}
                  </div>
                  <span className="truncate">{section === 'settings' ? 'Design' : section}</span>
                  {activeSection === section && !isPreviewMode && (
                    <motion.div 
                      layoutId="sidebar-active-indicator"
                      className="absolute left-1 w-1 h-6 bg-white rounded-full lg:block hidden"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>



          <div className="space-y-4 pt-6 lg:pt-8 border-t border-slate-200/50 block">
            <div className="px-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Profile Strength</span>
                <span className="text-xs font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-lg border border-brand-100">{calculateProfileStrength()}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/50 shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateProfileStrength()}%` }}
                  transition={{ type: "spring", stiffness: 50, damping: 20 }}
                  className="bg-gradient-to-r from-brand-400 via-brand-600 to-indigo-600 h-full rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Edit area: when ATS open on desktop, it takes the full right half (no preview), so edit area gets full remaining space */}
        <div className={cn(
          "print:hidden overflow-y-auto p-4 md:p-6 lg:p-8 bg-white transition-all duration-500 pb-32 lg:pb-10 flex-1 min-w-0",
          isPreviewMode ? "hidden" : (mobileView === 'edit' ? "block" : "hidden lg:block")
        )}>
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeSection}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              
              {activeSection === 'templates' && (
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.05 }
                    }
                  }}
                  className="space-y-8"
                >
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">World-Class Templates</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Select a baseline for your professional story.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {templates.map((t, idx) => (
                      <motion.button
                        key={t.id}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0 }
                        }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTemplateSelect(t.id)}
                        className={cn(
                          "p-6 rounded-[2rem] border-2 text-left transition-all duration-300 group relative flex flex-col overflow-hidden",
                          resume.templateType === t.id 
                            ? "border-brand-500 bg-white shadow-2xl shadow-brand-500/20" 
                            : "border-slate-100 bg-slate-50/50 hover:border-brand-200 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:rotate-6 shadow-sm",
                          t.color === 'brand' ? "bg-brand-500 text-white shadow-brand-500/20" :
                          t.color === 'emerald' ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                          t.color === 'violet' ? "bg-violet-500 text-white shadow-violet-500/20" :
                          t.color === 'indigo' ? "bg-indigo-500 text-white shadow-indigo-500/20" :
                          "bg-slate-500 text-white"
                        )}>
                          <t.icon className="w-6 h-6" />
                        </div>
                        <h3 className="font-black text-slate-900 text-lg">{t.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Select Layout</p>
                        
                        {resume.templateType === t.id && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-6 right-6 text-brand-500"
                          >
                            <CheckCircle2 className="w-6 h-6 fill-brand-500 text-white" />
                          </motion.div>
                        )}
                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-transparent to-slate-100/50 rounded-full group-hover:scale-150 transition-transform duration-700" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
                        {activeSection === 'personal' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Identity & Reach</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">How recruiters will identify and contact you.</p>
                  </div>
                  <ProTip>Make sure your email address is professional. Include your LinkedIn profile.</ProTip>
                  
                  <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 p-8 lg:p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50/50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 transition-opacity group-hover:opacity-100" />
                    <div className="flex flex-col md:flex-row gap-10 items-start mb-10 relative z-10">
                      <div className="relative shrink-0">
                        <div className="w-40 h-40 rounded-[2rem] bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-500 shadow-inner group/photo">
                          {resume.content?.personalInfo.photo ? (
                            <img src={resume.content.personalInfo.photo} alt="Profile" className="w-full h-full object-cover transition-transform duration-700 group-hover/photo:scale-110" />
                          ) : (
                            <User className="w-16 h-16 text-slate-300" />
                          )}
                          <label className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300 backdrop-blur-[2px] text-[10px] font-black uppercase tracking-widest translate-y-2 group-hover:translate-y-0">
                            <Camera className="w-6 h-6 mb-2" />
                            UPLOAD PHOTO
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setCropImage(reader.result as string);
                                    setShowCropModal(true);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        {resume.content?.personalInfo.photo && (
                          <button 
                            onClick={() => updateContent('personalInfo.photo', '')}
                            className="absolute -top-2 -right-2 w-8 h-8 bg-white text-red-500 rounded-2xl flex items-center justify-center shadow-xl hover:bg-red-50 transition-all hover:scale-110 active:scale-90 border border-red-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 space-y-4 pt-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                          <CheckCircle2 className="w-3 h-3" />
                          Public Presence
                        </div>
                        <h4 className="text-xl font-black text-slate-900 leading-tight">Your Professional Brand</h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">Add a high-quality headshot to increase trustworthiness and engagement. First impressions are irreversible.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                      <Input label="Full Name" value={resume.content?.personalInfo.fullName} onChange={v => updateContent('personalInfo.fullName', v)} placeholder="Nikola Tesla" />
                      <Input 
                        label="Professional Title" 
                        value={resume.content?.personalInfo.jobTitle} 
                        onChange={v => updateContent('personalInfo.jobTitle', v)} 
                        placeholder="e.g. Senior Machine Learning Engineer" 
                        suggestions={['Software Architect', 'Product Designer', 'Data Scientist', 'VP of Engineering', 'Creative Director', 'Strategic Consultant']}
                      />
                      <Input label="Email Address" value={resume.content?.personalInfo.email} onChange={v => updateContent('personalInfo.email', v)} placeholder="nikola@tesla.com" />
                      <Input label="Phone Number" value={resume.content?.personalInfo.phone} onChange={v => updateContent('personalInfo.phone', v)} placeholder="+91 99999 99999" />
                      <Input label="Location / City" value={resume.content?.personalInfo.location} onChange={v => updateContent('personalInfo.location', v)} placeholder="Mumbai, India" suggestions={['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'London, UK', 'Singapore', 'Remote']} />
                      <Input label="LinkedIn Profile" value={resume.content?.personalInfo.linkedin} onChange={v => updateContent('personalInfo.linkedin', v)} placeholder="linkedin.com/in/yourname" />
                      <Input label="Portfolio / Website" value={resume.content?.personalInfo.website} onChange={v => updateContent('personalInfo.website', v)} placeholder="yourportfolio.com" />
                    </div>

                    {/* Optional / Additional Details */}
                    <div className="relative z-10 mt-8 pt-8 border-t border-slate-100">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-2 h-6 bg-amber-400 rounded-full" />
                        <div>
                          <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Optional Details</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Required for government / traditional Indian formats. Leave blank if not needed.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Date of Birth" value={resume.content?.personalInfo.dob} onChange={v => updateContent('personalInfo.dob', v)} placeholder="e.g. 15 Aug 1999" />
                        <Input label="Father's Name" value={resume.content?.personalInfo.fatherName} onChange={v => updateContent('personalInfo.fatherName', v)} placeholder="e.g. Ramesh Kumar" />
                        <Input
                          label="Gender"
                          value={resume.content?.personalInfo.gender}
                          onChange={v => updateContent('personalInfo.gender', v)}
                          placeholder="Male / Female / Other"
                          suggestions={['Male', 'Female', 'Non-binary', 'Prefer not to say']}
                        />
                        <Input
                          label="Marital Status"
                          value={resume.content?.personalInfo.maritalStatus}
                          onChange={v => updateContent('personalInfo.maritalStatus', v)}
                          placeholder="Single / Married / Other"
                          suggestions={['Single', 'Married', 'Divorced', 'Widowed']}
                        />
                        <Input
                          label="Nationality"
                          value={resume.content?.personalInfo.nationality}
                          onChange={v => updateContent('personalInfo.nationality', v)}
                          placeholder="e.g. Indian"
                          suggestions={['Indian', 'American', 'British', 'Canadian', 'Australian']}
                        />
                        <Input
                          label="Domicile / State"
                          value={resume.content?.personalInfo.domicile}
                          onChange={v => updateContent('personalInfo.domicile', v)}
                          placeholder="e.g. Maharashtra"
                          suggestions={['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Uttar Pradesh', 'Gujarat', 'West Bengal', 'Rajasthan', 'Telangana', 'Bihar']}
                        />
                        <Input
                          label="Category"
                          value={resume.content?.personalInfo.category}
                          onChange={v => updateContent('personalInfo.category', v)}
                          placeholder="e.g. General / OBC / SC / ST"
                          suggestions={['General', 'OBC', 'SC', 'ST', 'EWS', 'PwD']}
                        />
                        <Input
                          label="Aadhaar (Last 4 digits only)"
                          value={resume.content?.personalInfo.aadhaar}
                          onChange={v => updateContent('personalInfo.aadhaar', v)}
                          placeholder="XXXX"
                        />
                      </div>

                      {/* Languages Known */}
                      <div className="mt-6">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Languages Known</label>
                        <div className="flex flex-wrap gap-3 items-center">
                          {(resume.content?.personalInfo.languages || []).map((lang, i) => (
                            <div key={i} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 group/lang">
                              <input
                                value={lang}
                                onChange={e => {
                                  const arr = [...(resume.content?.personalInfo.languages || [])];
                                  arr[i] = e.target.value;
                                  updateContent('personalInfo.languages', arr);
                                }}
                                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none w-20"
                              />
                              <button onClick={() => {
                                const arr = (resume.content?.personalInfo.languages || []).filter((_, idx) => idx !== i);
                                updateContent('personalInfo.languages', arr);
                              }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/lang:opacity-100 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => updateContent('personalInfo.languages', [...(resume.content?.personalInfo.languages || []), ''])}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-dashed border-slate-200 text-xs font-bold text-slate-400 hover:border-brand-400 hover:text-brand-600 transition-all"
                          >
                            <Plus className="w-3 h-3" /> Add Language
                          </button>
                        </div>
                      </div>

                      {/* Hobbies */}
                      <div className="mt-6">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Hobbies & Interests</label>
                        <div className="flex flex-wrap gap-3 items-center">
                          {(resume.content?.personalInfo.hobbies || []).map((hobby, i) => (
                            <div key={i} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 group/hobby">
                              <input
                                value={hobby}
                                onChange={e => {
                                  const arr = [...(resume.content?.personalInfo.hobbies || [])];
                                  arr[i] = e.target.value;
                                  updateContent('personalInfo.hobbies', arr);
                                }}
                                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none w-24"
                              />
                              <button onClick={() => {
                                const arr = (resume.content?.personalInfo.hobbies || []).filter((_, idx) => idx !== i);
                                updateContent('personalInfo.hobbies', arr);
                              }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/hobby:opacity-100 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => updateContent('personalInfo.hobbies', [...(resume.content?.personalInfo.hobbies || []), ''])}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-dashed border-slate-200 text-xs font-bold text-slate-400 hover:border-brand-400 hover:text-brand-600 transition-all"
                          >
                            <Plus className="w-3 h-3" /> Add Hobby
                          </button>
                        </div>
                      </div>

                      {/* Permanent Address */}
                      <div className="mt-6">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Permanent Address</label>
                        <textarea
                          value={resume.content?.personalInfo.permanentAddress || ''}
                          onChange={e => updateContent('personalInfo.permanentAddress', e.target.value)}
                          placeholder="e.g. 123, Gandhi Nagar, Mumbai - 400001, Maharashtra"
                          className="w-full h-20 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}


              {activeSection === 'summary' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">Professional Narrative</h3>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Hook recruiters in 30 seconds or less.</p>
                    </div>
                    <button
                      onClick={handleGenerateSummary}
                      disabled={generatingSummary}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {generatingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      MAGIC WRITE
                    </button>
                  </div>
                  <ProTip>Keep your summary under 4 sentences. Focus on high-impact achievements and unique competitive advantages.</ProTip>
                  
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-brand-500/20 to-indigo-500/20 rounded-[2.5rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <textarea 
                      value={resume.content?.summary}
                      onChange={e => updateContent('summary', e.target.value)}
                      placeholder="World-class Software Architect with 10+ years of experience in distributed systems and AI infrastructure..."
                      className="w-full h-72 bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-10 text-lg font-medium text-slate-700 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 outline-none transition-all resize-none leading-relaxed shadow-2xl shadow-slate-200/50 relative z-10"
                    />
                  </div>
                </motion.div>
              )}

              {activeSection === 'experience' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">Career Trajectory</h3>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Chronological professional history.</p>
                    </div>
                    <button 
                      onClick={addExperience} 
                      className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus className="w-5 h-5" /> ADD ROLE
                    </button>
                  </div>
                  <ProTip>Use action verbs and quantify results (e.g., "Increased revenue by 40%"). Use the AI Enhancer for bullet points.</ProTip>
                  
                  <div className="space-y-8">
                    {(resume.content?.experience || []).map((exp, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={exp.id} 
                        className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 relative group hover:border-brand-200 transition-all"
                      >
                        <button 
                          onClick={() => {
                            const newExp = resume.content?.experience.filter(e => e.id !== exp.id);
                            updateContent('experience', newExp);
                          }}
                          className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl bg-white text-slate-400 hover:text-red-500 flex items-center justify-center shadow-xl border border-slate-100 hover:scale-110"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                          <Input label="Company Name" value={exp.company} onChange={v => {
                            const newExp = [...(resume.content?.experience || [])];
                            newExp[idx].company = v;
                            updateContent('experience', newExp);
                          }} placeholder="e.g. Google" suggestions={['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Infosys', 'TCS', 'Wipro', 'HCL Technologies', 'Accenture', 'Cognizant', 'Flipkart', 'Paytm', 'Zomato', 'Swiggy', 'Razorpay', 'BYJU\'S', 'PhonePe', 'Deloitte', 'IBM']} />
                          <Input label="Job Title" value={exp.position} onChange={v => {
                            const newExp = [...(resume.content?.experience || [])];
                            newExp[idx].position = v;
                            updateContent('experience', newExp);
                          }} placeholder="e.g. Software Engineer" suggestions={['Software Engineer', 'Senior Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'DevOps Engineer', 'Data Analyst', 'Data Scientist', 'Machine Learning Engineer', 'Product Manager', 'UI/UX Designer', 'Project Manager', 'Business Analyst', 'QA Engineer', 'Mobile Developer', 'Cloud Engineer', 'System Administrator', 'Technical Lead', 'Engineering Manager', 'Intern']} />
                          <Input label="Start Date" value={exp.startDate} onChange={v => {
                            const newExp = [...(resume.content?.experience || [])];
                            newExp[idx].startDate = v;
                            updateContent('experience', newExp);
                          }} placeholder="e.g. May 2024" suggestions={['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2023', 'Jun 2023', 'Jan 2022', 'Jun 2022']} />
                          <Input label="End Date" value={exp.endDate} onChange={v => {
                            const newExp = [...(resume.content?.experience || [])];
                            newExp[idx].endDate = v;
                            if (v.toLowerCase() !== 'present') {
                              newExp[idx].current = false;
                            }
                            updateContent('experience', newExp);
                          }} placeholder="Present" suggestions={['Present', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Jun 2025', 'Dec 2024', 'Jun 2024', 'Dec 2023', 'Jun 2023']} />
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <input
                            type="checkbox"
                            id={`exp-current-${idx}`}
                            checked={!!exp.current || exp.endDate?.toLowerCase() === 'present'}
                            onChange={e => {
                              const newExp = [...(resume.content?.experience || [])];
                              newExp[idx].current = e.target.checked;
                              if (e.target.checked) {
                                newExp[idx].endDate = 'Present';
                              }
                              updateContent('experience', newExp);
                            }}
                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                          <label htmlFor={`exp-current-${idx}`} className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                            I currently work in this role
                          </label>
                        </div>

                        <div className="mt-6 space-y-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key Responsibilities & Achievements</p>
                          {(exp.description || []).map((bullet, bIdx) => (
                            <div key={bIdx} className="flex gap-2 group/bullet">
                              <input 
                                value={bullet}
                                onChange={e => {
                                  const newExp = [...(resume.content?.experience || [])];
                                  newExp[idx].description[bIdx] = e.target.value;
                                  updateContent('experience', newExp);
                                }}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                placeholder="Developed a feature that improved performance by 20%..."
                              />
                              <button 
                                onClick={() => {
                                  const newExp = [...(resume.content?.experience || [])];
                                  newExp[idx].description = newExp[idx].description.filter((_, i) => i !== bIdx);
                                  updateContent('experience', newExp);
                                }}
                                className="w-10 flex items-center justify-center text-slate-300 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/bullet:opacity-100"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const newExp = [...(resume.content?.experience || [])];
                              newExp[idx].description.push('');
                              updateContent('experience', newExp);
                            }}
                            className="flex items-center gap-2 mt-2 text-xs font-bold text-brand-600 hover:text-brand-700"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Bullet Point
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeSection === 'education' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">Academic Foundation</h3>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Your degrees and scholarly achievements.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const newEdu: Education = { id: Math.random().toString(), school: '', degree: '', field: '', graduationDate: '' };
                        updateContent('education', [...(resume.content?.education || []), newEdu]);
                      }} 
                      className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus className="w-5 h-5" /> ADD EDUCATION
                    </button>
                  </div>
                  <ProTip>Include your GPA if it's 3.5 or higher. For recent graduates, listing relevant coursework or academic honors is highly recommended.</ProTip>
                  
                  <div className="space-y-8">
                    {(resume.content?.education || []).map((edu, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={edu.id} 
                        className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 relative group hover:border-brand-200 transition-all"
                      >
                        <button 
                          onClick={() => {
                            const newEdu = resume.content?.education.filter(e => e.id !== edu.id);
                            updateContent('education', newEdu);
                          }}
                          className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl bg-white text-slate-400 hover:text-red-500 flex items-center justify-center shadow-xl border border-slate-100 hover:scale-110 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                          <Input label="School / University" value={edu.school} onChange={v => {
                            const newEdu = [...(resume.content?.education || [])];
                            newEdu[idx].school = v;
                            updateContent('education', newEdu);
                          }} placeholder="e.g. IIT Bombay / Delhi University" suggestions={['IIT Bombay', 'IIT Delhi', 'IIT Madras', 'IIT Kanpur', 'BITS Pilani', 'NIT Trichy', 'Delhi University', 'Mumbai University', 'Anna University', 'VIT Vellore', 'SRM University', 'Manipal University', 'Stanford University', 'MIT', 'Harvard University', 'Oxford University']} />
                          <Input label="Board / University Affiliation" value={edu.board || ''} onChange={v => {
                            const newEdu = [...(resume.content?.education || [])];
                            newEdu[idx].board = v;
                            updateContent('education', newEdu);
                          }} placeholder="e.g. CBSE / State Board / University" suggestions={['CBSE', 'ICSE', 'State Board', 'Mumbai University', 'Delhi University', 'Anna University', 'VTU', 'Autonomous', 'IB Board']} />
                          <Input label="Degree / Course" value={edu.degree} onChange={v => {
                            const newEdu = [...(resume.content?.education || [])];
                            newEdu[idx].degree = v;
                            updateContent('education', newEdu);
                          }} placeholder="e.g. B.Tech" suggestions={['B.Tech', 'B.E.', 'B.Sc', 'B.Com', 'BBA', 'BCA', 'M.Tech', 'M.Sc', 'MBA', 'MCA', 'M.Com', 'Ph.D.', 'Diploma', 'B.A.', 'M.A.', 'Bachelor of Science', 'Master of Science', 'Associate Degree', '12th (HSC)', '10th (SSC)']} />
                          <Input label="Field of Study / Major" value={edu.field} onChange={v => {
                            const newEdu = [...(resume.content?.education || [])];
                            newEdu[idx].field = v;
                            updateContent('education', newEdu);
                          }} placeholder="e.g. Computer Science" suggestions={['Computer Science', 'Information Technology', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Electronics & Communication', 'Data Science', 'Artificial Intelligence', 'Business Administration', 'Commerce', 'Economics', 'Mathematics']} />
                          <Input label="Graduation Date / Year" value={edu.graduationDate} onChange={v => {
                            const newEdu = [...(resume.content?.education || [])];
                            newEdu[idx].graduationDate = v;
                            updateContent('education', newEdu);
                          }} placeholder="e.g. June 2025" suggestions={['June 2025', 'May 2025', 'June 2024', 'May 2024', 'June 2023', 'May 2023', 'June 2022', 'Expected June 2026', 'Expected May 2027']} />
                          <Input label="Score / CGPA / Percentage (Optional)" value={edu.score || ''} onChange={v => {
                            const newEdu = [...(resume.content?.education || [])];
                            newEdu[idx].score = v;
                            updateContent('education', newEdu);
                          }} placeholder="e.g. 9.2 CGPA or 85%" suggestions={['9.5 CGPA', '9.0 CGPA', '8.5 CGPA', '8.0 CGPA', '90%', '85%', '80%', 'First Class with Distinction', '3.8 GPA', '3.9 GPA', '4.0 GPA']} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeSection === 'skills' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Core Competencies</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Hard and soft skills that set you apart.</p>
                  </div>
                  <ProTip>Group your skills by category (e.g., Languages, Frameworks, Soft Skills). Keep them relevant to the job you're applying for.</ProTip>
                  
                  <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60">
                    <div className="flex flex-wrap gap-4 items-center">
                      {(resume.content?.skills || []).map((skill, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className="flex items-center gap-2 group/skill"
                        >
                          <div className="relative">
                            <input 
                              value={skill}
                              onChange={e => {
                                const newSkills = [...(resume.content?.skills || [])];
                                newSkills[idx] = e.target.value;
                                updateContent('skills', newSkills);
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all shadow-sm pr-10 min-w-[160px]"
                            />
                            <button 
                              onClick={() => {
                                const newSkills = resume.content?.skills.filter((_, i) => i !== idx);
                                updateContent('skills', newSkills);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 opacity-0 group-hover/skill:opacity-100 transition-opacity"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                      
                      <div className="relative group/newskill">
                        <div className="absolute -inset-1 bg-gradient-to-r from-brand-500/20 to-indigo-500/20 rounded-2xl blur opacity-0 group-hover/newskill:opacity-100 transition-opacity" />
                        <input 
                          placeholder="ADD NEW SKILL..."
                          list="skills-suggestions"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value;
                              if (val) {
                                updateContent('skills', [...(resume.content?.skills || []), val]);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                          className="relative z-10 bg-white/50 border-2 border-dashed border-slate-200 rounded-2xl px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-400 focus:text-brand-600 focus:border-brand-500 focus:bg-white outline-none transition-all min-w-[200px] placeholder-slate-300"
                        />
                      </div>

                      <datalist id="skills-suggestions">
                        {['React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java', 'C++', 'SQL', 'NoSQL', 'AWS', 'Docker', 'Kubernetes', 'Machine Learning', 'Data Analysis', 'Agile', 'UI/UX Design', 'Figma', 'Git', 'Tailwind CSS', 'Redux', 'Next.js'].map((s, i) => (
                          <option key={i} value={s} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === 'projects' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">Technical Portfolio</h3>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Showcase your best builds and engineering craft.</p>
                    </div>
                    <button 
                      onClick={addProject} 
                      className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus className="w-5 h-5" /> ADD PROJECT
                    </button>
                  </div>
                  <ProTip>Focus on the problem you solved and the tech stack you used. Including links to GitHub or live demos adds significant credibility.</ProTip>
                  
                  <div className="space-y-8">
                    {(resume.content?.projects || []).map((project, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={project.id} 
                        className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 relative group hover:border-brand-200 transition-all"
                      >
                        <button 
                          onClick={() => {
                            const newProjects = resume.content?.projects.filter(p => p.id !== project.id);
                            updateContent('projects', newProjects);
                          }}
                          className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl bg-white text-slate-400 hover:text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-xl border border-slate-100 hover:scale-110"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
                          <Input label="Project Name" value={project.name} onChange={v => {
                            const newProjects = [...(resume.content?.projects || [])];
                            newProjects[idx].name = v;
                            updateContent('projects', newProjects);
                          }} placeholder="e.g. ResuSmart AI" />
                          <Input label="Live Link / GitHub" value={project.link || ''} onChange={v => {
                            const newProjects = [...(resume.content?.projects || [])];
                            newProjects[idx].link = v;
                            updateContent('projects', newProjects);
                          }} placeholder="github.com/yourname/project" />
                        </div>
                        <div className="mt-8 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Narrative & Impact</label>
                            <span className="text-[10px] font-bold text-brand-500">QUANTIFY YOUR RESULTS</span>
                          </div>
                          <textarea 
                            value={project.description}
                            onChange={e => {
                              const newProjects = [...(resume.content?.projects || [])];
                              newProjects[idx].description = e.target.value;
                              updateContent('projects', newProjects);
                            }}
                            className="w-full h-28 bg-slate-50 border border-slate-200 rounded-3xl p-5 text-sm font-medium text-slate-700 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all resize-none leading-relaxed shadow-inner"
                            placeholder="Architected a 60fps resume builder using React and Framer Motion..."
                          />
                        </div>

                        {/* Project Key Highlights / Bullets */}
                        <div className="mt-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Key Features & Highlights</label>
                            <button
                              type="button"
                              onClick={() => handleGenerateFeatures(project.id)}
                              className="text-[10px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 uppercase tracking-wider px-2 py-0.5 rounded-lg bg-brand-50 hover:bg-brand-100 transition-colors"
                            >
                              <Sparkles className="w-3 h-3" /> Auto Generate
                            </button>
                          </div>
                          {(project.keyFeatures || []).map((feat, fIdx) => (
                            <div key={fIdx} className="flex gap-2 group/feat">
                              <input 
                                value={feat}
                                onChange={e => {
                                  const newProjects = [...(resume.content?.projects || [])];
                                  const arr = [...(newProjects[idx].keyFeatures || [])];
                                  arr[fIdx] = e.target.value;
                                  newProjects[idx].keyFeatures = arr;
                                  updateContent('projects', newProjects);
                                }}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                placeholder="e.g. Implemented real-time synchronization handling 10,000+ operations/sec..."
                              />
                              <button 
                                onClick={() => {
                                  const newProjects = [...(resume.content?.projects || [])];
                                  newProjects[idx].keyFeatures = (newProjects[idx].keyFeatures || []).filter((_, i) => i !== fIdx);
                                  updateContent('projects', newProjects);
                                }}
                                className="w-10 flex items-center justify-center text-slate-300 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/feat:opacity-100"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const newProjects = [...(resume.content?.projects || [])];
                              newProjects[idx].keyFeatures = [...(newProjects[idx].keyFeatures || []), ''];
                              updateContent('projects', newProjects);
                            }}
                            className="flex items-center gap-2 mt-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Project Highlight
                          </button>
                        </div>

                        <div className="mt-6 space-y-3">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Technology Stack</label>
                          <input 
                            value={project.technologies.join(', ')}
                            onChange={e => {
                              const newProjects = [...(resume.content?.projects || [])];
                              newProjects[idx].technologies = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              updateContent('projects', newProjects);
                            }}
                            list="tech-suggestions"
                            placeholder="React, TypeScript, Node.js, AWS..."
                            className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest text-brand-600 focus:bg-white focus:border-brand-500 outline-none transition-all shadow-inner placeholder-brand-200"
                          />
                          <datalist id="tech-suggestions">
                            {['React', 'Node.js', 'Firebase', 'MongoDB', 'PostgreSQL', 'Python', 'Django', 'Flask', 'Next.js', 'Tailwind CSS', 'Express.js', 'AWS', 'Docker', 'Google Cloud', 'Azure', 'Unity', 'Swift', 'Kotlin', 'Flutter', 'GraphQL', 'Redis'].map((t, i) => (
                              <option key={i} value={t} />
                            ))}
                          </datalist>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeSection === 'certifications' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Certifications</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Formal recognitions of your expertise.</p>
                  </div>
                  <ProTip>Only include certifications that are relevant to the job you're applying for.</ProTip>
                  
                  <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60">
                    <div className="flex flex-wrap gap-4 items-center">
                      {(resume.content?.certifications || []).map((cert, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className="flex items-center gap-2 group/skill"
                        >
                          <div className="relative">
                            <input 
                              value={cert}
                              onChange={e => {
                                const newCerts = [...(resume.content?.certifications || [])];
                                newCerts[idx] = e.target.value;
                                updateContent('certifications', newCerts);
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all shadow-sm pr-10 min-w-[200px]"
                            />
                            <button 
                              onClick={() => {
                                const newCerts = resume.content?.certifications?.filter((_, i) => i !== idx);
                                updateContent('certifications', newCerts);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 opacity-0 group-hover/skill:opacity-100 transition-opacity"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                      
                      <div className="relative group/newskill">
                        <div className="absolute -inset-1 bg-gradient-to-r from-brand-500/20 to-indigo-500/20 rounded-2xl blur opacity-0 group-hover/newskill:opacity-100 transition-opacity" />
                        <input 
                          placeholder="ADD NEW CERTIFICATION..."
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value;
                              if (val) {
                                updateContent('certifications', [...(resume.content?.certifications || []), val]);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                          className="relative z-10 bg-white/50 border-2 border-dashed border-slate-200 rounded-2xl px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-400 focus:text-brand-600 focus:border-brand-500 focus:bg-white outline-none transition-all min-w-[240px] placeholder-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === 'declaration' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Legal Authenticity</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">A formal confirmation of your technical claims.</p>
                  </div>
                  <ProTip>A formal declaration is rarely required on modern short resumes. Include this mostly for traditional Indian formats or government jobs.</ProTip>
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-brand-500/20 to-indigo-500/20 rounded-[3rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[3rem] border border-white shadow-2xl shadow-slate-200/60 relative z-10 space-y-6">
                      <textarea 
                        value={resume.content?.declaration}
                        onChange={e => updateContent('declaration', e.target.value)}
                        placeholder="I hereby declare that the information provided above is true to the best of my knowledge and belief."
                        className="w-full h-40 bg-transparent border-none text-xl font-medium text-slate-700 italic placeholder-slate-300 focus:ring-0 outline-none transition-all resize-none leading-relaxed text-center"
                      />
                      <div className="flex justify-center">
                        <button 
                          onClick={() => updateContent('declaration', "I hereby declare that the information provided above is true to the best of my knowledge and belief.")}
                          className="px-6 py-2 bg-brand-50 text-brand-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-brand-100 transition-all hover:scale-105"
                        >
                          USE STANDARD DECLARATION
                        </button>
                      </div>

                      {/* Declaration Date & Place */}
                      <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Declaration Date <span className="text-slate-300 normal-case font-medium">(leave blank = today)</span></label>
                          <input
                            value={resume.content?.declarationDate || ''}
                            onChange={e => updateContent('declarationDate', e.target.value)}
                            placeholder={new Date().toLocaleDateString('en-IN')}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Place <span className="text-slate-300 normal-case font-medium">(leave blank = your location)</span></label>
                          <input
                            value={resume.content?.declarationPlace || ''}
                            onChange={e => updateContent('declarationPlace', e.target.value)}
                            placeholder={resume.content?.personalInfo?.location || 'e.g. Mumbai'}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}


              {activeSection === 'settings' && (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-10 pb-10"
                >
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Design Archetype</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Customize the visual language of your brand.</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white p-10 shadow-2xl shadow-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-12 relative overflow-hidden group">
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50/50 rounded-full -ml-32 -mb-32 blur-3xl opacity-50 transition-opacity group-hover:opacity-100" />
                    <div className="space-y-6 relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-6 bg-brand-500 rounded-full" />
                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest">Vibrant Palette</label>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {['#0f172a', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#f97316'].map(color => (
                          <button
                            key={color}
                            onClick={() => setResume(prev => ({ ...prev, settings: { ...prev.settings, primaryColor: color } }))}
                            className={cn(
                              "w-10 h-10 rounded-2xl transition-all flex items-center justify-center relative overflow-hidden group/color",
                              resume.settings?.primaryColor === color ? "ring-4 ring-offset-4 ring-brand-500 scale-110 shadow-xl" : "hover:scale-110 hover:shadow-lg shadow-slate-200"
                            )}
                            style={{ backgroundColor: color }}
                          >
                            {resume.settings?.primaryColor === color && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-white">
                                <CheckCircle2 className="w-5 h-5 fill-white/20" />
                              </motion.div>
                            )}
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/color:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-6 bg-brand-500 rounded-full" />
                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest">Premium Typography</label>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {['Inter', 'Roboto', 'Outfit', 'Montserrat', 'Source Sans Pro', 'Playfair Display', 'Merriweather', 'JetBrains Mono'].map(font => (
                          <button
                            key={font}
                            onClick={() => setResume(prev => ({ ...prev, settings: { ...prev.settings, fontFamily: font } }))}
                            className={cn(
                              "px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                              resume.settings?.fontFamily === font 
                                ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-105" 
                                : "bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-lg border border-slate-100"
                            )}
                            style={{ fontFamily: font }}
                          >
                            {font}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-6 bg-brand-500 rounded-full" />
                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest">Font Size</label>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {(['small', 'medium', 'large'] as const).map(size => (
                          <button
                            key={size}
                            onClick={() => setResume(prev => ({ ...prev, settings: { ...prev.settings, fontSize: size } }))}
                            className={cn(
                              "px-3 py-2.5 rounded-xl border text-xs font-bold transition-all capitalize shadow-sm flex-1 min-w-[70px]",
                              resume.settings?.fontSize === size ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            )}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Section Spacing</label>
                      <div className="flex flex-wrap gap-2">
                        {(['compact', 'normal', 'loose'] as const).map(space => (
                          <button
                            key={space}
                            onClick={() => setResume(prev => ({ ...prev, settings: { ...prev.settings, spacing: space } }))}
                            className={cn(
                              "px-3 py-2.5 rounded-xl border text-xs font-bold transition-all capitalize shadow-sm flex-1 min-w-[70px]",
                              resume.settings?.spacing === space ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            )}
                          >
                            {space}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 📄 Live Preview — hidden on desktop when ATS panel is open to avoid 4-column overflow */}
        <AnimatePresence>
          {(!isPreviewMode && showLivePreview && !showAtsPanel) && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn(
                "flex-col overflow-hidden transition-all duration-300 shrink-0 border-l border-slate-200 bg-slate-100",
                mobileView === 'preview' ? "fixed inset-0 z-[90] w-full h-full pb-24 flex" : "hidden lg:flex lg:w-[420px] xl:w-[480px]",
                "print:flex print:static print:bg-white print:w-full print:h-auto print:overflow-visible"
              )}
            >
              <div className="print:hidden h-12 bg-white/90 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Eye className="w-3.5 h-3.5 text-brand-600" />
                  <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest hidden sm:block">Live Preview</h3>
                  <button onClick={() => setIsPreviewMode(true)} className="flex lg:hidden items-center gap-1 px-1.5 py-1 sm:px-2 rounded-md bg-white border border-slate-200 text-brand-600 text-[9px] sm:text-[10px] font-bold shadow-sm hover:bg-slate-50">
                    <Eye className="w-3 h-3" /> Full Preview
                  </button>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                  <button onClick={() => setManualScale(prev => Math.max(0.1, (prev || previewScale) - 0.1))} className="p-1 hover:bg-white rounded-md text-slate-500 transition-all"><Minus className="w-3 h-3" /></button>
                  <span className="px-1 sm:px-1.5 text-[9px] font-bold text-slate-600 w-8 text-center">{Math.round((manualScale || previewScale) * 100)}%</span>
                  <button onClick={() => setManualScale(prev => Math.min(2, (prev || previewScale) + 0.1))} className="p-1 hover:bg-white rounded-md text-slate-500 transition-all"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-3 lg:p-5 flex justify-center items-start scrollbar-hide print:p-0 print:bg-white print:overflow-visible" ref={previewContainerRef}>
                <div 
                  id="resume-preview-content"
                  className="w-full max-w-[850px] bg-white shrink-0 origin-top flex justify-center transition-transform duration-200 ease-out shadow-xl ring-1 ring-slate-900/5 print:shadow-none print:ring-0 print:!transform-none print:w-full print:mb-0 mb-16" 
                  style={{ transform: `scale(${manualScale || previewScale})` }}
                >
                  <ResumePreview content={resume.content as ResumeContent} templateType={resume.templateType || 'modern-professional'} settings={resume.settings} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 📄 Mobile preview (when ATS panel is open on desktop, still show prev on mobile) */}
        <AnimatePresence>
          {(!isPreviewMode && showLivePreview && showAtsPanel && mobileView === 'preview') && (
            <motion.div 
              className="fixed inset-0 z-[90] w-full h-full pb-24 flex flex-col overflow-hidden bg-slate-100"
            >
              <div className="print:hidden h-12 bg-white/90 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Eye className="w-3.5 h-3.5 text-brand-600" />
                  <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest hidden sm:block">Preview</h3>
                  <button onClick={() => setIsPreviewMode(true)} className="flex lg:hidden items-center gap-1 px-1.5 py-1 sm:px-2 rounded-md bg-white border border-slate-200 text-brand-600 text-[9px] sm:text-[10px] font-bold shadow-sm hover:bg-slate-50">
                    <Eye className="w-3 h-3" /> Full Preview
                  </button>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                  <button onClick={() => setManualScale(prev => Math.max(0.1, (prev || previewScale) - 0.1))} className="p-1 hover:bg-white rounded-md text-slate-500 transition-all"><Minus className="w-3 h-3" /></button>
                  <span className="px-1 sm:px-1.5 text-[9px] font-bold text-slate-600 w-8 text-center">{Math.round((manualScale || previewScale) * 100)}%</span>
                  <button onClick={() => setManualScale(prev => Math.min(2, (prev || previewScale) + 0.1))} className="p-1 hover:bg-white rounded-md text-slate-500 transition-all"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-3 flex justify-center items-start scrollbar-hide" ref={previewContainerRef}>
                <div id="resume-preview-content" className="w-full max-w-[850px] bg-white shrink-0 origin-top shadow-xl" style={{ transform: `scale(${manualScale || previewScale})` }}>
                  <ResumePreview content={resume.content as ResumeContent} templateType={resume.templateType || 'modern-professional'} settings={resume.settings} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 ATS PANEL — replaces preview column on desktop (no 4-col overflow), fullscreen on mobile */}
        <AnimatePresence>
          {(mobileView === 'ats' || showAtsPanel) && (
            <motion.div 
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className={cn(
                "print:hidden bg-white border-l border-slate-200 flex-col shrink-0",
                mobileView === 'ats' ? "fixed inset-0 w-full h-full pb-24 overflow-y-auto flex z-[90]" : "hidden lg:flex lg:w-[400px] xl:w-[440px] overflow-y-auto"
              )}
            >
              <div className="p-6 md:p-8 border-b border-slate-100 space-y-6 bg-slate-50/50 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600">
                      <Search className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">ATS Intelligence</h3>
                  </div>
                  {/* Close button for ATS Panel on Desktop */}
                  <button onClick={() => setShowAtsPanel(false)} className="hidden lg:block p-2 text-slate-400 hover:text-slate-600 bg-white rounded-lg border border-slate-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Job Description</p>
                  <textarea 
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here..."
                    className="w-full h-32 bg-white border border-slate-200 rounded-2xl p-4 text-xs font-medium text-slate-600 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none leading-relaxed shadow-inner"
                  />
                </div>
                
                <button
                  onClick={() => runAnalysis()}
                  disabled={analyzing}
                  className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  Scan Job Match
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-white">
                <AnimatePresence mode="wait">
                  {atsAnalysis ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Match Score</p>
                          <p className="text-4xl font-black text-slate-900 tracking-tighter">{atsAnalysis.score}%</p>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }} animate={{ width: `${atsAnalysis.score}%` }} transition={{ duration: 1, ease: "easeOut" }}
                            className={cn("h-full transition-all duration-1000", atsAnalysis.score >= 80 ? "bg-emerald-500" : atsAnalysis.score >= 50 ? "bg-amber-500" : "bg-red-500")} 
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Missing Keywords</p>
                        <div className="flex flex-wrap gap-2">
                          {(atsAnalysis.missingKeywords || []).length > 0 ? atsAnalysis.missingKeywords.map((kw: string, i: number) => (
                            <span key={i} className="text-[10px] font-bold bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100">{kw}</span>
                          )) : <span className="text-xs text-emerald-600 font-medium">Looking great! No major keywords missing.</span>}
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">How to improve</p>
                        <div className="space-y-3">
                          <div className="flex gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            <p className="text-xs font-medium text-emerald-800/80 leading-relaxed uppercase tracking-tighter">Include {atsAnalysis.missingKeywords?.slice(0, 3).join(', ') || 'more relevant keywords'} naturally in your experience descriptions.</p>
                          </div>
                          <div className="flex gap-3 p-3 bg-blue-50 rounded-2xl border border-blue-100">
                            <Lightbulb className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                            <p className="text-xs font-medium text-brand-800/80 leading-relaxed uppercase tracking-tighter">Use a standard layout and common section headings for better parsing.</p>
                          </div>
                          <div className="flex gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                            <Activity className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-xs font-medium text-amber-800/80 leading-relaxed uppercase tracking-tighter">Quantify your achievements with numbers to stand out from other candidates.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-10">
                      <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
                        <Info className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-bold text-slate-900">No Analysis Yet</p>
                      <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                        Paste a job description and scan to see how your resume matches.
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* 🌟 NAYA FULL WINDOW PREVIEW MODAL 🌟 */}
      <AnimatePresence>
        {isPreviewMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-900/95 backdrop-blur-md flex flex-col"
          >
            <div className="h-16 px-6 md:px-10 flex items-center justify-between bg-slate-900/50 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400">
                  <Eye className="w-4 h-4" />
                </div>
                <h3 className="text-white font-bold tracking-widest uppercase text-sm hidden sm:block">Full Window Preview</h3>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center bg-white/5 rounded-lg border border-white/10 p-1">
                  <button onClick={() => setManualScale(prev => Math.max(0.2, (prev || 1) - 0.1))} className="p-1.5 hover:bg-white/10 rounded text-slate-300 transition-all"><Minus className="w-4 h-4" /></button>
                  <span className="px-3 text-xs font-bold text-slate-300">{Math.round((manualScale || 1) * 100)}%</span>
                  <button onClick={() => setManualScale(prev => Math.min(2, (prev || 1) + 0.1))} className="p-1.5 hover:bg-white/10 rounded text-slate-300 transition-all"><Plus className="w-4 h-4" /></button>
                </div>

                <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-lg shadow-brand-500/20">
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download PDF</span>
                </button>
                
                <button onClick={() => setIsPreviewMode(false)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-xs font-bold transition-all">
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-10 flex justify-center items-start scrollbar-hide">
              <motion.div 
                initial={{ y: 30, scale: 0.95 }} animate={{ y: 0, scale: 1 }} transition={{ delay: 0.1, type: "spring", damping: 25 }}
                className="w-full max-w-[850px] bg-white shadow-2xl shrink-0"
                style={{ transform: `scale(${manualScale || 1})`, transformOrigin: 'top center' }}
              >
                <ResumePreview content={resume.content as ResumeContent} templateType={resume.templateType || 'modern-professional'} settings={resume.settings} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Cropping Modal */}
      <AnimatePresence>
        {showCropModal && cropImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Adjust Photo</h3>
                    <p className="text-xs text-slate-500 font-medium tracking-tight">Drag and zoom to fit perfectly in the resume.</p>
                  </div>
                </div>
                <button onClick={() => setShowCropModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="relative h-[400px] w-full bg-slate-100">
                <Cropper
                  image={cropImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="round"
                  showGrid={false}
                />
              </div>

              <div className="p-8 space-y-8 bg-white">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Zoom Level</label>
                    <span className="text-xs font-black text-brand-600">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowCropModal(false)}
                    className="flex-1 py-4 px-6 rounded-2xl bg-slate-50 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-all border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCroppedImage}
                    className="flex-1 py-4 px-6 rounded-2xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Apply Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Magic Fill Modal */}
      <AnimatePresence>
        {isAiModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">AI Magic Fill</h3>
                    <p className="text-sm text-slate-500">Describe your career, and I'll build your resume.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Professional Story</p>
                    <button onClick={() => setAiPrompt("I am a software engineer with 5 years of experience in React and Node.js. I have worked on e-commerce platforms and fintech apps. I graduated from IIT Bombay with a B.Tech in Computer Science.")} className="text-[9px] font-bold text-brand-600 hover:underline">
                      Try Sample Prompt
                    </button>
                  </div>
                  <textarea 
                    value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                    placeholder="e.g. I am a Senior Frontend Developer with 8 years of experience in React, TypeScript and Node.js..."
                    className="w-full h-48 bg-slate-50 border border-slate-100 rounded-2xl p-6 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none leading-relaxed"
                  />
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setIsAiModalOpen(false)} className="flex-1 px-6 py-4 rounded-2xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                  <button onClick={handleAiGenerate} disabled={isGenerating || !aiPrompt.trim()} className="flex-[2] px-6 py-4 bg-brand-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-brand-200 hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                    {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</> : <><Wand2 className="w-5 h-5" /> Generate Content</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ Enhanced Import Modal — Upload → See Extracted Text → Auto-fill */}
      <AnimatePresence>
        {isImportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-6"
            onClick={(e) => e.target === e.currentTarget && setIsImportModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 24 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-brand-50/30 rounded-t-3xl shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-600/30">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Import Resume</h3>
                    <p className="text-[11px] font-medium text-slate-500">Upload PDF/photo or paste text — AI extracts and fills your form</p>
                  </div>
                </div>
                <button onClick={() => { setIsImportModalOpen(false); setImportStep('idle'); setExtractedText(''); setImportText(''); }}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Step 1: Upload zone */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[9px] flex items-center justify-center font-black">1</span>
                    Upload or Paste Your Resume
                  </p>

                  {/* Drag-drop / click upload */}
                  <label className={cn(
                    "flex flex-col items-center justify-center gap-3 w-full py-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all group",
                    importStep === 'extracting' ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-brand-400 hover:bg-brand-50/40"
                  )}>
                    {importStep === 'extracting' ? (
                      <>
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                        <p className="text-sm font-bold text-brand-600">Extracting text from your file...</p>
                        <p className="text-[11px] text-brand-400">AI is reading your resume</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-brand-100 group-hover:bg-brand-200 rounded-2xl flex items-center justify-center transition-colors">
                          <Upload className="w-6 h-6 text-brand-600" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-700">Drop PDF or photo here</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">PDF, JPG, PNG, WEBP supported</p>
                        </div>
                        <span className="px-4 py-1.5 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md">Choose File</span>
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      disabled={importStep === 'extracting'}
                      accept=".pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        e.target.value = '';
                        setImportStep('extracting');
                        setExtractedText('');
                        try {
                          let text = '';
                          if (file.type === 'application/pdf') {
                            const { getDocument } = await import('pdfjs-dist');
                            const arrayBuffer = await file.arrayBuffer();
                            const pdf = await getDocument(new Uint8Array(arrayBuffer)).promise;
                            for (let i = 1; i <= pdf.numPages; i++) {
                              const page = await pdf.getPage(i);
                              const content = await page.getTextContent();
                              text += content.items.map((item: any) => item.str).join(' ') + '\n';
                            }
                          } else {
                            // For images just use base64 + Gemini vision for text extraction
                            const { parseResumeFromImage } = await import('../services/aiService');
                            const base64 = await new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(reader.result as string);
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            });
                            // Use parseResumeFromImage to get structured data and show as JSON for review
                            const parsed = await parseResumeFromImage(base64, file.type || 'image/jpeg');
                            text = JSON.stringify(parsed, null, 2);
                          }
                          setExtractedText(text);
                          setImportStep('review');
                        } catch (err: any) {
                          alert(`Extraction failed: ${err.message}. Try pasting the text instead.`);
                          setImportStep('idle');
                        }
                      }}
                    />
                  </label>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] font-bold text-slate-400">OR PASTE TEXT DIRECTLY</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                </div>

                {/* Step 2: Extracted / pasted text review box */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className={cn("w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-black",
                      importStep === 'review' ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500")}>2</span>
                    Review Extracted Text
                    {importStep === 'review' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-bold">✓ Ready</span>}
                  </p>
                  <textarea
                    value={extractedText || importText}
                    onChange={(e) => { setExtractedText(e.target.value); setImportStep(e.target.value ? 'review' : 'idle'); }}
                    placeholder="Extracted text will appear here after upload, or paste your resume text directly..."
                    className="w-full h-52 bg-slate-50 border-2 border-slate-100 focus:border-brand-400 rounded-2xl p-4 text-xs font-mono text-slate-700 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all resize-none leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400">You can edit the text above before auto-filling your form.</p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50/50 rounded-b-3xl">
                <button onClick={() => { setIsImportModalOpen(false); setImportStep('idle'); setExtractedText(''); setImportText(''); }}
                  className="px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const text = extractedText || importText;
                    if (!text.trim()) return;
                    setImportStep('filling');
                    setIsImporting(true);
                    try {
                      let parsedContent: any = null;
                      // If it looks like JSON (from image extraction), parse directly
                      try { parsedContent = JSON.parse(text); } catch { /* not JSON */ }
                      if (!parsedContent?.personalInfo) {
                        const { parseResumeText } = await import('../services/aiService');
                        parsedContent = await parseResumeText(text);
                      }
                      if (parsedContent?.personalInfo) {
                        setResume(prev => ({ ...prev, content: { ...INITIAL_CONTENT, ...parsedContent } }));
                        setActiveSection('personal');
                        setShowAtsPanel(true);
                        if (jobDescription.trim()) setTimeout(() => runAnalysis(parsedContent), 500);
                        setImportSuccessMsg(`✅ Imported! ${parsedContent.personalInfo.fullName ? `Welcome, ${parsedContent.personalInfo.fullName}!` : 'Form filled.'}`);
                        setTimeout(() => setImportSuccessMsg(null), 5000);
                        setIsImportModalOpen(false);
                        setExtractedText('');
                        setImportText('');
                        setImportStep('idle');
                      } else {
                        throw new Error('Could not extract resume data. Please try a clearer document.');
                      }
                    } catch (err: any) {
                      alert(`Fill failed: ${err.message}`);
                      setImportStep('review');
                    } finally {
                      setIsImporting(false);
                    }
                  }}
                  disabled={isImporting || (!extractedText.trim() && !importText.trim())}
                  className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isImporting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Filling Form...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" />
                      <span className="flex flex-col leading-none text-left">
                        <span>Auto-fill Form</span>
                        <span className="text-[9px] font-normal opacity-80">Step 3 — AI parses & fills all fields</span>
                      </span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}

function Input({ label, value, onChange, placeholder, error, suggestions }: { label: string, value: string | undefined, onChange: (v: string) => void, placeholder?: string, error?: string, suggestions?: string[] }) {
  const listId = `suggestions-${label.replace(/\s+/g, '-').toLowerCase()}`;
  
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <input 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder}
        list={suggestions ? listId : undefined}
        autoComplete={suggestions ? "on" : "off"}
        className={cn("w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-medium text-slate-700 placeholder-slate-300 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all duration-300 shadow-sm", error ? "border-red-500" : "border-slate-200")}
      />
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((s, i) => <option key={i} value={s} />)}
        </datalist>
      )}
      {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
    </div>
  );
}

function ProTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
      <Lightbulb className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
      <p className="text-sm font-medium text-brand-800/80 leading-relaxed">
        <span className="font-bold text-brand-700">Tip:</span> {children}
      </p>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}