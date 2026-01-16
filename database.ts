import { db } from './firebase';
import { isUsingEmulator } from './firebase';
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
  writeBatch,
} from 'firebase/firestore';
import { UserProfile, Message, OnboardingStep, Role, Lead, Group, MatchingStats, LifeStage } from './types';

// Firestore collections
const profilesCol = collection(db, 'profiles');
const messagesCol = collection(db, 'messages');
const leadsCol = collection(db, 'leads');
const groupsCol = collection(db, 'groups');

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
  getLeadByEmail: (email: string) => Promise<Lead | undefined>;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<Lead>;
  
  // Groups
  createGroup: (group: Omit<Group, 'group_id' | 'created_at'>) => Promise<Group>;
  getGroup: (groupId: string) => Promise<Group | undefined>;
  getAllGroups: () => Promise<Group[]>;
  getGroupsByLocation: (city: string, stateCode: string) => Promise<Group[]>;
  updateGroup: (groupId: string, updates: Partial<Group>) => Promise<Group>;
  
  // Matching
  getUnmatchedUsers: (city?: string, stateCode?: string) => Promise<UserProfile[]>;
  getUsersInGroup: (groupId: string) => Promise<UserProfile[]>;
  updateUserGroupAssignment: (sessionId: string, groupId: string | null) => Promise<void>;
  getMatchingStats: () => Promise<MatchingStats>;
  
  // Database management (dev/emulator only)
  seedTestData?: () => Promise<void>;
  resetDatabase?: () => Promise<void>;
  cleanTestData?: () => Promise<void>;
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
      matching_eligible: false, // Default to false until onboarding is complete
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

  getLeadByEmail: async (email: string): Promise<Lead | undefined> => {
    const q = query(leadsCol, where('email', '==', email.toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as Lead;
  },

  updateLead: async (leadId: string, updates: Partial<Lead>): Promise<Lead> => {
    const ref = doc(leadsCol, leadId);
    await setDoc(ref, updates, { merge: true });
    const snap = await getDoc(ref);
    return snap.data() as Lead;
  },

  // Group operations
  createGroup: async (group: Omit<Group, 'group_id' | 'created_at'>): Promise<Group> => {
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newGroup: Group = {
      ...group,
      group_id: groupId,
      created_at: Date.now(),
    };
    const ref = doc(groupsCol, groupId);
    await setDoc(ref, newGroup);
    return newGroup;
  },

  getGroup: async (groupId: string): Promise<Group | undefined> => {
    const ref = doc(groupsCol, groupId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return undefined;
    return snap.data() as Group;
  },

  getAllGroups: async (): Promise<Group[]> => {
    const q = query(groupsCol, orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Group);
  },

  getGroupsByLocation: async (city: string, stateCode: string): Promise<Group[]> => {
    const q = query(
      groupsCol,
      where('location.city', '==', city),
      where('location.state_code', '==', stateCode),
      orderBy('created_at', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Group);
  },

  updateGroup: async (groupId: string, updates: Partial<Group>): Promise<Group> => {
    const ref = doc(groupsCol, groupId);
    await setDoc(ref, updates, { merge: true });
    const snap = await getDoc(ref);
    return snap.data() as Group;
  },

  // Matching operations
  getUnmatchedUsers: async (city?: string, stateCode?: string): Promise<UserProfile[]> => {
    try {
      // Get all eligible users first, then filter in JavaScript for better reliability
      let baseQuery = query(
        profilesCol,
        where('matching_eligible', '==', true)
      );

      // Add location filter if specified
      if (city && stateCode) {
        baseQuery = query(
          profilesCol,
          where('matching_eligible', '==', true),
          where('location.city', '==', city),
          where('location.state_code', '==', stateCode)
        );
      }

      const snapshot = await getDocs(baseQuery);
      const eligibleUsers = snapshot.docs.map(doc => doc.data() as UserProfile);
      
      // Filter out users that have a group_id (handles both null and undefined)
      const unmatchedUsers = eligibleUsers.filter(user => !user.group_id);
      
      console.log(`📊 getUnmatchedUsers: ${eligibleUsers.length} eligible, ${unmatchedUsers.length} unmatched${city ? ` in ${city}, ${stateCode}` : ''}`);
      
      return unmatchedUsers;
    } catch (error) {
      console.error('❌ Error in getUnmatchedUsers:', error);
      throw new Error(`Failed to get unmatched users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  getUsersInGroup: async (groupId: string): Promise<UserProfile[]> => {
    const q = query(profilesCol, where('group_id', '==', groupId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProfile);
  },

  updateUserGroupAssignment: async (sessionId: string, groupId: string | null): Promise<void> => {
    const ref = doc(profilesCol, sessionId);
    const updates: Partial<UserProfile> = {
      group_id: groupId,
      last_updated: Date.now(),
    };
    
    if (groupId) {
      updates.matched_at = Date.now();
    } else {
      updates.matched_at = undefined;
    }
    
    await setDoc(ref, updates, { merge: true });
  },

  getMatchingStats: async (): Promise<MatchingStats> => {
    const allProfiles = await database.getAllProfiles();
    const eligibleUsers = allProfiles.filter(p => p.matching_eligible);
    const matchedUsers = eligibleUsers.filter(p => p.group_id);
    const unmatchedUsers = eligibleUsers.filter(p => !p.group_id);

    const byLocation: Record<string, any> = {};

    for (const user of eligibleUsers) {
      if (!user.location) continue;
      
      const locationKey = `${user.location.city}, ${user.location.state_code}`;
      if (!byLocation[locationKey]) {
        byLocation[locationKey] = {
          total: 0,
          matched: 0,
          unmatched: 0,
          by_life_stage: {
            [LifeStage.EXPECTING]: 0,
            [LifeStage.NEWBORN]: 0,
            [LifeStage.INFANT]: 0,
            [LifeStage.TODDLER]: 0,
          }
        };
      }

      byLocation[locationKey].total++;
      if (user.group_id) {
        byLocation[locationKey].matched++;
      } else {
        byLocation[locationKey].unmatched++;
      }

      // Count by life stage
      const lifeStage = getLifeStageFromUser(user);
      if (lifeStage) {
        byLocation[locationKey].by_life_stage[lifeStage]++;
      }
    }

    return {
      total_users: eligibleUsers.length,
      matched_users: matchedUsers.length,
      unmatched_users: unmatchedUsers.length,
      by_location: byLocation,
    };
  },

  // Development/testing methods (only use with emulator)
  seedTestData: async (): Promise<void> => {
    // Only allow seeding when using emulator
    if (!isUsingEmulator) {
      console.error('❌ Seed test data is only available when using the Firebase emulator');
      throw new Error('Cannot seed test data in production. Use emulator for testing.');
    }
    
    console.log('🌱 Starting test user seeding...');
    
    // Generate 50 test users with realistic data
    const testUsers = [
      // Ann Arbor, MI - 15 users (8 expecting, 3 newborn, 3 infant, 1 toddler)
      { sessionId: 'test-session-aa-001', email: 'test-dad-aa-001@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'expecting' as const, birthMonth: 4, birthYear: 2025, gender: 'boy', interests: ['hiking', 'cooking', 'reading'] },
      { sessionId: 'test-session-aa-002', email: 'test-dad-aa-002@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'expecting' as const, birthMonth: 5, birthYear: 2025, gender: 'girl', interests: ['sports', 'music', 'technology'] },
      { sessionId: 'test-session-aa-003', email: 'test-dad-aa-003@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'expecting' as const, birthMonth: 6, birthYear: 2025, interests: ['fitness', 'photography', 'travel'] },
      { sessionId: 'test-session-aa-004', email: 'test-dad-aa-004@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'expecting' as const, birthMonth: 7, birthYear: 2025, gender: 'boy', interests: ['gaming', 'woodworking', 'cycling'] },
      { sessionId: 'test-session-aa-005', email: 'test-dad-aa-005@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'expecting' as const, birthMonth: 8, birthYear: 2025, interests: ['art', 'gardening', 'movies'] },
      { sessionId: 'test-session-aa-006', email: 'test-dad-aa-006@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'expecting' as const, birthMonth: 3, birthYear: 2025, gender: 'girl', interests: ['running', 'cooking', 'books'] },
      { sessionId: 'test-session-aa-007', email: 'test-dad-aa-007@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'expecting' as const, birthMonth: 9, birthYear: 2025, interests: ['music', 'hiking', 'technology'] },
      { sessionId: 'test-session-aa-008', email: 'test-dad-aa-008@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'expecting' as const, birthMonth: 4, birthYear: 2025, gender: 'boy', interests: ['sports', 'travel', 'fitness'] },
      { sessionId: 'test-session-aa-009', email: 'test-dad-aa-009@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'existing' as const, birthMonth: 12, birthYear: 2024, gender: 'girl', interests: ['photography', 'cooking', 'reading'] },
      { sessionId: 'test-session-aa-010', email: 'test-dad-aa-010@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'existing' as const, birthMonth: 11, birthYear: 2024, gender: 'boy', interests: ['gaming', 'music', 'cycling'] },
      { sessionId: 'test-session-aa-011', email: 'test-dad-aa-011@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'existing' as const, birthMonth: 10, birthYear: 2024, interests: ['hiking', 'technology', 'movies'] },
      { sessionId: 'test-session-aa-012', email: 'test-dad-aa-012@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'existing' as const, birthMonth: 8, birthYear: 2024, gender: 'girl', interests: ['woodworking', 'travel', 'fitness'] },
      { sessionId: 'test-session-aa-013', email: 'test-dad-aa-013@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'existing' as const, birthMonth: 6, birthYear: 2024, gender: 'boy', interests: ['art', 'running', 'books'] },
      { sessionId: 'test-session-aa-014', email: 'test-dad-aa-014@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'existing' as const, birthMonth: 4, birthYear: 2024, interests: ['gardening', 'sports', 'cooking'] },
      { sessionId: 'test-session-aa-015', email: 'test-dad-aa-015@example.com', location: { city: 'Ann Arbor', state_code: 'MI' }, childType: 'existing' as const, birthMonth: 6, birthYear: 2023, gender: 'boy', interests: ['music', 'hiking', 'photography'] },
      
      // Austin, TX - 12 users (6 expecting, 3 newborn, 2 infant, 1 toddler)
      { sessionId: 'test-session-au-001', email: 'test-dad-au-001@example.com', location: { city: 'Austin', state_code: 'TX' }, childType: 'expecting' as const, birthMonth: 5, birthYear: 2025, gender: 'girl', interests: ['music', 'food', 'cycling'] },
      { sessionId: 'test-session-au-002', email: 'test-dad-au-002@example.com', location: { city: 'Austin', state_code: 'TX' }, childType: 'expecting' as const, birthMonth: 6, birthYear: 2025, gender: 'boy', interests: ['technology', 'hiking', 'gaming'] },
      { sessionId: 'test-session-au-003', email: 'test-dad-au-003@example.com', location: { city: 'Austin', state_code: 'TX' }, childType: 'expecting' as const, birthMonth: 7, birthYear: 2025, interests: ['sports', 'cooking', 'travel'] },
      { sessionId: 'test-session-au-004', email: 'test-dad-au-004@example.com', location: { city: 'Austin', state_code: 'TX' }, childType: 'expecting' as const, birthMonth: 8, birthYear: 2025, gender: 'girl', interests: ['fitness', 'photography', 'movies'] },
      { sessionId: 'test-session-au-005', email: 'test-dad-au-005@example.com', location: { city: 'Austin', state_code: 'TX' }, childType: 'expecting' as const, birthMonth: 4, birthYear: 2025, interests: ['art', 'running', 'books'] },
      { sessionId: 'test-session-au-006', email: 'test-dad-au-006@example.com', location: { city: 'Austin', state_code: 'TX' }, childType: 'expecting' as const, birthMonth: 9, birthYear: 2025, gender: 'boy', interests: ['woodworking', 'music', 'gardening'] },
      { sessionId: 'test-session-au-007', email: 'test-dad-au-007@example.com', location: { city: 'Austin', state_code: 'TX' }, childType: 'existing' as const, birthMonth: 1, birthYear: 2025, gender: 'girl', interests: ['technology', 'cycling', 'cooking'] },
      { sessionId: 'test-session-au-008', email: 'test-dad-au-008@example.com', location: { city: 'Austin', state_code: 'TX' }, childType: 'existing' as const, birthMonth: 12, birthYear: 2024, gender: 'boy', interests: ['sports', 'hiking', 'photography'] },
      { sessionId: 'test-session-au-009', email: 'test-dad-au-009@example.com', location: { city: 'Austin', state_code: 'TX' }, childType: 'existing' as const, birthMonth: 11, birthYear: 2024, interests: ['gaming', 'travel', 'fitness'] },
      { sessionId: 'test-session-au-010', email: 'test-dad-au-010@example.com', location: { city: 'Austin', state_code: 'TX' }, childType: 'existing' as const, birthMonth: 9, birthYear: 2024, gender: 'girl', interests: ['music', 'art', 'movies'] },
      { sessionId: 'test-session-au-011', email: 'test-dad-au-011@example.com', location: { city: 'Austin', state_code: 'TX' }, childType: 'existing' as const, birthMonth: 7, birthYear: 2024, gender: 'boy', interests: ['running', 'books', 'gardening'] },
      { sessionId: 'test-session-au-012', email: 'test-dad-au-012@example.com', location: { city: 'Austin', state_code: 'TX' }, childType: 'existing' as const, birthMonth: 8, birthYear: 2023, gender: 'girl', interests: ['woodworking', 'cycling', 'cooking'] },
      
      // Boulder, CO - 10 users (5 expecting, 2 newborn, 2 infant, 1 toddler)
      { sessionId: 'test-session-bo-001', email: 'test-dad-bo-001@example.com', location: { city: 'Boulder', state_code: 'CO' }, childType: 'expecting' as const, birthMonth: 6, birthYear: 2025, gender: 'boy', interests: ['hiking', 'climbing', 'photography'] },
      { sessionId: 'test-session-bo-002', email: 'test-dad-bo-002@example.com', location: { city: 'Boulder', state_code: 'CO' }, childType: 'expecting' as const, birthMonth: 7, birthYear: 2025, interests: ['cycling', 'skiing', 'technology'] },
      { sessionId: 'test-session-bo-003', email: 'test-dad-bo-003@example.com', location: { city: 'Boulder', state_code: 'CO' }, childType: 'expecting' as const, birthMonth: 5, birthYear: 2025, gender: 'girl', interests: ['running', 'yoga', 'cooking'] },
      { sessionId: 'test-session-bo-004', email: 'test-dad-bo-004@example.com', location: { city: 'Boulder', state_code: 'CO' }, childType: 'expecting' as const, birthMonth: 8, birthYear: 2025, interests: ['music', 'travel', 'fitness'] },
      { sessionId: 'test-session-bo-005', email: 'test-dad-bo-005@example.com', location: { city: 'Boulder', state_code: 'CO' }, childType: 'expecting' as const, birthMonth: 4, birthYear: 2025, gender: 'boy', interests: ['art', 'gardening', 'books'] },
      { sessionId: 'test-session-bo-006', email: 'test-dad-bo-006@example.com', location: { city: 'Boulder', state_code: 'CO' }, childType: 'existing' as const, birthMonth: 12, birthYear: 2024, gender: 'girl', interests: ['hiking', 'photography', 'movies'] },
      { sessionId: 'test-session-bo-007', email: 'test-dad-bo-007@example.com', location: { city: 'Boulder', state_code: 'CO' }, childType: 'existing' as const, birthMonth: 1, birthYear: 2025, interests: ['cycling', 'technology', 'cooking'] },
      { sessionId: 'test-session-bo-008', email: 'test-dad-bo-008@example.com', location: { city: 'Boulder', state_code: 'CO' }, childType: 'existing' as const, birthMonth: 8, birthYear: 2024, gender: 'boy', interests: ['climbing', 'music', 'travel'] },
      { sessionId: 'test-session-bo-009', email: 'test-dad-bo-009@example.com', location: { city: 'Boulder', state_code: 'CO' }, childType: 'existing' as const, birthMonth: 6, birthYear: 2024, gender: 'girl', interests: ['skiing', 'fitness', 'art'] },
      { sessionId: 'test-session-bo-010', email: 'test-dad-bo-010@example.com', location: { city: 'Boulder', state_code: 'CO' }, childType: 'existing' as const, birthMonth: 9, birthYear: 2023, interests: ['running', 'gardening', 'books'] },
      
      // Portland, OR - 8 users (4 expecting, 2 newborn, 1 infant, 1 toddler)
      { sessionId: 'test-session-po-001', email: 'test-dad-po-001@example.com', location: { city: 'Portland', state_code: 'OR' }, childType: 'expecting' as const, birthMonth: 5, birthYear: 2025, gender: 'girl', interests: ['coffee', 'biking', 'music'] },
      { sessionId: 'test-session-po-002', email: 'test-dad-po-002@example.com', location: { city: 'Portland', state_code: 'OR' }, childType: 'expecting' as const, birthMonth: 6, birthYear: 2025, interests: ['food', 'hiking', 'technology'] },
      { sessionId: 'test-session-po-003', email: 'test-dad-po-003@example.com', location: { city: 'Portland', state_code: 'OR' }, childType: 'expecting' as const, birthMonth: 7, birthYear: 2025, gender: 'boy', interests: ['brewing', 'photography', 'gaming'] },
      { sessionId: 'test-session-po-004', email: 'test-dad-po-004@example.com', location: { city: 'Portland', state_code: 'OR' }, childType: 'expecting' as const, birthMonth: 8, birthYear: 2025, interests: ['art', 'running', 'movies'] },
      { sessionId: 'test-session-po-005', email: 'test-dad-po-005@example.com', location: { city: 'Portland', state_code: 'OR' }, childType: 'existing' as const, birthMonth: 11, birthYear: 2024, gender: 'girl', interests: ['coffee', 'books', 'travel'] },
      { sessionId: 'test-session-po-006', email: 'test-dad-po-006@example.com', location: { city: 'Portland', state_code: 'OR' }, childType: 'existing' as const, birthMonth: 12, birthYear: 2024, interests: ['biking', 'cooking', 'fitness'] },
      { sessionId: 'test-session-po-007', email: 'test-dad-po-007@example.com', location: { city: 'Portland', state_code: 'OR' }, childType: 'existing' as const, birthMonth: 9, birthYear: 2024, gender: 'boy', interests: ['food', 'music', 'gardening'] },
      { sessionId: 'test-session-po-008', email: 'test-dad-po-008@example.com', location: { city: 'Portland', state_code: 'OR' }, childType: 'existing' as const, birthMonth: 7, birthYear: 2023, gender: 'girl', interests: ['brewing', 'hiking', 'art'] },
      
      // Scattered cities - 5 users (unmatchable controls)
      { sessionId: 'test-session-sc-001', email: 'test-dad-sc-001@example.com', location: { city: 'Seattle', state_code: 'WA' }, childType: 'expecting' as const, birthMonth: 6, birthYear: 2025, interests: ['technology', 'coffee', 'hiking'] },
      { sessionId: 'test-session-sc-002', email: 'test-dad-sc-002@example.com', location: { city: 'Denver', state_code: 'CO' }, childType: 'expecting' as const, birthMonth: 7, birthYear: 2025, gender: 'boy', interests: ['skiing', 'music', 'travel'] },
      { sessionId: 'test-session-sc-003', email: 'test-dad-sc-003@example.com', location: { city: 'Nashville', state_code: 'TN' }, childType: 'existing' as const, birthMonth: 10, birthYear: 2024, interests: ['music', 'food', 'sports'] },
      { sessionId: 'test-session-sc-004', email: 'test-dad-sc-004@example.com', location: { city: 'Phoenix', state_code: 'AZ' }, childType: 'existing' as const, birthMonth: 8, birthYear: 2024, gender: 'girl', interests: ['hiking', 'photography', 'fitness'] },
      { sessionId: 'test-session-sc-005', email: 'test-dad-sc-005@example.com', location: { city: 'Miami', state_code: 'FL' }, childType: 'existing' as const, birthMonth: 5, birthYear: 2023, gender: 'boy', interests: ['swimming', 'cooking', 'art'] },
    ];

    let seededCount = 0;
    
    for (const user of testUsers) {
      const child: Child = {
        type: user.childType,
        birth_month: user.birthMonth,
        birth_year: user.birthYear,
      };
      
      if (user.gender) {
        child.gender = user.gender;
      }

      const profile: UserProfile = {
        session_id: user.sessionId,
        email: user.email,
        onboarded: true,
        onboarding_step: 'complete',
        location: user.location,
        interests: user.interests,
        children: [child],
        siblings: [],
        last_updated: Date.now(),
        matching_eligible: true,
      };

      const ref = doc(profilesCol, user.sessionId);
      await setDoc(ref, profile);
      seededCount++;
    }

    console.log(`✅ Successfully seeded ${seededCount} test users!`);
  },

  resetDatabase: async (): Promise<void> => {
    if (import.meta.env.PROD) {
      console.warn('Reset disabled in production');
      return;
    }
    
    // Note: In a real app, you'd want to batch delete documents
    // For now, this is just a placeholder
    console.log('Reset database (implement batch delete for emulator use)');
  },

  cleanTestData: async (): Promise<void> => {
    // Only allow cleaning test data when using emulator
    if (!isUsingEmulator) {
      console.error('❌ Clean test data is only available when using the Firebase emulator');
      throw new Error('Cannot clean test data in production. Use emulator for testing.');
    }

    const batch = writeBatch(db);
    
    // Delete test users (session_id starts with "test-")
    const testUsersQuery = query(profilesCol);
    const testUsersSnap = await getDocs(testUsersQuery);
    
    let deletedUsers = 0;
    testUsersSnap.docs.forEach(doc => {
      const data = doc.data() as UserProfile;
      if (data.session_id.startsWith('test-')) {
        batch.delete(doc.ref);
        deletedUsers++;
      }
    });

    // Delete test groups (test_mode: true)
    const testGroupsQuery = query(groupsCol, where('test_mode', '==', true));
    const testGroupsSnap = await getDocs(testGroupsQuery);
    
    let deletedGroups = 0;
    testGroupsSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedGroups++;
    });

    await batch.commit();
    console.log(`✅ Cleaned test data: ${deletedUsers} users, ${deletedGroups} groups`);
  }
};

// Helper function to determine life stage from user profile
function getLifeStageFromUser(user: UserProfile): LifeStage | null {
  if (!user.children || user.children.length === 0) return null;
  
  const primaryChild = user.children[0]; // Use first child for life stage
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
  
  if (primaryChild.type === 'expecting') {
    return LifeStage.EXPECTING;
  }
  
  // Calculate age in months
  const birthYear = primaryChild.birth_year;
  const birthMonth = primaryChild.birth_month;
  const ageInMonths = (currentYear - birthYear) * 12 + (currentMonth - birthMonth);
  
  if (ageInMonths <= 6) {
    return LifeStage.NEWBORN;
  } else if (ageInMonths <= 18) {
    return LifeStage.INFANT;
  } else if (ageInMonths <= 36) {
    return LifeStage.TODDLER;
  }
  
  return null; // Child is too old for our current matching system
}

// Export helper function for use in other modules
export { getLifeStageFromUser };