import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot } from '../firebase';
import { auth } from '../firebase';
import { Resume } from '../types';
import { Plus, FileText, TrendingUp, AlertCircle, ArrowRight, Clock, Award, Sparkles, Eye, Download, Target, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface DashboardProps {
  onEdit: (id: string) => void;
  onCreateNew: () => void;
}

export function Dashboard({ onEdit, onCreateNew }: DashboardProps) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'resumes'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resume));
      setResumes(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleTrackApplication = async (e: React.MouseEvent, resumeId: string, currentApps: number) => {
    e.stopPropagation();
    try {
      const resumeRef = doc(db, 'resumes', resumeId);
      await setDoc(resumeRef, { applications: currentApps + 1 }, { merge: true });
    } catch (error) {
      console.error("Failed to track application:", error);
    }
  };

  const handleTrackInterview = async (e: React.MouseEvent, resumeId: string, currentInterviews: number) => {
    e.stopPropagation();
    try {
      const resumeRef = doc(db, 'resumes', resumeId);
      await setDoc(resumeRef, { interviews: currentInterviews + 1 }, { merge: true });
    } catch (error) {
      console.error("Failed to track interview:", error);
    }
  };

  const navigate = (path: string) => {
    // In this app, we use onEdit for navigation to editor
    const id = path.split('/').pop();
    if (id) onEdit(id);
  };

  const handleDelete = async (e: React.MouseEvent, resumeId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    try {
      await deleteDoc(doc(db, 'resumes', resumeId));
    } catch (error) {
      console.error("Failed to delete resume:", error);
    }
  };

  const totalApplications = resumes.reduce((acc, r) => acc + (r.applications || 0), 0);
  const totalInterviews = resumes.reduce((acc, r) => acc + (r.interviews || 0), 0);
  const successRate = totalApplications > 0 ? Math.round((totalInterviews / totalApplications) * 100) : 0;

  return (
    <div className="p-4 md:p-8 space-y-8 md:space-y-12 max-w-7xl mx-auto relative z-10 overflow-x-hidden">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
        <div className="space-y-2 md:space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 via-vibrant-purple to-vibrant-pink rounded-lg flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">by</span>
              <span className="text-xs font-black bg-gradient-to-r from-vibrant-orange via-vibrant-pink to-vibrant-purple bg-clip-text text-transparent uppercase tracking-tight">Aniket singh</span>
            </div>
          </div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight"
          >
            Namaste, <span className="bg-gradient-to-r from-brand-600 via-vibrant-purple to-vibrant-pink bg-clip-text text-transparent">{auth.currentUser?.displayName?.split(' ')[0]}</span>!
          </motion.h2>
          <p className="text-base md:text-lg text-slate-500 font-medium">Your career journey is looking strong. Let's keep building.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreateNew}
          className="flex items-center justify-center gap-3 bg-gradient-to-r from-vibrant-orange via-vibrant-pink to-vibrant-purple text-white px-8 md:px-10 py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-black text-sm shadow-2xl shadow-vibrant-pink/30 transition-all group"
        >
          <Plus className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-transform" />
          Create New Resume
        </motion.button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        {[
          { label: 'Total Resumes', value: resumes.length, icon: FileText, color: 'from-blue-500 via-indigo-500 to-brand-600' },
          { 
            label: 'Avg ATS Score', 
            value: resumes.length > 0 
              ? `${Math.round(resumes.reduce((acc, r) => acc + (r.atsScore || 0), 0) / resumes.length)}%` 
              : '--', 
            icon: Award, 
            color: 'from-emerald-400 via-teal-500 to-emerald-600' 
          },
          { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, color: 'from-vibrant-orange via-rose-500 to-vibrant-pink' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-gradient-to-br ${stat.color} p-6 md:p-10 rounded-[30px] md:rounded-[40px] shadow-2xl shadow-slate-200/50 flex flex-col justify-between h-44 md:h-56 text-white group overflow-hidden relative border border-white/10`}
          >
            <div className="absolute -right-4 -bottom-4 md:-right-6 md:-bottom-6 opacity-10 group-hover:scale-125 transition-transform duration-700 rotate-12">
              <stat.icon className="w-32 h-32 md:w-40 md:h-40" />
            </div>
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-inner">
              <stat.icon className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div className="relative z-10">
              <p className="text-[9px] md:text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <p className="text-3xl md:text-4xl font-black tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Tips */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/40 backdrop-blur-xl rounded-[30px] md:rounded-[40px] p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 border border-white/40 shadow-xl"
      >
        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-brand-500 to-vibrant-purple rounded-2xl md:rounded-3xl flex items-center justify-center text-white shadow-lg shadow-brand-200 shrink-0 animate-bounce">
          <Sparkles className="w-8 h-8 md:w-10 md:h-10" />
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h4 className="text-xl md:text-2xl font-black text-slate-900">Pro Tip: Use Action Verbs</h4>
          <p className="text-sm md:text-base text-slate-600 font-medium leading-relaxed">Starting your bullet points with strong action verbs like "Spearheaded", "Engineered", or "Optimized" can increase your ATS score by up to 15%.</p>
        </div>
        <button className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-slate-800 transition-all shrink-0">
          Learn More
        </button>
      </motion.div>

      {/* Resumes List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Recent Documents</h3>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Scanning Registry...</p>
          </div>
        ) : resumes.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-20 bg-white/50 backdrop-blur-sm rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center space-y-6 text-center px-6"
          >
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
              <FileText className="w-10 h-10" />
            </div>
            <div className="max-w-xs">
              <p className="text-lg font-bold text-slate-900">No resumes yet</p>
              <p className="text-sm text-slate-500 mt-1">Start by creating your first ATS-optimized resume to land your dream job.</p>
            </div>
            <button
              onClick={onCreateNew}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 transition-all"
            >
              Initialize First Document
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume, i) => (
              <motion.div
                key={resume.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => onEdit(resume.id!)}
                className="group bg-white rounded-[32px] p-8 border border-slate-100 hover:border-brand-200 hover:shadow-2xl hover:shadow-brand-500/10 transition-all cursor-pointer relative overflow-hidden"
              >
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-500/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative z-10 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div className="flex items-center gap-2">
                      {resume.atsScore && (
                        <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                          {resume.atsScore}% ATS
                        </div>
                      )}
                      <div className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-brand-600 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                      {resume.title || 'Untitled Resume'}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        Updated {new Date(resume.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                    <button
                      onClick={(e) => handleTrackApplication(e, resume.id!, resume.applications || 0)}
                      className="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-slate-50 transition-colors group/btn"
                    >
                      <span className="text-lg font-black text-slate-900">{(resume.applications || 0)}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover/btn:text-brand-600">Applications</span>
                    </button>
                    <button
                      onClick={(e) => handleTrackInterview(e, resume.id!, resume.interviews || 0)}
                      className="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-slate-50 transition-colors group/btn"
                    >
                      <span className="text-lg font-black text-slate-900">{(resume.interviews || 0)}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover/btn:text-emerald-600">Interviews</span>
                    </button>
                  </div>

                  <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/editor/${resume.id}`);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, resume.id!)}
                      className="p-2.5 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors group/del"
                      title="Delete Resume"
                    >
                      <Trash2 className="w-4 h-4 group-hover/del:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
