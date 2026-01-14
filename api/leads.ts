// REST API Endpoint: POST /api/leads
// Handles landing page form submissions

import { database } from '../database';
import { Lead, OnboardingStep } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface LeadRequest {
  email: string;
  postcode: string;
  signupForOther: boolean;
}

export interface LeadResponse {
  success: boolean;
  message: string;
  leadId?: string;
  sessionId?: string; // Added for chat navigation
}

// Validation helpers
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPostcode = (postcode: string): boolean => {
  // Basic validation - adjust based on your target regions
  return postcode.trim().length >= 3 && postcode.trim().length <= 10;
};

const sanitizeInput = (input: string): string => {
  return input.trim().toLowerCase();
};

export const handleLeadRequest = async (request: LeadRequest): Promise<LeadResponse> => {
  try {
    const { email, postcode, signupForOther } = request;
    
    // Validate required fields
    if (!email || !postcode) {
      return {
        success: false,
        message: 'Email and postcode are required'
      };
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
      return {
        success: false,
        message: 'Please enter a valid email address'
      };
    }
    
    // Validate postcode
    if (!isValidPostcode(postcode)) {
      return {
        success: false,
        message: 'Please enter a valid postcode'
      };
    }
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPostcode = postcode.trim().toUpperCase();
    
    // Check for existing lead with this email
    const existingLead = await database.getLeadByEmail(sanitizedEmail);
    
    if (existingLead) {
      // If signupForOther is false and they already have a session, return it
      if (!signupForOther && existingLead.session_id) {
        console.log('Returning user with existing session:', existingLead.session_id);
        return {
          success: true,
          message: 'Welcome back! Resuming your session.',
          leadId: existingLead.id,
          sessionId: existingLead.session_id
        };
      }
      
      // If signupForOther is true, just acknowledge
      if (signupForOther) {
        return {
          success: true,
          message: 'This email is already on our waitlist'
        };
      }
      
      // If they don't have a session yet but signupForOther is false, create one
      if (!existingLead.session_id && !signupForOther) {
        const sessionId = uuidv4();
        
        // Update the lead with session_id
        await database.updateLead(existingLead.id!, { session_id: sessionId });
        
        // Create UserProfile
        await database.updateProfile(sessionId, {
          email: sanitizedEmail,
          onboarding_step: OnboardingStep.WELCOME,
          onboarded: false
        });
        
        console.log('Created session for existing lead:', sessionId);
        
        return {
          success: true,
          message: 'Successfully added to waitlist',
          leadId: existingLead.id,
          sessionId: sessionId
        };
      }
    }
    
    // Create new lead
    let sessionId: string | undefined = undefined;
    
    // Only create session if signupForOther is false
    if (!signupForOther) {
      sessionId = uuidv4();
    }
    
    // Build lead data - only include session_id if it exists
    const leadData: Omit<Lead, 'id' | 'timestamp'> = {
      email: sanitizedEmail,
      postcode: sanitizedPostcode,
      signupForOther: Boolean(signupForOther),
      source: 'landing_page',
      ...(sessionId && { session_id: sessionId })
    };
    
    const newLead = await database.addLead(leadData);
    
    // If not signing up for others, create UserProfile
    if (!signupForOther && sessionId) {
      await database.updateProfile(sessionId, {
        email: sanitizedEmail,
        onboarding_step: OnboardingStep.WELCOME,
        onboarded: false
      });
      
      console.log('New lead and profile created with session:', sessionId);
    } else {
      console.log('New lead created (signup for other):', newLead.id);
    }
    
    return {
      success: true,
      message: 'Successfully added to waitlist',
      leadId: newLead.id,
      sessionId: sessionId
    };
    
  } catch (error) {
    console.error('Lead API Error:', error);
    
    return {
      success: false,
      message: 'Something went wrong. Please try again.'
    };
  }
};

// Express.js route handler example (for reference)
export const leadsEndpoint = async (req: any, res: any) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false, 
        message: 'Method not allowed' 
      });
    }
    
    const { email, postcode, signupForOther } = req.body;
    
    const response = await handleLeadRequest({ 
      email, 
      postcode, 
      signupForOther 
    });
    
    const statusCode = response.success ? 200 : 400;
    res.status(statusCode).json(response);
    
  } catch (error) {
    console.error('Leads endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};