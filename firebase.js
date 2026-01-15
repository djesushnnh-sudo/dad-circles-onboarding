// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dad-circles",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Debug: Log the project ID to see if it's loading
console.log('Firebase Project ID:', firebaseConfig.projectId);
console.log('All Firebase Config:', firebaseConfig);

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Connect to Firestore emulator in development mode
if (import.meta.env.DEV) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8083);
    console.log('🔧 Connected to Firestore emulator on port 8083');
  } catch (error) {
    console.log('⚠️ Firestore emulator connection failed or already connected:', error.message);
  }
}
