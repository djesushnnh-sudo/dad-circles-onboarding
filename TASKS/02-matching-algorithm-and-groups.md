# Task 02: Matching Algorithm & Group Formation

## 📋 Overview

Build a simple, robust matching system that pairs dads into groups of 4-6 based on geographic location (City) and life stage (child age). Create test infrastructure with 50 diverse test users and a straightforward admin interface to trigger matching and view results.

---

## 🎯 Objective

Create a backend matching system that:
1. Groups dads strictly by City and Life Stage (Expecting, Newborn, Infant, Toddler).
2. Provides 50 realistic test users across multiple cities for algorithm validation.
3. Offers a simple Admin interface to trigger matching runs (Test/Production).
4. Forms groups of 4-6 members and stores them in Firestore.
5. Sends group introduction emails (with test mode to avoid real sends during development).

**Deferred to Future:**
- Interest-based matching (AI/semantic analysis).
- Complex scoring/weighting systems.
- "Match Quality" scores.
- Automated meeting scheduling.

---

## 🔨 Task Breakdown

### Subtask 1: Database Schema

**New Firestore Collection: `groups`**

Define a `Group` interface with these fields:
- `group_id`: UUID
- `name`: Generated name like "Ann Arbor Dads - Group 1"
- `created_at`: Timestamp
- `location`: Object with city and state_code
- `member_ids`: Array of session_ids (4-6 members)
- `member_emails`: Array of member emails
- `status`: One of: pending, active, inactive
- `emailed_member_ids`: Array of strings (session_ids who successfully received the email)
- `introduction_email_sent_at`: Optional timestamp (of first successful send)
- `test_mode`: Boolean (true for test groups)

**Updates to `profiles` Collection:**

Add these fields to UserProfile interface:
- `group_id`: Optional string reference to assigned group
- `matched_at`: Optional timestamp
- `matching_eligible`: Boolean (true if onboarded with valid location and child data)

**Database Helper Functions Needed:**

Create functions in `database.ts`:
- Create a new group document
- Get group by ID
- Get all users in a group
- Update user's group assignment
- Query unmatched users by location
- Get matching statistics (total users, matched, unmatched, by location)

---

### Subtask 2: Test Data Seeding (50 Users)

**Goal:** Create realistic, diverse test user profiles for algorithm validation.

**Geographic Distribution (50 total users):**
- 15 users: Ann Arbor, MI
- 12 users: Austin, TX
- 10 users: Boulder, CO
- 8 users: Portland, OR
- 5 users: Scattered across other cities (unmatchable controls)

**Child Age Distribution:**
- 25 expecting dads
- 10 newborns (0-6 months)
- 10 infants (6-18 months)
- 5 toddlers (18-36 months)

**Implementation Requirements:**

Create `scripts/seedTestUsers.ts` with:
- 50 user objects with realistic data
- Naming convention: `test-dad-{city-abbrev}-{number}@example.com`
- Session IDs: `test-session-{city-abbrev}-{number}`
- All users have `onboarded: true` and `matching_eligible: true`

Create `scripts/cleanTestUsers.ts` to:
- Delete all test users (session_id starts with "test-")
- Delete all test groups (test_mode: true)

Add npm scripts:
- `npm run seed:test`: Seed 50 test users
- `npm run clean:test`: Remove all test data

---

### Subtask 3: Matching Algorithm

**Goal:** Implement matching logic that prioritizes match quality (age proximity) over matching everyone.

**Matching Logic:**

**Step 1: Geographic Filter**
- Hard requirement: Users must be in the same City + State.

**Step 2: Life Stage Bucketing**
- Assign unmatched users to buckets: `Expecting`, `Newborn`, `Infant`, `Toddler`.

**Step 3: Group Formation (Greedy & Threshold-based)**
- For each City + Bucket:
  1. **Sort** users by specific child age (or due date).
  2. **Chunk** into clusters of 4-6 users.
  3. **Validate** using "Matchability Threshold":
     - **Max Age Gap:** The difference between the oldest and youngest child in the group must not exceed the threshold (e.g., 6 months for infants).
     - **Min Group Size:** Must be at least 4.
  4. **Commit:** If valid, form group.
  5. **Fallback:** If a cluster is invalid (too wide age gap) or too small (< 4), **do not force it**. Leave those users unmatched for now (they await better matches in future).

**Note:** We do *not* need to solve for "matching everyone" (e.g., splitting 13 users into 5-4-4). If the "Matchability Threshold" allows 6-6 (leaving 1), that is acceptable. Quality > Coverage.

**Output:**
- Create `Group` documents.
- Update `UserProfile` with `group_id`.

---

### Subtask 4: Admin Matching Interface

**Goal:** Simple admin control to run matching.

**New Admin Tab: "Matching"**

**Controls:**
- **Status Panel**: Show current stats (Unmatched Users per City).
- **Actions**:
  - Button: "Run Test Match" (Dry run, no emails, creates `test_mode` groups).
  - Button: "Run Production Match" (Creates real groups, sends emails).
  - Button: "Clear Test Data".
  - Button: "Seed Test Data".

**Results Display:**
- List of formed groups (Name, Member Count, Location).
- List of unmatched users.

---

### Subtask 5: Matching Service Implementation

**New File: `services/matchingService.ts`**

Implement these key functions:

**Core Logic:**
- `getUnmatchedUsers(city?: string)`
- `runMatchingAlgorithm(city?: string, testMode?: boolean)`:
  - Fetches users.
  - Buckets them.
  - Forms groups.
  - Saves groups to DB.
  - Updates user profiles.
  - Returns summary.

---

### Subtask 6: API Endpoints

**New File: `api/matching.ts`**

**POST `/api/matching/run`**
- Body: `{ city?: string, testMode: boolean }`
- Triggers logic.
- Returns results.

**GET `/api/matching/stats`**
- Returns counts of matched/unmatched users by city.

---

### Subtask 7: Group Introduction Email

**Goal:** Send simple email introducing group members.

**Subject:** "Meet Your DadCircles Group: {GroupName}"

**Body:**
- Greeting.
- List of members (First Name, Child Age/Status).
- "Reply all to say hi!"
- Simple text, clear call to action.

**Implementation:**
- `functions/src/emailService.ts`: `sendGroupIntroductionEmail`.
- Test Mode: Log to console, do not send via Resend/Provider.

---

### Subtask 8: Scheduled Matching

**Goal:** Automatically run matching daily.

**Cloud Function: `runDailyMatching`**
- Trigger: Pub/Sub Scheduled (Daily 9 AM UTC).
- Logic:
  - Scan all cities.
  - Run matching for any city with >= 4 unmatched users in a bucket.
  - Send emails.

---

## ✅ Success Criteria

### Data & Seeding
- [ ] 50 test users seeded across 4 cities.
- [ ] Seed/Clean scripts work reliably.

### Algorithm
- [ ] Users in different cities never matched.
- [ ] Users in different life stages never matched.
- [ ] All groups have 4-6 members.
- [ ] Simple sorting ensures closest ages match first.

### Admin & API
- [ ] Admin "Run Matching" button works.
- [ ] Test Mode creates groups but sends no emails.
- [ ] Production Mode sends emails.
- [ ] Daily scheduled job implemented.

### Email
- [ ] Emails received (simulated or real) with correct member list.

## 📚 Files to Create/Modify

**New Files:**
- `scripts/seedTestUsers.ts`
- `scripts/cleanTestUsers.ts`
- `services/matchingService.ts`
- `api/matching.ts`
- `functions/src/matching.ts`

**Modified Files:**
- `types.ts`
- `database.ts`
- `components/AdminDashboard.tsx`
- `functions/src/emailService.ts`
- `functions/src/index.ts`
- `package.json`

## 📝 Definition of Done

Task is done when:
1. Admin can click "Seed", "Run Test Match", and see valid groups formed in the UI.
2. Email logic is verified (logs in test mode).
3. Code is committed and deployed/ready for deploy.