import { UserProfile, Message, OnboardingStep, Role } from './types';

// SQLite Database Implementation
// This will replace the in-memory store with persistent SQLite storage

interface DatabaseInterface {
  // Profiles
  getProfile: (sessionId: string) => UserProfile | undefined;
  createProfile: (sessionId: string) => UserProfile;
  updateProfile: (sessionId: string, updates: Partial<UserProfile>) => UserProfile;
  getAllProfiles: () => UserProfile[];
  
  // Messages
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => Message;
  getMessages: (sessionId: string) => Message[];
  getAllMessages: () => Message[];
  
  // Admin SQL queries
  executeQuery: (query: string) => any[];
  
  // Database management
  initializeDatabase: () => void;
  migrateProfiles: () => void;
  seedTestData: () => void;
  resetDatabase: () => void;
}

// For now, we'll use enhanced in-memory storage that mimics SQLite structure
// This can be easily replaced with actual SQLite later

// Enhanced seed data - ALL FRESH for testing
const seedProfiles: Record<string, UserProfile> = {
  'user-a-complete': {
    session_id: 'user-a-complete',
    onboarded: false,
    onboarding_step: OnboardingStep.WELCOME,
    children: [],
    last_updated: Date.now() - 1000 * 60 * 60 * 2 // 2 hours ago
  },
  'user-b-expecting': {
    session_id: 'user-b-expecting',
    onboarded: false,
    onboarding_step: OnboardingStep.WELCOME,
    children: [],
    last_updated: Date.now() - 1000 * 60 * 30 // 30 mins ago
  },
  'user-c-fresh': {
    session_id: 'user-c-fresh',
    onboarded: false,
    onboarding_step: OnboardingStep.WELCOME,
    children: [],
    last_updated: Date.now() - 1000 * 60 * 5 // 5 mins ago
  }
};

const seedMessages: Message[] = [
  // All users start completely fresh with no message history
];

// In-memory storage that mimics SQLite structure
let profiles: Record<string, UserProfile> = {};
let messages: Message[] = [];
let messageIdCounter = 1000;

export const database: DatabaseInterface = {
  // Initialize database with seed data
  initializeDatabase: () => {
    console.log('Initializing database...');
    database.migrateProfiles(); // Migrate any existing data
    database.seedTestData();
  },

  // Migrate existing profiles to new structure (remove siblings field, consolidate into children)
  migrateProfiles: () => {
    Object.keys(profiles).forEach(sessionId => {
      const profile = profiles[sessionId];
      if ((profile as any).siblings && (profile as any).siblings.length > 0) {
        // Move siblings to children array with type "existing"
        const siblings = (profile as any).siblings.map((sibling: any) => ({
          ...sibling,
          type: 'existing'
        }));
        profile.children = [...(profile.children || []), ...siblings];
        delete (profile as any).siblings;
        console.log(`Migrated profile ${sessionId}: moved ${siblings.length} siblings to children array`);
      }
    });
  },

  // Seed test data as per spec
  seedTestData: () => {
    profiles = { ...seedProfiles };
    messages = [...seedMessages];
    messageIdCounter = 1000; // Reset message counter
    console.log('Seeded database with test data:', {
      profiles: Object.keys(profiles).length,
      messages: messages.length
    });
  },

  // Profile operations
  getProfile: (sessionId: string): UserProfile | undefined => {
    return profiles[sessionId];
  },
  
  createProfile: (sessionId: string): UserProfile => {
    const newProfile: UserProfile = {
      session_id: sessionId,
      onboarded: false,
      onboarding_step: OnboardingStep.WELCOME,
      children: [],
      last_updated: Date.now()
    };
    profiles[sessionId] = newProfile;
    return newProfile;
  },

  updateProfile: (sessionId: string, updates: Partial<UserProfile>): UserProfile => {
    const profile = profiles[sessionId] || database.createProfile(sessionId);
    profiles[sessionId] = { ...profile, ...updates, last_updated: Date.now() };
    return profiles[sessionId];
  },

  getAllProfiles: (): UserProfile[] => {
    return Object.values(profiles).sort((a, b) => b.last_updated - a.last_updated);
  },

  // Message operations
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>): Message => {
    const newMessage: Message = {
      ...msg,
      id: `msg-${messageIdCounter++}`,
      timestamp: Date.now()
    };
    messages.push(newMessage);
    return newMessage;
  },

  getMessages: (sessionId: string): Message[] => {
    return messages.filter(m => m.session_id === sessionId).sort((a, b) => a.timestamp - b.timestamp);
  },

  getAllMessages: (): Message[] => {
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  },

  // Admin SQL query interface (simulated)
  executeQuery: (query: string): any[] => {
    const lowerQuery = query.toLowerCase().trim();
    
    try {
      if (lowerQuery.startsWith('select * from profiles') || lowerQuery.startsWith('select * from userprofile')) {
        return Object.values(profiles);
      }
      
      if (lowerQuery.startsWith('select * from messages') || lowerQuery.startsWith('select * from message')) {
        return messages;
      }
      
      if (lowerQuery.includes('count') && lowerQuery.includes('profiles')) {
        return [{ count: Object.keys(profiles).length }];
      }
      
      if (lowerQuery.includes('count') && lowerQuery.includes('messages')) {
        return [{ count: messages.length }];
      }
      
      // Simple WHERE clauses
      if (lowerQuery.includes('where onboarded = true')) {
        return Object.values(profiles).filter(p => p.onboarded);
      }
      
      if (lowerQuery.includes('where onboarded = false')) {
        return Object.values(profiles).filter(p => !p.onboarded);
      }
      
      return [{ error: 'Query not supported in demo mode' }];
    } catch (error) {
      return [{ error: `Query error: ${error.message}` }];
    }
  },

  // Database management
  resetDatabase: () => {
    console.log('Resetting database to fresh state...');
    database.seedTestData();
  }
};

// Initialize database on import
database.initializeDatabase();

// Reset to fresh state for testing
database.resetDatabase();