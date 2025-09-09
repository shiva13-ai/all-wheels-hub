// Firebase initialization for the web app
// Keys here are safe to expose (Firebase web config is public by design)

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAnR_ICFZGj1aDmI6fW95QuVDwvJnfuDBU",
  authDomain: "autoaid-92b2a.firebaseapp.com",
  projectId: "autoaid-92b2a",
  storageBucket: "autoaid-92b2a.firebasestorage.app",
  messagingSenderId: "701401615245",
  appId: "1:701401615245:web:d201d560c07f55dc894bc4",
  measurementId: "G-LS4WY2CCS1",
};

// Ensure singleton app instance (Vite HMR friendly)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Core services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Optional: Analytics (guarded for environments where it's unsupported)
export const getAnalyticsIfSupported = async (): Promise<Analytics | null> => {
  if (typeof window === "undefined") return null;
  const supported = await isSupported().catch(() => false);
  return supported ? getAnalytics(app) : null;
};

export { app, auth, db, storage };
