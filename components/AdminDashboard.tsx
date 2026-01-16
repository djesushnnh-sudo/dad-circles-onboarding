import React, { useState, useEffect } from 'react';
import { database } from '../database';
import { UserProfile, Message, Role, Lead, Group, MatchingStats } from '../types';

export const AdminDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminInput, setAdminInput] = useState('');
  const [activeTab, setActiveTab] = useState<'sessions' | 'leads' | 'matching'>('sessions');
  const [loading, setLoading] = useState(false);
  
  // Matching state
  const [matchingStats, setMatchingStats] = useState<MatchingStats | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingResult, setMatchingResult] = useState<string>('');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<Record<string, UserProfile[]>>({});

  const loadProfiles = async () => {
    try {
      const response = await fetch('/api/matching/profiles');
      const data = await response.json();
      if (data.success) {
        setProfiles(data.profiles);
      } else {
        console.error('Error loading profiles:', data.error);
      }
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

  const loadMatchingData = async () => {
    try {
      setMatchingLoading(true);
      
      // Add cache-busting timestamp to prevent stale data
      const timestamp = Date.now();
      
      // Load stats and groups in parallel using API endpoints
      const [statsResponse, groupsResponse] = await Promise.all([
        fetch(`/api/matching/stats?t=${timestamp}`).then(res => res.json()).catch(err => {
          console.error('Error fetching stats:', err);
          return { success: false, error: err.message };
        }),
        fetch(`/api/matching/groups?t=${timestamp}`).then(res => res.json()).catch(err => {
          console.error('Error fetching groups:', err);
          return { success: false, groups: [] };
        })
      ]);
      
      if (statsResponse.success) {
        setMatchingStats(statsResponse.stats);
      } else {
        console.error('Stats API error:', statsResponse.error);
      }
      
      if (groupsResponse.success) {
        console.log('✅ Setting groups:', groupsResponse.groups.length);
        setGroups(groupsResponse.groups);
      } else {
        console.error('Groups API error:', groupsResponse.error);
        setGroups([]);
      }
      
    } catch (error) {
      console.error('Error loading matching data:', error);
    } finally {
      setMatchingLoading(false);
    }
  };

  const runMatching = async (testMode: boolean) => {
    setMatchingLoading(true);
    setMatchingResult('');
    
    try {
      console.log(`🚀 Running ${testMode ? 'test' : 'production'} matching...`);
      
      const response = await fetch('/api/matching/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testMode }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMatchingResult(`✅ ${data.result.summary}`);
        console.log('✅ Matching completed successfully');
        
        // Refresh all data after successful matching
        await Promise.all([
          loadMatchingData(),
          loadProfiles()
        ]);
        
      } else {
        const errorMsg = `❌ Error: ${data.error || 'Unknown error'}`;
        setMatchingResult(errorMsg);
        console.error('❌ Matching failed:', data);
      }
    } catch (error) {
      const errorMsg = `❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ Error running matching:', error);
      setMatchingResult(errorMsg);
    }
    
    setMatchingLoading(false);
  };

  const seedTestData = async () => {
    setMatchingLoading(true);
    setMatchingResult('');
    
    try {
      await database.seedTestData?.();
      setMatchingResult('✅ Successfully seeded 50 test users!');
      
      // Wait a moment for the database to fully commit
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh data
      await loadMatchingData();
      await loadProfiles();
    } catch (error) {
      console.error('Error seeding test data:', error);
      setMatchingResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setMatchingLoading(false);
  };

  const cleanTestData = async () => {
    setMatchingLoading(true);
    setMatchingResult('');
    
    try {
      await database.cleanTestData?.();
      setMatchingResult('✅ Test data cleaned successfully');
      
      // Wait a moment for the database to fully commit
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh data
      await loadMatchingData();
      await loadProfiles();
    } catch (error) {
      console.error('Error cleaning test data:', error);
      setMatchingResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setMatchingLoading(false);
  };

  const loadGroupMembers = async (groupId: string, memberIds: string[]) => {
    // If already expanded, collapse it
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }

    // If members already loaded, just expand
    if (groupMembers[groupId]) {
      setExpandedGroupId(groupId);
      return;
    }

    // Load member profiles
    try {
      const memberProfiles: UserProfile[] = [];
      for (const sessionId of memberIds) {
        try {
          const profile = await database.getProfile(sessionId);
          if (profile) {
            memberProfiles.push(profile);
          }
        } catch (err) {
          console.error(`Failed to load profile for ${sessionId}:`, err);
        }
      }

      setGroupMembers(prev => ({
        ...prev,
        [groupId]: memberProfiles
      }));
      setExpandedGroupId(groupId);
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  const calculateChildAge = (birthMonth: number, birthYear: number): string => {
    const now = new Date();
    const ageInMonths = (now.getFullYear() - birthYear) * 12 + (now.getMonth() + 1 - birthMonth);
    
    if (ageInMonths < 0) {
      return `Due ${Math.abs(ageInMonths)}mo`;
    } else if (ageInMonths === 0) {
      return 'Newborn';
    } else if (ageInMonths < 12) {
      return `${ageInMonths}mo`;
    } else {
      const years = Math.floor(ageInMonths / 12);
      const months = ageInMonths % 12;
      return months > 0 ? `${years}y ${months}mo` : `${years}y`;
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
    if (activeTab === 'matching') {
      loadMatchingData();
    }
  }, [activeTab]);

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
        <button
          onClick={() => setActiveTab('matching')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition ${
            activeTab === 'matching'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Matching ({groups.length} groups)
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
      ) : activeTab === 'leads' ? (
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
      ) : (
        /* Matching Tab */
        <div className="flex flex-col gap-6">
          {/* Status Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-users text-purple-600"></i>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">
                    {matchingStats?.total_users || 0}
                  </div>
                  <div className="text-sm text-slate-500">Total Eligible Users</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600"></i>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">
                    {matchingStats?.matched_users || 0}
                  </div>
                  <div className="text-sm text-slate-500">Matched Users</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-clock text-amber-600"></i>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">
                    {matchingStats?.unmatched_users || 0}
                  </div>
                  <div className="text-sm text-slate-500">Unmatched Users</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Matching Actions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <button
                onClick={() => runMatching(true)}
                disabled={matchingLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                <i className="fas fa-flask"></i>
                Run Test Match
              </button>
              
              <button
                onClick={() => runMatching(false)}
                disabled={matchingLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white px-4 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                <i className="fas fa-rocket"></i>
                Run Production Match
              </button>
              
              <button
                onClick={seedTestData}
                disabled={matchingLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white px-4 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                <i className="fas fa-seedling"></i>
                Seed Test Data
              </button>
              
              <button
                onClick={cleanTestData}
                disabled={matchingLoading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white px-4 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                <i className="fas fa-trash"></i>
                Clear Test Data
              </button>
            </div>

            {matchingResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                <div className="text-sm font-mono text-slate-700">{matchingResult}</div>
              </div>
            )}

            {matchingLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <span className="ml-2 text-slate-600">Processing...</span>
              </div>
            )}
          </div>

          {/* Groups Display */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="font-semibold text-slate-700">Formed Groups ({groups.length})</span>
              <button 
                onClick={loadMatchingData}
                className="text-slate-400 hover:text-purple-600 transition p-1"
                title="Refresh groups"
              >
                <i className="fas fa-sync-alt text-xs"></i>
              </button>
            </div>
            
            <div>
              {groups.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <i className="fas fa-users text-2xl text-slate-300"></i>
                  </div>
                  <p>No groups formed yet</p>
                  <p className="text-sm mt-2">Run the matching algorithm to create groups</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {groups.map(group => {
                    const isExpanded = expandedGroupId === group.group_id;
                    const members = groupMembers[group.group_id] || [];
                    
                    return (
                      <div key={group.group_id} className="hover:bg-slate-50 transition">
                        <button
                          onClick={() => loadGroupMembers(group.group_id, group.member_ids)}
                          className="w-full p-4 text-left"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                group.test_mode ? 'bg-blue-100' : 'bg-purple-100'
                              }`}>
                                <i className={`fas fa-users text-sm ${
                                  group.test_mode ? 'text-blue-600' : 'text-purple-600'
                                }`}></i>
                              </div>
                              <div>
                                <div className="font-medium text-slate-800 flex items-center gap-2">
                                  {group.name}
                                  <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-xs text-slate-400`}></i>
                                </div>
                                <div className="text-sm text-slate-600 flex items-center gap-2">
                                  <i className="fas fa-map-marker-alt text-xs"></i>
                                  {group.location.city}, {group.location.state_code}
                                  <span>&bull;</span>
                                  <span>{group.life_stage}</span>
                                  <span>&bull;</span>
                                  <span>{group.member_ids.length} members</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400">
                                {new Date(group.created_at).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-slate-400">
                                {new Date(group.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`px-2 py-1 rounded-full font-medium ${
                              group.test_mode 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'bg-purple-50 text-purple-700'
                            }`}>
                              {group.test_mode ? 'Test Group' : 'Production'}
                            </span>
                            <span className={`px-2 py-1 rounded-full font-medium ${
                              group.status === 'active' 
                                ? 'bg-green-50 text-green-700'
                                : group.status === 'pending'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-50 text-slate-700'
                            }`}>
                              {group.status}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">
                              ID: {group.group_id.slice(-8)}
                            </span>
                          </div>
                        </button>

                        {/* Expanded Member Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-slate-50/50">
                            <div className="border-t border-slate-200 pt-3 mt-2">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                Group Members ({members.length})
                              </div>
                              
                              {members.length === 0 ? (
                                <div className="text-sm text-slate-400 italic py-2">
                                  Loading member details...
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {members.map((member, idx) => {
                                    const child = member.children?.[0];
                                    const childAge = child 
                                      ? calculateChildAge(child.birth_month, child.birth_year)
                                      : 'N/A';
                                    
                                    return (
                                      <div 
                                        key={member.session_id} 
                                        className="bg-white rounded-lg p-3 border border-slate-200 text-sm"
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                              <span className="text-xs font-bold text-slate-600">
                                                {idx + 1}
                                              </span>
                                            </div>
                                            <div>
                                              <div className="font-medium text-slate-800">
                                                {member.email || member.session_id}
                                              </div>
                                              <div className="text-xs text-slate-500">
                                                Session: {member.session_id.slice(-8)}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-xs font-semibold text-slate-700">
                                              {child?.type === 'expecting' ? '🤰 ' : '👶 '}
                                              {childAge}
                                            </div>
                                            {child?.gender && (
                                              <div className="text-xs text-slate-500">
                                                {child.gender}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Child Details */}
                                        {child && (
                                          <div className="text-xs text-slate-600 space-y-1">
                                            <div className="flex items-center gap-1.5">
                                              <i className="fas fa-calendar text-[10px] opacity-60"></i>
                                              {child.type === 'expecting' 
                                                ? `Due: ${child.birth_month}/${child.birth_year}`
                                                : `Born: ${child.birth_month}/${child.birth_year}`
                                              }
                                            </div>
                                          </div>
                                        )}

                                        {/* Interests */}
                                        {member.interests && member.interests.length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-slate-100">
                                            <div className="text-xs text-slate-500 mb-1">Interests:</div>
                                            <div className="flex flex-wrap gap-1">
                                              {member.interests.map((interest, i) => (
                                                <span 
                                                  key={i}
                                                  className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px]"
                                                >
                                                  {interest}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Siblings */}
                                        {member.siblings && member.siblings.length > 0 && (
                                          <div className="mt-2 text-xs text-slate-500">
                                            <i className="fas fa-users text-[10px] opacity-60 mr-1"></i>
                                            {member.siblings.length} other child{member.siblings.length !== 1 ? 'ren' : ''}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};