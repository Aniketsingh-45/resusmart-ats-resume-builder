import React, { useState } from 'react';
import { UserProfile } from '../types';
import { LayoutDashboard, FileText, GraduationCap, LogOut, User, Sparkles, Menu, X, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
  profile: UserProfile | null;
  view: 'dashboard' | 'editor' | 'certificates';
  setView: (view: 'dashboard' | 'editor' | 'certificates') => void;
  onLogout: () => void;
}

export function Layout({ children, profile, view, setView, onLogout }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDark } = useTheme();

  const navItems = [
    { id: 'dashboard',    label: 'Dashboard',   shortLabel: 'Home',  icon: LayoutDashboard, color: 'violet' },
    { id: 'editor',       label: 'Resume Studio', shortLabel: 'Build', icon: FileText,        color: 'blue'   },
    { id: 'certificates', label: 'Cert Engine', shortLabel: 'Certs', icon: GraduationCap,   color: 'emerald'},
  ] as const;

  return (
    <div className={`min-h-screen flex flex-col font-sans overflow-x-hidden relative transition-colors duration-300 ${isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* ── Top Navbar ── */}
      <header
        className="print:hidden sticky top-0 z-50 h-14 flex items-center justify-between px-4 md:px-6 transition-colors duration-150"
        style={{
          background: isDark ? '#0d111b' : '#ffffff',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.85)'}`,
          boxShadow: isDark ? '0 2px 14px rgba(0,0,0,0.28)' : '0 2px 10px rgba(15,23,42,0.04)',
        }}
      >
        {/* Brand */}
        <button
          onClick={() => setView('dashboard')}
          className="flex items-center gap-2.5 group shrink-0"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md border border-white/15"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #0ea5e9 100%)' }}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-base font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
              ResuSmart
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono"
              style={{ background: 'rgba(124,58,237,0.14)', border: '1px solid rgba(124,58,237,0.24)', color: '#7c3aed' }}>
              PRO
            </span>
          </div>
        </button>

        {/* Desktop Nav Pills */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(241,245,249,0.90)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.80)'}`
          }}>
          {navItems.map((item) => {
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-150',
                  isActive
                    ? 'text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                )}
                style={isActive ? {
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  border: '1px solid rgba(255,255,255,0.15)'
                } : undefined}
              >
                <item.icon className={cn('w-4 h-4', isActive ? 'text-white' : '')} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2.5">
          {/* Theme Switcher Button */}
          <ThemeToggle />

          {/* ATS Online badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{
              background: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.10)',
              border: `1px solid ${isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.30)'}`
            }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold font-mono text-emerald-500 uppercase tracking-wider">ATS Ready</span>
          </div>

          {/* User pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-default"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(241,245,249,0.90)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.80)'}`
            }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <span className={`text-xs font-semibold max-w-25 truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {profile?.displayName?.split(' ')[0] || 'User'}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:text-red-500 hover:bg-red-500/10 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
            style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(203,213,225,0.80)'}` }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-all"
            style={{
              background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(241,245,249,0.90)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(203,213,225,0.80)'}`
            }}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Mobile Dropdown Menu ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed top-14 inset-x-0 z-40 md:hidden px-4 pt-2 pb-4 shadow-2xl"
          style={{
            background: isDark ? '#0b0f19' : '#ffffff',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(124,58,237,0.15)'}`,
          }}
        >
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id); setIsMobileMenuOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors',
                    isActive
                      ? (isDark ? 'text-white' : 'text-violet-900')
                      : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                  )}
                  style={isActive ? { background: isDark ? 'rgba(124,58,237,0.20)' : 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.30)' } : {}}
                >
                  <item.icon className={cn('w-5 h-5', isActive ? 'text-violet-500' : '')} />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-violet-500" />}
                </button>
              );
            })}
            <div className="pt-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(203,213,225,0.70)' }}>
              <div className="flex items-center gap-3 px-4 py-2.5 mb-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                  {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <div>
                  <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{profile?.displayName || 'User'}</p>
                  <p className="text-[10px] font-mono text-violet-500 uppercase tracking-wider">{profile?.subscriptionTier || 'PRO'}</p>
                </div>
              </div>
              <button
                onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Content ── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div key={view} className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
