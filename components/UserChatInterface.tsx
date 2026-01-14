import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../store';
import { getAgentResponse } from '../services/geminiService';
import { Role, Message, OnboardingStep } from '../types';

export const UserChatInterface: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [sendDisabled, setSendDisabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMessages = async (sid: string) => {
    try {
      const existingMessages = await db.getMessages(sid);
      setMessages(existingMessages);
      return existingMessages;
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    }
  };

  const loadProfile = async (sid: string) => {
    try {
      const profile = await db.getProfile(sid);
      setCurrentProfile(profile);
      return profile;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  };

  useEffect(() => {
    if (!sessionId) {
      console.error('No session ID provided');
      return;
    }

    const initializeSession = async () => {
      const existingMessages = await loadMessages(sessionId);
      const profile = await loadProfile(sessionId);
      
      // Check if returning user
      if (existingMessages.length > 0) {
        setIsReturningUser(true);
      }
      
      // Only start onboarding if session is completely empty AND no messages exist
      if (existingMessages.length === 0) {
        if (!profile || profile.onboarding_step === OnboardingStep.WELCOME) {
          await startOnboarding(sessionId);
        }
      }
    };

    initializeSession();
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleInputFocus = () => {
    // Scroll to bottom when input is focused (keyboard opens on mobile)
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 300); // Delay to allow keyboard animation
  };

  const startOnboarding = async (sid: string) => {
    try {
      // Check if we already have a welcome message to prevent duplicates
      const existingMessages = await db.getMessages(sid);
      if (existingMessages.length > 0) {
        return; // Already has messages, don't add another welcome
      }

      // Add a simple welcome message without calling AI API
      await db.addMessage({
        session_id: sid,
        role: Role.AGENT,
        content: "Hey there! So glad you're here. To get started, are you an expecting dad or a current dad?"
      });
      
      // Update profile to STATUS step since we asked the question
      await db.updateProfile(sid, { 
        onboarding_step: OnboardingStep.STATUS 
      });

      await loadMessages(sid);
      await loadProfile(sid);
    } catch (error) {
      console.error('Error starting onboarding:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !sessionId || sendDisabled) return;

    const userMsg = input.trim();
    setInput('');
    
    // Debounce: disable send button for 500ms
    setSendDisabled(true);
    setTimeout(() => setSendDisabled(false), 500);
    
    try {
      await db.addMessage({
        session_id: sessionId,
        role: Role.USER,
        content: userMsg
      });
      await loadMessages(sessionId);

      setLoading(true);
      
      const profile = await db.getProfile(sessionId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      const history = await db.getMessages(sessionId);
      
      const result = await getAgentResponse(profile, history);

      if (result.profile_updates) {
        await db.updateProfile(sessionId, result.profile_updates);
      }

      const nextStep = result.next_step as OnboardingStep;
      await db.updateProfile(sessionId, { 
        onboarding_step: nextStep,
        onboarded: nextStep === OnboardingStep.COMPLETE
      });

      await db.addMessage({
        session_id: sessionId,
        role: Role.AGENT,
        content: result.message
      });

      await loadMessages(sessionId);
      await loadProfile(sessionId);
    } catch (error) {
      console.error('Error getting response:', error);
      // Fallback response if API fails
      await db.addMessage({
        session_id: sessionId,
        role: Role.AGENT,
        content: "I'm having a little trouble processing that. Could you try again or rephrase your response?"
      });
      await loadMessages(sessionId);
    }
    setLoading(false);
  };

  const isComplete = currentProfile?.onboarding_step === OnboardingStep.COMPLETE;

  if (!sessionId) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={styles.errorTitle}>Session Not Found</h2>
        <p style={styles.errorText}>Please start from the landing page to begin your onboarding.</p>
      </div>
    );
  }

  return (
    <div style={styles.body}>
      <div style={styles.logo}>
        <div style={styles.logoSquare}>DC</div>
        <div style={styles.logoText}>DadCircles</div>
      </div>

      <div style={styles.chatContainer}>
        <div ref={scrollRef} style={styles.messagesContainer}>
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              style={{
                ...styles.messageWrapper,
                justifyContent: msg.role === Role.USER ? 'flex-end' : 'flex-start'
              }}
            >
              <div 
                style={{
                  ...styles.messageBubble,
                  ...(msg.role === Role.USER ? styles.userBubble : styles.agentBubble)
                }}
              >
                {msg.content.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < msg.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.messageWrapper, justifyContent: 'flex-start' }}>
              <div style={{ ...styles.messageBubble, ...styles.agentBubble, ...styles.loadingBubble }}>
                <div style={styles.typingIndicator}>
                  <span style={styles.dot}></span>
                  <span style={{ ...styles.dot, animationDelay: '0.2s' }}></span>
                  <span style={{ ...styles.dot, animationDelay: '0.4s' }}></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={styles.inputContainer}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={handleInputFocus}
            disabled={loading || sendDisabled}
            placeholder="Type your response..."
            style={styles.input}
          />
          <button 
            type="submit"
            disabled={loading || !input.trim() || sendDisabled}
            style={{
              ...styles.sendButton,
              ...(loading || !input.trim() || sendDisabled ? styles.sendButtonDisabled : {})
            }}
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  body: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    background: 'white',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    margin: 0,
  },
  logo: {
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 10,
    background: 'white',
    borderBottom: '1px solid #f1f5f9',
  },
  logoSquare: {
    width: '32px',
    height: '32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 700,
    fontSize: '1rem',
    flexShrink: 0,
  },
  logoText: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1a1a1a',
    whiteSpace: 'nowrap',
  },
  chatContainer: {
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    paddingLeft: '16px',
    paddingRight: '16px',
    paddingBottom: '16px',
    boxSizing: 'border-box',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingTop: '16px',
    paddingBottom: '16px',
    WebkitOverflowScrolling: 'touch',
  },
  messageWrapper: {
    display: 'flex',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: '12px 16px',
    borderRadius: '16px',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  },
  userBubble: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  agentBubble: {
    background: '#f1f5f9',
    color: '#1e293b',
    borderBottomLeftRadius: '4px',
  },
  loadingBubble: {
    padding: '16px',
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#94a3b8',
    animation: 'bounce 1.4s infinite ease-in-out',
  },
  inputContainer: {
    display: 'flex',
    gap: '8px',
    paddingTop: '16px',
    paddingBottom: '16px',
    background: 'white',
    borderTop: '1px solid #e2e8f0',
    position: 'sticky',
    bottom: 0,
    left: 0,
    right: 0,
  },
  input: {
    flex: 1,
    padding: '14px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.3s',
    minWidth: 0,
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
  },
  sendButton: {
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.2rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, opacity 0.2s',
    minWidth: '56px',
    flexShrink: 0,
    WebkitAppearance: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  errorTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '16px',
  },
  errorText: {
    fontSize: '1.1rem',
    color: '#4a5568',
  },
};

export default UserChatInterface;
