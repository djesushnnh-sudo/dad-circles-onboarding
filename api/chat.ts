// REST API Endpoint: POST /chat
// This implements the API structure specified in the spec

import { database } from '../database';
import { getAgentResponse } from '../services/geminiService';
import { Role, OnboardingStep } from '../types';

export interface ChatRequest {
  session_id: string;
  message: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  onboarding_step: string;
  onboarded: boolean;
}

export const handleChatRequest = async (request: ChatRequest): Promise<ChatResponse> => {
  const { session_id, message } = request;
  
  try {
    // Get or create user profile
    let profile = database.getProfile(session_id);
    if (!profile) {
      profile = database.createProfile(session_id);
    }
    
    // Add user message to history
    database.addMessage({
      session_id,
      role: Role.USER,
      content: message
    });
    
    // Get conversation history
    const history = database.getMessages(session_id);
    
    // Get AI response
    const result = await getAgentResponse(profile, history);
    
    // Update profile with any new data
    if (result.profile_updates) {
      profile = database.updateProfile(session_id, result.profile_updates);
    }
    
    // Update onboarding step
    const nextStep = result.next_step as OnboardingStep;
    profile = database.updateProfile(session_id, {
      onboarding_step: nextStep,
      onboarded: nextStep === OnboardingStep.COMPLETE
    });
    
    // Add agent response to history
    database.addMessage({
      session_id,
      role: Role.AGENT,
      content: result.message
    });
    
    return {
      response: result.message,
      session_id: profile.session_id,
      onboarding_step: profile.onboarding_step,
      onboarded: profile.onboarded
    };
    
  } catch (error) {
    console.error('Chat API Error:', error);
    
    // Fallback response
    const fallbackMessage = "I'm having a little trouble processing that. Could you try again or rephrase your response?";
    
    database.addMessage({
      session_id,
      role: Role.AGENT,
      content: fallbackMessage
    });
    
    const profile = database.getProfile(session_id) || database.createProfile(session_id);
    
    return {
      response: fallbackMessage,
      session_id: profile.session_id,
      onboarding_step: profile.onboarding_step,
      onboarded: profile.onboarded
    };
  }
};

// Express.js route handler example (for reference)
export const chatEndpoint = async (req: any, res: any) => {
  try {
    const { session_id, message } = req.body;
    
    if (!session_id || !message) {
      return res.status(400).json({ error: 'Missing session_id or message' });
    }
    
    const response = await handleChatRequest({ session_id, message });
    res.json(response);
    
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};