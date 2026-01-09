// REST API Endpoint: POST /api/leads
// Handles landing page form submissions

import { database } from '../database';
import { Lead } from '../types';

export interface LeadRequest {
  email: string;
  postcode: string;
  signupForOther: boolean;
}

export interface LeadResponse {
  success: boolean;
  message: string;
  leadId?: string;
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
    
    // Check for duplicate email (optional - you might want to allow duplicates)
    const existingLeads = await database.getAllLeads();
    const duplicateEmail = existingLeads.find(lead => lead.email === sanitizedEmail);
    
    if (duplicateEmail) {
      return {
        success: false,
        message: 'This email is already on our waitlist'
      };
    }
    
    // Create the lead
    const newLead = await database.addLead({
      email: sanitizedEmail,
      postcode: sanitizedPostcode,
      signupForOther: Boolean(signupForOther),
      source: 'landing_page'
    });
    
    console.log('New lead created:', newLead.id);
    
    return {
      success: true,
      message: 'Successfully added to waitlist',
      leadId: newLead.id
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