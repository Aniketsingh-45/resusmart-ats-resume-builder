import React, { useState, useEffect, useDeferredValue, useMemo, useCallback, useRef } from 'react';
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
  FileText, GraduationCap, Eye, Edit3, Briefcase, Lightbulb, Lock, Upload, Github, Linkedin, Activity, Target, TrendingUp, AlertCircle, Camera, Award,
  Zap, Maximize2, Columns, Rows, Check
} from 'lucide-react';
import { ResumePreview } from './ResumePreview';
import Cropper, { Point, Area } from 'react-easy-crop';
import { cn } from '../utils/cn';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { ANIKET_RESUME_CONTENT, ANIKET_RESUME_SETTINGS } from '../data/aniketResumePreset';

interface ResumeEditorProps {
  resumeId: string | null;
  initialTemplate?: string;
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

const SUMMARY_PRESETS = [
  {
    role: '🚀 Full Stack Engineer',
    text: 'Results-driven Full Stack Engineer with 4+ years of experience architecting high-throughput distributed systems, scalable React/Node.js web applications, and resilient REST/GraphQL APIs. Proven track record in optimizing cloud latency and accelerating sprint delivery.'
  },
  {
    role: '🤖 AI / ML Engineer',
    text: 'Innovative Machine Learning Engineer specializing in LLM integration, deep learning pipelines, and predictive analytics with PyTorch and Python. Experienced in deploying scalable AI models to cloud infrastructure with 99.9% uptime.'
  },
  {
    role: '☁️ DevOps & Cloud Architect',
    text: 'DevOps & Cloud Infrastructure Architect with deep expertise in AWS, Kubernetes, Terraform, and automated CI/CD pipelines. Dedicated to achieving high availability, robust cloud security, and zero-downtime deployments.'
  },
  {
    role: '📊 Data Scientist / Analyst',
    text: 'Analytical Data Scientist with strong prowess in Python, SQL, statistical modeling, and BI dashboards. Passionate about transforming multi-terabyte datasets into revenue-generating business strategies.'
  },
  {
    role: '📱 Frontend / UI Engineer',
    text: 'High-impact Frontend Engineer crafting 60fps responsive web apps and cross-platform mobile experiences with React, Next.js, and TypeScript. Obsessed with UX performance and clean UI design systems.'
  },
  {
    role: '💼 Product / Tech Manager',
    text: 'Strategic Technical Product Manager bridging business vision with agile engineering execution. Skilled in roadmap planning, cross-functional leadership, and delivering customer-centric SaaS products.'
  },
  {
    role: '🎓 Graduate / Entry Level',
    text: 'High-achieving Computer Science graduate with solid foundations in data structures, algorithms, and full-stack development. Passionate about software engineering excellence and scalable codebases.'
  }
];

const ACTION_VERBS = ['Architected', 'Spearheaded', 'Engineered', 'Optimized', 'Automated', 'Delivered', 'Scaled', 'Accelerated', 'Redesigned', 'Mentored'];

const STAR_BULLETS = [
  'Architected a microservices backend in Node.js & Go, handling 2M+ daily requests with 99.98% uptime.',
  'Optimized PostgreSQL database queries and Redis cache, reducing server response latency by 45%.',
  'Built end-to-end CI/CD automation pipelines using GitHub Actions, decreasing deployment cycle time by 60%.',
  'Spearheaded frontend migration to Next.js and TypeScript, improving Core Web Vitals score from 62 to 98.',
  'Mentored and led a cross-functional team of 6 engineers across bi-weekly agile sprint deliverables.',
  'Refactored AWS cloud architecture, cutting monthly infrastructure expenditures by 30% ($8,000/month).',
  'Implemented OAuth 2.0, JWT authentication, and RBAC security protocols across all user-facing endpoints.'
];

const SKILL_BUNDLES = [
  {
    name: '🌐 Frontend Stack',
    skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Redux Toolkit', 'HTML5/CSS3', 'GraphQL', 'Vite']
  },
  {
    name: '⚙️ Backend & API',
    skills: ['Node.js', 'Python', 'Express.js', 'Go', 'FastAPI', 'Java', 'Spring Boot', 'REST APIs', 'gRPC']
  },
  {
    name: '🗄️ Databases & Storage',
    skills: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'DynamoDB', 'Supabase', 'Firebase', 'Prisma ORM']
  },
  {
    name: '☁️ Cloud & DevOps',
    skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD (GitHub Actions)', 'Linux / Bash', 'GCP', 'Nginx']
  },
  {
    name: '🤖 AI & Data Science',
    skills: ['PyTorch', 'TensorFlow', 'OpenAI API', 'LangChain', 'Pandas', 'NumPy', 'Scikit-Learn', 'LLMs']
  },
  {
    name: '🛠️ Tools & Core',
    skills: ['Git & GitHub', 'Agile / Scrum', 'System Design', 'Microservices', 'Jest / Testing', 'Figma', 'Jira']
  },
  {
    name: '💡 Leadership & Soft',
    skills: ['Technical Leadership', 'Problem Solving', 'Cross-Functional Collaboration', 'Critical Thinking']
  }
];

const PROJECT_PRESETS = [
  {
    name: 'ResuSmart AI – Intelligent ATS Resume Builder',
    description: 'Engineered an AI-powered resume builder and real-time ATS keyword optimization platform with live PDF rendering.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Google Gemini AI', 'Firebase'],
    link: 'github.com/yourname/resusmart',
    keyFeatures: [
      'Engineered real-time ATS score analyzer scoring keyword match against pasted job descriptions',
      'Developed 10 pixel-perfect responsive resume templates with instant print-to-PDF compilation',
      'Integrated Google Gemini Vision AI for automated resume extraction from uploaded PDF/image scans'
    ]
  },
  {
    name: 'CloudSync – Real-Time Collaborative Workspace',
    description: 'High-performance collaborative document and code editor supporting real-time multi-cursor synchronization.',
    technologies: ['Next.js', 'WebSockets', 'Node.js', 'Redis', 'Docker'],
    link: 'github.com/yourname/cloudsync',
    keyFeatures: [
      'Implemented Operational Transformation (OT) algorithm achieving sub-50ms sync latency for 50+ concurrent users',
      'Architected distributed Redis pub/sub messaging layer with automatic fallback reconnection',
      'Containerized microservices via Docker and automated deployments using GitHub Actions CI/CD'
    ]
  },
  {
    name: 'OmniStore – Distributed E-Commerce Microservices',
    description: 'Scalable distributed e-commerce backend with resilient inventory locking and payment integration.',
    technologies: ['Node.js', 'PostgreSQL', 'Docker', 'Stripe API', 'Redis'],
    link: 'github.com/yourname/omnistore',
    keyFeatures: [
      'Designed ACID-compliant transactional checkout pipeline handling concurrent flash-sale demand',
      'Integrated Stripe Webhooks with exponential backoff retry queue for 100% payment reconciliation',
      'Reduced database read overhead by 55% using Redis write-through caching architecture'
    ]
  }
];

const CERTIFICATION_PRESETS = [
  'AWS Certified Solutions Architect – Associate',
  'Certified Kubernetes Administrator (CKA)',
  'Google Cloud Professional Cloud Architect',
  'Microsoft Certified: Azure Solutions Architect Expert',
  'HashiCorp Certified: Terraform Associate',
  'Meta Front-End Developer Professional Certificate',
  'DeepLearning.AI Machine Learning Specialization',
  'CompTIA Security+ (SY0-701)',
  'Oracle Certified Professional: Java SE Developer',
  'Certified ScrumMaster (CSM)'
];

const DECLARATION_PRESETS = [
  {
    label: '🏢 Corporate Standard',
    text: 'I hereby declare that all the information furnished above is true, complete, and correct to the best of my knowledge and belief.'
  },
  {
    label: '🎓 Campus Placement',
    text: 'I solemnly declare that the particulars given above are correct and authentic, and I shall produce original certificates upon request.'
  },
  {
    label: '🌍 International Format',
    text: 'I certify that all statements made in this resume are true, complete, and correct to the best of my knowledge.'
  },
  {
    label: '🏛️ Government & PSU',
    text: 'I hereby declare that all statements made in this application are true, complete and correct to the best of my knowledge and belief. In the event of any information being found false, my candidature is liable to be cancelled.'
  }
];

const ATS_PALETTES = [
  { name: 'Executive Oxford Navy', color: '#1e3a8a', atsScore: '100% Contrast', tag: 'Top Corporate Pick' },
  { name: 'Slate Charcoal', color: '#0f172a', atsScore: '100% Monochrome', tag: 'Universal Standard' },
  { name: 'Royal Sapphire', color: '#2563eb', atsScore: '99% Clean ATS', tag: 'Modern Tech Leader' },
  { name: 'Forest Emerald', color: '#065f46', atsScore: '99% High Contrast', tag: 'Clean Executive' },
  { name: 'Classic Burgundy', color: '#831843', atsScore: '98% High Contrast', tag: 'Finance & Legal' },
  { name: 'Teal Pro', color: '#0f766e', atsScore: '98% Readability', tag: 'Engineering & Data' },
  { name: 'Cosmic Indigo', color: '#4f46e5', atsScore: '98% Crisp Tech', tag: 'Product & SaaS' },
  { name: 'Steel Slate', color: '#334155', atsScore: '99% Standard', tag: 'Universal Clean' }
];

const templates = [
  { id: 'classic-chronological', name: 'Classic Chronological', icon: FileText, color: 'slate', atsRating: 100, tag: '100% ATS Gold Standard', category: 'Universal Single-Column', filterGroup: 'ats-100', recommendedFor: 'Enterprise, Tech, Finance & All ATS Parsers' },
  { id: 'ats-harvard-ivy', name: 'Harvard / Ivy Executive', icon: Award, color: 'slate', atsRating: 100, tag: '100% ATS Executive Pick', category: 'Classic Serif Single-Column', filterGroup: 'ats-100', recommendedFor: 'FAANG, Wall Street, Consulting & Grad Roles' },
  { id: 'ats-jake-clean', name: 'SWE Clean Pro (100% ATS)', icon: Zap, color: 'indigo', atsRating: 100, tag: '100% Engineer Standard', category: 'High-Density Tech Single', filterGroup: 'ats-100', recommendedFor: 'Software Engineers, AI/ML & CS Students' },
  { id: 'minimalist-clean', name: 'Minimalist Clean', icon: CheckCircle2, color: 'slate', atsRating: 100, tag: '100% Zero-Parsing Glitch', category: 'Text-First Minimal', filterGroup: 'ats-100', recommendedFor: 'Law, Academia, Product & Global Roles' },
  { id: 'modern-professional', name: 'Modern Dark Sidebar', icon: Sparkles, color: 'brand', atsRating: 99, tag: '99% ATS Split Pro', category: 'Dark Sidebar Split', filterGroup: 'split', recommendedFor: 'Software Engineers, Product & Data' },
  { id: 'executive-pro', name: 'Executive Pro Header', icon: TrendingUp, color: 'slate', atsRating: 99, tag: '99% Leadership ATS', category: 'Executive Banner', filterGroup: 'split', recommendedFor: 'Staff / Principal Leads, VPs & Directors' },
  { id: 'tech-focused', name: 'Tech & Terminal Pro', icon: Search, color: 'emerald', atsRating: 98, tag: '98% Tech ATS Standard', category: 'Monospace Tech', filterGroup: 'ats-100', recommendedFor: 'Cloud DevOps, Backend & AI Developers' },
  { id: 'student-entry', name: 'Student / Entry-Level', icon: GraduationCap, color: 'emerald', atsRating: 98, tag: '98% Campus ATS Standard', category: 'Education Priority', filterGroup: 'split', recommendedFor: 'Freshers, Interns & Graduates' },
  { id: 'executive-minimal', name: 'Executive Minimal', icon: Briefcase, color: 'indigo', atsRating: 97, tag: '97% Clean Hierarchy', category: 'Compact Professional', filterGroup: 'creative', recommendedFor: 'Consulting, Operations & Management' },
  { id: 'creative-vibrant', name: 'Creative Vibrant', icon: Wand2, color: 'violet', atsRating: 95, tag: '95% Modern ATS Accent', category: 'Modern Vibrant Split', filterGroup: 'creative', recommendedFor: 'Designers, Product & Growth' },
  { id: 'modern-creative', name: 'Modern Creative Story', icon: Sparkles, color: 'brand', atsRating: 94, tag: '94% Portfolio Layout', category: 'Visual Accent', filterGroup: 'creative', recommendedFor: 'Startups, Agencies & Marketing' },
  { id: 'modern-photo', name: 'Executive Photo Pro', icon: User, color: 'brand', atsRating: 93, tag: '93% International CV', category: 'Photo Sidebar', filterGroup: 'split', recommendedFor: 'International CVs & Media Roles' },
];

export function ResumeEditor({ resumeId, initialTemplate, onBack }: ResumeEditorProps) {
  const { isDark } = useTheme();
  const [resume, setResume] = useState<Partial<Resume>>({
    title: 'New Resume',
    templateType: initialTemplate || 'classic-chronological',
    content: INITIAL_CONTENT,
    settings: {
      primaryColor: '#2563eb',
      fontFamily: 'Inter',
      fontSize: 'small',
      spacing: 'compact',
      margins: 'compact',
      projectLayout: 'grid',
      fitToOnePage: true
    },
    atsScore: 0
  });

  const [liveFitScale, setLiveFitScale] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  const deferredContent = useDeferredValue(resume.content);
  const deferredSettings = useDeferredValue(resume.settings);
  const deferredTemplate = useDeferredValue(resume.templateType);

  // Idle-debounced print snapshot keeps offscreen print tree at 0% CPU while editing/typing
  const [printSnapshot, setPrintSnapshot] = useState(resume);
  useEffect(() => {
    const id = setTimeout(() => setPrintSnapshot(resume), 600);
    return () => clearTimeout(id);
  }, [resume]);

  const [templateFilter, setTemplateFilter] = useState<'all' | 'ats-100' | 'split' | 'creative'>('all');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newCertInput, setNewCertInput] = useState('');
  const [techDrafts, setTechDrafts] = useState<Record<string, string>>({});

  const handleAutoFitOnePage = () => {
    setResume(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        fitToOnePage: true,
        fontSize: 'tiny',
        spacing: 'ultra-compact',
        margins: 'compact',
        projectLayout: (prev.content?.projects?.length || 0) >= 4 ? 'grid' : (prev.settings?.projectLayout || 'single')
      }
    }));
    setImportSuccessMsg('⚡ Single-Page Mode active! Width expanded & layout tuned for 1 page.');
    setTimeout(() => setImportSuccessMsg(null), 5000);
  };

  const handleLoadAniketResume = () => {
    setResume(prev => ({
      ...prev,
      title: 'Aniket Singh - 1-Page ATS Resume',
      templateType: 'classic-chronological',
      content: ANIKET_RESUME_CONTENT,
      settings: ANIKET_RESUME_SETTINGS,
      atsScore: 98
    }));
    setActiveSection('personal');
    setImportSuccessMsg('📄 Loaded Aniket Singh’s ATS Resume with all 6 projects fitted to 1 page!');
    setTimeout(() => setImportSuccessMsg(null), 5000);
  };
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
      
      const scaleWidth = availableWidth / 800;
      const scaleHeight = availableHeight / 1125;
      
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
  }, [isPreviewMode, resume.templateType, showLivePreview, manualScale, mobileView, showAtsPanel]);

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

  useEffect(() => {
    if (resumeId) {
      const fetchResume = async () => {
        if (!auth.currentUser || resumeId.startsWith('guest_')) {
          try {
            const raw = localStorage.getItem('resusmart_guest_resumes');
            const list: Resume[] = raw ? JSON.parse(raw) : [];
            const found = list.find(r => r.id === resumeId);
            if (found) {
              setResume({
                ...found,
                settings: {
                  primaryColor: '#2563eb',
                  fontFamily: 'Inter',
                  fontSize: 'small',
                  spacing: 'compact',
                  margins: 'compact',
                  projectLayout: 'grid',
                  ...found.settings,
                  fitToOnePage: found.settings?.fitToOnePage ?? true,
                }
              });
            }
          } catch {}
          setLoading(false);
          return;
        }
        const docRef = doc(db, 'resumes', resumeId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Resume;
          const currentViews = data.views || 0;
          await setDoc(docRef, { views: currentViews + 1 }, { merge: true });
          setResume({
            id: docSnap.id,
            ...data,
            views: currentViews + 1,
            settings: {
              primaryColor: '#2563eb',
              fontFamily: 'Inter',
              fontSize: 'small',
              spacing: 'compact',
              margins: 'compact',
              projectLayout: 'grid',
              ...data.settings,
              fitToOnePage: data.settings?.fitToOnePage ?? true,
            }
          });
        }
        setLoading(false);
      };
      fetchResume();
    }
  }, [resumeId]);

  const handleAiGenerate = async (customPrompt?: string) => {
    const promptToUse = (typeof customPrompt === 'string' ? customPrompt : aiPrompt).trim();
    if (!promptToUse) return;
    setIsGenerating(true);
    try {
      const generatedContent = await generateResumeContent(promptToUse);
      if (generatedContent && generatedContent.personalInfo) {
        setResume(prev => ({
          ...prev,
          title: (!prev.title || prev.title === 'Untitled Resume')
            ? `${generatedContent.personalInfo.fullName || promptToUse} - Resume`
            : prev.title,
          content: {
            ...INITIAL_CONTENT,
            ...generatedContent,
            declaration: generatedContent.declaration || prev.content?.declaration || ''
          }
        }));
        setActiveSection('personal');
        setIsAiModalOpen(false);
        setAiPrompt('');
        setImportSuccessMsg(`✨ AI Generated Resume for "${promptToUse}" loaded!`);
        setTimeout(() => setImportSuccessMsg(null), 5000);
      }
    } catch (error) {
      console.error("AI Generation failed", error);
      alert("AI Generation encountered an issue. Please try again or select a preset.");
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

  // Sync print state with browser native print (Ctrl+P or PDF export)
  useEffect(() => {
    const handleBeforePrint = () => {
      setIsPrinting(true);
      if (resume.settings?.fitToOnePage !== false) {
        document.body.classList.add('fit-one-page');
      }
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('fit-one-page');
      setIsPrinting(false);
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [resume.settings?.fitToOnePage]);

  const handleDownloadPdf = async () => {
    incrementDownloads();
    const originalTitle = document.title;
    const candidateName = (resume.content?.personalInfo?.fullName?.trim() || 'Resume').replace(/\s+/g, '_');
    document.title = `${candidateName}_Resume`;
    setIsPrinting(true);
    if (resume.settings?.fitToOnePage !== false) {
      document.body.classList.add('fit-one-page');
    } else {
      document.body.classList.remove('fit-one-page');
    }

    // Wait two frames so offscreen #print-resume-root flushes latest edits & calibrates 1-page scale identically
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        setTimeout(() => {
          document.body.classList.remove('fit-one-page');
          document.title = originalTitle;
          setIsPrinting(false);
        }, 600);
      });
    });
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
    setSaving(true);
    try {
      if (!auth.currentUser) {
        const id = resumeId || resume.id || `guest_${Date.now()}`;
        const guestData: Resume = {
          ...(resume as Resume),
          id,
          userId: 'guest-preview',
          updatedAt: new Date().toISOString(),
          version: (resume.version || 0) + 1
        };
        const raw = localStorage.getItem('resusmart_guest_resumes');
        const list: Resume[] = raw ? JSON.parse(raw) : [];
        const existsIdx = list.findIndex(r => r.id === id);
        if (existsIdx >= 0) list[existsIdx] = guestData;
        else list.unshift(guestData);
        localStorage.setItem('resusmart_guest_resumes', JSON.stringify(list));
        setResume(guestData);
        window.dispatchEvent(new Event('resusmart_guest_updated'));
        setImportSuccessMsg('✅ Resume saved locally in Guest Mode!');
        setTimeout(() => setImportSuccessMsg(null), 3500);
        return;
      }

      const id = resumeId || resume.id || doc(collection(db, 'resumes')).id;
      const data = {
        ...resume,
        id,
        userId: auth.currentUser.uid,
        updatedAt: new Date().toISOString(),
        version: (resume.version || 0) + 1
      };
      await setDoc(doc(db, 'resumes', id), data);
      setResume(data);
      setImportSuccessMsg('✅ Resume Saved Successfully!');
      setTimeout(() => setImportSuccessMsg(null), 3500);
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
    <div className="h-full flex flex-col items-center justify-center gap-4" style={{background:'#060811'}}>
      <div className="w-12 h-12 border-[3px] border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
      <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Initializing Studio...</p>
    </div>
  );

  return (
    <div className={`h-full flex flex-col print:bg-none print:bg-white print:overflow-visible print:h-auto overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#080c16] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* Import Success Toast */}
      {importSuccessMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-300 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-3 animate-bounce-in border border-white/20">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {importSuccessMsg}
        </div>
      )}
      
      {/* Studio Header */}
      <header className="print:hidden h-14 flex items-center justify-between px-3 md:px-5 shrink-0 z-50 sticky top-0 gap-2 transition-colors duration-200"
        style={{
          background: isDark ? '#0d111b' : '#ffffff',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.85)'}`,
          boxShadow: isDark ? '0 2px 14px rgba(0,0,0,0.30)' : '0 2px 10px rgba(15,23,42,0.04)',
        }}>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onBack}
            title="Back to Dashboard"
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'}`}
            style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(203,213,225,0.80)'}` }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="hidden sm:flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>Resume Studio</span>
              <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold font-mono" style={{ background: 'rgba(124,58,237,0.16)', border: '1px solid rgba(124,58,237,0.28)', color: '#7c3aed' }}>PRO</span>
            </div>
            <input
              value={resume.title}
              onChange={(e) => setResume(prev => ({ ...prev, title: e.target.value }))}
              className={`text-[10px] font-mono bg-transparent border-none focus:ring-0 p-0 transition-colors w-40 mt-0.5 outline-none font-semibold ${isDark ? 'text-slate-400 placeholder-slate-600 focus:text-violet-300' : 'text-slate-500 placeholder-slate-400 focus:text-violet-700'}`}
              placeholder="Untitled Resume"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Theme Switcher */}
          <ThemeToggle compact />

          {/* Preview toggle */}
          <button onClick={() => setIsPreviewMode(true)} title="Full Window Preview"
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${isDark ? 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10' : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'}`}
            style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(203,213,225,0.80)'}` }}>
            <Eye className="w-3.5 h-3.5 text-violet-500" /><span className="hidden xl:inline">Full Preview</span>
          </button>

          {/* Tips */}
          <button onClick={() => setShowSuggestions(!showSuggestions)} title="Writing Tips"
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-xl transition-colors"
            style={showSuggestions
              ? { background: 'rgba(251,191,36,0.20)', border: '1px solid rgba(251,191,36,0.40)', color: '#f59e0b' }
              : { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(241,245,249,0.90)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(203,213,225,0.80)'}`, color: isDark ? '#94a3b8' : '#64748b' }}>
            <Lightbulb className="w-3.5 h-3.5" />
          </button>

          <div className="hidden lg:block w-px h-5 mx-0.5" style={{ background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(203,213,225,0.80)' }} />

          {/* Quick 1-Page Mode Toggle */}
          <button 
            type="button"
            onClick={() => setResume(prev => ({
              ...prev,
              settings: {
                ...prev.settings,
                fitToOnePage: !prev.settings?.fitToOnePage,
                ...(prev.settings?.fitToOnePage ? {} : { margins: 'compact' })
              }
            }))} 
            title={resume.settings?.fitToOnePage ? "Single-Page Lock Active (Click to switch to multi-page)" : "Fit and Lock Resume to 1 Page"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-xs border",
              resume.settings?.fitToOnePage
                ? "bg-emerald-600/20 text-emerald-500 border-emerald-500/40"
                : isDark ? "bg-white/5 text-slate-400 border-white/10 hover:text-white" : "bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900"
            )}
          >
            <Zap className={cn("w-3.5 h-3.5", resume.settings?.fitToOnePage ? "text-emerald-400" : "text-amber-500")} />
            <span className="hidden sm:inline font-mono">{resume.settings?.fitToOnePage ? "1-Page: ON" : "Fit 1-Page"}</span>
          </button>

          {/* Sample 1-Page Resume (Aniket) */}
          <button
            type="button"
            onClick={handleLoadAniketResume}
            title="Load Aniket Singh's 1-Page ATS Resume with all 6 projects"
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${isDark ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 hover:bg-cyan-900/40' : 'text-cyan-800 bg-cyan-50 border border-cyan-200 hover:bg-cyan-100'}`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-500" />
            <span className="hidden xl:inline">Sample (Aniket)</span>
            <span className="xl:hidden">Sample</span>
          </button>

          {/* AI Optimize */}
          <button
            type="button"
            onClick={handleOptimizeResume}
            disabled={isOptimizing}
            title="Auto-Optimize Entire Resume with AI for ATS"
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${isDark ? 'text-amber-300 bg-amber-950/30 border border-amber-700/50 hover:bg-amber-900/40' : 'text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100'}`}
          >
            {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> : <Wand2 className="w-3.5 h-3.5 text-amber-500" />}
            <span className="hidden 2xl:inline">{isOptimizing ? 'Optimizing…' : 'ATS Optimize'}</span>
          </button>

          {/* ATS Score */}
          <button onClick={() => setShowAtsPanel(!showAtsPanel)} title="ATS Keyword Match Analysis"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-xs"
            style={showAtsPanel
              ? { background: 'rgba(124,58,237,0.20)', border: '1px solid rgba(124,58,237,0.40)', color: '#7c3aed' }
              : { background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(203,213,225,0.80)'}`, color: isDark ? '#cbd5e1' : '#334155' }
            }>
            <Activity className="w-3.5 h-3.5 text-cyan-500" />
            <span className="font-mono">{resume.atsScore || 0}%</span>
            <span className="hidden md:inline text-[10px] uppercase tracking-wider font-mono">ATS</span>
          </button>

          {/* AI Magic */}
          <button onClick={() => setIsAiModalOpen(true)} title="AI Auto-Fill with Job Description"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-colors hover:brightness-110 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: '1px solid rgba(255,255,255,0.16)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">AI Fill</span>
          </button>

          {/* Import */}
          <input ref={autoFillInputRef} type="file" className="hidden"
            accept=".pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff"
            onChange={handleResumeUpload} />
          <button onClick={() => setIsImportModalOpen(true)} disabled={isImporting} title="Import Existing Resume (PDF or Image)"
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${isDark ? 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10' : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'}`}
            style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(203,213,225,0.80)'}` }}>
            {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" /> : <Upload className="w-3.5 h-3.5" />}
          </button>

          {/* Save */}
          <button onClick={handleSave} disabled={saving} title="Save Changes"
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${isDark ? 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10' : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'}`}
            style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(203,213,225,0.80)'}` }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" /> : <Save className="w-3.5 h-3.5" />}
          </button>

          {/* Export Word */}
          <button onClick={handleDownloadDocx} title="Download Editable Word (.doc)"
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${isDark ? 'text-blue-300 bg-blue-950/40 border border-blue-800/50 hover:bg-blue-900/40' : 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100'}`}>
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">DOC</span>
          </button>

          {/* Export PDF */}
          <button onClick={handleDownloadPdf} title={resume.settings?.fitToOnePage ? "Download Single-Page PDF" : "Download PDF"}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-colors hover:brightness-110 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', border: '1px solid rgba(255,255,255,0.16)' }}>
            <Download className="w-3.5 h-3.5" />
            <span>{resume.settings?.fitToOnePage ? "1-Page PDF" : "PDF"}</span>
          </button>
        </div>
      </header>

      <div className={`flex-1 flex overflow-hidden flex-col lg:flex-row relative transition-colors duration-300 ${isDark ? 'bg-[#080c16]' : 'bg-slate-100'}`}>
        
        {/* Mobile floating view switcher */}
        <div className="lg:hidden fixed bottom-6 left-0 right-0 px-4 flex justify-center z-999 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl shadow-2xl"
            style={{
              background: isDark ? '#0d111b' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(124,58,237,0.20)'}`,
            }}>
            {(['edit', 'preview', 'ats'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setMobileView(v)}
                className="px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
                style={mobileView === v
                  ? { background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,0.40)' }
                  : { color: isDark ? '#94a3b8' : '#64748b' }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className={cn(
          "print:hidden w-full lg:w-56 xl:w-60 p-3 space-y-1 overflow-y-auto shrink-0 scrollbar-hide z-40 transition-colors duration-300",
          mobileView === 'edit' ? "flex flex-col" : "hidden lg:flex lg:flex-col"
        )}
          style={{
            background: isDark ? 'rgba(11,15,25,0.85)' : 'rgba(255,255,255,0.75)',
            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.80)'}`
          }}>
          <p className={`px-2 text-[10px] font-mono font-bold uppercase tracking-widest hidden lg:block pb-1 pt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sections</p>
          <div className="flex flex-wrap lg:flex-col gap-1 lg:gap-0.5 pb-2 lg:pb-0">
            {([
              { id: 'templates',      label: 'Templates',     icon: FileText,     color: ['rgba(124,58,237,0.15)','rgba(124,58,237,0.40)','#7c3aed'] },
              { id: 'personal',       label: 'Personal',      icon: User,         color: ['rgba(59,130,246,0.15)','rgba(59,130,246,0.40)','#2563eb'] },
              { id: 'summary',        label: 'Summary',       icon: Edit3,        color: ['rgba(6,182,212,0.15)','rgba(6,182,212,0.35)','#0891b2'] },
              { id: 'experience',     label: 'Experience',    icon: Briefcase,    color: ['rgba(16,185,129,0.15)','rgba(16,185,129,0.35)','#059669'] },
              { id: 'education',      label: 'Education',     icon: GraduationCap,color: ['rgba(245,158,11,0.15)','rgba(245,158,11,0.35)','#d97706'] },
              { id: 'skills',         label: 'Skills',        icon: Activity,     color: ['rgba(239,68,68,0.15)','rgba(239,68,68,0.35)','#dc2626'] },
              { id: 'projects',       label: 'Projects',      icon: Target,       color: ['rgba(168,85,247,0.15)','rgba(168,85,247,0.35)','#9333ea'] },
              { id: 'certifications', label: 'Certifications',icon: Award,        color: ['rgba(251,191,36,0.15)','rgba(251,191,36,0.35)','#b45309'] },
              { id: 'declaration',    label: 'Declaration',   icon: CheckCircle2, color: ['rgba(52,211,153,0.15)','rgba(52,211,153,0.35)','#047857'] },
              { id: 'settings',       label: 'Design',        icon: TrendingUp,   color: ['rgba(244,114,182,0.15)','rgba(244,114,182,0.35)','#db2777'] },
            ] as const).map(({ id, label, icon: Icon, color }) => {
              const isActive = activeSection === id && !isPreviewMode;
              return (
                <button
                  key={id}
                  onClick={() => { setActiveSection(id as any); setIsPreviewMode(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 text-left relative"
                  style={isActive
                    ? { background: color[0], border: `1px solid ${color[1]}` }
                    : { border: '1px solid transparent' }}
                  onMouseEnter={e => { if(!isActive) (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; }}
                  onMouseLeave={e => { if(!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={isActive
                      ? { background: color[1] }
                      : { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: isActive ? (isDark ? '#ffffff' : color[2]) : (isDark ? '#94a3b8' : '#64748b') }} />
                  </div>
                  <span className={`text-xs font-bold ${isActive ? (isDark ? 'text-white' : 'text-slate-900') : isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
                  {isActive && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: color[2] }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Profile strength */}
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.80)'}` }}>
            <div className="px-1">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Strength</span>
                <span className="text-[11px] font-mono font-bold text-violet-500">{calculateProfileStrength()}%</span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.80)' }}>
                <div
                  className="h-full rounded-full transition-[width] duration-300 ease-out"
                  style={{ width: `${calculateProfileStrength()}%`, background: 'linear-gradient(90deg, #7c3aed, #4f46e5, #0ea5e9)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Edit Area */}
        <div className={cn(
          "print:hidden overflow-y-auto p-4 md:p-5 lg:p-6 pb-32 lg:pb-8 flex-1 min-w-0",
          isPreviewMode ? "hidden" : (mobileView === 'edit' ? "block" : "hidden lg:block")
        )}
          style={{ background: isDark ? '#080b12' : '#f8fafc' }}>
          <div key={activeSection} className="max-w-2xl mx-auto space-y-5">
              
              {/* 🛡️ Real-time ATS Guidance Banner (Shown on filling tabs) */}
              {activeSection !== 'templates' && activeSection !== 'settings' && (
                <div className={`p-4 rounded-2xl border transition-all mb-2 ${isDark ? 'bg-indigo-950/20 border-indigo-500/25' : 'bg-indigo-50/70 border-indigo-100 shadow-xs'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-600 text-white shadow-md shadow-indigo-500/25 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>ATS Compliance Advisor</p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                            ★ {templates.find(t => t.id === resume.templateType)?.atsRating || 99}% ATS Score
                          </span>
                        </div>
                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Active layout: <span className="font-semibold text-indigo-500">{templates.find(t => t.id === resume.templateType)?.name}</span> • {templates.find(t => t.id === resume.templateType)?.category}
                        </p>
                      </div>
                    </div>

                    {/* Quick switch to 100% ATS templates */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>100% ATS:</span>
                      {[
                        { id: 'classic-chronological', label: 'Classic' },
                        { id: 'ats-harvard-ivy', label: 'Harvard Ivy' },
                        { id: 'ats-jake-clean', label: 'SWE Clean' },
                        { id: 'minimalist-clean', label: 'Minimal' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleTemplateSelect(t.id)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border ${resume.templateType === t.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs' : isDark ? 'bg-slate-900 text-slate-300 border-slate-800 hover:border-indigo-500/40' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'}`}
                        >
                          {t.label} {resume.templateType === t.id ? '✓' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'templates' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{fontFamily:'Outfit,Inter,sans-serif'}}>
                        ATS-Optimized Templates ({templates.length})
                      </h3>
                      <p className={`text-xs font-mono mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        All templates support 1-Page Auto-Fit, Width Expansion & 2-Column Project Grids
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'all', label: `All (${templates.length})` },
                        { id: 'ats-100', label: '100% ATS Star' },
                        { id: 'split', label: 'Split Sidebar' },
                        { id: 'creative', label: 'Executive & Visual' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setTemplateFilter(tab.id as any)}
                          className={cn(
                            'px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all border',
                            templateFilter === tab.id
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                              : isDark ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white' : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* ATS Info Card */}
                  <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${isDark ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                    <p className="text-xs leading-relaxed">
                      Selected layout updates your live resume & PDF download instantaneously — every color palette, font, spacing, margin & 2-column grid control works across 100% of templates.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {templates
                      .filter(t => templateFilter === 'all' || t.filterGroup === templateFilter)
                      .map((t) => {
                        const isSelected = resume.templateType === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleTemplateSelect(t.id)}
                            className={cn(
                              "p-4 rounded-2xl border-2 text-left transition-colors duration-150 group relative flex flex-col justify-between overflow-hidden hover:-translate-y-0.5",
                              isSelected
                                ? (isDark ? "border-emerald-500 bg-slate-900 shadow-lg ring-2 ring-emerald-500/25" : "border-indigo-600 bg-white shadow-md ring-2 ring-indigo-500/20")
                                : (isDark ? "border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900" : "border-slate-200 bg-white hover:border-indigo-400 hover:shadow-sm")
                            )}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                                    t.color === 'brand' ? "bg-indigo-600 text-white" :
                                    t.color === 'emerald' ? "bg-emerald-600 text-white" :
                                    t.color === 'violet' ? "bg-purple-600 text-white" :
                                    t.color === 'indigo' ? "bg-cyan-600 text-white" :
                                    "bg-slate-700 text-white"
                                  )}>
                                    <t.icon className="w-4 h-4" />
                                  </div>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold border",
                                    t.atsRating === 100
                                      ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                                      : t.atsRating >= 98
                                      ? "bg-indigo-500/15 text-indigo-500 border-indigo-500/30"
                                      : "bg-purple-500/15 text-purple-500 border-purple-500/30"
                                  )}>
                                    ★ {t.atsRating}% ATS
                                  </span>
                                </div>
                                {isSelected && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-500 text-white shadow-sm shrink-0">
                                    100% SELECTED ✓
                                  </span>
                                )}
                              </div>

                              {/* Interactive Color-Synced Mini Wireframe Thumbnail */}
                              <div className="mb-3">
                                <TemplateThumbnail id={t.id} accent={resume.settings?.primaryColor || '#2563eb'} />
                              </div>

                              <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.name}</h3>
                              <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.category}</p>
                              <p className="text-[10px] font-mono text-indigo-500 mt-1 line-clamp-1">Target: {t.recommendedFor}</p>
                            </div>
                            
                            <div className="mt-3 pt-2.5 border-t flex items-center justify-between" style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                              <span className={`text-[9.5px] font-mono font-bold uppercase tracking-wider ${isSelected ? 'text-emerald-500 font-black' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {isSelected ? 'Currently Active Layout ✓' : 'Click to Apply Layout'}
                              </span>
                              <ChevronRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${isSelected ? 'text-emerald-500' : 'text-slate-400'}`} />
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {activeSection === 'personal' && (
                <div className="space-y-4">
                  <div>
                    <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{fontFamily:'Outfit,Inter,sans-serif'}}>Personal Info</h3>
                    <p className={`text-xs font-mono mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>How recruiters and ATS algorithms will reach you</p>
                  </div>
                  <ProTip>Use a professional email. Include LinkedIn and GitHub profile links for maximum impact.</ProTip>

                  {/* ⚡ Quick Title & Role Presets */}
                  <div className="space-y-1.5">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>⚡ Quick Role Presets (Click to apply):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Full Stack Engineer', 'Frontend Developer', 'Backend Architect', 'DevOps & Cloud Engineer', 'Data Scientist', 'AI / ML Engineer', 'Product Manager', 'UI/UX Designer', 'QA Automation Engineer', 'Cybersecurity Analyst'].map((title) => (
                        <button
                          key={title}
                          type="button"
                          onClick={() => updateContent('personalInfo.jobTitle', title)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${resume.content?.personalInfo.jobTitle === title ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' : isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-indigo-500/50 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 shadow-xs'}`}
                        >
                          + {title}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Main info card */}
                  <div className={`p-5 rounded-2xl border space-y-5 transition-all ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden transition-all group/photo cursor-pointer"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
                            border: `2px dashed ${isDark ? 'rgba(255,255,255,0.10)' : '#cbd5e1'}`
                          }}>
                          {resume.content?.personalInfo.photo ? (
                            <img src={resume.content.personalInfo.photo} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-8 h-8" style={{color: isDark ? '#475569' : '#94a3b8'}} />
                          )}
                          <label className="absolute inset-0 flex flex-col items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-all duration-200 rounded-2xl" style={{background:'rgba(6,8,17,0.80)'}}>
                            <Camera className="w-4 h-4 mb-1" style={{color:'#a78bfa'}} />
                            <span className="text-[9px] font-bold font-mono uppercase tracking-wider" style={{color:'#a78bfa'}}>Upload</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) { const reader = new FileReader(); reader.onloadend = () => { setCropImage(reader.result as string); setShowCropModal(true); }; reader.readAsDataURL(file); }
                            }} />
                          </label>
                        </div>
                        {resume.content?.personalInfo.photo && (
                          <button onClick={() => updateContent('personalInfo.photo', '')}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full transition-all"
                            style={{background:'#dc2626',border:'2px solid #060811'}}>
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Profile Photo</p>
                            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Add a crisp headshot (auto-cropped to circle) for Photo Pro layouts.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsSocialSyncOpen(true)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all hover:scale-105 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-400'}`}
                          >
                            <Github className="w-3.5 h-3.5" />
                            <span>Sync GitHub / LinkedIn</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="Full Name" value={resume.content?.personalInfo.fullName} onChange={v => updateContent('personalInfo.fullName', v)} placeholder="Nikola Tesla" />
                      <Input
                        label="Professional Title"
                        value={resume.content?.personalInfo.jobTitle}
                        onChange={v => updateContent('personalInfo.jobTitle', v)}
                        placeholder="e.g. Senior ML Engineer"
                        suggestions={['Software Architect', 'Product Designer', 'Data Scientist', 'VP of Engineering', 'Creative Director', 'Full Stack Developer', 'Cloud & DevOps Architect']}
                      />
                      <Input label="Email Address" value={resume.content?.personalInfo.email} onChange={v => updateContent('personalInfo.email', v)} placeholder="you@domain.com" />
                      <Input label="Phone Number" value={resume.content?.personalInfo.phone} onChange={v => updateContent('personalInfo.phone', v)} placeholder="+91 99999 99999" />
                      <Input label="Location" value={resume.content?.personalInfo.location} onChange={v => updateContent('personalInfo.location', v)} placeholder="Mumbai, India" suggestions={['Remote / Global', 'Mumbai, India', 'Bangalore, India', 'Delhi, India', 'Hyderabad, India', 'Pune, India', 'San Francisco, CA', 'London, UK', 'Singapore', 'Berlin, Germany']} />
                      <Input label="LinkedIn Profile" value={resume.content?.personalInfo.linkedin} onChange={v => updateContent('personalInfo.linkedin', v)} placeholder="linkedin.com/in/yourname" />
                      <Input label="GitHub Profile" value={resume.content?.personalInfo.github} onChange={v => updateContent('personalInfo.github', v)} placeholder="github.com/yourusername" />
                      <Input label="Portfolio / Website" value={resume.content?.personalInfo.website} onChange={v => updateContent('personalInfo.website', v)} placeholder="yourportfolio.com" />
                    </div>
                  </div>

                  {/* Optional Details */}
                  <div className={`p-5 rounded-2xl border space-y-4 transition-all ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-amber-500" />
                      <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Optional Details <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>(for government/traditional formats)</span></p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <div className="space-y-2">
                        <label className={`block text-[10px] font-mono font-semibold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Languages Known</label>
                        <div className="flex flex-wrap gap-2 items-center">
                          {(resume.content?.personalInfo.languages || []).map((lang, i) => (
                            <div key={i} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 group/lang border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              <input
                                value={lang}
                                onChange={e => {
                                  const arr = [...(resume.content?.personalInfo.languages || [])];
                                  arr[i] = e.target.value;
                                  updateContent('personalInfo.languages', arr);
                                }}
                                className={`bg-transparent border-none text-xs font-semibold outline-none w-20 ${isDark ? 'text-white' : 'text-slate-900'}`}
                              />
                              <button onClick={() => {
                                const arr = (resume.content?.personalInfo.languages || []).filter((_, idx) => idx !== i);
                                updateContent('personalInfo.languages', arr);
                              }} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover/lang:opacity-100 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => updateContent('personalInfo.languages', [...(resume.content?.personalInfo.languages || []), ''])}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-dashed ${isDark ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:text-slate-900'}`}
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                      </div>

                      {/* Hobbies */}
                      <div className="space-y-2">
                        <label className={`block text-[10px] font-mono font-semibold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Hobbies & Interests</label>
                        <div className="flex flex-wrap gap-2 items-center">
                          {(resume.content?.personalInfo.hobbies || []).map((hobby, i) => (
                            <div key={i} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 group/hobby border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              <input
                                value={hobby}
                                onChange={e => {
                                  const arr = [...(resume.content?.personalInfo.hobbies || [])];
                                  arr[i] = e.target.value;
                                  updateContent('personalInfo.hobbies', arr);
                                }}
                                className={`bg-transparent border-none text-xs font-semibold outline-none w-24 ${isDark ? 'text-white' : 'text-slate-900'}`}
                              />
                              <button onClick={() => {
                                const arr = (resume.content?.personalInfo.hobbies || []).filter((_, idx) => idx !== i);
                                updateContent('personalInfo.hobbies', arr);
                              }} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover/hobby:opacity-100 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => updateContent('personalInfo.hobbies', [...(resume.content?.personalInfo.hobbies || []), ''])}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-dashed ${isDark ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:text-slate-900'}`}
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                      </div>

                      {/* Permanent Address */}
                      <div className="space-y-1.5">
                        <label className={`block text-[10px] font-mono font-semibold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Permanent Address</label>
                        <AutoTextarea
                          value={resume.content?.personalInfo.permanentAddress || ''}
                          onChange={val => updateContent('personalInfo.permanentAddress', val)}
                          placeholder="e.g. 123, Gandhi Nagar, Mumbai - 400001, Maharashtra"
                          className={`w-full h-16 text-xs font-medium outline-none transition-colors resize-none leading-relaxed rounded-xl px-3.5 py-2.5 border ${isDark ? 'bg-slate-950/70 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'}`}
                        />
                      </div>
                    </div>
                </div>
              )}

              {activeSection === 'summary' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit,Inter,sans-serif' }}>Professional Summary</h3>
                      <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Hook recruiters and ATS parsers in 30 seconds</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleImproveGrammar}
                        disabled={improvingGrammar || !resume.content?.summary}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ${isDark ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:border-emerald-500/60' : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 shadow-xs'}`}
                      >
                        {improvingGrammar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Improve Tone</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateSummary}
                        disabled={generatingSummary}
                        className="flex items-center gap-1.5 px-4 py-2 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50 border border-white/20"
                      >
                        {generatingSummary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>AI Magic Write</span>
                      </button>
                    </div>
                  </div>
                  <ProTip>Keep your summary under 4 sentences. Highlight your core domain, years of expertise, and highest ROI accomplishment.</ProTip>
                  
                  {/* ⚡ Pre-written Summary Presets */}
                  <div className="space-y-2">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>⚡ 1-Click Role Presets (Click to load):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SUMMARY_PRESETS.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => updateContent('summary', p.text)}
                          className={`text-left p-3 rounded-xl border text-xs transition-all hover:scale-[1.01] ${isDark ? 'bg-slate-950/70 border-slate-800 hover:border-indigo-500/60' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-xs'}`}
                        >
                          <p className="font-bold text-indigo-500 text-xs mb-0.5">{p.role}</p>
                          <p className={`line-clamp-2 text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{p.text}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 💥 Power Action Verbs */}
                  <div className="space-y-1.5">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>💥 Power Action Verbs (Click to insert):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {ACTION_VERBS.map((verb) => (
                        <button
                          key={verb}
                          type="button"
                          onClick={() => updateContent('summary', (resume.content?.summary ? `${resume.content.summary} ${verb}` : verb))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500' : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-400'}`}
                        >
                          + {verb}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative group">
                    <AutoTextarea 
                      value={resume.content?.summary || ''}
                      onChange={val => updateContent('summary', val)}
                      placeholder="High-impact Software Architect with 8+ years of engineering scalable microservices, leading AI automation pipelines, and improving user performance by 40%..."
                      className={`w-full h-44 rounded-2xl p-4 text-sm font-medium outline-none transition-colors resize-none leading-relaxed ${isDark ? 'bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:bg-slate-950 focus:border-indigo-500' : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500'}`}
                    />
                  </div>
                </div>
              )}

              {activeSection === 'experience' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>Work Experience</h3>
                      <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Chronological roles & measurable achievements</p>
                    </div>
                    <button 
                      onClick={addExperience} 
                      className="flex items-center gap-1.5 px-4 py-2 bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all border border-white/20"
                    >
                      <Plus className="w-3.5 h-3.5" /> <span>Add Role</span>
                    </button>
                  </div>
                  <ProTip>Begin bullet points with strong action verbs (Architected, Spearheaded, Optimized) and include numerical metrics (% or $).</ProTip>
                  
                  <div className="space-y-4">
                    {(resume.content?.experience || []).map((exp, idx) => (
                      <div 
                        key={exp.id} 
                        className={`p-5 rounded-2xl border relative group ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
                      >
                        <button 
                          onClick={() => {
                            const newExp = resume.content?.experience.filter(e => e.id !== exp.id);
                            updateContent('experience', newExp);
                          }}
                          className={`absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105 ${isDark ? 'bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-700' : 'bg-slate-100 text-slate-500 hover:text-red-600 border border-slate-200'}`}
                          title="Delete Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                          <Input label="Company Name" value={exp.company} onChange={v => {
                            const newExp = [...(resume.content?.experience || [])];
                            newExp[idx].company = v;
                            updateContent('experience', newExp);
                          }} placeholder="e.g. Google" suggestions={['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Uber', 'Stripe', 'Infosys', 'TCS', 'Wipro', 'HCL Technologies', 'Accenture', 'Cognizant', 'Flipkart', 'Paytm', 'Zomato', 'Swiggy', 'Razorpay', 'Deloitte', 'IBM']} />
                          <Input label="Job Title" value={exp.position} onChange={v => {
                            const newExp = [...(resume.content?.experience || [])];
                            newExp[idx].position = v;
                            updateContent('experience', newExp);
                          }} placeholder="e.g. Software Engineer" suggestions={['Software Engineer', 'Senior Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'DevOps Engineer', 'Data Analyst', 'Data Scientist', 'Machine Learning Engineer', 'Product Manager', 'UI/UX Designer', 'Project Manager', 'Technical Lead', 'Engineering Manager']} />
                          <Input label="Start Date" value={exp.startDate} onChange={v => {
                            const newExp = [...(resume.content?.experience || [])];
                            newExp[idx].startDate = v;
                            updateContent('experience', newExp);
                          }} placeholder="e.g. May 2024" suggestions={['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2023', 'Jun 2023', 'Jan 2022']} />
                          <Input label="End Date" value={exp.endDate} onChange={v => {
                            const newExp = [...(resume.content?.experience || [])];
                            newExp[idx].endDate = v;
                            if (v.toLowerCase() !== 'present') {
                              newExp[idx].current = false;
                            }
                            updateContent('experience', newExp);
                          }} placeholder="Present" suggestions={['Present', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Jun 2025', 'Dec 2024', 'Jun 2024', 'Dec 2023']} />
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
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <label htmlFor={`exp-current-${idx}`} className={`text-xs font-mono font-bold cursor-pointer select-none ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            I currently work in this role
                          </label>
                        </div>

                        {/* STAR Achievement Starters */}
                        <div className="mt-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Key Achievements (STAR Method)</p>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-mono uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Industry:</span>
                              <select
                                value={targetIndustry}
                                onChange={e => setTargetIndustry(e.target.value)}
                                className={`text-[10px] font-mono font-bold rounded-lg px-2 py-0.5 border outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                              >
                                {['Technology', 'AI / ML', 'Finance / FinTech', 'Healthcare', 'Product Management', 'E-Commerce'].map(ind => (
                                  <option key={ind} value={ind}>{ind}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {(exp.description || []).map((bullet, bIdx) => {
                            const isEnhancingThis = enhancingBullet === `${exp.id}-${bIdx}`;
                            return (
                              <div key={bIdx} className="flex gap-1.5 group/bullet items-center">
                                <AutoRawInput 
                                  value={bullet}
                                  onChange={val => {
                                    const newExp = [...(resume.content?.experience || [])];
                                    newExp[idx].description[bIdx] = val;
                                    updateContent('experience', newExp);
                                  }}
                                  className={`flex-1 min-w-0 rounded-xl px-3.5 py-2 text-sm font-medium outline-none transition-colors ${isDark ? 'bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-600 focus:border-indigo-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'}`}
                                  placeholder="Architected a caching layer that reduced latency by 45%..."
                                />
                                <button
                                  type="button"
                                  onClick={() => handleEnhance(exp.id, bIdx)}
                                  disabled={isEnhancingThis || !bullet.trim()}
                                  title="Rewrite bullet with AI metrics & STAR framing"
                                  className={`px-2.5 py-2 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 border transition-all disabled:opacity-40 ${isDark ? 'bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25' : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'}`}
                                >
                                  {isEnhancingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                  <span className="hidden sm:inline">Enhance</span>
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const newExp = [...(resume.content?.experience || [])];
                                    newExp[idx].description = newExp[idx].description.filter((_, i) => i !== bIdx);
                                    updateContent('experience', newExp);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-lg transition-all shrink-0"
                                  title="Remove bullet"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                          <button 
                            onClick={() => {
                              const newExp = [...(resume.content?.experience || [])];
                              newExp[idx].description.push('');
                              updateContent('experience', newExp);
                            }}
                            className="flex items-center gap-1 mt-1 text-xs font-mono font-bold text-indigo-500 hover:text-indigo-600"
                          >
                            <Plus className="w-3.5 h-3.5" /> <span>Add Bullet Point</span>
                          </button>

                          {/* Quick STAR Bullet Starters */}
                          <div className={`p-3 rounded-xl mt-3 space-y-1.5 border ${isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'}`}>
                            <p className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>⚡ Quick Insert High-Impact Achievement Bullets:</p>
                            <div className="flex flex-col gap-1">
                              {STAR_BULLETS.slice(0, 4).map((sb, sbIdx) => (
                                <button
                                  key={sbIdx}
                                  type="button"
                                  onClick={() => {
                                    const newExp = [...(resume.content?.experience || [])];
                                    newExp[idx].description = [...(newExp[idx].description || []).filter(Boolean), sb];
                                    updateContent('experience', newExp);
                                  }}
                                  className={`text-left text-[11px] p-1.5 rounded-lg border transition-all flex items-center justify-between gap-2 group/b ${isDark ? 'bg-slate-900 border-slate-800/80 hover:border-emerald-500/50 text-slate-300' : 'bg-white border-slate-200 hover:border-emerald-500 text-slate-700'}`}
                                >
                                  <span className="line-clamp-1">{sb}</span>
                                  <span className="text-[10px] font-mono font-bold text-emerald-500 shrink-0 opacity-0 group-hover/b:opacity-100">+ Add</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'education' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>Education</h3>
                      <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Degrees, certifications & academic foundation</p>
                    </div>
                    <button 
                      onClick={() => {
                        const newEdu: Education = { id: Math.random().toString(), school: '', degree: '', field: '', graduationDate: '' };
                        updateContent('education', [...(resume.content?.education || []), newEdu]);
                      }} 
                      className="flex items-center gap-1.5 px-4 py-2 bg-linear-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all border border-white/20"
                    >
                      <Plus className="w-3.5 h-3.5" /> <span>Add Education</span>
                    </button>
                  </div>
                  <ProTip>Include your GPA or percentage if it reflects strong merit. Listing your board/university is ideal for domestic applications.</ProTip>
                  
                  <div className="space-y-4">
                    {(resume.content?.education || []).map((edu, idx) => (
                      <div 
                        key={edu.id} 
                        className={`p-5 rounded-2xl border relative group ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
                      >
                        <button 
                          onClick={() => {
                            const newEdu = resume.content?.education.filter(e => e.id !== edu.id);
                            updateContent('education', newEdu);
                          }}
                          className={`absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105 ${isDark ? 'bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-700' : 'bg-slate-100 text-slate-500 hover:text-red-600 border border-slate-200'}`}
                          title="Delete Education"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                          <Input label="School / University" value={edu.school} onChange={v => {
                            const newEdu = [...(resume.content?.education || [])];
                            newEdu[idx].school = v;
                            updateContent('education', newEdu);
                          }} placeholder="e.g. IIT Bombay / Delhi University" suggestions={['IIT Bombay', 'IIT Delhi', 'IIT Madras', 'IIT Kanpur', 'BITS Pilani', 'NIT Trichy', 'Delhi University', 'Mumbai University', 'Anna University', 'VIT Vellore', 'Stanford University', 'MIT', 'Harvard University', 'Oxford University']} />
                          <Input label="Board / Affiliation" value={edu.board || ''} onChange={v => {
                            const newEdu = [...(resume.content?.education || [])];
                            newEdu[idx].board = v;
                            updateContent('education', newEdu);
                          }} placeholder="e.g. CBSE / State Board / University" suggestions={['CBSE', 'ICSE', 'State Board', 'Mumbai University', 'Delhi University', 'Anna University', 'VTU', 'Autonomous', 'IB Board']} />
                          <Input label="Degree / Course" value={edu.degree} onChange={v => {
                            const newEdu = [...(resume.content?.education || [])];
                            newEdu[idx].degree = v;
                            updateContent('education', newEdu);
                          }} placeholder="e.g. B.Tech" suggestions={['B.Tech in Computer Science', 'B.S. in Software Engineering', 'M.S. in Computer Science', 'B.C.A. / M.C.A.', 'B.Sc in Information Technology', 'MBA in Tech Management', 'B.E.', 'M.Tech', 'Ph.D.']} />
                          <Input label="Field of Study / Major" value={edu.field} onChange={v => {
                            const newEdu = [...(resume.content?.education || [])];
                            newEdu[idx].field = v;
                            updateContent('education', newEdu);
                          }} placeholder="e.g. Computer Science" suggestions={['Computer Science', 'Information Technology', 'Data Science', 'Artificial Intelligence', 'Software Engineering', 'Electronics & Communication', 'Business Administration']} />
                          <Input label="Graduation Date / Year" value={edu.graduationDate} onChange={v => {
                            const newEdu = [...(resume.content?.education || [])];
                            newEdu[idx].graduationDate = v;
                            updateContent('education', newEdu);
                          }} placeholder="e.g. June 2025" suggestions={['June 2025', 'May 2025', 'June 2024', 'May 2024', 'June 2023', 'Expected May 2026', 'Expected June 2027']} />
                          <Input label="Score / CGPA / Percentage" value={edu.score || ''} onChange={v => {
                            const newEdu = [...(resume.content?.education || [])];
                            newEdu[idx].score = v;
                            updateContent('education', newEdu);
                          }} placeholder="e.g. 9.2 CGPA or 85%" suggestions={['CGPA: 9.5 / 10.0', 'CGPA: 9.0 / 10.0', 'CGPA: 8.5 / 10.0', 'GPA: 3.9 / 4.0 (Top 5% Merit)', 'First Class with Distinction', '88% Aggregate']} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'skills' && (
                <div className="space-y-4">
                  <div>
                    <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>Skills & Competencies</h3>
                    <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Hard technical stacks and domain proficiencies</p>
                  </div>
                  <ProTip>Include both high-level frameworks and low-level fundamentals (e.g. React, TypeScript, System Design, REST APIs, CI/CD).</ProTip>

                  {/* ⚡ Categorized Instant Tech Bundles */}
                  <div className="space-y-3">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>⚡ Instant Tech Bundles (Click category to add all or individual skills):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {SKILL_BUNDLES.map((bundle, bIdx) => (
                        <div key={bIdx} className={`p-3 rounded-xl border space-y-2 ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-500">{bundle.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const current = new Set(resume.content?.skills || []);
                                bundle.skills.forEach(s => current.add(s));
                                updateContent('skills', Array.from(current));
                              }}
                              className="text-[10px] font-mono font-bold text-violet-500 hover:text-violet-600 px-2 py-0.5 rounded-md bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
                            >
                              + Add All
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {bundle.skills.map((s, sIdx) => {
                              const exists = (resume.content?.skills || []).includes(s);
                              return (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => {
                                    if (!exists) {
                                      updateContent('skills', [...(resume.content?.skills || []), s]);
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${exists ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40 cursor-default' : isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600'}`}
                                >
                                  {exists ? `✓ ${s}` : `+ ${s}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex flex-wrap gap-2 items-center">
                      {(resume.content?.skills || []).map((skill, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center gap-1.5"
                        >
                          <div className="relative group/skill">
                            <AutoRawInput 
                              value={skill}
                              onChange={val => {
                                const newSkills = [...(resume.content?.skills || [])];
                                newSkills[idx] = val;
                                updateContent('skills', newSkills);
                              }}
                              className={`rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider outline-none transition-colors pr-7 min-w-30 ${isDark ? 'bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500' : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-indigo-500'}`}
                            />
                            <button 
                              onClick={() => {
                                const newSkills = resume.content?.skills.filter((_, i) => i !== idx);
                                updateContent('skills', newSkills);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 opacity-0 group-hover/skill:opacity-100 transition-opacity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex items-center gap-1.5">
                        <input 
                          value={newSkillInput}
                          onChange={e => setNewSkillInput(e.target.value)}
                          placeholder="+ ADD SKILL…"
                          list="skills-suggestions"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newSkillInput.trim()) {
                              e.preventDefault();
                              updateContent('skills', [...(resume.content?.skills || []), newSkillInput.trim()]);
                              setNewSkillInput('');
                            }
                          }}
                          className={`border border-dashed rounded-xl px-4 py-1.5 text-xs font-bold uppercase tracking-wider outline-none transition-all min-w-35 ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200 focus:text-indigo-300 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-700 focus:text-indigo-600 focus:border-indigo-500'}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newSkillInput.trim()) {
                              updateContent('skills', [...(resume.content?.skills || []), newSkillInput.trim()]);
                              setNewSkillInput('');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors shrink-0"
                        >
                          Add
                        </button>
                      </div>

                      <datalist id="skills-suggestions">
                        {['React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java', 'C++', 'SQL', 'NoSQL', 'AWS', 'Docker', 'Kubernetes', 'Machine Learning', 'Data Analysis', 'Agile', 'UI/UX Design', 'Figma', 'Git', 'Tailwind CSS', 'Redux', 'Next.js', 'FastAPI', 'Go', 'PostgreSQL', 'Redis', 'GraphQL'].map((s, i) => (
                          <option key={i} value={s} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'projects' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>Projects</h3>
                      <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Showcase engineering craft, architectural wins & live URLs</p>
                    </div>
                    <button 
                      onClick={addProject} 
                      className="flex items-center gap-1.5 px-4 py-2 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-xl text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all border border-white/20"
                    >
                      <Plus className="w-3.5 h-3.5" /> <span>Add Project</span>
                    </button>
                  </div>
                  <ProTip>State the architectural problem, your concrete engineering solution, and link directly to live repositories or demos.</ProTip>

                  {/* ⚡ 1-Click Engineering Project Presets */}
                  <div className="space-y-2">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>⚡ 1-Click Engineering Project Presets:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {PROJECT_PRESETS.map((proj, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            const newP: Project = {
                              id: Math.random().toString(36).substr(2, 9),
                              name: proj.name,
                              description: proj.description,
                              technologies: proj.technologies,
                              link: proj.link,
                              keyFeatures: proj.keyFeatures
                            };
                            updateContent('projects', [...(resume.content?.projects || []), newP]);
                          }}
                          className={`text-left p-3 rounded-2xl border space-y-1 transition-all hover:scale-[1.02] ${isDark ? 'bg-slate-950/70 border-slate-800 hover:border-indigo-500/60' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-xs'}`}
                        >
                          <p className="font-bold text-indigo-500 text-xs line-clamp-1">{proj.name}</p>
                          <p className={`text-[10px] line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{proj.description}</p>
                          <span className="inline-block text-[9px] font-mono font-bold text-violet-500 uppercase tracking-wider mt-1">+ Use Preset</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {(resume.content?.projects || []).map((project, idx) => (
                      <div 
                        key={project.id} 
                        className={`p-5 rounded-2xl border relative group ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
                      >
                        <button 
                          onClick={() => {
                            const newProjects = resume.content?.projects.filter(p => p.id !== project.id);
                            updateContent('projects', newProjects);
                          }}
                          className={`absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105 ${isDark ? 'bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-700' : 'bg-slate-100 text-slate-500 hover:text-red-600 border border-slate-200'}`}
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                          <Input label="Project Name" value={project.name} onChange={v => {
                            const newProjects = [...(resume.content?.projects || [])];
                            newProjects[idx].name = v;
                            updateContent('projects', newProjects);
                          }} placeholder="e.g. ResuSmart AI" />
                          <Input label="Live Demo / GitHub Link" value={project.link || ''} onChange={v => {
                            const newProjects = [...(resume.content?.projects || [])];
                            newProjects[idx].link = v;
                            updateContent('projects', newProjects);
                          }} placeholder="github.com/yourname/project" />
                        </div>
                        <div className="mt-3 space-y-1.5">
                          <label className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Description & Impact</label>
                          <AutoTextarea 
                            value={project.description || ''}
                            onChange={val => {
                              const newProjects = [...(resume.content?.projects || [])];
                              newProjects[idx].description = val;
                              updateContent('projects', newProjects);
                            }}
                            className={`w-full h-20 rounded-xl p-3 text-sm font-medium outline-none transition-colors resize-none leading-relaxed ${isDark ? 'bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-600 focus:border-indigo-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'}`}
                            placeholder="Architected a 60fps resume studio using React and TypeScript..."
                          />
                        </div>

                        {/* Project Highlights */}
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Key Highlights</label>
                            <button
                              type="button"
                              onClick={() => handleGenerateFeatures(project.id)}
                              className="text-[10px] font-mono font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                            >
                              <Sparkles className="w-3 h-3" /> Auto Generate
                            </button>
                          </div>
                          {(project.keyFeatures || []).map((feat, fIdx) => (
                            <div key={fIdx} className="flex gap-2 group/feat">
                              <AutoRawInput 
                                value={feat}
                                onChange={val => {
                                  const newProjects = [...(resume.content?.projects || [])];
                                  const arr = [...(newProjects[idx].keyFeatures || [])];
                                  arr[fIdx] = val;
                                  newProjects[idx].keyFeatures = arr;
                                  updateContent('projects', newProjects);
                                }}
                                className={`flex-1 rounded-xl px-3.5 py-2 text-sm font-medium outline-none transition-colors ${isDark ? 'bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-600 focus:border-indigo-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'}`}
                                placeholder="e.g. Implemented real-time synchronization handling 10,000+ operations/sec..."
                              />
                              <button 
                                onClick={() => {
                                  const newProjects = [...(resume.content?.projects || [])];
                                  newProjects[idx].keyFeatures = (newProjects[idx].keyFeatures || []).filter((_, i) => i !== fIdx);
                                  updateContent('projects', newProjects);
                                }}
                                className="w-8 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-lg transition-all"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const newProjects = [...(resume.content?.projects || [])];
                              newProjects[idx].keyFeatures = [...(newProjects[idx].keyFeatures || []), ''];
                              updateContent('projects', newProjects);
                            }}
                            className="flex items-center gap-1 text-xs font-mono font-bold text-indigo-500 hover:text-indigo-600"
                          >
                            <Plus className="w-3.5 h-3.5" /> <span>Add Highlight</span>
                          </button>
                        </div>

                        <div className="mt-3 space-y-1">
                          <label className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Technologies Used (comma-separated)</label>
                          <input 
                            value={techDrafts[project.id] ?? project.technologies.join(', ')}
                            onChange={e => {
                              const raw = e.target.value;
                              setTechDrafts(prev => ({ ...prev, [project.id]: raw }));
                              const newProjects = [...(resume.content?.projects || [])];
                              newProjects[idx].technologies = raw.split(',').map(s => s.trim()).filter(Boolean);
                              updateContent('projects', newProjects);
                            }}
                            onBlur={() => {
                              setTechDrafts(prev => {
                                const copy = { ...prev };
                                delete copy[project.id];
                                return copy;
                              });
                            }}
                            list="tech-suggestions"
                            placeholder="React, TypeScript, Node.js, AWS..."
                            className={`w-full rounded-xl px-3.5 py-2 text-xs font-mono font-bold tracking-wider outline-none transition-all ${isDark ? 'bg-slate-950/70 border border-slate-800 text-indigo-400 placeholder-slate-600' : 'bg-slate-50 border border-slate-200 text-indigo-600 placeholder-slate-400 font-bold'}`}
                          />
                          <datalist id="tech-suggestions">
                            {['React', 'Node.js', 'Firebase', 'MongoDB', 'PostgreSQL', 'Python', 'Django', 'Flask', 'Next.js', 'Tailwind CSS', 'Express.js', 'AWS', 'Docker', 'Google Cloud', 'Azure', 'Unity', 'Swift', 'Kotlin', 'Flutter', 'GraphQL', 'Redis'].map((t, i) => (
                              <option key={i} value={t} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'certifications' && (
                <div className="space-y-4">
                  <div>
                    <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>Certifications</h3>
                    <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Formal industry badges and verified credentials</p>
                  </div>
                  <ProTip>Add high-ROI cloud, management, or domain-specific certifications to pass automated keyword screens.</ProTip>

                  {/* ⚡ In-Demand Cloud & Tech Certifications */}
                  <div className="space-y-2">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>⚡ Top In-Demand Cloud & Tech Badges (Click to add):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {CERTIFICATION_PRESETS.map((cert, cIdx) => {
                        const exists = (resume.content?.certifications || []).includes(cert);
                        return (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => {
                              if (!exists) {
                                updateContent('certifications', [...(resume.content?.certifications || []), cert]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${exists ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40 cursor-default' : isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-indigo-500 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 shadow-xs'}`}
                          >
                            {exists ? `✓ ${cert}` : `+ ${cert}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex flex-wrap gap-2 items-center">
                      {(resume.content?.certifications || []).map((cert, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center gap-1.5"
                        >
                          <div className="relative group/cert">
                            <AutoRawInput 
                              value={cert}
                              onChange={val => {
                                const newCerts = [...(resume.content?.certifications || [])];
                                newCerts[idx] = val;
                                updateContent('certifications', newCerts);
                              }}
                              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider outline-none transition-colors pr-7 min-w-40 ${isDark ? 'bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500' : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-indigo-500'}`}
                            />
                            <button 
                              onClick={() => {
                                const newCerts = resume.content?.certifications?.filter((_, i) => i !== idx);
                                updateContent('certifications', newCerts);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 opacity-0 group-hover/cert:opacity-100 transition-opacity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex items-center gap-1.5">
                        <input 
                          value={newCertInput}
                          onChange={e => setNewCertInput(e.target.value)}
                          placeholder="+ ADD CERTIFICATION…"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newCertInput.trim()) {
                              e.preventDefault();
                              updateContent('certifications', [...(resume.content?.certifications || []), newCertInput.trim()]);
                              setNewCertInput('');
                            }
                          }}
                          className={`border border-dashed rounded-xl px-4 py-1.5 text-xs font-bold uppercase tracking-wider outline-none transition-all min-w-42.5 ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200 focus:text-indigo-300 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-700 focus:text-indigo-600 focus:border-indigo-500'}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newCertInput.trim()) {
                              updateContent('certifications', [...(resume.content?.certifications || []), newCertInput.trim()]);
                              setNewCertInput('');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-500 transition-colors shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'declaration' && (
                <div className="space-y-4">
                  <div>
                    <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>Declaration & Sign-off</h3>
                    <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Formal confirmation of accuracy for placements & PSU applications</p>
                  </div>
                  <ProTip>Formal declaration is standard for campus placements & government PSU applications.</ProTip>

                  {/* ⚡ 1-Click Declaration Presets */}
                  <div className="space-y-2">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>⚡ Instant Declaration Presets:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DECLARATION_PRESETS.map((dec, dIdx) => (
                        <button
                          key={dIdx}
                          type="button"
                          onClick={() => updateContent('declaration', dec.text)}
                          className={`text-left p-3 rounded-xl border text-xs transition-all hover:scale-[1.01] ${resume.content?.declaration === dec.text ? 'bg-indigo-600/15 border-indigo-500 text-indigo-500 font-bold' : isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-indigo-500/50' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 shadow-xs'}`}
                        >
                          <p className="font-bold text-xs mb-1 text-indigo-500">{dec.label}</p>
                          <p className={`text-[11px] line-clamp-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{dec.text}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <AutoTextarea 
                      value={resume.content?.declaration || ''}
                      onChange={val => updateContent('declaration', val)}
                      placeholder="I hereby declare that the information provided above is true to the best of my knowledge and belief."
                      className={`w-full h-24 rounded-xl p-3 text-sm font-medium italic outline-none transition-colors resize-none leading-relaxed text-center ${isDark ? 'bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-600 focus:border-indigo-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'}`}
                    />

                    <div className={`pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <Input
                        label="Declaration Date"
                        value={resume.content?.declarationDate || ''}
                        onChange={e => updateContent('declarationDate', e)}
                        placeholder={new Date().toLocaleDateString('en-IN')}
                      />
                      <Input
                        label="Place / City"
                        value={resume.content?.declarationPlace || ''}
                        onChange={e => updateContent('declarationPlace', e)}
                        placeholder={resume.content?.personalInfo?.location || 'e.g. Mumbai'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'settings' && (
                <div className="space-y-4 pb-10">
                  <div>
                    <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>Design & Typography</h3>
                    <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Customize accent color, typography, scaling & density</p>
                  </div>

                  <div className={`p-5 rounded-2xl border space-y-6 transition-all ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    
                    {/* ⚡ ATS-Vetted High-Contrast Color Palettes */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-mono font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>⭐ ATS High-Contrast Safe Palettes</label>
                        <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">100% OCR Contrast Verified</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ATS_PALETTES.map((pal, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setResume(prev => ({ ...prev, settings: { ...prev.settings, primaryColor: pal.color } }))}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${resume.settings?.primaryColor === pal.color ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm' : isDark ? 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-400'}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-5 h-5 rounded-lg shrink-0 shadow-sm" style={{ backgroundColor: pal.color }} />
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{pal.name}</p>
                                <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{pal.tag}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-500 shrink-0">{pal.atsScore}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Additional Creative Accents */}
                    <div className="space-y-2 pt-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                      <label className={`text-xs font-mono font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>All Accent Colors</label>
                      <div className="flex flex-wrap gap-2.5">
                        {['#0f172a', '#1e3a8a', '#2563eb', '#0f766e', '#10b981', '#065f46', '#831843', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#f97316'].map(color => (
                          <button
                            key={color}
                            onClick={() => setResume(prev => ({ ...prev, settings: { ...prev.settings, primaryColor: color } }))}
                            className={cn(
                              "w-8 h-8 rounded-xl transition-all flex items-center justify-center relative overflow-hidden",
                              resume.settings?.primaryColor === color ? "ring-4 ring-offset-2 ring-indigo-500 scale-110 shadow-lg" : "hover:scale-110"
                            )}
                            style={{ backgroundColor: color }}
                          >
                            {resume.settings?.primaryColor === color && (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Pairing with ATS Indicators */}
                    <div className="space-y-2 pt-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-mono font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Typography & ATS Fonts</label>
                        <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Standard vector fonts</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Inter', tag: 'ATS Top Standard' },
                          { name: 'Roboto', tag: 'ATS Preferred' },
                          { name: 'Outfit', tag: 'Modern Clean' },
                          { name: 'Source Sans Pro', tag: 'Enterprise ATS' },
                          { name: 'Merriweather', tag: 'Classic Serif' },
                          { name: 'Montserrat', tag: 'Modern Bold' },
                          { name: 'JetBrains Mono', tag: 'Tech Code' }
                        ].map(font => (
                          <button
                            key={font.name}
                            onClick={() => setResume(prev => ({ ...prev, settings: { ...prev.settings, fontFamily: font.name } }))}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                              resume.settings?.fontFamily === font.name 
                                ? "bg-indigo-600 text-white shadow-md scale-105" 
                                : isDark ? "bg-slate-950 text-slate-400 hover:text-white border border-slate-800" : "bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
                            )}
                            style={{ fontFamily: font.name }}
                          >
                            <span>{font.name}</span>
                            <span className={`text-[9px] opacity-75 font-mono`}>({font.tag})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ⚡ One-Page Resume Optimizer Card */}
                    <div className="pt-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                      <div className="p-3.5 rounded-2xl border" style={{
                        background: resume.settings?.fitToOnePage 
                          ? (isDark ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.10))' : 'linear-gradient(135deg, #ecfdf5, #f0fdf4)')
                          : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                        borderColor: resume.settings?.fitToOnePage ? '#10b98150' : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0')
                      }}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{
                              background: resume.settings?.fitToOnePage ? '#10b981' : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                              color: resume.settings?.fitToOnePage ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')
                            }}>
                              <Zap className="w-4 h-4" />
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>One-Page Resume Mode</p>
                              <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {resume.settings?.fitToOnePage ? '✓ 1-Page Auto-Fit scaling active (zero clipping)' : 'Fit & scale resume to 1 clean A4 page'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setResume(prev => ({
                              ...prev,
                              settings: {
                                ...prev.settings,
                                fitToOnePage: !prev.settings?.fitToOnePage,
                                ...(prev.settings?.fitToOnePage ? {} : { margins: 'compact' })
                              }
                            }))}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                              resume.settings?.fitToOnePage ? "bg-emerald-600" : isDark ? "bg-slate-800" : "bg-slate-300"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                                resume.settings?.fitToOnePage ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleAutoFitOnePage}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>⚡ Auto-Fit to 1 Page</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleLoadAniketResume}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-cyan-400 hover:text-white' : 'bg-white border-slate-300 text-cyan-700 hover:text-slate-900'}`}
                            title="Load Aniket Singh's 1-Page ATS resume preset"
                          >
                            <FileText className="w-3.5 h-3.5 text-cyan-500" />
                            <span>Load Aniket Resume</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Margins & Width Expansion */}
                    <div className="space-y-2 pt-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-mono font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Margins & Printable Width</label>
                        <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Expand width for 1-page fit</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'compact', label: 'Compact', sub: 'Expand Width 95%' },
                          { id: 'normal', label: 'Standard', sub: 'Balanced 88%' },
                          { id: 'wide', label: 'Relaxed', sub: 'Spacious 80%' },
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setResume(prev => ({ ...prev, settings: { ...prev.settings, margins: m.id as any } }))}
                            className={cn(
                              "p-2 rounded-xl border text-left transition-all",
                              (resume.settings?.margins === m.id || (!resume.settings?.margins && m.id === (resume.settings?.fitToOnePage ? 'compact' : 'normal')))
                                ? "border-indigo-500 bg-indigo-500/15 text-indigo-500 font-bold"
                                : isDark ? "border-slate-800 bg-slate-950 text-slate-400" : "border-slate-200 bg-slate-100 text-slate-700"
                            )}
                          >
                            <p className="text-xs font-bold">{m.label}</p>
                            <p className="text-[9px] font-mono opacity-75">{m.sub}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Scaling & Density */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                      <div className="space-y-2">
                        <label className={`text-xs font-mono font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Font Scaling</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: 'tiny', label: 'Tiny', pt: '9.5pt' },
                            { id: 'small', label: 'Small', pt: '10.5pt' },
                            { id: 'medium', label: 'Mid', pt: '11.5pt' },
                            { id: 'large', label: 'Large', pt: '13pt' }
                          ].map(size => (
                            <button
                              key={size.id}
                              type="button"
                              onClick={() => setResume(prev => ({ ...prev, settings: { ...prev.settings, fontSize: size.id as any } }))}
                              className={cn(
                                "py-1.5 px-1 rounded-xl border text-center transition-all",
                                (resume.settings?.fontSize === size.id || (!resume.settings?.fontSize && size.id === 'medium'))
                                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-500 font-bold"
                                  : isDark ? "border-slate-800 bg-slate-950 text-slate-400" : "border-slate-200 bg-slate-100 text-slate-700"
                              )}
                            >
                              <p className="text-[11px] font-bold">{size.label}</p>
                              <p className="text-[8px] font-mono opacity-70">{size.pt}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className={`text-xs font-mono font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Spacing Density</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: 'ultra-compact', label: 'Ultra', sub: 'Tight' },
                            { id: 'compact', label: 'Tight', sub: 'Fit 1P' },
                            { id: 'normal', label: 'Normal', sub: 'Std' },
                            { id: 'loose', label: 'Loose', sub: 'Multi' }
                          ].map(space => (
                            <button
                              key={space.id}
                              type="button"
                              onClick={() => setResume(prev => ({ ...prev, settings: { ...prev.settings, spacing: space.id as any } }))}
                              className={cn(
                                "py-1.5 px-1 rounded-xl border text-center transition-all",
                                (resume.settings?.spacing === space.id || (!resume.settings?.spacing && space.id === 'compact'))
                                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-500 font-bold"
                                  : isDark ? "border-slate-800 bg-slate-950 text-slate-400" : "border-slate-200 bg-slate-100 text-slate-700"
                              )}
                            >
                              <p className="text-[11px] font-bold">{space.label}</p>
                              <p className="text-[8px] font-mono opacity-70">{space.sub}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Projects Layout (Grid vs Single Column) */}
                    <div className="space-y-2 pt-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                      <label className={`text-xs font-mono font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Projects Layout</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setResume(prev => ({ ...prev, settings: { ...prev.settings, projectLayout: 'grid' } }))}
                          className={cn(
                            "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all",
                            resume.settings?.projectLayout === 'grid'
                              ? "border-indigo-500 bg-indigo-500/15 text-indigo-500 font-bold"
                              : isDark ? "border-slate-800 bg-slate-950 text-slate-400" : "border-slate-200 bg-slate-100 text-slate-700"
                          )}
                        >
                          <Columns className="w-4 h-4 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">2-Column Grid</p>
                            <p className="text-[9px] font-mono opacity-75">Saves 50% vertical space</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setResume(prev => ({ ...prev, settings: { ...prev.settings, projectLayout: 'single' } }))}
                          className={cn(
                            "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all",
                            (resume.settings?.projectLayout === 'single' || !resume.settings?.projectLayout)
                              ? "border-indigo-500 bg-indigo-500/15 text-indigo-500 font-bold"
                              : isDark ? "border-slate-800 bg-slate-950 text-slate-400" : "border-slate-200 bg-slate-100 text-slate-700"
                          )}
                        >
                          <Rows className="w-4 h-4 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">Single Column</p>
                            <p className="text-[9px] font-mono opacity-75">Traditional ATS list</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
          </div>
        </div>

        {/* ── LIVE PREVIEW PANEL ── */}
        {(!isPreviewMode && showLivePreview && (mobileView === 'preview' || !showAtsPanel)) && (
          <div
            className={cn(
              "print:hidden flex-col overflow-hidden shrink-0",
              mobileView === 'preview'
                ? "fixed inset-0 z-90 w-full h-full pb-20 flex"
                : !showAtsPanel
                ? "hidden lg:flex lg:w-95 xl:w-110 2xl:w-120"
                : "hidden"
            )}
            style={{
              background: isDark ? '#070a12' : '#f1f5f9',
              borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.90)'}`
            }}
          >
            {/* Preview toolbar */}
            <div className="print:hidden h-11 px-3.5 flex items-center justify-between shrink-0"
              style={{
                background: isDark ? '#0b0f19' : '#ffffff',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.80)'}`
              }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Live Preview</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border",
                  resume.settings?.fitToOnePage
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                )}>
                  {resume.settings?.fitToOnePage
                    ? (liveFitScale < 0.99 ? `1 Page • ${Math.round(liveFitScale * 100)}%` : 'Page 1 / 1')
                    : 'Multi-Page'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Quick 1-Page Toggle */}
                <button 
                  type="button"
                  onClick={() => setResume(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      fitToOnePage: !prev.settings?.fitToOnePage,
                      ...(prev.settings?.fitToOnePage ? {} : { margins: 'compact' })
                    }
                  }))}
                  title="Toggle single-page layout mode"
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors border",
                    resume.settings?.fitToOnePage 
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-xs" 
                      : isDark ? "bg-white/5 text-slate-400 border-white/10 hover:text-white" : "bg-white text-slate-600 border-slate-200 hover:text-slate-900"
                  )}
                >
                  <Zap className={cn("w-3 h-3", resume.settings?.fitToOnePage ? "text-amber-300" : "text-amber-500")} />
                  <span>{resume.settings?.fitToOnePage ? '1-Page: ON' : '1-Page Fit'}</span>
                </button>

                {/* Auto-Fit Button */}
                <button 
                  type="button"
                  onClick={handleAutoFitOnePage}
                  title="Auto-tune margins, font sizes, and layout to fit in 1 page"
                  className={`hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors ${isDark ? 'text-violet-300 bg-violet-950/40 border border-violet-800/60 hover:bg-violet-900/40' : 'text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100'}`}
                >
                  <Sparkles className="w-3 h-3 text-violet-500" />
                  <span>Auto-Fit</span>
                </button>
                {/* Zoom Controls */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(241,245,249,0.90)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.80)'}`
                }}>
                  <button onClick={() => setManualScale(prev => Math.max(0.15, (prev || previewScale) - 0.08))}
                    title="Zoom Out"
                    className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                    <Minus className="w-3 h-3" />
                  </button>
                  <button onClick={() => setManualScale(previewScale)}
                    title="Auto Fit"
                    className={`px-1.5 text-[9px] font-mono font-bold ${isDark ? 'text-violet-300 hover:text-white' : 'text-violet-700 hover:text-violet-900'}`}>
                    {Math.round((manualScale || previewScale) * 100)}%
                  </button>
                  <button onClick={() => setManualScale(prev => Math.min(1.8, (prev || previewScale) + 0.08))}
                    title="Zoom In"
                    className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Full window preview */}
                <button onClick={() => setIsPreviewMode(true)} title="Expand Full View"
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white bg-white/5' : 'text-slate-600 hover:text-slate-900 bg-slate-100'}`}
                  style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.80)'}` }}>
                  <Eye className="w-3.5 h-3.5 text-violet-500" />
                </button>

                {/* Export PDF shortcut */}
                <button onClick={handleDownloadPdf} title="Export PDF"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white transition-colors hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
                  <Download className="w-3 h-3" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Preview canvas */}
            <div className="flex-1 overflow-auto flex justify-center items-start p-4 scrollbar-hide print:hidden surface-dots" ref={previewContainerRef}
              style={{ backgroundColor: isDark ? '#060910' : '#e2e8f0' }}>
              <div
                id="screen-preview-wrapper"
                className="bg-white shrink-0 origin-top flex justify-center mb-16 rounded-xs"
                style={{
                  width: '210mm',
                  minWidth: '210mm',
                  transform: `scale(${manualScale || previewScale})`,
                  transformOrigin: 'top center',
                  boxShadow: isDark ? '0 18px 50px rgba(0,0,0,0.65)' : '0 14px 36px rgba(15,23,42,0.16)',
                }}
              >
                <ResumePreview
                  content={(deferredContent || resume.content) as ResumeContent}
                  templateType={deferredTemplate || 'modern-professional'}
                  settings={deferredSettings}
                  onScaleChange={setLiveFitScale}
                />
              </div>
            </div>
          </div>
        )}

        {/* ATS Intelligence Panel */}
        {(mobileView === 'ats' || showAtsPanel) && (
          <div
            className={cn(
              "print:hidden flex-col shrink-0 transition-colors",
              mobileView === 'ats'
                ? "fixed inset-0 w-full h-full pb-20 overflow-y-auto flex z-90"
                : showAtsPanel
                ? "hidden lg:flex lg:w-85 xl:w-95 overflow-y-auto"
                : "hidden"
            )}
            style={{
              background: isDark ? 'rgba(6,8,17,0.97)' : '#ffffff',
              borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.80)'}`
            }}
          >
              {/* ATS Header */}
              <div className="p-5 space-y-4 shrink-0 transition-colors duration-300"
                style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.80)'}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: isDark ? 'rgba(124,58,237,0.20)' : '#ede9fe', border: `1px solid ${isDark ? 'rgba(124,58,237,0.30)' : '#c7d2fe'}` }}>
                      <Search className="w-4 h-4 text-violet-500" />
                    </div>
                    <div>
                      <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>ATS Scanner</h3>
                      <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Keyword match analysis</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAtsPanel(false)}
                    className={`hidden lg:flex w-7 h-7 items-center justify-center rounded-lg transition-all ${isDark ? 'text-slate-400 hover:text-white bg-white/5' : 'text-slate-600 hover:text-slate-900 bg-slate-100'}`}
                    style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.80)'}` }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <p className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Job Description</p>
                  <textarea
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                    placeholder="Paste the target job description to analyze keyword matches..."
                    className={`w-full h-24 text-xs font-medium outline-none transition-all resize-none leading-relaxed rounded-xl p-3 border ${isDark ? 'text-slate-200 bg-slate-950/70 border-slate-800 placeholder-slate-600 focus:border-indigo-500' : 'text-slate-900 bg-slate-50 border-slate-200 placeholder-slate-400 focus:border-indigo-500'}`}
                  />
                </div>

                <button
                  onClick={() => runAnalysis()}
                  disabled={analyzing}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50 shadow-md"
                  style={{ background: 'linear-gradient(135deg,#059669,#0891b2)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Scan Resume
                </button>
              </div>

              {/* ATS Results */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {atsAnalysis ? (
                  <div className="space-y-5">
                    {/* Score */}
                    <div className={`p-4 rounded-2xl space-y-3 border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <p className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Match Score</p>
                        <p className="text-2xl font-black font-mono" style={{ color: atsAnalysis.score >= 80 ? '#10b981' : atsAnalysis.score >= 50 ? '#f59e0b' : '#f43f5e' }}>{atsAnalysis.score}%</p>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <div
                          className="h-full rounded-full transition-[width] duration-300 ease-out"
                          style={{ width: `${atsAnalysis.score}%`, background: atsAnalysis.score >= 80 ? 'linear-gradient(90deg,#059669,#34d399)' : atsAnalysis.score >= 50 ? 'linear-gradient(90deg,#d97706,#fbbf24)' : 'linear-gradient(90deg,#dc2626,#fb7185)' }}
                        />
                      </div>
                    </div>

                    {/* Missing keywords */}
                    <div className="space-y-2">
                      <p className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Missing Keywords</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(atsAnalysis.missingKeywords || []).length > 0
                          ? atsAnalysis.missingKeywords.map((kw: string, i: number) => (
                            <span key={i} className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border ${isDark ? 'bg-rose-500/10 border-rose-500/25 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>{kw}</span>
                          ))
                          : <span className="text-xs font-mono text-emerald-500 font-bold">✨ No critical keywords missing!</span>
                        }
                      </div>
                    </div>

                    {/* Improvements */}
                    <div className={`space-y-2 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <p className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Recommended Actions</p>
                      <div className="space-y-2">
                        {[
                          { icon: CheckCircle2, text: `Add ${atsAnalysis.missingKeywords?.slice(0,3).join(', ') || 'role keywords'} in experience bullets.`, color: '#10b981', bg: isDark ? 'rgba(16,185,129,0.10)' : '#ecfdf5', border: isDark ? 'rgba(16,185,129,0.20)' : '#a7f3d0' },
                          { icon: Lightbulb, text: 'Use standard section headings for 100% ATS parse success.', color: '#8b5cf6', bg: isDark ? 'rgba(139,92,246,0.10)' : '#f5f3ff', border: isDark ? 'rgba(139,92,246,0.20)' : '#ddd6fe' },
                          { icon: Activity, text: 'Quantify impact with % or $ to boost recruiter scoring.', color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.10)' : '#fffbeb', border: isDark ? 'rgba(245,158,11,0.20)' : '#fde68a' },
                        ].map(({ icon: Icon, text, color, bg, border }, i) => (
                          <div key={i} className="flex gap-2.5 p-3 rounded-xl" style={{ background: bg, border: `1px solid ${border}` }}>
                            <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} />
                            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center space-y-3 py-16">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: isDark ? 'rgba(124,58,237,0.10)' : '#ede9fe', border: `1px solid ${isDark ? 'rgba(124,58,237,0.20)' : '#c7d2fe'}` }}>
                      <Info className="w-6 h-6 text-violet-500" />
                    </div>
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Scanner Ready</p>
                    <p className={`text-xs max-w-50 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Paste a job description and scan to check your match score.</p>
                  </div>
                )}
              </div>
            </div>
          )}

      </div>

      {/* 🌟 FULL WINDOW PREVIEW MODAL 🌟 */}
      {isPreviewMode && (
        <div
          className={`print:hidden fixed inset-0 z-150 flex flex-col ${isDark ? 'bg-slate-950/95' : 'bg-slate-900/90'}`}
        >
          <div className={`h-14 px-6 md:px-10 flex items-center justify-between shrink-0 ${isDark ? 'bg-[#0d111b] border-b border-white/10' : 'bg-white border-b border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-500">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className={`font-bold tracking-wider uppercase text-xs hidden sm:block ${isDark ? 'text-white' : 'text-slate-900'}`}>Full Window Preview</h3>
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold font-mono border",
                resume.settings?.fitToOnePage
                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              )}>
                {resume.settings?.fitToOnePage
                  ? (liveFitScale < 0.99 ? `1 Page • ${Math.round(liveFitScale * 100)}%` : 'Page 1 / 1')
                  : 'Multi-Page'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className={`hidden md:flex items-center rounded-lg p-1 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                <button onClick={() => setManualScale(prev => Math.max(0.2, (prev || 1) - 0.1))} className={`p-1.5 rounded transition-colors ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-200'}`}><Minus className="w-4 h-4" /></button>
                <span className={`px-3 text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{Math.round((manualScale || 1) * 100)}%</span>
                <button onClick={() => setManualScale(prev => Math.min(2, (prev || 1) + 0.1))} className={`p-1.5 rounded transition-colors ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-200'}`}><Plus className="w-4 h-4" /></button>
              </div>

              <button onClick={handleDownloadDocx} className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${isDark ? 'bg-blue-950/50 border-blue-800 text-blue-300 hover:bg-blue-900/50' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'}`}>
                <FileText className="w-4 h-4" /> <span>Export DOC</span>
              </button>

              <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold transition-colors hover:brightness-110 shadow-sm">
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">{resume.settings?.fitToOnePage ? 'Download 1-Page PDF' : 'Download PDF'}</span>
              </button>
              
              <button onClick={() => setIsPreviewMode(false)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${isDark ? 'bg-white/10 hover:bg-red-500/20 text-slate-300 hover:text-red-400' : 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600'}`}>
                <X className="w-4 h-4" /> Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-10 flex justify-center items-start scrollbar-hide surface-dots" style={{ backgroundColor: isDark ? '#080c16' : '#e2e8f0' }}>
            <div 
              className="bg-white shadow-2xl shrink-0"
              style={{ 
                width: '210mm',
                minWidth: '210mm',
                transform: `scale(${manualScale || 1})`, 
                transformOrigin: 'top center' 
              }}
            >
              <ResumePreview content={resume.content as ResumeContent} templateType={resume.templateType || 'modern-professional'} settings={resume.settings} onScaleChange={setLiveFitScale} />
            </div>
          </div>
        </div>
      )}

      {/* 🪄 AI Auto-Fill & Resume Generator Modal */}
      {isAiModalOpen && (
        <div
          className="print:hidden fixed inset-0 z-200 bg-slate-950/85 flex items-center justify-center p-4 md:p-6"
          onClick={(e) => e.target === e.currentTarget && !isGenerating && setIsAiModalOpen(false)}
        >
          <div
            className={`border rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
          >
              {/* Header */}
              <div className={`px-6 py-5 border-b flex items-center justify-between rounded-t-3xl shrink-0 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg text-white"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.40)' }}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
                      AI Resume Studio & Auto-Fill
                    </h3>
                    <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Synthesize a complete 100% ATS-optimized resume tailored to any role or industry.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !isGenerating && setIsAiModalOpen(false)}
                  disabled={isGenerating}
                  className={`p-2 rounded-xl transition-all disabled:opacity-40 ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Prompt input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Target Role / Career Prompt
                    </label>
                    <span className="text-[10px] font-mono text-violet-500 font-bold">Step 1 — Describe your role</span>
                  </div>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Senior Full Stack Engineer with 4 years experience in React, Node.js, AWS, and distributed microservices. Led sprint deliveries at a high-growth tech startup..."
                    rows={3}
                    className={`w-full rounded-2xl p-4 text-xs font-medium outline-none transition-all resize-none leading-relaxed border ${isDark ? 'bg-slate-950/70 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500'}`}
                  />
                </div>

                {/* 1-Click Role Presets */}
                <div className="space-y-2">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    ⚡ 1-Click Role Presets (Click to autofill prompt):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { role: '🚀 Full Stack Engineer', desc: 'React, Node.js, TypeScript, PostgreSQL & Cloud microservices', prompt: 'Full Stack Engineer with 4+ years of experience in React, TypeScript, Node.js, PostgreSQL, and scalable AWS cloud architectures.' },
                      { role: '🤖 AI / ML Engineer', desc: 'PyTorch, LLM agents, Python, LangChain & Vector Databases', prompt: 'Machine Learning & AI Engineer specializing in LLMs, PyTorch, Python, neural networks, and scalable model deployment.' },
                      { role: '☁️ DevOps & Cloud Architect', desc: 'AWS, Kubernetes, Docker, Terraform & CI/CD automation', prompt: 'DevOps & Cloud Engineer with expertise in AWS infrastructure, Kubernetes orchestration, Docker, and zero-downtime CI/CD pipelines.' },
                      { role: '📊 Data Scientist / Analyst', desc: 'Python, SQL, Tableau, Predictive modeling & BI', prompt: 'Data Scientist with deep proficiency in SQL, Python, machine learning pipelines, predictive analytics, and enterprise BI dashboards.' },
                      { role: '🎨 UI/UX Product Designer', desc: 'Figma, Design Systems, User Research & Wireframing', prompt: 'Senior UI/UX Product Designer with expertise in Figma, design systems, interactive prototypes, and user research.' },
                      { role: '📱 Mobile Engineer', desc: 'React Native, Flutter, Swift, iOS & Android', prompt: 'Mobile Application Developer with 3+ years experience building cross-platform React Native and Flutter mobile apps.' },
                      { role: '🎓 Fresher / Graduate Developer', desc: 'Entry-level CS Graduate with solid DSA & Web Dev foundation', prompt: 'Entry-level Computer Science Graduate with strong foundations in Data Structures, Algorithms, React, JavaScript, and database management.' },
                      { role: '💼 Technical Product Manager', desc: 'Agile sprints, PRDs, Roadmap strategy & User metrics', prompt: 'Technical Product Manager with experience driving product lifecycles, user-centric feature discovery, and cross-functional engineering teams.' }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAiPrompt(item.prompt);
                        }}
                        className={`text-left p-3 rounded-xl border text-xs transition-all hover:scale-[1.01] group ${aiPrompt === item.prompt ? (isDark ? 'bg-violet-950/40 border-violet-500 text-white' : 'bg-violet-50 border-violet-400 text-violet-900') : (isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-violet-500/50' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-violet-400 shadow-xs')}`}
                      >
                        <p className="font-bold text-violet-500 text-xs mb-0.5 flex items-center justify-between">
                          <span>{item.role}</span>
                          <span className="text-[10px] opacity-0 group-hover:opacity-100 font-mono text-violet-400">Select →</span>
                        </p>
                        <p className={`text-[11px] line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* What AI will generate note */}
                <div className={`p-4 rounded-2xl border space-y-1.5 ${isDark ? 'bg-indigo-950/20 border-indigo-500/20' : 'bg-indigo-50/70 border-indigo-100'}`}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    <p className={`text-xs font-bold ${isDark ? 'text-violet-300' : 'text-violet-900'}`}>
                      What gets auto-generated:
                    </p>
                  </div>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    • High-impact summary • 2+ quantified experience roles with STAR bullet points • Academic background • Standardized skill sets • 2 technical projects with highlights
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className={`px-6 py-4 border-t flex gap-3 shrink-0 rounded-b-3xl ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  disabled={isGenerating}
                  className={`px-5 py-3 rounded-2xl font-mono font-bold text-xs border transition-colors ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAiGenerate()}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="flex-1 py-3.5 px-6 rounded-2xl font-mono font-bold text-xs text-white flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 border border-white/20"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #06b6d4 100%)',
                    boxShadow: '0 4px 20px rgba(124,58,237,0.40)'
                  }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing All Resume Sections…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate & Auto-Fill Entire Resume</span>
                    </>
                  )}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* 📥 AI Resume Importer Modal */}
      {isImportModalOpen && (
        <div
          className="print:hidden fixed inset-0 z-200 bg-slate-950/85 flex items-center justify-center p-4 md:p-6"
          onClick={(e) => e.target === e.currentTarget && setIsImportModalOpen(false)}
        >
          <div
            className={`border rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
          >
              {/* Header */}
              <div className={`px-6 py-5 border-b flex items-center justify-between rounded-t-3xl shrink-0 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Import Existing Resume</h3>
                    <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Upload PDF or image to extract and auto-fill your builder.</p>
                  </div>
                </div>
                <button onClick={() => { setIsImportModalOpen(false); setImportStep('idle'); setExtractedText(''); setImportText(''); }}
                  className={`p-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Step 1: Upload zone */}
                <div className="space-y-3">
                  <p className={`text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-black">1</span>
                    Upload PDF or Image
                  </p>

                  <label className={cn(
                    "flex flex-col items-center justify-center gap-3 w-full py-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all group",
                    importStep === 'extracting' ? "border-indigo-500 bg-indigo-500/10" : (isDark ? "bg-slate-950/60 border-slate-800 hover:border-indigo-500" : "bg-slate-50 border-slate-300 hover:border-indigo-500")
                  )}>
                    {importStep === 'extracting' ? (
                      <>
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        <p className="text-sm font-bold text-indigo-500">Extracting content with Gemini Vision…</p>
                        <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Parsing structured resume fields</p>
                      </>
                    ) : (
                      <>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                          <Upload className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="text-center">
                          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Drop PDF or screenshot here</p>
                          <p className={`text-[11px] font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>PDF, PNG, JPG, WEBP supported</p>
                        </div>
                        <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-mono font-bold shadow-md">Select File</span>
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
                            const { parseResumeFromImage } = await import('../services/aiService');
                            const base64 = await new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(reader.result as string);
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            });
                            const parsed = await parseResumeFromImage(base64, file.type || 'image/jpeg');
                            text = JSON.stringify(parsed, null, 2);
                          }
                          setExtractedText(text);
                          setImportStep('review');
                        } catch (err: any) {
                          alert(`Extraction failed: ${err.message}. Try pasting text directly.`);
                          setImportStep('idle');
                        }
                      }}
                    />
                  </label>

                  <div className="flex items-center gap-3">
                    <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>OR PASTE RAW TEXT</span>
                    <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  </div>
                </div>

                {/* Step 2: Extracted text review */}
                <div className="space-y-2">
                  <p className={`text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className={cn("w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-black",
                      importStep === 'review' ? "bg-indigo-600 text-white" : (isDark ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-600"))}>2</span>
                    Review Extracted Text
                    {importStep === 'review' && <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 rounded-full text-[9px] font-mono font-bold">✓ Parsed</span>}
                  </p>
                  <textarea
                    value={extractedText || importText}
                    onChange={(e) => { setExtractedText(e.target.value); setImportStep(e.target.value ? 'review' : 'idle'); }}
                    placeholder="Extracted text will appear here after upload, or paste text directly…"
                    className={`w-full h-48 rounded-2xl p-4 text-xs font-mono outline-none transition-all resize-none leading-relaxed border ${isDark ? 'bg-slate-950/80 border-slate-800 text-slate-200 placeholder-slate-600 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'}`}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className={`px-6 py-4 border-t flex gap-3 shrink-0 rounded-b-3xl ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <button onClick={() => { setIsImportModalOpen(false); setImportStep('idle'); setExtractedText(''); setImportText(''); }}
                  className={`px-5 py-3 rounded-2xl font-mono font-bold text-xs border transition-colors ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
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
                  className="flex-1 px-6 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-mono font-bold text-xs shadow-lg shadow-indigo-600/30 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-white/20"
                >
                  {isImporting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Filling Builder…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" />
                      <span>Auto-fill All Form Fields</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* 📸 Profile Photo Cropper Modal */}
      {showCropModal && cropImage && (
        <div
          className="print:hidden fixed inset-0 z-250 bg-slate-950/85 flex items-center justify-center p-4"
          onClick={() => setShowCropModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl border overflow-hidden shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
          >
              <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <h3 className="text-sm font-black">Crop Profile Photo</h3>
                <button onClick={() => setShowCropModal(false)} className="p-1.5 rounded-xl hover:bg-slate-500/15">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative h-72 w-full bg-slate-950">
                <Cropper
                  image={cropImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold opacity-70">Zoom</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    className="flex-1 accent-indigo-600"
                  />
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCropModal(false)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCroppedImage}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md"
                  >
                    Apply Headshot ✓
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* 🔗 Social Profile Sync Modal (GitHub / LinkedIn) */}
      {isSocialSyncOpen && (
        <div
          className="print:hidden fixed inset-0 z-250 bg-slate-950/85 flex items-center justify-center p-4"
          onClick={() => !isSyncing && setIsSocialSyncOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl border p-6 space-y-5 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
          >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Github className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black">Sync Developer Profiles</h3>
                    <p className="text-[11px] font-mono text-slate-400">Import repositories & career history</p>
                  </div>
                </div>
                <button onClick={() => !isSyncing && setIsSocialSyncOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-500/15">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <Input label="GitHub Username" value={githubUsername} onChange={setGithubUsername} placeholder="e.g. Aniketsingh-45" />
                <Input label="LinkedIn Profile URL" value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/in/yourname" />
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSocialSyncOpen(false)}
                  disabled={isSyncing}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${isDark ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSocialSync}
                  disabled={isSyncing || (!githubUsername.trim() && !linkedinUrl.trim())}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isSyncing ? 'Importing…' : 'Sync Into Resume'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* 🖨️ Dedicated Exact-Parity Print Root (Idle snapshot while editing = 0% print reflow lag; instant flush when printing) */}
      <div id="print-resume-root" aria-hidden="true" className="print-offscreen print:block print:w-full print:h-auto print:bg-white m-0 p-0">
        <ResumePreview
          content={(isPrinting ? resume.content : (printSnapshot.content || resume.content)) as ResumeContent}
          templateType={(isPrinting ? resume.templateType : printSnapshot.templateType) || 'modern-professional'}
          settings={isPrinting ? resume.settings : printSnapshot.settings}
        />
      </div>

    </div>
  );
}

const Input = React.memo(function Input({ label, value, onChange, placeholder, error, suggestions }: { label: string, value: string | undefined, onChange: (v: string) => void, placeholder?: string, error?: string, suggestions?: string[] }) {
  const listId = `suggestions-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const { isDark } = useTheme();
  const [localVal, setLocalVal] = useState(value || '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setLocalVal(value || '');
  }, [value]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleChange = (v: string) => {
    setLocalVal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChangeRef.current(v), 95);
  };

  return (
    <div className="space-y-1">
      <label className={`text-[10px] font-mono font-bold uppercase tracking-widest ml-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</label>
      <input
        value={localVal}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        list={suggestions ? listId : undefined}
        autoComplete={suggestions ? 'on' : 'off'}
        className={`w-full text-sm font-medium outline-none transition-colors duration-150 rounded-xl px-3.5 py-2.5 ${isDark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
        style={{
          background: error ? 'rgba(239,68,68,0.08)' : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
          border: `1px solid ${error ? 'rgba(239,68,68,0.50)' : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(203,213,225,0.90)')}`,
          boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
        }}
        onFocus={e => {
          e.target.style.borderColor = '#7c3aed';
          e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.18)';
        }}
        onBlur={e => {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
            onChangeRef.current(e.target.value);
          }
          e.target.style.borderColor = error ? 'rgba(239,68,68,0.50)' : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(203,213,225,0.90)');
          e.target.style.boxShadow = isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.03)';
        }}
      />
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((s, i) => <option key={i} value={s} />)}
        </datalist>
      )}
      {error && <p className="text-[10px] font-mono font-semibold mt-1 text-rose-500">{error}</p>}
    </div>
  );
});

const AutoRawInput = React.memo(function AutoRawInput({ value, onChange, className, placeholder }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  const [localVal, setLocalVal] = useState(value || '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => { setLocalVal(value || ''); }, [value]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <input
      value={localVal}
      placeholder={placeholder}
      className={className}
      onChange={e => {
        const v = e.target.value;
        setLocalVal(v);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onChangeRef.current(v), 95);
      }}
      onBlur={e => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
          onChangeRef.current(e.target.value);
        }
      }}
    />
  );
});

const AutoTextarea = React.memo(function AutoTextarea({ value, onChange, className, placeholder }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  const [localVal, setLocalVal] = useState(value || '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => { setLocalVal(value || ''); }, [value]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <textarea
      value={localVal}
      placeholder={placeholder}
      className={className}
      onChange={e => {
        const v = e.target.value;
        setLocalVal(v);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onChangeRef.current(v), 95);
      }}
      onBlur={e => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
          onChangeRef.current(e.target.value);
        }
      }}
    />
  );
});

const ProTip = React.memo(function ProTip({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();

  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-xl shadow-xs"
      style={{
        background: isDark ? 'rgba(124,58,237,0.10)' : 'rgba(124,58,237,0.07)',
        border: `1px solid ${isDark ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.20)'}`
      }}>
      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-violet-500" />
      <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        <span className="font-bold text-violet-600">Pro Tip: </span>{children}
      </p>
    </div>
  );
});

const TemplateThumbnail = React.memo(function TemplateThumbnail({ id, accent }: { id: string; accent: string }) {
  const isSidebarDark = id === 'modern-professional' || id === 'modern-photo';
  const isVibrantTop = id === 'creative-vibrant' || id === 'modern-creative';
  const isTech = id === 'tech-focused';
  const isBanner = id === 'executive-pro' || id === 'ats-harvard-ivy';
  const isRightSidebar = id === 'student-entry' || id === 'creative-vibrant' || id === 'modern-creative' || id === 'executive-pro';

  return (
    <div className="w-full h-24 rounded-xl bg-white border border-slate-200 p-2 overflow-hidden shadow-inner text-left flex flex-col gap-1">
      {isSidebarDark ? (
        <div className="flex h-full gap-1.5">
          <div className="w-1/3 h-full rounded-sm bg-slate-900 p-1.5 flex flex-col gap-1">
            {id === 'modern-photo' && <div className="w-5 h-5 rounded-full bg-slate-700 border border-white/40 mx-auto mb-0.5" />}
            <div className="h-1.5 w-4/5 rounded-full bg-white/85" />
            <div className="h-1 w-full rounded-full" style={{ backgroundColor: accent }} />
            <div className="h-1 w-2/3 rounded-full bg-white/30 mt-1" />
            <div className="h-1 w-3/4 rounded-full bg-white/25" />
          </div>
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: accent }} />
            <div className="h-1 w-full rounded-full bg-slate-200" />
            <div className="h-1 w-4/5 rounded-full bg-slate-200" />
            <div className="h-1.5 w-2/5 rounded-full mt-1" style={{ backgroundColor: accent }} />
            <div className="grid grid-cols-2 gap-1">
              <div className="h-3.5 rounded-sm bg-slate-50 border border-slate-200" />
              <div className="h-3.5 rounded-sm bg-slate-50 border border-slate-200" />
            </div>
          </div>
        </div>
      ) : isVibrantTop ? (
        <div className="space-y-1.5 h-full">
          <div className="rounded-sm p-1.5" style={{ backgroundColor: accent }}>
            <div className="h-1.5 w-1/2 rounded-full bg-white/95 mb-0.5" />
            <div className="h-1 w-1/3 rounded-full bg-white/70" />
          </div>
          <div className="flex gap-1.5 h-10">
            <div className="flex-1 space-y-1">
              <div className="h-1 w-2/3 rounded-full" style={{ backgroundColor: accent }} />
              <div className="h-1 w-full rounded-full bg-slate-200" />
              <div className="h-1 w-5/6 rounded-full bg-slate-200" />
            </div>
            <div className="w-1/3 space-y-1 border-l border-slate-200 pl-1">
              <div className="h-1.5 w-full rounded-sm" style={{ backgroundColor: `${accent}30` }} />
              <div className="h-1.5 w-4/5 rounded-sm" style={{ backgroundColor: `${accent}20` }} />
            </div>
          </div>
        </div>
      ) : isTech ? (
        <div className="space-y-1.5 h-full bg-slate-50/70 rounded p-1">
          <div className="rounded-sm bg-slate-900 p-1.5">
            <div className="h-1.5 w-1/2 rounded-full mb-0.5" style={{ backgroundColor: accent }} />
            <div className="h-1 w-2/3 rounded-full bg-white/40" />
          </div>
          <div className="h-1 w-1/3 rounded-full bg-slate-400" />
          <div className="grid grid-cols-2 gap-1">
            <div className="h-4 rounded-sm bg-white border border-slate-200" />
            <div className="h-4 rounded-sm bg-white border border-slate-200" />
          </div>
        </div>
      ) : isRightSidebar ? (
        <div className="space-y-1.5 h-full">
          <div className={cn('pb-1 border-b-2', isBanner ? 'text-center' : 'flex justify-between items-center')} style={{ borderColor: accent }}>
            <div className={cn('h-2 w-1/2 rounded-full bg-slate-900', isBanner && 'mx-auto')} />
          </div>
          <div className="flex gap-1.5 h-12">
            <div className="flex-1 space-y-1">
              <div className="h-1 w-1/3 rounded-full" style={{ backgroundColor: accent }} />
              <div className="h-1 w-full rounded-full bg-slate-200" />
              <div className="h-1 w-4/5 rounded-full bg-slate-200" />
            </div>
            <div className="w-1/3 space-y-1 border-l border-slate-200 pl-1">
              <div className="h-1 w-full rounded-full" style={{ backgroundColor: accent }} />
              <div className="h-1 w-3/4 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1 h-full">
          <div className={cn('pb-1 border-b-2', id === 'minimalist-clean' || id === 'executive-minimal' ? 'text-left' : 'text-center')} style={{ borderColor: id === 'minimalist-clean' ? '#1e293b' : accent }}>
            <div className={cn('h-2 w-1/2 rounded-full bg-slate-900 mb-0.5', id !== 'minimalist-clean' && id !== 'executive-minimal' && 'mx-auto')} />
            <div className={cn('h-1 w-2/3 rounded-full bg-slate-300', id !== 'minimalist-clean' && id !== 'executive-minimal' && 'mx-auto')} />
          </div>
          <div className="space-y-1">
            <div className="h-1 w-1/4 rounded-full" style={{ backgroundColor: accent }} />
            <div className="h-1 w-full rounded-full bg-slate-200" />
            <div className="h-1 w-5/6 rounded-full bg-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-1 pt-0.5">
            <div className="h-4 rounded-sm bg-slate-50 border border-slate-200" />
            <div className="h-4 rounded-sm bg-slate-50 border border-slate-200" />
          </div>
        </div>
      )}
    </div>
  );
});