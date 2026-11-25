import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, auth } from '../firebase';
import { Resume } from '../types';
import {
  Plus, FileText, TrendingUp, Clock,
  Award, Sparkles, Edit2, Trash2, Zap, Briefcase, CheckCircle2, ArrowRight
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { cn } from '../utils/cn';
import { useTheme } from '../context/ThemeContext';

interface DashboardProps {
  onEdit: (id: string) => void;
  onCreateNew: (templateId?: string) => void;
}

const GUEST_STORAGE_KEY = 'resusmart_guest_resumes';

const FEATURED_TEMPLATES = [
  { id: 'classic-chronological', name: 'Classic ATS', tag: '100% ATS', accent: '#2563eb', layout: 'classic', desc: 'Gold standard single-column' },
  { id: 'ats-harvard-ivy', name: 'Harvard Ivy', tag: '100% ATS', accent: '#1e3a8a', layout: 'ivy', desc: 'Crisp serif executive layout' },
  { id: 'ats-jake-clean', name: 'SWE Clean Pro', tag: '100% ATS', accent: '#0f766e', layout: 'jake', desc: 'High-density tech layout' },
  { id: 'minimalist-clean', name: 'Minimalist Clean', tag: '100% ATS', accent: '#0f172a', layout: 'minimal', desc: 'Zero-glitch universal text' },
  { id: 'modern-professional', name: 'Modern Dark Sidebar', tag: '99% ATS', accent: '#7c3aed', layout: 'sidebar', desc: 'Split contrast dark column' },
  { id: 'executive-pro', name: 'Executive Banner', tag: '99% ATS', accent: '#831843', layout: 'banner', desc: 'Centered header + 2-pane' },
];

export function Dashboard({ onEdit, onCreateNew }: DashboardProps) {
  const { isDark } = useTheme();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGuest = () => {
      try {
        const raw = localStorage.getItem(GUEST_STORAGE_KEY);
        setResumes(raw ? JSON.parse(raw) : []);
      } catch {
        setResumes([]);
      }
      setLoading(false);
    };

    if (!auth.currentUser) {
      loadGuest();
      const onGuestUpdate = () => loadGuest();
      window.addEventListener('resusmart_guest_updated', onGuestUpdate);
      return () => window.removeEventListener('resusmart_guest_updated', onGuestUpdate);
    }

    const q = query(collection(db, 'resumes'), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Resume));
      docs.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      setResumes(docs);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateGuestResume = (resumeId: string, patch: Partial<Resume>) => {
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      const list: Resume[] = raw ? JSON.parse(raw) : [];
      const next = list.map(r => (r.id === resumeId ? { ...r, ...patch } : r));
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(next));
      setResumes(next);
    } catch {}
  };

  const handleTrackApplication = async (e: React.MouseEvent, resumeId: string, currentApps: number) => {
    e.stopPropagation();
    if (!auth.currentUser) {
      updateGuestResume(resumeId, { applications: currentApps + 1 });
      return;
    }
    try { await setDoc(doc(db, 'resumes', resumeId), { applications: currentApps + 1 }, { merge: true }); }
    catch (error) { console.error('Failed to track application:', error); }
  };

  const handleTrackInterview = async (e: React.MouseEvent, resumeId: string, currentInterviews: number) => {
    e.stopPropagation();
    if (!auth.currentUser) {
      updateGuestResume(resumeId, { interviews: currentInterviews + 1 });
      return;
    }
    try { await setDoc(doc(db, 'resumes', resumeId), { interviews: currentInterviews + 1 }, { merge: true }); }
    catch (error) { console.error('Failed to track interview:', error); }
  };

  const handleDelete = async (e: React.MouseEvent, resumeId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this resume?')) return;
    if (!auth.currentUser) {
      try {
        const raw = localStorage.getItem(GUEST_STORAGE_KEY);
        const list: Resume[] = raw ? JSON.parse(raw) : [];
        const next = list.filter(r => r.id !== resumeId);
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(next));
        setResumes(next);
      } catch {}
      return;
    }
    try { await deleteDoc(doc(db, 'resumes', resumeId)); }
    catch (error) { console.error('Failed to delete resume:', error); }
  };

  const totalApplications = resumes.reduce((acc, r) => acc + (r.applications || 0), 0);
  const totalInterviews   = resumes.reduce((acc, r) => acc + (r.interviews   || 0), 0);
  const successRate = totalApplications > 0 ? Math.round((totalInterviews / totalApplications) * 100) : 0;
  const avgScore    = resumes.length > 0 ? Math.round(resumes.reduce((acc, r) => acc + (r.atsScore || 0), 0) / resumes.length) : 0;

  const stats = [
    { label: 'Resumes',        value: resumes.length,                      sub: 'Active docs',              icon: FileText,   bg: isDark ? 'linear-gradient(135deg, rgba(124,58,237,0.20), rgba(79,70,229,0.10))' : 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: isDark ? 'rgba(139,92,246,0.30)' : '#ddd6fe', iconBg: isDark ? 'rgba(139,92,246,0.20)' : '#e0e7ff', iconColor: isDark ? '#c4b5fd' : '#6366f1' },
    { label: 'Avg ATS Score',  value: avgScore > 0 ? `${avgScore}%` : '--', sub: avgScore >= 80 ? 'Excellent' : avgScore >= 60 ? 'Good' : 'Ready to scan', icon: Award,      bg: isDark ? 'linear-gradient(135deg, rgba(16,185,129,0.20), rgba(6,182,212,0.10))' : 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: isDark ? 'rgba(52,211,153,0.30)' : '#a7f3d0',  iconBg: isDark ? 'rgba(52,211,153,0.20)' : '#ccfbf1',  iconColor: isDark ? '#6ee7b7' : '#059669' },
    { label: 'Applications',   value: totalApplications,                    sub: 'Tracked sends',            icon: Briefcase,  bg: isDark ? 'linear-gradient(135deg, rgba(59,130,246,0.20), rgba(99,102,241,0.10))' : 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: isDark ? 'rgba(96,165,250,0.30)' : '#bfdbfe',  iconBg: isDark ? 'rgba(96,165,250,0.20)' : '#e0e7ff',  iconColor: isDark ? '#93c5fd' : '#2563eb' },
    { label: 'Interview Rate', value: `${successRate}%`,                    sub: `${totalInterviews} interviews`, icon: TrendingUp, bg: isDark ? 'linear-gradient(135deg, rgba(245,158,11,0.20), rgba(249,115,22,0.10))' : 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: isDark ? 'rgba(251,191,36,0.30)' : '#fde68a', iconBg: isDark ? 'rgba(251,191,36,0.20)' : '#fef9c3', iconColor: isDark ? '#fde68a' : '#d97706' },
  ];

  const userName = auth.currentUser?.displayName?.split(' ')[0] || 'Explorer';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 relative transition-colors duration-300">

      {/* Hero Banner */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(79,70,229,0.12) 50%, rgba(6,182,212,0.08) 100%)'
            : 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 50%, #e0f2fe 100%)',
          border: isDark ? '1px solid rgba(124,58,237,0.26)' : '1px solid rgba(199,210,254,0.90)',
          boxShadow: isDark
            ? '0 10px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 10px 30px rgba(124,58,237,0.08)',
        }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: isDark ? 'rgba(124,58,237,0.20)' : '#ffffff',
                border: isDark ? '1px solid rgba(124,58,237,0.30)' : '1px solid #c7d2fe',
                color: isDark ? '#c4b5fd' : '#6366f1'
              }}>
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              Career Command Center • 12 Pro Templates
            </div>
            <h1 className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif', letterSpacing: '-0.02em' }}>
              Welcome back, <span className="text-gradient">{userName}</span>!
            </h1>
            <p className={`text-sm font-medium max-w-lg ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Build 100% ATS-verified single-page or multi-page resumes with live preview, AI bullets, and crisp PDF export.
            </p>
          </div>

          <button
            onClick={() => onCreateNew('classic-chronological')}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg hover:brightness-110 transition-colors shrink-0"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #0ea5e9 100%)',
              boxShadow: '0 8px 24px rgba(124,58,237,0.35)',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>New Resume</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl p-5 group"
            style={{
              background: stat.bg,
              border: `1px solid ${stat.border}`,
              boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.30)' : '0 4px 12px rgba(0,0,0,0.04)',
            }}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{stat.label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: stat.iconBg, border: `1px solid ${stat.border}` }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.iconColor }} />
                </div>
              </div>
              <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
              <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 100% ATS Template Quick Launcher */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
              Start from a 100% ATS & Curated Template
            </h2>
          </div>
          <button
            onClick={() => onCreateNew('classic-chronological')}
            className="text-xs font-bold text-violet-500 hover:text-violet-400 flex items-center gap-1"
          >
            <span>Browse all 12</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {FEATURED_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onCreateNew(tpl.id)}
              className={cn(
                'p-3 rounded-2xl border text-left transition-all duration-150 hover:-translate-y-0.5 flex flex-col justify-between group',
                isDark ? 'bg-slate-900/75 border-slate-800 hover:border-violet-500/60 hover:bg-slate-900' : 'bg-white border-slate-200 hover:border-violet-400 shadow-xs hover:shadow-md'
              )}
            >
              {/* Miniature Visual Thumbnail */}
              <div className="w-full h-24 rounded-xl bg-white border border-slate-200/90 p-2 mb-2.5 overflow-hidden relative shadow-inner">
                {tpl.layout === 'sidebar' ? (
                  <div className="flex h-full gap-1.5">
                    <div className="w-1/3 h-full rounded-sm bg-slate-900 p-1 space-y-1">
                      <div className="h-1.5 w-3/4 rounded-full bg-white/80" />
                      <div className="h-1 w-full rounded-full" style={{ backgroundColor: tpl.accent }} />
                      <div className="h-1 w-4/5 rounded-full bg-white/30" />
                    </div>
                    <div className="flex-1 space-y-1.5 pt-0.5">
                      <div className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: tpl.accent }} />
                      <div className="h-1 w-full rounded-full bg-slate-200" />
                      <div className="h-1 w-5/6 rounded-full bg-slate-200" />
                      <div className="h-1.5 w-1/3 rounded-full mt-2" style={{ backgroundColor: tpl.accent }} />
                      <div className="grid grid-cols-2 gap-1">
                        <div className="h-4 rounded-sm bg-slate-100 border border-slate-200" />
                        <div className="h-4 rounded-sm bg-slate-100 border border-slate-200" />
                      </div>
                    </div>
                  </div>
                ) : tpl.layout === 'banner' ? (
                  <div className="space-y-1.5 h-full">
                    <div className="text-center pb-1 border-b-2" style={{ borderColor: tpl.accent }}>
                      <div className="h-2 w-2/3 mx-auto rounded-full bg-slate-900 mb-0.5" />
                      <div className="h-1 w-1/2 mx-auto rounded-full bg-slate-400" />
                    </div>
                    <div className="flex gap-1.5 h-12">
                      <div className="flex-1 space-y-1">
                        <div className="h-1 w-full rounded-full bg-slate-300" />
                        <div className="h-1 w-4/5 rounded-full bg-slate-200" />
                      </div>
                      <div className="w-1/3 space-y-1 border-l border-slate-200 pl-1">
                        <div className="h-1 w-full rounded-full" style={{ backgroundColor: tpl.accent }} />
                        <div className="h-1 w-full rounded-full bg-slate-200" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 h-full">
                    <div className={cn('pb-1 border-b', tpl.layout === 'minimal' ? 'text-left border-slate-800' : 'text-center border-slate-900')}>
                      <div className={cn('h-2 w-2/3 rounded-full bg-slate-900 mb-0.5', tpl.layout !== 'minimal' && 'mx-auto')} />
                      <div className={cn('h-1 w-1/2 rounded-full', tpl.layout !== 'minimal' && 'mx-auto')} style={{ backgroundColor: tpl.accent }} />
                    </div>
                    <div className="space-y-1">
                      <div className="h-1 w-1/3 rounded-full" style={{ backgroundColor: tpl.accent }} />
                      <div className="h-1 w-full rounded-full bg-slate-200" />
                      <div className="h-1 w-5/6 rounded-full bg-slate-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-0.5">
                      <div className="h-4 rounded-sm bg-slate-50 border border-slate-200" />
                      <div className="h-4 rounded-sm bg-slate-50 border border-slate-200" />
                    </div>
                  </div>
                )}

                <span
                  className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-mono font-black text-white shadow-sm"
                  style={{ backgroundColor: tpl.tag === '100% ATS' ? '#059669' : tpl.accent }}
                >
                  {tpl.tag}
                </span>
              </div>

              <div>
                <p className={`text-xs font-bold leading-tight group-hover:text-violet-500 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>{tpl.name}</p>
                <p className={`text-[10px] mt-0.5 line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tpl.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ATS Tip Banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 flex items-start gap-4"
        style={{
          background: isDark ? 'rgba(124,58,237,0.10)' : 'rgba(238,242,255,0.90)',
          border: isDark ? '1px solid rgba(124,58,237,0.22)' : '1px solid rgba(199,210,254,0.80)'
        }}
      >
        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>ATS Algorithm Tip</h4>
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold font-mono"
              style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)', color: isDark ? '#fde68a' : '#b45309' }}>
              +18% Score
            </span>
          </div>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Enable <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Fit 1-Page</strong> and <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>2-Column Project Grid</strong> in Resume Studio to automatically scale content onto 1 clean A4 page with zero clipped words and clickable URLs.
          </p>
        </div>
      </div>

      {/* Resume Documents */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>Your Resumes</h2>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold font-mono ${isDark ? 'text-slate-400 bg-white/5 border border-white/10' : 'text-slate-700 bg-slate-100 border border-slate-200'}`}>
              {resumes.length}
            </span>
          </div>
          <button
            onClick={() => onCreateNew('classic-chronological')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${isDark ? 'text-violet-300 hover:text-white bg-violet-600/15 border border-violet-500/25' : 'text-violet-700 hover:text-violet-900 bg-violet-50 border border-violet-200'}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {loading ? (
          <div className={`py-20 flex flex-col items-center gap-4 rounded-3xl ${isDark ? 'bg-white/[0.03] border border-white/[0.07]' : 'bg-white border border-slate-200 shadow-sm'}`}>
            <div className="w-8 h-8 border-2 border-violet-500/40 border-t-violet-400 rounded-full animate-spin" />
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Loading portfolio...</p>
          </div>
        ) : resumes.length === 0 ? (
          <div
            className={`py-16 flex flex-col items-center gap-5 rounded-3xl text-center px-6 ${isDark ? 'bg-white/[0.02] border-2 border-dashed border-white/[0.08]' : 'bg-white border-2 border-dashed border-slate-200'}`}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: isDark ? 'rgba(124,58,237,0.12)' : '#ede9fe', border: isDark ? '1px solid rgba(124,58,237,0.20)' : '1px solid #c7d2fe' }}>
              <CheckCircle2 className="w-8 h-8 text-violet-500" />
            </div>
            <div>
              <p className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>No saved resumes yet</p>
              <p className={`text-xs max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pick any 100% ATS template above or create a new resume in seconds.</p>
            </div>
            <button
              onClick={() => onCreateNew('classic-chronological')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white shadow-md hover:brightness-110 transition-colors"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              <Plus className="w-4 h-4" />
              Create First Resume
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                onClick={() => onEdit(resume.id!)}
                className="group relative overflow-hidden rounded-2xl p-5 cursor-pointer flex flex-col justify-between transition-colors hover:-translate-y-0.5"
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(19,24,38,0.92) 0%, rgba(8,11,19,0.96) 100%)'
                    : '#ffffff',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                  boxShadow: isDark ? '0 4px 18px rgba(0,0,0,0.35)' : '0 4px 16px rgba(0,0,0,0.05)',
                }}
              >
                <div className="space-y-4 relative z-10">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                      style={{
                        background: isDark ? 'rgba(124,58,237,0.15)' : '#ede9fe',
                        border: isDark ? '1px solid rgba(124,58,237,0.25)' : '1px solid #c7d2fe'
                      }}>
                      <FileText className="w-5 h-5 text-violet-500" />
                    </div>

                    {resume.atsScore ? (
                      <span className={cn(
                        'px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono shrink-0',
                        resume.atsScore >= 80 ? (isDark ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border border-emerald-200') :
                        resume.atsScore >= 60 ? (isDark ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-amber-700 bg-amber-50 border border-amber-200') :
                        (isDark ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : 'text-rose-700 bg-rose-50 border border-rose-200')
                      )}>
                        {resume.atsScore}% ATS
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono ${isDark ? 'text-slate-500 bg-white/5 border border-white/10' : 'text-slate-500 bg-slate-100 border border-slate-200'}`}>
                        Draft
                      </span>
                    )}
                  </div>

                  {/* Title & date */}
                  <div>
                    <h3 className={`text-base font-bold transition-colors line-clamp-1 ${isDark ? 'text-white group-hover:text-violet-200' : 'text-slate-900 group-hover:text-violet-700'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
                      {resume.title || 'Untitled Resume'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5 text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span className="text-[11px] font-mono">
                        {new Date(resume.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Application metrics */}
                  <div className={`grid grid-cols-2 gap-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <button
                      onClick={(e) => handleTrackApplication(e, resume.id!, resume.applications || 0)}
                      className={`flex flex-col items-center p-2.5 rounded-xl transition-all ${isDark ? 'bg-white/5 border border-white/10 hover:bg-violet-600/15' : 'bg-slate-50 border border-slate-200 hover:bg-violet-50'}`}
                    >
                      <span className={`text-base font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{resume.applications || 0}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">+ Applied</span>
                    </button>
                    <button
                      onClick={(e) => handleTrackInterview(e, resume.id!, resume.interviews || 0)}
                      className={`flex flex-col items-center p-2.5 rounded-xl transition-all ${isDark ? 'bg-white/5 border border-white/10 hover:bg-emerald-600/15' : 'bg-slate-50 border border-slate-200 hover:bg-emerald-50'}`}
                    >
                      <span className={`text-base font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{resume.interviews || 0}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">+ Interview</span>
                    </button>
                  </div>
                </div>

                {/* Action row */}
                <div className={`flex items-center justify-between mt-4 pt-4 relative z-10 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(resume.id!); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Open Studio
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, resume.id!)}
                    className={`p-2 rounded-xl transition-all ${isDark ? 'text-slate-500 hover:text-rose-400 border border-white/10 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-600 border border-slate-200 hover:bg-rose-50'}`}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
