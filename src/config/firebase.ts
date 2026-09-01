import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';

export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "resusmart-ats-app",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:425413852108:web:e63925b766f06d34c7bb69",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "enter you api",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "resusmart-ats-app.firebaseapp.com",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "resusmart-ats-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "425413852108",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signOut,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
};
