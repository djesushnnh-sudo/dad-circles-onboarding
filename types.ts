export enum OnboardingStep {
  WELCOME = 'welcome',
  STATUS = 'status',
  CHILD_INFO = 'child_info',
  SIBLINGS = 'siblings',
  INTERESTS = 'interests',
  LOCATION = 'location',
  CONFIRM = 'confirm',
  COMPLETE = 'complete'
}

export enum Role {
  USER = 'user',
  AGENT = 'agent',
  ADMIN = 'admin'
}

export interface Child {
  type: 'expecting' | 'existing';
  birth_month: number;
  birth_year: number;
  gender?: string;
}

export interface UserLocation {
  city: string;
  state_code: string;
}

export interface UserProfile {
  session_id: string;
  email?: string;
  onboarded: boolean;
  onboarding_step: OnboardingStep;
  location?: UserLocation;
  interests?: string[];
  children: Child[];
  siblings?: Child[]; // Other existing children
  last_updated: number;
}

export interface Message {
  id: string;
  session_id: string;
  timestamp: number;
  role: Role;
  content: string;
}

export interface Lead {
  id?: string;
  email: string;
  postcode: string;
  signupForOther: boolean;
  session_id?: string; // Links to UserProfile for non-signupForOther leads
  timestamp: number;
  source: 'landing_page';
  
  // Email tracking fields
  welcomeEmailSent?: boolean;
  welcomeEmailSentAt?: any; // Firestore timestamp
  welcomeEmailFailed?: boolean;
  welcomeEmailFailedAt?: any; // Firestore timestamp
  
  followUpEmailSent?: boolean;
  followUpEmailSentAt?: any; // Firestore timestamp
  followUpEmailFailed?: boolean;
  followUpEmailFailedAt?: any; // Firestore timestamp
}