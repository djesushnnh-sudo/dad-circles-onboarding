// Simple script to seed the database with test data
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedData = async () => {
  console.log('Seeding database with test data...');
  
  const testProfiles = [
    {
      session_id: 'user-a-complete',
      onboarded: false,
      onboarding_step: 'WELCOME',
      children: [],
      last_updated: Date.now() - 1000 * 60 * 60 * 2 // 2 hours ago
    },
    {
      session_id: 'user-b-expecting',
      onboarded: false,
      onboarding_step: 'WELCOME',
      children: [],
      last_updated: Date.now() - 1000 * 60 * 30 // 30 mins ago
    },
    {
      session_id: 'user-c-fresh',
      onboarded: false,
      onboarding_step: 'WELCOME',
      children: [],
      last_updated: Date.now() - 1000 * 60 * 5 // 5 mins ago
    }
  ];

  try {
    for (const profile of testProfiles) {
      const profileRef = doc(db, 'profiles', profile.session_id);
      await setDoc(profileRef, profile);
      console.log(`Created profile: ${profile.session_id}`);
    }
    console.log('✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();