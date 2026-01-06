import React, { useState, useEffect } from 'react';
import { db } from '../store';
import { UserProfile, Message, Role } from '../types';

export const AdminDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminInput, setAdminInput] = useState('');

  useEffect(() => {
    setProfiles(db.getAllProfiles());
  }, []);

  useEffect(() => {
    if (selectedSession) {
      setMessages(db.getMessages(selectedSession));
    }
  }, [selectedSession]);

  const handleInjectMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !adminInput.trim()) return;

    db.addMessage({
      session_id: selectedSession,
      role: Role.ADMIN,
      content: adminInput.trim()
    });

    setAdminInput('');
    setMessages(db.getMessages(selectedSession));
    // Trigger update in sidebar
    setProfiles(db.getAllProfiles());
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)] relative">
      {/* Sidebar: Sessions List */}
      <div className={`
        ${selectedSession ? 'hidden lg:flex' : 'flex'} 
        lg:w-1/3 flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full
      `}>
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="font-semibold text-slate-700">Onboarding Sessions ({profiles.length})</span>
          <button 
            onClick={() => setProfiles(db.getAllProfiles())}
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
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-slate-800 text-sm truncate">ID: {p.session_id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight ${
                    p.onboarded ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {p.onboarded ? 'Complete' : p.onboarding_step}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <i className="fas fa-map-marker-alt text-[10px] opacity-40"></i>
                  {p.location ? `${p.location.city}, ${p.location.state_code}` : 'Location pending'}
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
                  db.getProfile(selectedSession)?.onboarded ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}>
                  {db.getProfile(selectedSession)?.onboarding_step}
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
                  disabled={!adminInput.trim()}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 rounded-xl transition text-sm font-bold shadow-sm shadow-amber-500/10"
                >
                  Inject
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
  );
};