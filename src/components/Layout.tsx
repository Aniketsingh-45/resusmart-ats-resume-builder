import React, { useState } from 'react';
import { UserProfile } from '../types';
import { LayoutDashboard, FileText, GraduationCap, LogOut, User, Sparkles, Menu, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  profile: UserProfile | null;
  view: 'dashboard' | 'editor' | 'certificates';
  setView: (view: 'dashboard' | 'editor' | 'certificates') => void;
  onLogout: () => void;
}

export function Layout({ children, profile, view, setView, onLogout }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'editor', label: 'Resume Builder', icon: FileText },
    { id: 'certificates', label: 'Cert Engine', icon: GraduationCap },
  ] as const;

  const SidebarContent = () => (
    <>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-1 group cursor-pointer">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-500 via-vibrant-purple to-vibrant-pink rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-200 group-hover:rotate-12 transition-transform duration-300">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 bg-gradient-to-r from-brand-600 via-vibrant-purple to-vibrant-pink bg-clip-text text-transparent">ResuSmart</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">by Aniket Singh</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setView(item.id);
              setIsSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200",
              view === item.id 
                ? "bg-brand-50 text-brand-700 shadow-sm" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className={cn("w-5 h-5", view === item.id ? "text-brand-600" : "text-slate-400")} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-100 space-y-4">
        <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-600 shadow-sm border border-slate-100">
            <User className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-900 truncate">{profile?.displayName}</p>
            <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">{profile?.subscriptionTier} PLAN</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col shadow-sm z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-[101] lg:hidden flex flex-col shadow-2xl"
            >
              <div className="absolute top-4 right-4">
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-slate-900">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation - Removed in favor of top toggle as requested */}
      {/* {view !== 'editor' && ( ... )} */}

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col overflow-hidden relative lg:pb-0",
        "pb-0"
      )}>
        <header className="h-16 lg:h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-[80] sticky top-0">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 via-vibrant-purple to-vibrant-pink rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm lg:text-xl font-black text-slate-900 leading-none tracking-tight uppercase flex items-center gap-2">
                ResuSmart
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-[8px] font-black text-slate-400 uppercase tracking-widest">v2.0</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[8px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">by</span>
                <span className="text-[9px] lg:text-xs font-black bg-gradient-to-r from-vibrant-orange via-vibrant-pink to-vibrant-purple bg-clip-text text-transparent uppercase tracking-tight">Aniket singh</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ATS Engine Active
            </div>
            
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-11 h-11 rounded-2xl bg-slate-900 flex flex-col items-center justify-center gap-1 text-white active:scale-90 transition-all shadow-lg shadow-slate-200"
            >
              <div className="w-5 h-0.5 bg-white rounded-full" />
              <div className="w-5 h-0.5 bg-white rounded-full" />
              <div className="w-3 h-0.5 bg-white rounded-full self-start ml-3" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
