import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    // TODO: Add Firebase configuration
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase key components with a safe fallback for build-time
let app;
let db: any;
let auth: any;

try {
    // Only initialize if we have a project ID (checking one key is usually enough)
    if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        db = getFirestore(app);
        auth = getAuth(app);
    } else {
        // During build or if keys are missing, we mock these or leave them undefined.
        // However, to prevent crashes in components importing them, we can check for their existence.
        console.warn("Firebase keys missing. Service not initialized.");
    }
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}

export { app, db, auth };
