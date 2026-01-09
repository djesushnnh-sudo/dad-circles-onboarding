import React, { useState, useEffect } from 'react';
import { database } from '../database';
import { UserProfile, Message, Role, Lead } from '../types';

export const AdminDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminInput, setAdminInput] = useState('');
  const [activeTab, setActiveTab] = useState<'sessions' | 'leads'>('sessions');
  const [loading, setLoading] = useState(false);

  const loadProfiles = async () => {
    try {
      const allProfiles = await database.getAllProfiles();
      setProfiles(allProfiles);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadLeads = async () => {
    try {
      const allLeads = await database.getAllLeads();
      setLeads(allLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const sessionMessages = await database.getMessages(sessionId);
      setMessages(sessionMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  useEffect(() => {
    loadProfiles();
    loadLeads();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession);
    }
  }, [selectedSession]);

  const handleInjectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !adminInput.trim() || loading) return;

    setLoading(true);
    try {
      await database.addMessage({
        session_id: selectedSession,
        role: Role.ADMIN,
        content: adminInput.trim()
      });

      setAdminInput('');
      await loadMessages(selectedSession);
      await loadProfiles(); // Refresh profiles list
    } catch (error) {
      console.error('Error injecting message:', error);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-160px)] relative">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition ${
            activeTab === 'sessions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Chat Sessions ({profiles.length})
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition ${
            activeTab === 'leads'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Waitlist Leads ({leads.length})
        </button>
      </div>

      {activeTab === 'sessions' ? (
        <div className="flex flex-col lg:flex-row gap-6 flex-1">
          {/* Sidebar: Sessions List */}
          <div className={`
            ${selectedSession ? 'hidden lg:flex' : 'flex'} 
            lg:w-1/3 flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full
          `}>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="font-semibold text-slate-700">Onboarding Sessions ({profiles.length})</span>
              <button 
                onClick={loadProfiles}
                className="text-slate-400 hover:text-blue-600 transition p-1"
                title="Refresh list"
              >
                <i className="fas fa-sync-alt text-xs"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {profiles.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">No sessions yet</div>
              ) : (
                profiles.map(p => (
                  <button
                    key={p.session_id}
                    onClick={() => setSelectedSession(p.session_id)}
                    className={`w-full text-left p-4 border-b border-slate-50 transition hover:bg-slate-50 group ${
                      selectedSession === p.session_id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-slate-800 text-sm truncate">ID: {p.session_id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight ${
                        p.onboarded ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {p.onboarded ? 'Complete' : p.onboarding_step}
                      </span>
                    </div>
                    
                    {/* User Details */}
                    <div className="space-y-1 mb-2">
                      {p.children && p.children.length > 0 && (
                        <div className="space-y-1">
                          {p.children.map((child, index) => (
                            <div key={index} className="text-xs text-slate-600 flex items-center gap-1.5">
                              <i className="fas fa-baby text-[10px] opacity-60"></i>
                              {child.type === 'expecting' 
                                ? `Expecting ${child.birth_month}/${child.birth_year}${child.gender ? `, ${child.gender}` : ''}`
                                : `Child born ${child.birth_month}/${child.birth_year}${child.gender ? `, ${child.gender}` : ''}`
                              }
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {p.interests && p.interests.length > 0 && (
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <i className="fas fa-heart text-[10px] opacity-60"></i>
                          {p.interests.join(', ')}
                        </div>
                      )}
                      
                      {p.siblings && p.siblings.length > 0 && (
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <i className="fas fa-users text-[10px] opacity-60"></i>
                          {p.siblings.length} other child{p.siblings.length !== 1 ? 'ren' : ''}
                        </div>
                      )}
                      
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <i className="fas fa-map-marker-alt text-[10px] opacity-60"></i>
                        {p.location ? `${p.location.city}, ${p.location.state_code}` : 'Location pending'}
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                      <span>Updated {new Date(p.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <i className="fas fa-chevron-right opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main: Conversation Stream */}
          <div className={`
            ${selectedSession ? 'flex' : 'hidden lg:flex'} 
            lg:w-2/3 flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full
          `}>
            {selectedSession ? (
              <>
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedSession(null)}
                      className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 transition"
                    >
                      <i className="fas fa-arrow-left"></i>
                    </button>
                    <div>
                      <h3 className="font-semibold text-slate-700 leading-none">Conversation</h3>
                      <span className="text-[10px] text-slate-400 font-mono">{selectedSession}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      profiles.find(p => p.session_id === selectedSession)?.onboarded ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {profiles.find(p => p.session_id === selectedSession)?.onboarding_step}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm relative group ${
                        m.role === Role.USER 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : m.role === Role.ADMIN
                            ? 'bg-amber-100 text-amber-900 border border-amber-200 rounded-tl-none italic'
                            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                      }`}>
                        <div className="flex gap-2 items-center mb-1 opacity-60 text-[10px] font-bold uppercase tracking-wider">
                          <span>{m.role}</span>
                          <span>&bull;</span>
                          <span className="font-normal">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleInjectMessage} className="p-4 border-t border-slate-100 bg-white">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                        <i className="fas fa-shield-halved text-xs"></i>
                      </span>
                      <input
                        type="text"
                        value={adminInput}
                        onChange={(e) => setAdminInput(e.target.value)}
                        placeholder="Type an admin message to inject..."
                        className="w-full bg-amber-50/30 border border-amber-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={!adminInput.trim() || loading}
                      className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 rounded-xl transition text-sm font-bold shadow-sm shadow-amber-500/10"
                    >
                      {loading ? 'Injecting...' : 'Inject'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/20">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <i className="fas fa-user-gear text-3xl text-slate-300"></i>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Select a Dad Session</h2>
                <p className="text-slate-500 max-w-xs mx-auto">
                  Choose a session from the list to view their progress and provide manual support.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Leads Tab */
        <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="font-semibold text-slate-700">Waitlist Leads ({leads.length})</span>
            <button 
              onClick={loadLeads}
              className="text-slate-400 hover:text-green-600 transition p-1"
              title="Refresh leads"
            >
              <i className="fas fa-sync-alt text-xs"></i>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {leads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <i className="fas fa-envelope text-2xl text-slate-300"></i>
                </div>
                <p>No leads yet</p>
                <p className="text-sm mt-2">Leads will appear here when people sign up on the landing page</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {leads.map(lead => (
                  <div key={lead.id} className="p-4 hover:bg-slate-50 transition">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-green-600 text-sm"></i>
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{lead.email}</div>
                          <div className="text-sm text-slate-600 flex items-center gap-2">
                            <i className="fas fa-map-marker-alt text-xs"></i>
                            {lead.postcode}
                            {lead.signupForOther && (
                              <>
                                <span>&bull;</span>
                                <span className="text-amber-600 font-medium">Signing up for someone else</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">
                          {new Date(lead.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(lead.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                        {lead.source}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">
                        ID: {lead.id?.slice(-8)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};