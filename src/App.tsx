import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, db, doc, getDoc, setDoc, createUserWithEmailAndPassword, signInWithEmailAndPassword } from './firebase';
import { UserProfile } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ResumeEditor } from './components/ResumeEditor';
import { CertificateEngine } from './components/CertificateEngine';
import { LogIn, Loader2, Sparkles, CheckCircle2, Mail, Lock, UserPlus, Eye, EyeOff, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import firebaseConfig from '../firebase-config.json';

const FIREBASE_PROJECT_ID = firebaseConfig.projectId || 'resusmart-ats-app';
const FIREBASE_CONSOLE_AUTH_URL = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`;

// Google SVG icon
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
    </g>
  </svg>
);

// Step-by-step fix modal for unauthorized-domain error
function GoogleFixModal({ onClose }: { onClose: () => void }) {
  const currentDomain = window.location.hostname;
  const [copied, setCopied] = React.useState(false);

  const copyDomain = () => {
    navigator.clipboard.writeText(currentDomain).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const steps = [
    { num: 1, text: 'Click "Open Firebase Console" below' },
    { num: 2, text: 'Go to Authentication → Settings → Authorized domains tab' },
    { num: 3, text: `Click "Add domain" and paste your domain (copied above)` },
    { num: 4, text: 'Click Add/Save, then come back and try Google sign-in again' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-5"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-white font-black text-lg">Google Sign-In Blocked</h2>
              <p className="text-slate-400 text-xs">Domain not in Firebase authorized list</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Show the actual domain that needs to be added */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Add this domain to Firebase:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-amber-400 font-bold text-sm bg-slate-900 px-3 py-2 rounded-xl truncate">
              {currentDomain}
            </code>
            <button
              onClick={copyDomain}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-vibrant-pink/20 text-vibrant-pink hover:bg-vibrant-pink/30'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.num} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-vibrant-orange to-vibrant-pink flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 mt-0.5">{s.num}</div>
              <p className="text-slate-300 text-sm leading-snug">{s.text}</p>
            </div>
          ))}
        </div>

        <a
          href={FIREBASE_CONSOLE_AUTH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-vibrant-orange via-vibrant-pink to-vibrant-purple text-white rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all shadow-xl"
        >
          <ExternalLink className="w-4 h-4" />
          Open Firebase Console
        </a>

        <button
          onClick={onClose}
          className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-xs font-bold transition-colors uppercase tracking-widest"
        >
          Use Email / Password instead
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'editor' | 'certificates'>('dashboard');
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [showGoogleFixModal, setShowGoogleFixModal] = useState(false);

  // Login form state
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
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google Login failed", error);
      if (error.code === 'auth/unauthorized-domain') {
        setShowGoogleFixModal(true);
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in was cancelled. Please try again.');
      } else {
        setAuthError('Google sign-in failed: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) { setAuthError('Please fill in all fields.'); return; }
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Email sign-in failed", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError('Invalid email or password. Please try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setAuthError('Too many failed attempts. Please try again later.');
      } else {
        setAuthError(error.message || 'Sign-in failed. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password || !displayName) { setAuthError('Please fill in all fields.'); return; }
    if (password !== confirmPassword) { setAuthError('Passwords do not match.'); return; }
    if (password.length < 6) { setAuthError('Password must be at least 6 characters.'); return; }
    setAuthLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Save profile with display name
      const docRef = doc(db, 'users', cred.user.uid);
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || '',
        displayName: displayName,
        subscriptionTier: 'free',
        createdAt: new Date().toISOString(),
      };
      await setDoc(docRef, newProfile);
      setProfile(newProfile);
    } catch (error: any) {
      console.error("Sign-up failed", error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('An account with this email already exists. Please sign in instead.');
        setAuthTab('signin');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('Password is too weak. Use at least 6 characters.');
      } else {
        setAuthError(error.message || 'Sign-up failed. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUser = { uid: 'guest-123', email: 'guest@resusmart.com', displayName: 'Guest User' };
    setUser(guestUser);
    setProfile({
      uid: guestUser.uid,
      email: guestUser.email,
      displayName: guestUser.displayName,
      subscriptionTier: 'free',
      createdAt: new Date().toISOString(),
    });
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-vibrant-orange via-vibrant-pink to-vibrant-purple rounded-2xl flex items-center justify-center shadow-2xl animate-pulse">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-vibrant-pink" />
        <p className="text-slate-400 text-sm font-semibold tracking-widest uppercase">Loading ResuSmart…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-vibrant-mesh flex flex-col lg:flex-row font-sans overflow-x-hidden">
        <AnimatePresence>
          {showGoogleFixModal && <GoogleFixModal onClose={() => setShowGoogleFixModal(false)} />}
        </AnimatePresence>
        {/* Left Hero Panel */}
        <div className="flex-1 p-8 lg:p-16 flex flex-col justify-center space-y-8 relative z-10">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-vibrant-orange via-vibrant-pink to-vibrant-purple rounded-2xl flex items-center justify-center text-white shadow-xl">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none">ResuSmart</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">by Aniket Singh</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.1)] backdrop-blur-md border border-[rgba(255,255,255,0.2)] rounded-full text-[10px] font-bold text-white uppercase tracking-[0.2em]">
              <Sparkles className="w-3.5 h-3.5 text-vibrant-orange" />
              The Future of Resume Building
            </div>
            <h2 className="text-5xl lg:text-7xl font-black tracking-tight text-white leading-[0.85]">
              Land your <br />
              <span className="bg-gradient-to-r from-vibrant-orange via-vibrant-pink to-vibrant-purple bg-clip-text text-transparent italic">dream job</span> <br />
              with AI.
            </h2>
            <p className="text-base text-slate-300 max-w-sm leading-relaxed">
              ResuSmart uses advanced AI to optimize your resume for modern ATS systems — ensuring you never get rejected by a bot again.
            </p>
          </div>

          <div className="space-y-3">
            {[
              'ATS Score Analysis & Optimization',
              'AI-Powered Content Suggestions',
              '10+ Professional Resume Templates',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-vibrant-orange flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-300">{feat}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 pt-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vibrant-orange to-vibrant-pink flex items-center justify-center text-white font-black text-sm shadow-lg">AS</div>
            <div>
              <p className="text-sm font-bold text-white">Aniket Singh</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Founder & Lead Engineer</p>
            </div>
          </div>
        </div>

        {/* Right Login Panel */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md"
          >
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl space-y-6">
              {/* Tabs */}
              <div className="flex bg-white/10 rounded-2xl p-1 gap-1">
                {(['signin', 'signup'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setAuthTab(tab); setAuthError(''); }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                      authTab === tab
                        ? 'bg-white text-slate-900 shadow-md'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {tab === 'signin' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-white text-slate-800 rounded-2xl font-bold text-sm hover:bg-slate-50 active:scale-95 transition-all shadow-lg disabled:opacity-60"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-xs text-white/50 font-semibold">or</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              {/* Error */}
              <AnimatePresence>
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/20 border border-red-400/40 text-red-200 text-xs font-semibold px-4 py-3 rounded-xl"
                  >
                    {authError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sign In Form */}
              <AnimatePresence mode="wait">
                {authTab === 'signin' ? (
                  <motion.form
                    key="signin"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleEmailSignIn}
                    className="space-y-4"
                  >
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:border-vibrant-pink focus:bg-white/15 transition-all"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-12 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:border-vibrant-pink focus:bg-white/15 transition-all"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-vibrant-orange via-vibrant-pink to-vibrant-purple text-white rounded-2xl font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:scale-100"
                    >
                      {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                      {authLoading ? 'Signing in…' : 'Sign In'}
                    </button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleEmailSignUp}
                    className="space-y-4"
                  >
                    <div className="relative">
                      <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                      <input
                        type="text"
                        placeholder="Full name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:border-vibrant-pink focus:bg-white/15 transition-all"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:border-vibrant-pink focus:bg-white/15 transition-all"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password (min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-12 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:border-vibrant-pink focus:bg-white/15 transition-all"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:border-vibrant-pink focus:bg-white/15 transition-all"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-vibrant-orange via-vibrant-pink to-vibrant-purple text-white rounded-2xl font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:scale-100"
                    >
                      {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      {authLoading ? 'Creating account…' : 'Create Account'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Guest */}
              <button
                onClick={handleGuestLogin}
                className="w-full py-2.5 text-white/50 hover:text-white/80 text-xs font-bold transition-colors uppercase tracking-widest"
              >
                Continue as Guest (No account needed)
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      profile={profile} 
      view={view} 
      setView={setView} 
      onLogout={() => signOut(auth)}
    >
      {view === 'dashboard' && (
        <Dashboard 
          onEdit={(id) => {
            setActiveResumeId(id);
            setView('editor');
          }} 
          onCreateNew={() => {
            setActiveResumeId(null);
            setView('editor');
          }}
        />
      )}
      {view === 'editor' && (
        <ResumeEditor 
          resumeId={activeResumeId} 
          onBack={() => setView('dashboard')} 
        />
      )}
      {view === 'certificates' && (
        <CertificateEngine />
      )}
    </Layout>
  );
}
