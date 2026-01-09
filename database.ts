import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { UserProfile, Message, OnboardingStep, Role, Lead } from './types';

// Firestore collections
const profilesCol = collection(db, 'profiles');
const messagesCol = collection(db, 'messages');
const leadsCol = collection(db, 'leads');

interface DatabaseInterface {
  // Profiles
  getProfile: (sessionId: string) => Promise<UserProfile | undefined>;
  createProfile: (sessionId: string) => Promise<UserProfile>;
  updateProfile: (sessionId: string, updates: Partial<UserProfile>) => Promise<UserProfile>;
  getAllProfiles: () => Promise<UserProfile[]>;
  
  // Messages
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => Promise<Message>;
  getMessages: (sessionId: string) => Promise<Message[]>;
  getAllMessages: () => Promise<Message[]>;
  
  // Leads
  addLead: (lead: Omit<Lead, 'id' | 'timestamp'>) => Promise<Lead>;
  getAllLeads: () => Promise<Lead[]>;
  
  // Database management (dev/emulator only)
  seedTestData?: () => Promise<void>;
  resetDatabase?: () => Promise<void>;
}

export const database: DatabaseInterface = {
  // Profile operations
  getProfile: async (sessionId: string): Promise<UserProfile | undefined> => {
    const ref = doc(profilesCol, sessionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return undefined;
    return snap.data() as UserProfile;
  },

  createProfile: async (sessionId: string): Promise<UserProfile> => {
    const newProfile: UserProfile = {
      session_id: sessionId,
      onboarded: false,
      onboarding_step: OnboardingStep.WELCOME,
      children: [],
      last_updated: Date.now(),
    };
    const ref = doc(profilesCol, sessionId);
    await setDoc(ref, newProfile);
    return newProfile;
  },

  updateProfile: async (sessionId: string, updates: Partial<UserProfile>): Promise<UserProfile> => {
    const existing = (await database.getProfile(sessionId)) ?? 
                    (await database.createProfile(sessionId));
    const updated: UserProfile = {
      ...existing,
      ...updates,
      last_updated: Date.now(),
    };
    const ref = doc(profilesCol, sessionId);
    await setDoc(ref, updated, { merge: true });
    return updated;
  },

  getAllProfiles: async (): Promise<UserProfile[]> => {
    const q = query(profilesCol, orderBy('last_updated', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProfile);
  },

  // Message operations
  addMessage: async (msg: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
    const withTimestamp = {
      ...msg,
      timestamp: Date.now(),
    };
    const docRef = await addDoc(messagesCol, withTimestamp);
    const newMessage: Message = {
      ...withTimestamp,
      id: docRef.id,
    };
    await setDoc(doc(messagesCol, docRef.id), newMessage);
    return newMessage;
  },

  getMessages: async (sessionId: string): Promise<Message[]> => {
    const q = query(
      messagesCol,
      where('session_id', '==', sessionId),
      orderBy('timestamp', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Message);
  },

  getAllMessages: async (): Promise<Message[]> => {
    const q = query(messagesCol, orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Message);
  },

  // Lead operations
  addLead: async (lead: Omit<Lead, 'id' | 'timestamp'>): Promise<Lead> => {
    const withTimestamp = {
      ...lead,
      timestamp: Date.now(),
    };
    const docRef = await addDoc(leadsCol, withTimestamp);
    const newLead: Lead = {
      ...withTimestamp,
      id: docRef.id,
    };
    await setDoc(doc(leadsCol, docRef.id), newLead);
    return newLead;
  },

  getAllLeads: async (): Promise<Lead[]> => {
    const q = query(leadsCol, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Lead);
  },

  // Development/testing methods (only use with emulator)
  seedTestData: async (): Promise<void> => {
    if (import.meta.env.PROD) {
      console.warn('Seeding disabled in production');
      return;
    }
    
    const seedProfiles = [
      {
        session_id: 'user-a-complete',
        onboarded: false,
        onboarding_step: OnboardingStep.WELCOME,
        children: [],
        last_updated: Date.now() - 1000 * 60 * 60 * 2 // 2 hours ago
      },
      {
        session_id: 'user-b-expecting',
        onboarded: false,
        onboarding_step: OnboardingStep.WELCOME,
        children: [],
        last_updated: Date.now() - 1000 * 60 * 30 // 30 mins ago
      },
      {
        session_id: 'user-c-fresh',
        onboarded: false,
        onboarding_step: OnboardingStep.WELCOME,
        children: [],
        last_updated: Date.now() - 1000 * 60 * 5 // 5 mins ago
      }
    ];

    for (const profile of seedProfiles) {
      const ref = doc(profilesCol, profile.session_id);
      await setDoc(ref, profile);
    }
    
    console.log('Seeded test data to Firestore');
  },

  resetDatabase: async (): Promise<void> => {
    if (import.meta.env.PROD) {
      console.warn('Reset disabled in production');
      return;
    }
    
    // Note: In a real app, you'd want to batch delete documents
    // For now, this is just a placeholder
    console.log('Reset database (implement batch delete for emulator use)');
  }
};