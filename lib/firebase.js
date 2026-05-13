// ============================================
// Firebase SDK Initialization
// Change this file to switch Firebase projects
// ============================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAIceqMXYNY5EH_3vTmIbogjb6wJ2CCBxQ",
  authDomain: "speakup-27de0.firebaseapp.com",
  databaseURL: "https://speakup-27de0-default-rtdb.firebaseio.com",
  projectId: "speakup-27de0",
  storageBucket: "speakup-27de0.firebasestorage.app",
  messagingSenderId: "811108429557",
  appId: "1:811108429557:web:1ad8de2151de43b8f8dfbc",
  measurementId: "G-BQ65T23S3M"
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
