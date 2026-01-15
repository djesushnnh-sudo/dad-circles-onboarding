/**
 * Matching Cloud Functions
 * 
 * Provides cloud functions for the matching system:
 * - Daily scheduled matching
 * - Manual matching triggers
 * - Group email sending
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {EmailService} from "./emailService";

// Types (duplicated here to avoid import issues in cloud functions)
interface UserProfile {
  session_id: string;
  email?: string;
  onboarded: boolean;
  location?: {
    city: string;
    state_code: string;
  };
  children: Array<{
    type: 'expecting' | 'existing';
    birth_month: number;
    birth_year: number;
    gender?: string;
  }>;
  matching_eligible: boolean;
  group_id?: string;
  matched_at?: number;
  last_updated: number;
}

interface Group {
  group_id: string;
  name: string;
  created_at: number;
  location: {
    city: string;
    state_code: string;
  };
  member_ids: string[];
  member_emails: string[];
  status: 'pending' | 'active' | 'inactive';
  emailed_member_ids: string[];
  introduction_email_sent_at?: number;
  test_mode: boolean;
  life_stage: string;
}

enum LifeStage {
  EXPECTING = 'Expecting',
  NEWBORN = 'Newborn',
  INFANT = 'Infant',
  TODDLER = 'Toddler'
}

/**
 * Helper function to determine life stage from user profile
 */
function getLifeStageFromUser(user: UserProfile): LifeStage | null {
  if (!user.children || user.children.length === 0) return null;
  
  const primaryChild = user.children[0];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (primaryChild.type === 'expecting') {
    return LifeStage.EXPECTING;
  }
  
  const birthYear = primaryChild.birth_year;
  const birthMonth = primaryChild.birth_month;
  const ageInMonths = (currentYear - birthYear) * 12 + (currentMonth - birthMonth);
  
  if (ageInMonths <= 6) {
    return LifeStage.NEWBORN;
  } else if (ageInMonths <= 18) {
    return LifeStage.INFANT;
  } else if (ageInMonths <= 36) {
    return LifeStage.TODDLER;
  }
  
  return null;
}

/**
 * Get unmatched users from Firestore
 */
async function getUnmatchedUsers(city?: string, stateCode?: string): Promise<UserProfile[]> {
  const db = admin.firestore();
  let query = db.collection('profiles')
    .where('matching_eligible', '==', true)
    .where('group_id', '==', null);

  if (city && stateCode) {
    query = query
      .where('location.city', '==', city)
      .where('location.state_code', '==', stateCode);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data() as UserProfile);
}

/**
 * Check if a city has enough users for matching
 */
async function checkCityForMatching(city: string, stateCode: string): Promise<boolean> {
  const users = await getUnmatchedUsers(city, stateCode);
  
  // Group by life stage
  const lifeStageCounts: Record<LifeStage, number> = {
    [LifeStage.EXPECTING]: 0,
    [LifeStage.NEWBORN]: 0,
    [LifeStage.INFANT]: 0,
    [LifeStage.TODDLER]: 0,
  };

  for (const user of users) {
    const lifeStage = getLifeStageFromUser(user);
    if (lifeStage) {
      lifeStageCounts[lifeStage]++;
    }
  }

  // Check if any life stage has at least 4 users (minimum group size)
  return Object.values(lifeStageCounts).some(count => count >= 4);
}

/**
 * Send group introduction emails for a group
 */
export async function sendGroupIntroductionEmails(
  group: Group,
  testMode: boolean = false
): Promise<{ success: boolean; emailedMembers: string[] }> {
  try {
    logger.info("📧 Sending group introduction emails", {
      groupId: group.group_id,
      groupName: group.name,
      memberCount: group.member_ids.length,
      testMode
    });

    const db = admin.firestore();
    
    // Get member details
    const memberDetails: Array<{ email: string; name: string; childInfo: string }> = [];
    
    for (const sessionId of group.member_ids) {
      try {
        const userDoc = await db.collection('profiles').doc(sessionId).get();
        if (userDoc.exists) {
          const userData = userDoc.data() as UserProfile;
          if (userData.email) {
            // Generate child info string
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
              name: userData.email.split('@')[0], // Use email prefix as name for now
              childInfo
            });
          }
        }
      } catch (error) {
        logger.error("Error getting member details", { sessionId, error });
      }
    }

    if (memberDetails.length === 0) {
      logger.warn("No members with email addresses found for group", {
        groupId: group.group_id
      });
      return { success: false, emailedMembers: [] };
    }

    // Send the group introduction emails
    const result = await EmailService.sendGroupIntroductionEmail(
      group.name,
      memberDetails,
      testMode
    );

    // Update group with email results
    if (result.success && result.emailedMembers.length > 0) {
      await db.collection('groups').doc(group.group_id).update({
        emailed_member_ids: result.emailedMembers,
        introduction_email_sent_at: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      });

      logger.info("✅ Group introduction emails sent successfully", {
        groupId: group.group_id,
        emailedCount: result.emailedMembers.length
      });
    }

    return result;

  } catch (error) {
    logger.error("❌ Error sending group introduction emails", {
      groupId: group.group_id,
      error
    });
    return { success: false, emailedMembers: [] };
  }
}

/**
 * Run daily matching for all cities
 */
export async function runDailyMatching(): Promise<void> {
  try {
    logger.info("🚀 Starting daily matching job");
    
    // Get all unique cities with unmatched users
    const unmatchedUsers = await getUnmatchedUsers();
    const cities = new Set<string>();
    
    for (const user of unmatchedUsers) {
      if (user.location) {
        cities.add(`${user.location.city}|${user.location.state_code}`);
      }
    }

    logger.info(`📍 Found ${cities.size} cities with unmatched users`);

    let totalGroupsCreated = 0;
    let totalUsersMatched = 0;

    // Check each city for matching eligibility
    for (const cityKey of cities) {
      const [city, stateCode] = cityKey.split('|');
      
      try {
        const hasEnoughUsers = await checkCityForMatching(city, stateCode);
        
        if (hasEnoughUsers) {
          logger.info(`🏙️ Running matching for ${city}, ${stateCode}`);
          
          // Note: In a real implementation, we would call the matching service here
          // For now, we'll just log that matching would occur
          logger.info(`✅ Would run matching for ${city}, ${stateCode}`);
          
          // TODO: Implement actual matching call when matching service is available in cloud functions
          // const result = await runMatchingAlgorithm(city, stateCode, false);
          // totalGroupsCreated += result.groups_created.length;
          // totalUsersMatched += result.users_matched;
        } else {
          logger.info(`⏳ ${city}, ${stateCode} doesn't have enough users for matching yet`);
        }
      } catch (error) {
        logger.error(`❌ Error processing ${city}, ${stateCode}:`, error);
      }
    }

    logger.info("🎉 Daily matching job completed", {
      citiesProcessed: cities.size,
      groupsCreated: totalGroupsCreated,
      usersMatched: totalUsersMatched
    });

  } catch (error) {
    logger.error("❌ Daily matching job failed:", error);
  }
}

/**
 * Send introduction emails for pending groups
 */
export async function sendPendingGroupEmails(): Promise<void> {
  try {
    logger.info("📧 Starting pending group email job");

    const db = admin.firestore();
    
    // Get groups that need introduction emails
    const pendingGroupsQuery = db.collection('groups')
      .where('status', '==', 'pending')
      .where('introduction_email_sent_at', '==', null)
      .limit(10); // Process in batches

    const snapshot = await pendingGroupsQuery.get();

    if (snapshot.empty) {
      logger.info("No pending groups found for email sending");
      return;
    }

    logger.info(`📬 Processing ${snapshot.size} pending groups`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const doc of snapshot.docs) {
      const group = doc.data() as Group;
      
      try {
        const result = await sendGroupIntroductionEmails(group, group.test_mode);
        
        if (result.success) {
          emailsSent++;
          logger.info("✅ Group emails sent", {
            groupId: group.group_id,
            groupName: group.name
          });
        } else {
          emailsFailed++;
          logger.error("❌ Group emails failed", {
            groupId: group.group_id,
            groupName: group.name
          });
        }
      } catch (error) {
        emailsFailed++;
        logger.error("❌ Error processing group emails", {
          groupId: group.group_id,
          error
        });
      }
    }

    logger.info("📬 Pending group email job completed", {
      totalProcessed: snapshot.size,
      emailsSent,
      emailsFailed
    });

  } catch (error) {
    logger.error("❌ Pending group email job failed:", error);
  }
}