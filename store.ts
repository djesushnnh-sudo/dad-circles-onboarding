import { UserProfile, Message, OnboardingStep, Role } from './types';

// Initial Mock Data to populate the dashboard
const initialProfiles: Record<string, UserProfile> = {
  'session-abc-123': {
    session_id: 'session-abc-123',
    onboarded: true,
    onboarding_step: OnboardingStep.COMPLETE,
    location: { city: 'Austin', state_code: 'TX' },
    interests: ['Cooking', 'Running'],
    children: [{ type: 'existing', birth_month: 5, birth_year: 2022, gender: 'Girl' }],
    last_updated: Date.now() - 1000 * 60 * 60 * 2 // 2 hours ago
  },
  'session-def-456': {
    session_id: 'session-def-456',
    onboarded: false,
    onboarding_step: OnboardingStep.CONFIRM,
    location: { city: 'Lansing', state_code: 'MI' },
    interests: ['Hiking'],
    children: [{ type: 'expecting', birth_month: 10, birth_year: 2025 }],
    last_updated: Date.now() - 1000 * 60 * 15 // 15 mins ago
  },
  'session-ghi-789': {
    session_id: 'session-ghi-789',
    onboarded: false,
    onboarding_step: OnboardingStep.INTERESTS,
    location: { city: 'Seattle', state_code: 'WA' },
    children: [{ type: 'existing', birth_month: 2, birth_year: 2024, gender: 'Boy' }],
    last_updated: Date.now() - 1000 * 60 * 5 // 5 mins ago
  }
};

const initialMessages: Message[] = [
  // Session 1 History
  { id: 'm1', session_id: 'session-abc-123', timestamp: Date.now() - 7200000, role: Role.AGENT, content: "Hi! Welcome to Dad Circles. Are you a current dad or an expecting one?" },
  { id: 'm2', session_id: 'session-abc-123', timestamp: Date.now() - 7100000, role: Role.USER, content: "I'm a dad to a toddler." },
  { id: 'm3', session_id: 'session-abc-123', timestamp: Date.now() - 7000000, role: Role.AGENT, content: "That's awesome! When was your little one born? (Month and Year)" },
  { id: 'm4', session_id: 'session-abc-123', timestamp: Date.now() - 6900000, role: Role.USER, content: "May 2022. It's a girl!" },
  { id: 'm5', session_id: 'session-abc-123', timestamp: Date.now() - 6800000, role: Role.AGENT, content: "Got it! Any hobbies you enjoy when you get some downtime?" },
  { id: 'm6', session_id: 'session-abc-123', timestamp: Date.now() - 6700000, role: Role.USER, content: "Cooking and running." },
  { id: 'm7', session_id: 'session-abc-123', timestamp: Date.now() - 6600000, role: Role.AGENT, content: "Nice. And finally, what city and state do you live in?" },
  { id: 'm8', session_id: 'session-abc-123', timestamp: Date.now() - 6500000, role: Role.USER, content: "Austin, TX" },
  { id: 'm9', session_id: 'session-abc-123', timestamp: Date.now() - 6400000, role: Role.AGENT, content: "Perfect! Here's what I have: Status: Current Dad. Child: Girl (Born May 2022). Interests: Cooking, Running. Location: Austin, TX. Does that look correct?" },
  { id: 'm10', session_id: 'session-abc-123', timestamp: Date.now() - 6300000, role: Role.USER, content: "Yep!" },
  { id: 'm11', session_id: 'session-abc-123', timestamp: Date.now() - 6200000, role: Role.AGENT, content: "You’re officially onboarded! Welcome to Dad Circles — we'll reach out when we find your group." },

  // Session 2 History
  { id: 'm12', session_id: 'session-def-456', timestamp: Date.now() - 900000, role: Role.AGENT, content: "Hey there! Welcome. Are you an expecting dad or already a dad?" },
  { id: 'm13', session_id: 'session-def-456', timestamp: Date.now() - 850000, role: Role.USER, content: "Expecting my first!" },
  { id: 'm14', session_id: 'session-def-456', timestamp: Date.now() - 800000, role: Role.AGENT, content: "Congrats! That is so exciting. When is the due date?" },
  { id: 'm15', session_id: 'session-def-456', timestamp: Date.now() - 750000, role: Role.USER, content: "October 2025." },
  { id: 'm16', session_id: 'session-def-456', timestamp: Date.now() - 700000, role: Role.AGENT, content: "Love it. What are some of your interests or hobbies?" },
  { id: 'm17', session_id: 'session-def-456', timestamp: Date.now() - 650000, role: Role.USER, content: "Mostly hiking." },
  { id: 'm18', session_id: 'session-def-456', timestamp: Date.now() - 600000, role: Role.AGENT, content: "Got it. Where are you located? (City and State)" },
  { id: 'm19', session_id: 'session-def-456', timestamp: Date.now() - 550000, role: Role.USER, content: "Lansing MI" },
  { id: 'm20', session_id: 'session-def-456', timestamp: Date.now() - 500000, role: Role.AGENT, content: "Awesome. I've got you down as an Expecting Dad, due in Oct 2025, interested in Hiking, living in Lansing, MI. Look good?" },

  // Session 3 History
  { id: 'm21', session_id: 'session-ghi-789', timestamp: Date.now() - 300000, role: Role.AGENT, content: "Hi! Welcome to Dad Circles. Are you an expecting or current dad?" },
  { id: 'm22', session_id: 'session-ghi-789', timestamp: Date.now() - 250000, role: Role.USER, content: "Current dad." },
  { id: 'm23', session_id: 'session-ghi-789', timestamp: Date.now() - 200000, role: Role.AGENT, content: "Great! When was your child born?" },
  { id: 'm24', session_id: 'session-ghi-789', timestamp: Date.now() - 150000, role: Role.USER, content: "Feb 2024. He's a boy." }
];

// In-memory data store initialized with mock data
let profiles: Record<string, UserProfile> = { ...initialProfiles };
let messages: Message[] = [ ...initialMessages ];

export const db = {
  // Profiles
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
    const profile = profiles[sessionId] || db.createProfile(sessionId);
    profiles[sessionId] = { ...profile, ...updates, last_updated: Date.now() };
    return profiles[sessionId];
  },

  getAllProfiles: (): UserProfile[] => {
    return Object.values(profiles).sort((a, b) => b.last_updated - a.last_updated);
  },

  // Messages
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>): Message => {
    const newMessage: Message = {
      ...msg,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now()
    };
    messages.push(newMessage);
    return newMessage;
  },

  getMessages: (sessionId: string): Message[] => {
    return messages.filter(m => m.session_id === sessionId).sort((a, b) => a.timestamp - b.timestamp);
  },

  getAllMessages: (): Message[] => {
    return messages;
  }
};