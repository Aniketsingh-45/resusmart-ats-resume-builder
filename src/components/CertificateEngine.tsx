import React, { useState, useEffect } from 'react';
import { db, collection, query, onSnapshot, auth } from '../firebase';
import { Certification, Resume } from '../types';
import { recommendCertifications } from '../services/aiService';
import { 
  GraduationCap, TrendingUp, ExternalLink, 
  Search, Loader2, Sparkles, DollarSign,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

export function CertificateEngine() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [targetRole, setTargetRole] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;
    // Fetch user's latest resume to get skills
    const q = query(collection(db, 'resumes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resumes = snapshot.docs.map(doc => doc.data() as Resume);
      const latest = resumes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      if (latest) {
        setUserSkills(latest.content.skills);
      }
    });
    return unsubscribe;
  }, []);

  const getRecommendations = async () => {
    if (!targetRole) return;
    setLoading(true);
    try {
      const recs = await recommendCertifications(userSkills, targetRole);
      setRecommendations(recs);
    } catch (error) {
      console.error("Failed to get recommendations", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto overflow-x-hidden">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Certificate Intelligence</h2>
        <p className="text-slate-500">Identify high-impact certifications to boost your career ROI.</p>
      </div>

      {/* Search Header */}
      <div className="bg-slate-900 p-8 rounded-[32px] flex flex-col md:flex-row gap-6 items-end shadow-xl">
        <div className="flex-1 space-y-2 w-full">
          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Target Job Title</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Cloud Engineer, Product Manager..."
              className="w-full bg-slate-800 border-none py-4 pl-12 pr-4 text-white rounded-2xl text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            />
          </div>
        </div>
        <button
          onClick={getRecommendations}
          disabled={loading || !targetRole}
          className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-lg shadow-brand-900/20 hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Analyze Gaps
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-brand-600" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Scanning industry trends...</p>
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((rec, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-slate-200 p-8 rounded-[32px] space-y-6 flex flex-col group hover:shadow-xl hover:border-brand-200 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{rec.provider}</p>
                  <h4 className="text-xl font-bold text-slate-900 leading-tight">{rec.name}</h4>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  rec.impact === 'high' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                )}>
                  {rec.impact} Impact
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Strategic Value</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{rec.why}</p>
                </div>

                <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-900">+15% ROI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-500" />
                    <span className="text-xs font-bold text-slate-900">Trending</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {rec.freeSource && (
                  <a 
                    href={rec.freeSource} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all active:scale-95"
                  >
                    Free Source <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button className="flex-1 border-2 border-slate-100 py-4 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95">
                  Add to Roadmap
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center space-y-6 text-center px-6">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
            <GraduationCap className="w-10 h-10" />
          </div>
          <div className="max-w-xs">
            <p className="text-lg font-bold text-slate-900">Intelligence Engine Idle</p>
            <p className="text-sm text-slate-500 mt-1">Enter your target role to identify certification gaps and ROI-positive learning paths.</p>
          </div>
        </div>
      )}

      {/* Industry Trending Sidebar (Mock for now) */}
      <div className="pt-12 border-t border-[#141414]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-mono uppercase tracking-widest font-bold">Industry Trending (Monthly)</h3>
          <span className="text-[10px] font-mono opacity-50 uppercase">Updated: March 2026</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['AWS Certified Solutions Architect', 'PMP Certification', 'Google Data Analytics', 'CompTIA Security+'].map((cert, i) => (
            <div key={i} className="p-4 bg-[#141414]/5 border border-[#141414]/5 space-y-2">
              <p className="text-[9px] font-mono uppercase opacity-50">#{i+1} Trending</p>
              <p className="text-xs font-mono font-bold leading-tight">{cert}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
