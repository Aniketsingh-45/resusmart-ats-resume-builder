import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        title={isDark ? "Switch to Bright Colorful Theme" : "Switch to Dark Nebula Theme"}
        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 relative group overflow-hidden ${className}`}
        style={{
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(124,58,237,0.08)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(124,58,237,0.20)'}`,
          color: isDark ? '#fbbf24' : '#7c3aed'
        }}
      >
        <motion.div
          key={theme}
          initial={{ rotate: -90, scale: 0.7, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-violet-600" />}
        </motion.div>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to Bright Colorful Theme" : "Switch to Dark Nebula Theme"}
      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 select-none shadow-sm hover:scale-105 active:scale-95 ${className}`}
      style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.08) 100%)'
          : 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.08) 100%)',
        border: `1px solid ${isDark ? 'rgba(251,191,36,0.30)' : 'rgba(124,58,237,0.25)'}`,
        color: isDark ? '#fde68a' : '#6d28d9',
      }}
    >
      <div className="w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-violet-600" />
        )}
      </div>
      <span className="font-mono text-[11px] uppercase tracking-wider">
        {isDark ? 'Bright Mode' : 'Dark Mode'}
      </span>
      <span className="px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold"
        style={{
          background: isDark ? 'rgba(251,191,36,0.20)' : 'rgba(124,58,237,0.15)',
          color: isDark ? '#fbbf24' : '#7c3aed',
        }}>
        {isDark ? '☀️' : '🌙'}
      </span>
    </button>
  );
}
