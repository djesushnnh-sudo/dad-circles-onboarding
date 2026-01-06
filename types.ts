export enum OnboardingStep {
  WELCOME = 'welcome',
  STATUS = 'status',
  CHILD_INFO = 'child_info',
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
  onboarded: boolean;
  onboarding_step: OnboardingStep;
  location?: UserLocation;
  interests?: string[];
  children: Child[];
  last_updated: number;
}

export interface Message {
  id: string;
  session_id: string;
  timestamp: number;
  role: Role;
  content: string;
}