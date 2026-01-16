/**
 * Matching API Endpoints (JavaScript version)
 * 
 * Provides REST API endpoints for the matching system:
 * - POST /api/matching/run - Run matching algorithm
 * - GET /api/matching/stats - Get matching statistics
 */

// Import Firebase directly since we can't import the TypeScript database module
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, getDocs, query, where, doc, setDoc, writeBatch, getDoc } from 'firebase/firestore';
import Logger from '../utils/logger.js';

// Clear logs at startup for fresh debugging
Logger.clearLogs();
Logger.info('STARTUP', 'Matching API initializing...');

// Initialize Firebase (same config as main app)
const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "dad-circles",
};

Logger.info('FIREBASE', 'Initializing Firebase app for matching API', { projectId: firebaseConfig.projectId });

const app = initializeApp(firebaseConfig, 'matching-api');
const db = getFirestore(app);

// Connect to emulator in development
if (process.env.NODE_ENV !== 'production') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8083);
    Logger.info('FIREBASE', 'Connected to Firestore emulator on port 8083');
    console.log('🔧 Matching API connected to Firestore emulator');
  } catch (error) {
    Logger.error('FIREBASE', 'Failed to connect to Firestore emulator', { error: error.message });
    console.log('⚠️ Firestore emulator connection failed or already connected');
  }
} else {
  Logger.info('FIREBASE', 'Running in production mode - using live Firestore');
}

/**
 * POST /api/matching/run
 * 
 * Run the matching algorithm
 * Body: { city?: string, stateCode?: string, testMode: boolean }
 */
async function runMatching(req, res) {
  Logger.matching('INFO', '=== POST /api/matching/run called ===', req.body);
  
  try {
    const { city, stateCode, testMode = false } = req.body;
    
    Logger.matching('INFO', 'Validating input parameters', { city, stateCode, testMode });
    
    // Validate input
    if (city && !stateCode) {
      Logger.matching('ERROR', 'Validation failed: stateCode required when city provided');
      return res.status(400).json({
        error: 'stateCode is required when city is provided'
      });
    }
    
    if (stateCode && !city) {
      Logger.matching('ERROR', 'Validation failed: city required when stateCode provided');
      return res.status(400).json({
        error: 'city is required when stateCode is provided'
      });
    }
    
    Logger.matching('INFO', 'Input validation passed, attempting to import matching service');
    
    // Run the real matching algorithm (JavaScript implementation)
    Logger.matching('INFO', 'Running real matching algorithm');
    const result = await runRealMatching(city, stateCode, testMode);
    
    Logger.matching('INFO', 'Matching algorithm completed successfully', {
      groupsCreated: result.groups_created,
      usersMatched: result.users_matched,
      usersUnmatched: result.users_unmatched,
      summary: result.summary
    });
    
    res.json({
      success: true,
      result: {
        groups_created: result.groups_created,
        users_matched: result.users_matched,
        users_unmatched: result.users_unmatched,
        summary: result.summary,
        groups: result.groups.map(group => ({
          group_id: group.group_id,
          name: group.name,
          location: group.location,
          life_stage: group.life_stage,
          member_count: group.member_ids.length,
          test_mode: group.test_mode,
          created_at: group.created_at
        }))
      }
    });
    
  } catch (error) {
    Logger.error('MATCHING', 'Critical error in matching API endpoint', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    
    res.status(500).json({
      error: 'Failed to run matching algorithm',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Real matching algorithm implementation in JavaScript
 */
async function runRealMatching(city, stateCode, testMode) {
  Logger.matching('INFO', '=== STARTING REAL MATCHING ALGORITHM ===', { city, stateCode, testMode });
  
  try {
    // Step 1: Get unmatched users
    Logger.matching('INFO', 'Getting unmatched users from database');
    const unmatchedUsers = await getUnmatchedUsersJS(city, stateCode);
    
    Logger.matching('INFO', `Found ${unmatchedUsers.length} unmatched eligible users`);
    
    if (unmatchedUsers.length === 0) {
      return {
        groups_created: 0,
        users_matched: 0,
        users_unmatched: 0,
        summary: 'No unmatched users found',
        groups: []
      };
    }
    
    // Step 2: Group by location and life stage
    const locationLifeStageBuckets = {};
    
    for (const user of unmatchedUsers) {
      if (!user.location) {
        Logger.matching('WARN', `User ${user.session_id} has no location data, skipping`);
        continue;
      }
      
      const locationKey = `${user.location.city}|${user.location.state_code}`;
      const lifeStage = getLifeStageFromUserJS(user);
      
      if (!lifeStage) {
        Logger.matching('WARN', `User ${user.session_id} has no valid life stage, skipping`);
        continue;
      }
      
      if (!locationLifeStageBuckets[locationKey]) {
        locationLifeStageBuckets[locationKey] = {
          'Expecting': [],
          'Newborn': [],
          'Infant': [],
          'Toddler': [],
        };
      }
      
      locationLifeStageBuckets[locationKey][lifeStage].push(user);
    }
    
    Logger.matching('INFO', `Organized users into ${Object.keys(locationLifeStageBuckets).length} location buckets`);
    
    // Step 3: Form groups for each location + life stage combination
    const allGroups = [];
    let totalUsersMatched = 0;
    
    for (const [locationKey, lifeStageBuckets] of Object.entries(locationLifeStageBuckets)) {
      const [cityName, stateCodeName] = locationKey.split('|');
      const location = { city: cityName, state_code: stateCodeName };
      
      for (const [lifeStage, users] of Object.entries(lifeStageBuckets)) {
        if (users.length === 0) continue;
        
        Logger.matching('INFO', `Processing ${location.city}, ${location.state_code} - ${lifeStage}: ${users.length} users`);
        
        // Form groups (minimum 4 users, maximum 6 per group)
        const minGroupSize = 4;
        const maxGroupSize = 6;
        
        if (users.length >= minGroupSize) {
          // Sort users by age for better matching
          const sortedUsers = sortUsersByAgeJS(users, lifeStage);
          
          // Create groups in chunks
          let groupSequence = 1;
          for (let i = 0; i < sortedUsers.length; i += maxGroupSize) {
            const chunk = sortedUsers.slice(i, i + maxGroupSize);
            
            if (chunk.length < minGroupSize) {
              Logger.matching('INFO', `Remaining ${chunk.length} users insufficient for group in ${location.city}, ${location.state_code} - ${lifeStage}`);
              break;
            }
            
            // Create the group
            const groupData = {
              name: `${location.city} ${lifeStage} Dads - Group ${groupSequence}`,
              location: location,
              member_ids: chunk.map(u => u.session_id),
              member_emails: chunk.map(u => u.email || '').filter(email => email),
              status: 'pending',
              emailed_member_ids: [],
              test_mode: testMode,
              life_stage: lifeStage,
            };
            
            // Save group to database
            const savedGroup = await createGroupJS(groupData);
            allGroups.push(savedGroup);
            
            // Update users with group assignment
            await assignUsersToGroupJS(chunk.map(u => u.session_id), savedGroup.group_id);
            
            totalUsersMatched += chunk.length;
            groupSequence++;
            
            Logger.matching('INFO', `Created group "${savedGroup.name}" with ${savedGroup.member_ids.length} members`);
          }
        } else {
          Logger.matching('INFO', `${location.city}, ${location.state_code} - ${lifeStage}: Only ${users.length} users (need ${minGroupSize}+ for group)`);
        }
      }
    }
    
    // Step 4: Send group introduction emails
    if (allGroups.length > 0) {
      Logger.matching('INFO', `📧 Sending introduction emails for ${allGroups.length} groups (${testMode ? 'TEST MODE' : 'PRODUCTION'})`);
      
      try {
        await sendGroupEmailsJS(allGroups, testMode);
      } catch (emailError) {
        Logger.error('MATCHING', 'Failed to send group emails (continuing anyway)', {
          error: emailError.message
        });
        // Don't fail the entire matching process if emails fail
      }
    }
    
    const totalUsersUnmatched = unmatchedUsers.length - totalUsersMatched;
    const summary = `Created ${allGroups.length} groups, matched ${totalUsersMatched} users, ${totalUsersUnmatched} remain unmatched`;
    
    Logger.matching('INFO', `🎉 Real matching complete: ${summary}`);
    
    return {
      groups_created: allGroups.length,
      users_matched: totalUsersMatched,
      users_unmatched: totalUsersUnmatched,
      summary,
      groups: allGroups
    };
    
  } catch (error) {
    Logger.error('MATCHING', 'Error in real matching algorithm', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get unmatched users (JavaScript implementation)
 */
async function getUnmatchedUsersJS(city, stateCode) {
  let baseQuery = query(
    collection(db, 'profiles'),
    where('matching_eligible', '==', true)
  );

  // Add location filter if specified
  if (city && stateCode) {
    baseQuery = query(
      collection(db, 'profiles'),
      where('matching_eligible', '==', true),
      where('location.city', '==', city),
      where('location.state_code', '==', stateCode)
    );
  }

  const snapshot = await getDocs(baseQuery);
  const eligibleUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Filter out users that have a group_id
  const unmatchedUsers = eligibleUsers.filter(user => !user.group_id);
  
  return unmatchedUsers;
}

/**
 * Determine life stage from user profile (JavaScript implementation)
 */
function getLifeStageFromUserJS(user) {
  if (!user.children || user.children.length === 0) return null;
  
  const primaryChild = user.children[0];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (primaryChild.type === 'expecting') {
    return 'Expecting';
  }
  
  const birthYear = primaryChild.birth_year;
  const birthMonth = primaryChild.birth_month;
  const ageInMonths = (currentYear - birthYear) * 12 + (currentMonth - birthMonth);
  
  if (ageInMonths <= 6) {
    return 'Newborn';
  } else if (ageInMonths <= 18) {
    return 'Infant';
  } else if (ageInMonths <= 36) {
    return 'Toddler';
  }
  
  return null;
}

/**
 * Sort users by age within life stage (JavaScript implementation)
 */
function sortUsersByAgeJS(users, lifeStage) {
  return users.sort((a, b) => {
    const childA = a.children[0];
    const childB = b.children[0];
    
    if (lifeStage === 'Expecting') {
      // Sort by due date (sooner first)
      const dueDateA = new Date(childA.birth_year, childA.birth_month - 1);
      const dueDateB = new Date(childB.birth_year, childB.birth_month - 1);
      return dueDateA.getTime() - dueDateB.getTime();
    } else {
      // Sort by child age (younger first)
      const now = new Date();
      const ageA = (now.getFullYear() - childA.birth_year) * 12 + (now.getMonth() + 1 - childA.birth_month);
      const ageB = (now.getFullYear() - childB.birth_year) * 12 + (now.getMonth() + 1 - childB.birth_month);
      return ageA - ageB;
    }
  });
}

/**
 * Create group in database (JavaScript implementation)
 */
async function createGroupJS(groupData) {
  const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newGroup = {
    ...groupData,
    group_id: groupId,
    created_at: Date.now(),
  };
  
  const groupRef = doc(db, 'groups', groupId);
  await setDoc(groupRef, newGroup);
  
  return newGroup;
}

/**
 * Assign users to group (JavaScript implementation)
 */
async function assignUsersToGroupJS(sessionIds, groupId) {
  const batch = writeBatch(db);
  
  for (const sessionId of sessionIds) {
    const userRef = doc(db, 'profiles', sessionId);
    batch.update(userRef, {
      group_id: groupId,
      matched_at: Date.now(),
      last_updated: Date.now()
    });
  }
  
  await batch.commit();
}

/**
 * Simulate matching algorithm for testing
 */
async function simulateMatching(testMode) {
  Logger.matching('INFO', '=== STARTING SIMULATED MATCHING ALGORITHM ===', { testMode });
  
  try {
    // First, let's see ALL profiles in the database
    Logger.database('INFO', 'Querying ALL profiles from database');
    const allProfilesCol = collection(db, 'profiles');
    const allProfilesSnap = await getDocs(allProfilesCol);
    const allProfiles = allProfilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    Logger.database('INFO', `Retrieved ${allProfiles.length} total profiles from database`);
    Logger.database('DEBUG', 'Detailed profile analysis', {
      totalProfiles: allProfiles.length,
      profileBreakdown: {
        withMatchingEligible: allProfiles.filter(p => p.hasOwnProperty('matching_eligible')).length,
        matchingEligibleTrue: allProfiles.filter(p => p.matching_eligible === true).length,
        matchingEligibleFalse: allProfiles.filter(p => p.matching_eligible === false).length,
        withLocation: allProfiles.filter(p => p.location).length,
        withChildren: allProfiles.filter(p => p.children && p.children.length > 0).length,
        onboarded: allProfiles.filter(p => p.onboarded === true).length,
        withGroupId: allProfiles.filter(p => p.group_id).length
      },
      sampleProfiles: allProfiles.slice(0, 5).map(p => ({
        session_id: p.session_id,
        matching_eligible: p.matching_eligible,
        onboarded: p.onboarded,
        location: p.location,
        children_count: p.children?.length || 0,
        group_id: p.group_id,
        email: p.email
      }))
    });
    
    // Get eligible users
    Logger.matching('INFO', 'Filtering for eligible users (matching_eligible === true)');
    const eligibleQuery = query(allProfilesCol, where('matching_eligible', '==', true));
    const eligibleSnap = await getDocs(eligibleQuery);
    const eligibleUsers = eligibleSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    Logger.matching('INFO', `Found ${eligibleUsers.length} eligible users`, {
      eligibleCount: eligibleUsers.length,
      eligibleSample: eligibleUsers.slice(0, 3).map(u => ({
        session_id: u.session_id,
        location: u.location,
        children: u.children?.length || 0
      }))
    });
    
    // Get unmatched users - need to handle both undefined and null group_id
    Logger.matching('INFO', 'Filtering for unmatched users (no group_id)');
    
    // First try users with no group_id field at all
    const unmatchedQuery1 = query(allProfilesCol, where('matching_eligible', '==', true));
    const unmatchedSnap1 = await getDocs(unmatchedQuery1);
    const allEligibleUsers = unmatchedSnap1.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter out users that have a group_id (either null or a value)
    const unmatchedUsers = allEligibleUsers.filter(user => !user.group_id);
    
    Logger.matching('INFO', `Found ${unmatchedUsers.length} unmatched users out of ${eligibleUsers.length} eligible`, {
      totalEligible: allEligibleUsers.length,
      unmatchedCount: unmatchedUsers.length,
      usersWithGroupId: allEligibleUsers.filter(u => u.group_id).length,
      sampleUnmatched: unmatchedUsers.slice(0, 3).map(u => ({
        session_id: u.session_id,
        group_id: u.group_id,
        hasGroupIdField: u.hasOwnProperty('group_id')
      }))
    });
    
    if (unmatchedUsers.length === 0) {
      Logger.matching('WARN', 'No unmatched users found - all eligible users may already be in groups');
      return {
        groups_created: 0,
        users_matched: 0,
        users_unmatched: 0,
        summary: 'No unmatched users available for matching',
        groups: []
      };
    }
    
    // Group by location
    Logger.matching('INFO', 'Grouping users by location');
    const locationGroups = {};
    let usersWithoutLocation = 0;
    
    for (const user of unmatchedUsers) {
      if (!user.location) {
        usersWithoutLocation++;
        Logger.warn('MATCHING', `User ${user.session_id} has no location data`);
        continue;
      }
      
      const locationKey = `${user.location.city}, ${user.location.state_code}`;
      if (!locationGroups[locationKey]) {
        locationGroups[locationKey] = [];
      }
      locationGroups[locationKey].push(user);
    }
    
    Logger.matching('INFO', 'Location grouping complete', {
      totalLocations: Object.keys(locationGroups).length,
      usersWithoutLocation,
      locationBreakdown: Object.entries(locationGroups).map(([loc, users]) => ({
        location: loc,
        userCount: users.length
      }))
    });
    
    const groups = [];
    let totalMatched = 0;
    
    // Create groups for each location with 4+ users
    for (const [location, users] of Object.entries(locationGroups)) {
      Logger.matching('INFO', `Processing location: ${location} with ${users.length} users`);
      
      if (users.length >= 4) {
        const groupSize = Math.min(6, users.length);
        const groupUsers = users.slice(0, groupSize);
        
        const group = {
          group_id: `test-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: `${location} Test Group`,
          location: groupUsers[0].location,
          life_stage: 'Mixed',
          member_count: groupUsers.length,
          test_mode: testMode,
          created_at: Date.now()
        };
        
        groups.push(group);
        totalMatched += groupUsers.length;
        
        Logger.matching('INFO', `Created group for ${location}`, {
          groupId: group.group_id,
          groupName: group.name,
          memberCount: group.member_count,
          members: groupUsers.map(u => u.session_id)
        });
      } else {
        Logger.matching('INFO', `Skipping ${location} - only ${users.length} users (need 4+ for group)`);
      }
    }
    
    const result = {
      groups_created: groups.length,
      users_matched: totalMatched,
      users_unmatched: unmatchedUsers.length - totalMatched,
      summary: `Simulated matching: Created ${groups.length} groups, matched ${totalMatched} users`,
      groups: groups
    };
    
    Logger.matching('INFO', '=== MATCHING ALGORITHM COMPLETE ===', result);
    
    return result;
    
  } catch (error) {
    Logger.error('MATCHING', 'Error in simulated matching algorithm', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * GET /api/matching/stats
 * 
 * Get matching statistics
 */
async function getStats(req, res) {
  Logger.matching('INFO', 'GET /api/matching/stats called');
  
  try {
    Logger.database('INFO', 'Fetching all profiles from Firestore');
    
    // Get all profiles from Firestore
    const profilesCol = collection(db, 'profiles');
    const profilesSnap = await getDocs(profilesCol);
    const profiles = profilesSnap.docs.map(doc => doc.data());
    
    Logger.database('INFO', `Retrieved ${profiles.length} total profiles from Firestore`);
    Logger.database('DEBUG', 'Sample profiles structure', { 
      sampleCount: Math.min(3, profiles.length),
      samples: profiles.slice(0, 3).map(p => ({
        session_id: p.session_id,
        matching_eligible: p.matching_eligible,
        onboarded: p.onboarded,
        location: p.location,
        children: p.children?.length || 0,
        group_id: p.group_id
      }))
    });
    
    const eligibleUsers = profiles.filter(p => p.matching_eligible === true);
    Logger.matching('INFO', `Found ${eligibleUsers.length} eligible users out of ${profiles.length} total`);
    
    const matchedUsers = eligibleUsers.filter(p => p.group_id);
    const unmatchedUsers = eligibleUsers.filter(p => !p.group_id);

    Logger.matching('INFO', `Breakdown: ${matchedUsers.length} matched, ${unmatchedUsers.length} unmatched`);

    // Build location stats
    const byLocation = {};
    
    for (const user of eligibleUsers) {
      if (!user.location) {
        Logger.warn('MATCHING', `User ${user.session_id} has no location data`);
        continue;
      }
      
      const locationKey = `${user.location.city}, ${user.location.state_code}`;
      if (!byLocation[locationKey]) {
        byLocation[locationKey] = {
          total: 0,
          matched: 0,
          unmatched: 0,
          by_life_stage: {
            'Expecting': 0,
            'Newborn': 0,
            'Infant': 0,
            'Toddler': 0,
          }
        };
      }

      byLocation[locationKey].total++;
      if (user.group_id) {
        byLocation[locationKey].matched++;
      } else {
        byLocation[locationKey].unmatched++;
      }

      // Determine life stage
      let lifeStage = null;
      if (user.children && user.children.length > 0) {
        const child = user.children[0];
        if (child.type === 'expecting') {
          lifeStage = 'Expecting';
        } else {
          const now = new Date();
          const ageInMonths = (now.getFullYear() - child.birth_year) * 12 + 
                            (now.getMonth() + 1 - child.birth_month);
          
          if (ageInMonths <= 6) {
            lifeStage = 'Newborn';
          } else if (ageInMonths <= 18) {
            lifeStage = 'Infant';
          } else if (ageInMonths <= 36) {
            lifeStage = 'Toddler';
          }
        }
      }

      if (lifeStage && byLocation[locationKey].by_life_stage[lifeStage] !== undefined) {
        byLocation[locationKey].by_life_stage[lifeStage]++;
      }
    }

    Logger.matching('INFO', 'Location breakdown', { 
      locations: Object.keys(byLocation).length,
      breakdown: Object.entries(byLocation).map(([loc, data]) => ({
        location: loc,
        total: data.total,
        matched: data.matched,
        unmatched: data.unmatched
      }))
    });

    const stats = {
      total_users: eligibleUsers.length,
      matched_users: matchedUsers.length,
      unmatched_users: unmatchedUsers.length,
      by_location: byLocation,
    };
    
    Logger.matching('INFO', 'Returning stats to client', stats);
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    Logger.error('MATCHING', 'Error getting matching statistics', { 
      error: error.message,
      stack: error.stack 
    });
    res.status(500).json({
      error: 'Failed to get matching statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/matching/groups
 * 
 * Get all groups
 */
async function getGroups(req, res) {
  Logger.matching('INFO', 'GET /api/matching/groups called');
  
  try {
    // Get all groups from Firestore
    const groupsCol = collection(db, 'groups');
    const groupsSnap = await getDocs(groupsCol);
    const groups = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    Logger.matching('INFO', `Retrieved ${groups.length} groups from database`);
    
    res.json({
      success: true,
      groups: groups
    });
    
  } catch (error) {
    Logger.error('MATCHING', 'Error getting groups', { 
      error: error.message,
      stack: error.stack 
    });
    res.status(500).json({
      error: 'Failed to get groups',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/matching/profiles
 * 
 * Get all profiles
 */
async function getProfiles(req, res) {
  Logger.matching('INFO', 'GET /api/matching/profiles called');
  
  try {
    // Get all profiles from Firestore
    const profilesCol = collection(db, 'profiles');
    const profilesSnap = await getDocs(profilesCol);
    const profiles = profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    Logger.matching('INFO', `Retrieved ${profiles.length} profiles from database`);
    
    res.json({
      success: true,
      profiles: profiles
    });
    
  } catch (error) {
    Logger.error('MATCHING', 'Error getting profiles', { 
      error: error.message,
      stack: error.stack 
    });
    res.status(500).json({
      error: 'Failed to get profiles',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Send group introduction emails (JavaScript implementation)
 */
async function sendGroupEmailsJS(groups, testMode) {
  Logger.matching('INFO', `📧 Starting email sending for ${groups.length} groups`);
  
  // Import Resend dynamically
  let Resend;
  try {
    const resendModule = await import('resend');
    Resend = resendModule.Resend;
  } catch (error) {
    Logger.error('EMAIL', 'Failed to import Resend module', { error: error.message });
    return;
  }

  // Check if API key is configured
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'your_resend_api_key_here') {
    Logger.matching('WARN', '⚠️ RESEND_API_KEY not configured - emails will be simulated');
    
    // Simulate email sending in test mode
    for (const group of groups) {
      Logger.matching('INFO', `📧 SIMULATED EMAIL for group "${group.name}" to ${group.member_emails.length} members`);
      
      // Update group status even in simulation
      const groupRef = doc(db, 'groups', group.group_id);
      await setDoc(groupRef, {
        emailed_member_ids: group.member_emails,
        introduction_email_sent_at: Date.now(),
        status: 'active'
      }, { merge: true });
    }
    return;
  }

  // Initialize Resend
  const resend = new Resend(apiKey);
  Logger.matching('INFO', '🔑 Resend initialized with API key');

  // Send emails for each group
  for (const group of groups) {
    try {
      Logger.matching('INFO', `📧 Processing emails for group "${group.name}"`);
      
      // Get member details
      const memberDetails = [];
      for (const sessionId of group.member_ids) {
        try {
          const userDoc = await getDoc(doc(db, 'profiles', sessionId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.email) {
              // Calculate child info
              let childInfo = 'Dad';
              if (userData.children && userData.children.length > 0) {
                const child = userData.children[0];
                if (child.type === 'expecting') {
                  childInfo = `Expecting ${child.birth_month}/${child.birth_year}`;
                } else {
                  const now = new Date();
                  const ageInMonths = (now.getFullYear() - child.birth_year) * 12 + 
                                    (now.getMonth() + 1 - child.birth_month);
                  if (ageInMonths <= 6) {
                    childInfo = `${ageInMonths}mo old`;
                  } else if (ageInMonths <= 36) {
                    childInfo = `${Math.floor(ageInMonths / 12)}y ${ageInMonths % 12}mo old`;
                  } else {
                    childInfo = `${Math.floor(ageInMonths / 12)}y old`;
                  }
                }
              }

              memberDetails.push({
                email: userData.email,
                name: userData.email.split('@')[0],
                childInfo
              });
            }
          }
        } catch (userError) {
          Logger.error('EMAIL', `Error getting user details for ${sessionId}`, { error: userError.message });
        }
      }

      if (memberDetails.length === 0) {
        Logger.matching('WARN', `⚠️ No members with email addresses found for group ${group.name}`);
        continue;
      }

      Logger.matching('INFO', `📬 Sending emails to ${memberDetails.length} members`);

      // Generate email HTML
      const membersList = memberDetails.map(member => 
        `<li><strong>${member.name}</strong> - ${member.childInfo}</li>`
      ).join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Meet Your DadCircles Group</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 40px 20px; text-align: center; }
            .logo { width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; margin-bottom: 20px; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 20px; }
            .content h2 { color: #1a1a1a; margin-bottom: 20px; }
            .content p { color: #4a5568; line-height: 1.6; margin-bottom: 20px; }
            .highlight { background: #faf5ff; border-left: 4px solid #8b5cf6; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .members-list { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .members-list ul { margin: 0; padding-left: 20px; }
            .members-list li { margin-bottom: 8px; color: #374151; }
            .cta { background: #8b5cf6; color: white; padding: 16px 24px; border-radius: 8px; text-align: center; margin: 30px 0; text-decoration: none; display: block; font-weight: bold; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #718096; font-size: 14px; }
            ${testMode ? '.test-banner { background: #fef3c7; border: 2px solid #f59e0b; padding: 12px; text-align: center; color: #92400e; font-weight: bold; }' : ''}
          </style>
        </head>
        <body>
          ${testMode ? '<div class="test-banner">🧪 THIS IS A TEST EMAIL - No real group has been formed</div>' : ''}
          <div class="container">
            <div class="header">
              <div class="logo">DC</div>
              <h1>Meet Your Group!</h1>
            </div>
            
            <div class="content">
              <h2>Welcome to ${group.name}! 🎉</h2>
              
              <p>Great news! We've matched you with other dads in your area who are at a similar stage in their parenting journey.</p>
              
              <div class="highlight">
                <strong>Your Group Members:</strong><br>
                You've been matched based on your location and where you are in your parenting journey. Here's who you'll be connecting with:
              </div>
              
              <div class="members-list">
                <h3 style="margin-top: 0; color: #374151;">Group Members:</h3>
                <ul>
                  ${membersList}
                </ul>
              </div>
              
              <p><strong>What's next?</strong></p>
              <ul>
                <li>Reply all to this email to introduce yourself to the group</li>
                <li>Share a bit about yourself and what you're looking forward to</li>
                <li>Start planning your first meetup or playdate</li>
                <li>Exchange contact information if you'd like</li>
              </ul>
              
              <div class="cta">
                Reply All to Say Hi! 👋
              </div>
              
              <p>We're excited to see the connections you'll make. Remember, this is just the beginning - your group can grow and evolve as you get to know each other.</p>
              
              <p>If you have any questions or need support, just reply to this email.</p>
              
              <p><strong>The DadCircles Team</strong></p>
            </div>
            
            <div class="footer">
              <p>DadCircles - Connecting fathers, building community</p>
              <p>Questions? Just reply to this email - we're here to help!</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailedMembers = [];

      // Send to each member (with delay to avoid rate limiting)
      for (let i = 0; i < memberDetails.length; i++) {
        const member = memberDetails[i];
        try {
          Logger.matching('INFO', `📤 Sending email to ${member.email}`);
          
          const result = await resend.emails.send({
            from: 'DadCircles <onboarding@resend.dev>',
            to: member.email,
            subject: `Meet Your DadCircles Group: ${group.name}${testMode ? ' (TEST)' : ''}`,
            html: emailHtml,
          });

          if (result.error) {
            Logger.error('EMAIL', `Failed to send email to ${member.email}`, { error: result.error });
          } else {
            Logger.matching('INFO', `✅ Email sent successfully to ${member.email}`, { emailId: result.data?.id });
            emailedMembers.push(member.email);
          }
          
          // Add delay between emails to avoid rate limiting (500ms = 2 emails per second max)
          if (i < memberDetails.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 600));
          }
        } catch (emailError) {
          Logger.error('EMAIL', `Error sending email to ${member.email}`, { error: emailError.message });
        }
      }

      // Update group with email results
      if (emailedMembers.length > 0) {
        const groupRef = doc(db, 'groups', group.group_id);
        await setDoc(groupRef, {
          emailed_member_ids: emailedMembers,
          introduction_email_sent_at: Date.now(),
          status: 'active'
        }, { merge: true });

        Logger.matching('INFO', `✅ Updated group "${group.name}" - emailed ${emailedMembers.length} members`);
      }

    } catch (groupError) {
      Logger.error('EMAIL', `Error processing emails for group ${group.name}`, { error: groupError.message });
    }
  }

  Logger.matching('INFO', '📧 Group email processing complete');
}

/**
 * Express router setup for matching endpoints
 */
function setupMatchingRoutes(app) {
  app.post('/api/matching/run', runMatching);
  app.get('/api/matching/stats', getStats);
  app.get('/api/matching/groups', getGroups);
  app.get('/api/matching/profiles', getProfiles);
  
  // Debug endpoint to read log files
  app.get('/api/matching/logs/:logType?', async (req, res) => {
    try {
      const { logType } = req.params;
      const logPaths = Logger.getLogPaths();
      
      let logContent = '';
      
      if (logType && logPaths[logType]) {
        // Read specific log file
        const fs = await import('fs');
        if (fs.existsSync(logPaths[logType])) {
          logContent = fs.readFileSync(logPaths[logType], 'utf8');
        } else {
          logContent = `Log file ${logType} not found`;
        }
      } else {
        // Read all log files
        const fs = await import('fs');
        for (const [type, path] of Object.entries(logPaths)) {
          if (fs.existsSync(path)) {
            const content = fs.readFileSync(path, 'utf8');
            logContent += `\n\n=== ${type.toUpperCase()} LOG ===\n${content}`;
          }
        }
      }
      
      res.json({
        success: true,
        logType: logType || 'all',
        content: logContent,
        availableLogs: Object.keys(logPaths)
      });
      
    } catch (error) {
      Logger.error('API', 'Error reading log files', { error: error.message });
      res.status(500).json({
        error: 'Failed to read log files',
        message: error.message
      });
    }
  });
  
  Logger.info('API', 'Matching API routes registered');
  console.log('🔗 Matching API routes registered');
}

export {
  runMatching,
  getStats,
  setupMatchingRoutes
};