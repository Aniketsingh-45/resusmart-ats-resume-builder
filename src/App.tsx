import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, db, doc, getDoc, setDoc, createUserWithEmailAndPassword, signInWithEmailAndPassword } from './firebase';
import { UserProfile } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ResumeEditor } from './components/ResumeEditor';
import { CertificateEngine } from './components/CertificateEngine';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import {
  LogIn, Loader2, Sparkles, Mail, Lock,
  UserPlus, Eye, EyeOff, AlertTriangle, ExternalLink, X,
  Zap, FileText, Award, ArrowRight, CheckCircle2, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { firebaseConfig } from './config/firebase';

const FIREBASE_PROJECT_ID = firebaseConfig.projectId || 'resusmart-ats-app';
const FIREBASE_CONSOLE_AUTH_URL = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`;

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1,0,0,1,27.009001,-39.238998)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
    </g>
  </svg>
);

function GoogleFixModal({ onClose }: { onClose: () => void }) {
  const currentDomain = window.location.hostname;
  const [copied, setCopied] = React.useState(false);
  const copyDomain = () => {
    navigator.clipboard.writeText(currentDomain).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  const steps = [
    { num: 1, text: 'Click "Open Firebase Console" below' },
    { num: 2, text: 'Go to Authentication → Settings → Authorized domains' },
    { num: 3, text: 'Click "Add domain" and paste your domain' },
    { num: 4, text: 'Save, then retry Google sign-in' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl p-7 space-y-5"
        style={{ background: 'rgba(13,17,23,0.95)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 30px 80px rgba(0,0,0,0.60)' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Google Sign-In Notice</h2>
              <p className="text-xs text-slate-500">Domain not in Firebase authorized list</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 rounded-2xl space-y-2" style={{ background: 'rgba(6,8,17,0.60)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest">Add this domain to Firebase:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-amber-400 font-mono text-sm px-3 py-2 rounded-xl truncate" style={{ background: 'rgba(6,8,17,0.80)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {currentDomain}
            </code>
            <button onClick={copyDomain}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${copied ? 'bg-emerald-600 text-white' : 'text-violet-300'}`}
              style={!copied ? { background: 'rgba(124,58,237,0.20)', border: '1px solid rgba(124,58,237,0.30)' } : {}}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {steps.map(s => (
            <div key={s.num} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>{s.num}</div>
              <p className="text-slate-300 text-sm">{s.text}</p>
            </div>
          ))}
        </div>
        <a href={FIREBASE_CONSOLE_AUTH_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.40)' }}>
          <ExternalLink className="w-4 h-4" />
          Open Firebase Console
        </a>
        <button onClick={onClose} className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-xs font-semibold transition-colors">
          Use Email / Password instead
        </button>
      </motion.div>
    </motion.div>
  );
}

function MainApp() {
  const { isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'editor' | 'certificates'>('dashboard');
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [showGoogleFixModal, setShowGoogleFixModal] = useState(false);

  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            subscriptionTier: 'free',
            createdAt: new Date().toISOString(),
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleGoogleLogin = async () => {
    setAuthLoading(true); setAuthError('');
    try { await signInWithPopup(auth, googleProvider); }
    catch (error: any) {
      if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain')) setShowGoogleFixModal(true);
      else if (error.code !== 'auth/popup-closed-by-user') setAuthError(error.message || 'Google sign-in failed.');
    } finally { setAuthLoading(false); }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setAuthError('Please enter email and password.'); return; }
    setAuthLoading(true); setAuthError('');
    try { await signInWithEmailAndPassword(auth, email.trim(), password); }
    catch (error: any) {
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(error.code)) setAuthError('Incorrect email or password.');
      else if (error.code === 'auth/invalid-email') setAuthError('Invalid email format.');
      else if (error.code === 'auth/too-many-requests') setAuthError('Too many attempts. Try again later.');
      else setAuthError(error.message || 'Sign in failed.');
    } finally { setAuthLoading(false); }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) { setAuthError('Please fill all fields.'); return; }
    if (password.length < 6) { setAuthError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setAuthError('Passwords do not match.'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const newProfile: UserProfile = { uid: newUser.uid, email: newUser.email || '', displayName: displayName.trim(), subscriptionTier: 'free', createdAt: new Date().toISOString() };
      await setDoc(doc(db, 'users', newUser.uid), newProfile);
      setProfile(newProfile);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') setAuthError('Email already registered. Sign in instead.');
      else if (error.code === 'auth/invalid-email') setAuthError('Invalid email format.');
      else if (error.code === 'auth/weak-password') setAuthError('Password too weak.');
      else setAuthError(error.message || 'Account creation failed.');
    } finally { setAuthLoading(false); }
  };

  const handleGuestLogin = () => {
    setUser({ uid: 'guest-preview', email: 'guest@resusmart.dev', displayName: 'Guest Explorer' });
    setProfile({ uid: 'guest-preview', email: 'guest@resusmart.dev', displayName: 'Guest Explorer', subscriptionTier: 'pro', createdAt: new Date().toISOString() });
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-5 relative overflow-hidden" style={{ background: isDark ? '#060811' : '#f8fafc' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.20) 0px, transparent 65%)' }} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-3xl flex items-center justify-center border border-white/15 relative z-10"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5, #0ea5e9)', boxShadow: '0 0 40px rgba(124,58,237,0.50)' }}
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <div className="flex items-center gap-2.5 relative z-10">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          <p className={`text-xs font-mono font-semibold tracking-[0.25em] uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Booting ResuSmart 2.0…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const inputClass = `w-full py-3.5 rounded-xl text-sm outline-none transition-all font-medium ${isDark ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'}`;
    const inputStyle = {
      background: isDark ? 'rgba(6,8,17,0.75)' : '#f8fafc',
      border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid #cbd5e1'
    };
    const inputFocusHandlers = {
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = '#6366f1';
        e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.09)' : '#cbd5e1';
        e.target.style.boxShadow = 'none';
      },
    };

    return (
      <div className="min-h-screen w-full flex flex-col lg:flex-row overflow-x-hidden relative transition-colors duration-300" style={{ background: isDark ? '#060811' : '#f8fafc' }}>

        {/* Top Header Controls (Theme Toggle) */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
          <ThemeToggle />
        </div>

        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.5) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute top-1/2 left-0 w-[300px] h-[300px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        {/* Surface pattern */}
        <div className="absolute inset-0 surface-grid opacity-30 pointer-events-none" />

        <AnimatePresence>
          {showGoogleFixModal && <GoogleFixModal onClose={() => setShowGoogleFixModal(false)} />}
        </AnimatePresence>

        {/* ── LEFT: Hero Panel ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative z-10"
        >
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white border border-white/15 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 8px 24px rgba(124,58,237,0.45)' }}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif', letterSpacing: '-0.02em' }}>ResuSmart</span>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono" style={{ background: 'rgba(124,58,237,0.20)', border: '1px solid rgba(124,58,237,0.30)', color: '#c4b5fd' }}>v2.0</span>
              </div>
              <p className={`text-[9px] font-mono uppercase tracking-[0.2em] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>by Aniket Singh</p>
            </div>
          </div>

          {/* Value prop */}
          <div className="my-10 lg:my-0 space-y-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid #e2e8f0',
                color: isDark ? '#94a3b8' : '#475569',
                boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)'
              }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AI-Powered ATS Optimization Engine
            </div>

            <div className="space-y-4">
              <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif', letterSpacing: '-0.03em', lineHeight: '1.05' }}>
                Land more interviews<br />
                with <span className="text-gradient italic">algorithm-beating</span><br />
                resumes.
              </h2>
              <p className={`text-base leading-relaxed max-w-md ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                ResuSmart crafts ATS-compliant resumes with real-time scoring, 10 adaptive multi-page templates, and clickable interactive PDF exports.
              </p>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Zap, label: 'ATS Score Radar', desc: 'Live keyword metrics', color: '#f59e0b', darkBg: 'rgba(251,191,36,0.10)', lightBg: '#ffffff', darkBorder: 'rgba(251,191,36,0.20)', lightBorder: '#e2e8f0' },
                { icon: FileText, label: '10 Templates', desc: 'Multi-page PDF scaling', color: '#8b5cf6', darkBg: 'rgba(124,58,237,0.12)', lightBg: '#ffffff', darkBorder: 'rgba(124,58,237,0.22)', lightBorder: '#e2e8f0' },
                { icon: Award, label: 'Cert Intelligence', desc: 'ROI gap analysis', color: '#10b981', darkBg: 'rgba(52,211,153,0.10)', lightBg: '#ffffff', darkBorder: 'rgba(52,211,153,0.20)', lightBorder: '#e2e8f0' },
              ].map((feat, i) => (
                <div key={i} className={`p-4 rounded-2xl space-y-2 transition-all hover:scale-[1.03] cursor-default ${!isDark ? 'shadow-sm' : ''}`}
                  style={{ background: isDark ? feat.darkBg : feat.lightBg, border: `1px solid ${isDark ? feat.darkBorder : feat.lightBorder}` }}>
                  <feat.icon className="w-5 h-5" style={{ color: feat.color }} />
                  <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{feat.label}</p>
                  <p className={`text-[10px] leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{feat.desc}</p>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>99.8% ATS Pass Rate</span>
              <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Zero Data Tracking</span>
              </div>
            </div>
          </div>

          {/* Author badge */}
          <div className="flex items-center gap-3 pt-6" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm border border-white/15"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>AS</div>
            <div>
              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Aniket Singh</p>
              <p className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Creator & Engineer</p>
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT: Auth Panel ── */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="w-full max-w-md"
          >
            <div className="relative overflow-hidden rounded-3xl p-7 sm:p-9 space-y-6"
              style={{
                background: isDark ? 'rgba(10,13,22,0.90)' : '#ffffff',
                backdropFilter: 'blur(30px) saturate(1.5)',
                WebkitBackdropFilter: 'blur(30px) saturate(1.5)',
                border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid #e2e8f0',
                boxShadow: isDark ? '0 30px 80px rgba(0,0,0,0.60), 0 0 0 1px rgba(124,58,237,0.08)' : '0 20px 60px rgba(99,102,241,0.08), 0 1px 3px rgba(0,0,0,0.05)',
              }}>

              {/* Top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.80) 40%, rgba(79,70,229,0.80) 60%, transparent 100%)' }} />

              {/* Tab switcher */}
              <div className="flex p-1.5 rounded-2xl gap-1.5"
                style={{ background: isDark ? 'rgba(6,8,17,0.70)' : '#f1f5f9', border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0' }}>
                {(['signin', 'signup'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setAuthTab(tab); setAuthError(''); }}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all relative ${authTab === tab ? 'text-white' : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {authTab === tab && (
                      <motion.div
                        layoutId="auth-tab-active"
                        className="absolute inset-0 rounded-xl -z-10"
                        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.85), rgba(79,70,229,0.80))', border: '1px solid rgba(124,58,237,0.35)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}
                    {tab === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              {/* Google Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 border ${isDark ? 'text-white bg-white/5 hover:bg-white/10 border-white/10' : 'text-slate-800 bg-slate-50 hover:bg-slate-100 border-slate-200 shadow-xs'}`}
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0' }} />
                <span className={`text-[11px] font-mono uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>or email</span>
                <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0' }} />
              </div>

              {/* Error */}
              <AnimatePresence>
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold text-rose-500"
                    style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{authError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Forms */}
              <AnimatePresence mode="wait">
                {authTab === 'signin' ? (
                  <motion.form key="signin" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}
                    onSubmit={handleEmailSignIn} className="space-y-3.5">
                    <div className="relative">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
                        className={inputClass} style={{ ...inputStyle, paddingLeft: '2.75rem', paddingRight: '1rem' }} {...inputFocusHandlers} required />
                    </div>
                    <div className="relative">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                        className={inputClass} style={{ ...inputStyle, paddingLeft: '2.75rem', paddingRight: '3rem' }} {...inputFocusHandlers} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700'}`}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button type="submit" disabled={authLoading}
                      className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.01]"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.45)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                      {authLoading ? 'Authenticating...' : 'Sign In'}
                    </button>
                  </motion.form>
                ) : (
                  <motion.form key="signup" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}
                    onSubmit={handleEmailSignUp} className="space-y-3.5">
                    <div className="relative">
                      <UserPlus className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input type="text" placeholder="Full name" value={displayName} onChange={e => setDisplayName(e.target.value)}
                        className={inputClass} style={{ ...inputStyle, paddingLeft: '2.75rem', paddingRight: '1rem' }} {...inputFocusHandlers} required />
                    </div>
                    <div className="relative">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
                        className={inputClass} style={{ ...inputStyle, paddingLeft: '2.75rem', paddingRight: '1rem' }} {...inputFocusHandlers} required />
                    </div>
                    <div className="relative">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input type={showPassword ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)}
                        className={inputClass} style={{ ...inputStyle, paddingLeft: '2.75rem', paddingRight: '3rem' }} {...inputFocusHandlers} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700'}`}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input type={showPassword ? 'text' : 'password'} placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                        className={inputClass} style={{ ...inputStyle, paddingLeft: '2.75rem', paddingRight: '1rem' }} {...inputFocusHandlers} required />
                    </div>
                    <button type="submit" disabled={authLoading}
                      className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.01]"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.45)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      {authLoading ? 'Creating Account...' : 'Create Free Account'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Guest access */}
              <button
                onClick={handleGuestLogin}
                className={`w-full py-3 flex items-center justify-center gap-2 rounded-2xl text-xs font-semibold transition-all border ${isDark ? 'text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 border-white/10' : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200 shadow-xs'}`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Explore Demo (Instant Guest Access)
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <Layout profile={profile} view={view} setView={setView} onLogout={() => signOut(auth)}>
      {view === 'dashboard' && (
        <Dashboard
          onEdit={(id) => { setActiveResumeId(id); setView('editor'); }}
          onCreateNew={() => { setActiveResumeId(null); setView('editor'); }}
        />
      )}
      {view === 'editor' && (
        <ResumeEditor resumeId={activeResumeId} onBack={() => setView('dashboard')} />
      )}
      {view === 'certificates' && <CertificateEngine />}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
