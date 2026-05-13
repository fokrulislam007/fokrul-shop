// ============================================
// Firebase SDK Initialization
// Change this file to switch Firebase projects
// ============================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyB-GiVjc5XWKuVfJH66aBI6Pj9suZtDDZQ",
  authDomain: "fokrul-store.firebaseapp.com",
  databaseURL: "https://fokrul-store-default-rtdb.firebaseio.com",
  projectId: "fokrul-store",
  storageBucket: "fokrul-store.firebasestorage.app",
  messagingSenderId: "399582835530",
  appId: "1:399582835530:web:43a7c4126c562d770007b3",
  measurementId: "G-NZD47Q1WCM"
};

// Initialize Firebase (singleton — safe for HMR / SSR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firestore database
const db = getFirestore(app);

// Firebase Authentication
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Analytics (client-side only)
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then(yes => {
    if (yes) analytics = getAnalytics(app);
  });
}

export { app, db, auth, googleProvider, analytics };
