import React, { useState } from 'react';
import { handleLeadRequest } from '../api/leads';

const LandingPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [postcode, setPostcode] = useState('');
  const [signupForOther, setSignupForOther] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await handleLeadRequest({
        email,
        postcode,
        signupForOther
      });

      if (response.success) {
        setShowSuccess(true);
        setEmail('');
        setPostcode('');
        setSignupForOther(false);
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } else {
        setErrorMessage(response.message);
      }
    } catch (error) {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.body}>
      <div style={styles.logo}>
        <div style={styles.logoSquare}>DC</div>
        <div style={styles.logoText}>DadCircles</div>
      </div>
      
      <div style={styles.container}>
        <div style={styles.content}>
          <h1 style={styles.h1}>Find Your Dad Squad</h1>
          <p style={styles.description}>
            Connect with new dads nearby who share your interests. Join local circles, plan activities, and build lasting friendships.
          </p>
          
          <form style={styles.emailForm} onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              style={styles.inputEmail}
            />
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="Your postcode"
              required
              style={styles.inputText}
            />
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={styles.button}
            >
              {isSubmitting ? 'Joining...' : 'Join Waitlist'}
            </button>
          </form>
          
          <div style={styles.toggleContainer}>
            <input
              type="checkbox"
              id="signupForOther"
              checked={signupForOther}
              onChange={(e) => setSignupForOther(e.target.checked)}
              style={styles.checkbox}
            />
            <label htmlFor="signupForOther" style={styles.checkboxLabel}>
              I'm signing up for someone else
            </label>
          </div>
          
          <p style={styles.privacyNote}>
            We'll contact you to find a local parent group. No spam, ever.
          </p>
          
          {showSuccess && (
            <div style={{...styles.successMessage, ...styles.successMessageShow}}>
              ✓ Thanks! You're on the list. We'll be in touch soon.
            </div>
          )}
          
          {errorMessage && (
            <div style={styles.errorMessage}>
              ⚠ {errorMessage}
            </div>
          )}
        </div>
        
        <div style={styles.phoneMockup}>
          <div style={styles.phoneFrame}>
            <div style={styles.phoneNotch}></div>
            <div style={styles.phoneScreen}>
              <img 
                src="/images/network-visualization.png" 
                alt="Dad Circles Network Visualization"
                style={styles.phoneScreenImg}
                onError={(e) => {
                  // Fallback to placeholder if image doesn't load
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='600' viewBox='0 0 300 600'%3E%3Crect width='300' height='600' fill='%23667eea'/%3E%3Ctext x='150' y='300' text-anchor='middle' fill='white' font-size='20' font-family='Arial'%3EDad Circles%3C/text%3E%3Ctext x='150' y='330' text-anchor='middle' fill='white' font-size='14' font-family='Arial'%3ENetwork%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div style={styles.disclaimer}>
        DadCircles is in early alpha
      </div>
    </div>
  );
};

const styles = {
  body: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    background: 'white',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative' as const,
    margin: 0,
  },
  logo: {
    position: 'fixed' as const,
    top: '24px',
    left: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 10,
  },
  logoSquare: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 700,
    fontSize: '1.25rem',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  container: {
    maxWidth: '1200px',
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '60px',
    alignItems: 'center',
  },
  content: {
    color: '#1a1a1a',
  },
  h1: {
    fontSize: '3.5rem',
    fontWeight: 700,
    marginBottom: '24px',
    lineHeight: 1.1,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  description: {
    fontSize: '1.25rem',
    marginBottom: '32px',
    color: '#4a5568',
    lineHeight: 1.6,
  },
  emailForm: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  inputEmail: {
    flex: 1,
    padding: '16px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  },
  inputText: {
    flex: 1,
    padding: '16px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    padding: '12px',
    background: '#f7fafc',
    borderRadius: '8px',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    accentColor: '#667eea',
  },
  checkboxLabel: {
    fontSize: '0.95rem',
    color: '#4a5568',
    cursor: 'pointer',
    userSelect: 'none' as const,
  },
  button: {
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  privacyNote: {
    fontSize: '0.875rem',
    color: '#718096',
  },
  successMessage: {
    display: 'none',
    background: '#f0fdf4',
    color: '#166534',
    border: '1px solid #86efac',
    padding: '16px',
    borderRadius: '12px',
    marginTop: '16px',
  },
  successMessageShow: {
    display: 'block',
    animation: 'fadeIn 0.5s',
  },
  errorMessage: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    padding: '16px',
    borderRadius: '12px',
    marginTop: '16px',
  },
  disclaimer: {
    position: 'fixed' as const,
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '0.75rem',
    color: '#a0aec0',
    textAlign: 'center' as const,
  },
  phoneMockup: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '300px',
    margin: '0 auto',
  },
  phoneFrame: {
    position: 'relative' as const,
    width: '100%',
    paddingBottom: '200%',
    background: '#1a1a1a',
    borderRadius: '40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    border: '12px solid #1a1a1a',
  },
  phoneNotch: {
    position: 'absolute' as const,
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '120px',
    height: '30px',
    background: '#1a1a1a',
    borderRadius: '0 0 20px 20px',
    zIndex: 2,
  },
  phoneScreen: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'white',
    overflow: 'hidden',
  },
  phoneScreenImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
};

export default LandingPage;