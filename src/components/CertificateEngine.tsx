import React, { useState, useEffect } from 'react';
import { db, collection, query, onSnapshot, auth } from '../firebase';
import { Certification, Resume } from '../types';
import { recommendCertifications } from '../services/aiService';
import {
  GraduationCap, TrendingUp, ExternalLink,
  Search, Loader2, Sparkles, DollarSign,
  Award, BookOpen, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useTheme } from '../context/ThemeContext';

export function CertificateEngine() {
  const { isDark } = useTheme();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [targetRole, setTargetRole] = useState('Senior Full Stack Engineer');

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'resumes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resumes = snapshot.docs.map(doc => doc.data() as Resume);
      const latest = resumes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      if (latest) setUserSkills(latest.content.skills || []);
    });
    return unsubscribe;
  }, []);

  const getRecommendations = async (roleOverride?: string) => {
    const role = roleOverride || targetRole;
    if (!role) return;
    setLoading(true);
    try {
      const recs = await recommendCertifications(userSkills, role);
      setRecommendations(recs);
    } catch (error) {
      console.error("Failed to get recommendations", error);
    } finally {
      setLoading(false);
    }
  };

  const quickRoles = [
    'Cloud Architect', 'Full Stack Developer', 'Data Scientist',
    'DevOps Engineer', 'Cybersecurity Specialist', 'AI/ML Engineer'
  ];

  const trending = [
    { title: 'AWS Solutions Architect Professional', rank: '#1', category: 'Cloud', color: isDark ? 'rgba(251,191,36,0.15)' : '#fffbeb', border: isDark ? 'rgba(251,191,36,0.25)' : '#fde68a', accent: isDark ? '#fde68a' : '#b45309' },
    { title: 'Certified Kubernetes Administrator', rank: '#2', category: 'DevOps', color: isDark ? 'rgba(96,165,250,0.12)' : '#eff6ff', border: isDark ? 'rgba(96,165,250,0.25)' : '#bfdbfe', accent: isDark ? '#93c5fd' : '#1d4ed8' },
    { title: 'Google Professional Data Engineer', rank: '#3', category: 'Data & AI', color: isDark ? 'rgba(52,211,153,0.12)' : '#ecfdf5', border: isDark ? 'rgba(52,211,153,0.25)' : '#a7f3d0', accent: isDark ? '#6ee7b7' : '#047857' },
    { title: 'CompTIA Security+ / CISSP', rank: '#4', category: 'Security', color: isDark ? 'rgba(251,113,133,0.12)' : '#fff1f2', border: isDark ? 'rgba(251,113,133,0.25)' : '#fecdd3', accent: isDark ? '#fca5a5' : '#be123c' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 transition-colors duration-300">

      {/* ── Page Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 transition-colors duration-300"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.12) 60%, rgba(124,58,237,0.10) 100%)'
            : 'linear-gradient(135deg, #ecfdf5 0%, #e0f2fe 60%, #ede9fe 100%)',
          border: isDark ? '1px solid rgba(52,211,153,0.22)' : '1px solid #a7f3d0',
          boxShadow: isDark ? '0 0 60px rgba(16,185,129,0.08)' : '0 10px 30px rgba(16,185,129,0.06)',
        }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: isDark ? 'rgba(52,211,153,0.15)' : '#ffffff',
                border: isDark ? '1px solid rgba(52,211,153,0.25)' : '1px solid #a7f3d0',
                color: isDark ? '#6ee7b7' : '#059669'
              }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ROI Career Accelerator
            </span>
            <h1 className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif', letterSpacing: '-0.02em' }}>
              Certificate Intelligence Engine
            </h1>
            <p className={`text-sm max-w-xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Identify high-value credentials that maximize salary ROI and bridge skill gaps for your target role.
            </p>
          </div>

          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl flex-shrink-0 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-emerald-200 shadow-sm'}`}>
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <div>
              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Smart Gap Scanner</p>
              <p className="text-[10px] font-mono text-emerald-500 font-bold">Active</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Search Box ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl p-5 sm:p-6 space-y-4 transition-colors duration-300 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-slate-200 shadow-sm'}`}
      >
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1.5 w-full">
            <label className={`text-[10px] font-bold font-mono uppercase tracking-widest block ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
              Target Position / Role
            </label>
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && getRecommendations()}
                placeholder="e.g. Staff Cloud Engineer, Lead ML Scientist..."
                className={`w-full py-3.5 pl-11 pr-4 rounded-xl text-sm outline-none transition-all font-medium ${isDark ? 'text-white bg-slate-950/70 border border-white/10 placeholder-slate-600 focus:border-indigo-500' : 'text-slate-900 bg-slate-50 border border-slate-200 placeholder-slate-400 focus:border-indigo-500'}`}
              />
            </div>
          </div>
          <button
            onClick={() => getRecommendations()}
            disabled={loading || !targetRole.trim()}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white flex-shrink-0 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Analyze Role Gaps
          </button>
        </div>

        {/* Quick role pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className={`text-[10px] font-mono font-bold mr-1 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Quick:</span>
          {quickRoles.map((role, i) => (
            <button
              key={i}
              onClick={() => { setTargetRole(role); getRecommendations(role); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isDark ? 'text-slate-300 bg-white/5 border border-white/10 hover:bg-violet-600/20 hover:text-white' : 'text-slate-700 bg-slate-100 border border-slate-200 hover:bg-violet-50 hover:text-violet-700'}`}
            >
              {role}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Results ── */}
      {loading ? (
        <div className={`py-20 text-center space-y-4 rounded-3xl ${isDark ? 'bg-white/[0.02] border border-white/[0.07]' : 'bg-white border border-slate-200 shadow-sm'}`}>
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-violet-500" />
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Scanning certification roadmaps...</p>
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence>
            {recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className={`relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between group transition-all ${isDark ? 'border border-white/10 shadow-2xl' : 'bg-white border border-slate-200 shadow-sm'}`}
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(19,24,38,0.85) 0%, rgba(8,11,19,0.92) 100%)'
                    : '#ffffff',
                }}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className={`text-[9px] font-bold font-mono uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {rec.provider || 'Accredited Issuer'}
                      </span>
                      <h3 className={`text-base font-bold leading-snug transition-colors ${isDark ? 'text-white group-hover:text-violet-200' : 'text-slate-900 group-hover:text-violet-700'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
                        {rec.name}
                      </h3>
                    </div>
                    <span className={cn('px-2.5 py-1 rounded-lg text-[9px] font-bold font-mono flex-shrink-0 uppercase tracking-wider',
                      rec.impact === 'high' ? (isDark ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border border-emerald-200') :
                      (isDark ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-amber-700 bg-amber-50 border border-amber-200')
                    )}>
                      {rec.impact || 'High'} Impact
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className={`text-[10px] font-bold font-mono uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Why it matters</p>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{rec.why}</p>
                  </div>
                </div>

                <div className={`space-y-3 mt-5 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      <DollarSign className="w-4 h-4" />
                      +15–25% Salary Value
                    </span>
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                      <TrendingUp className="w-4 h-4" />
                      High Demand
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {rec.freeSource && (
                      <a
                        href={rec.freeSource}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isDark ? 'text-slate-300 hover:text-white bg-white/5 border border-white/10' : 'text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200'}`}
                        onClick={e => e.stopPropagation()}
                      >
                        <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                        Free Course
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); alert(`"${rec.name}" noted! Add it under Certifications in Resume Studio.`); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isDark ? 'text-violet-300 hover:text-white bg-violet-600/15 border border-violet-500/25' : 'text-violet-700 hover:text-violet-900 bg-violet-50 border border-violet-200'}`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      Save to Target
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className={`py-16 flex flex-col items-center gap-5 rounded-3xl text-center px-6 ${isDark ? 'bg-white/[0.02] border-2 border-dashed border-white/[0.07]' : 'bg-white border-2 border-dashed border-slate-200'}`}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: isDark ? 'rgba(52,211,153,0.10)' : '#d1fae5', border: isDark ? '1px solid rgba(52,211,153,0.20)' : '1px solid #a7f3d0' }}>
            <GraduationCap className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <p className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Engine Ready</p>
            <p className="text-xs text-slate-500 max-w-xs">Enter your target role or pick a preset to analyze certification gaps.</p>
          </div>
        </div>
      )}

      {/* ── Trending Certs ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>Global Trending Certifications</h3>
          <span className="text-[10px] font-mono text-violet-500 font-bold uppercase tracking-wider">Quarterly Verified</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {trending.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="p-4 rounded-xl space-y-2 transition-colors duration-300"
              style={{ background: item.color, border: `1px solid ${item.border}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold font-mono uppercase tracking-wider" style={{ color: item.accent }}>{item.rank}</span>
                <span className="text-[9px] font-mono text-slate-500">{item.category}</span>
              </div>
              <p className={`text-xs font-semibold leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.title}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

