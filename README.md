# Dad Circles Onboarding MVP (Phase 1)

A high-fidelity conversational onboarding experience built for new and expecting dads. This project uses the **Gemini 2.0 Flash** model to drive a human-like, state-aware onboarding flow.

## 🚀 Key Features
- **State-Driven Onboarding**: The agent strictly follows a sequence (Welcome -> Status -> Child Info -> Interests -> Location -> Confirmation).
- **Test Persona System**: Built-in switcher to test different user journeys (New Dad, Expecting Dad, and Completed profiles).
- **Admin Dashboard**: A real-time monitoring view where admins can see active sessions and manually inject messages into the conversation.
- **Matching Algorithm**: Intelligent grouping system that matches dads by location and life stage to form support circles.
- **Firebase Integration**: Real-time database with Firestore for production and local emulator support for development.

## 🛠️ Tech Stack
- **React 19** (via ESM)
- **Tailwind CSS** (Styling)
- **Google Gemini API** (LLM Logic)
- **React Router** (Navigation)
- **Firebase/Firestore** (Database)
- **Express** (Backend API)
- **Vite** (Build Tool)

## 🔑 Environment Setup

### Prerequisites
- Node.js (v18 or higher)
- Firebase CLI (`npm install -g firebase-tools`)
- Java (for Firebase emulator)

### Local Development Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. Start the Firebase emulator (in one terminal):
   ```bash
   npm run emulator
   ```

5. Start the development server (in another terminal):
   ```bash
   npm run dev:server
   ```

6. Open your browser to `http://localhost:3000`

## 🧪 Testing the Flow
Use the **Test Persona** buttons at the top of the Chat interface to jump between different stages of the onboarding process to verify the LLM's state management logic.

---

## 👥 Matching Algorithm System

The matching algorithm automatically groups dads into support circles based on their location and life stage. This creates meaningful connections between dads who are going through similar experiences at the same time.

### How It Works

1. **Eligibility**: Users become eligible for matching after completing onboarding
2. **Grouping Criteria**:
   - **Location**: Dads are grouped by city and state (e.g., "Ann Arbor, MI")
   - **Life Stage**: Four categories based on child's age:
     - **Expecting**: Due date is in the future
     - **Newborn**: Child is 0-6 months old
     - **Infant**: Child is 7-18 months old
     - **Toddler**: Child is 19-36 months old
3. **Group Size**: 4-6 members per group (minimum 4 required to form a group)
4. **Age Sorting**: Within each group, dads are sorted by child age for better compatibility

### Life Stage Definitions

| Life Stage | Age Range | Description |
|------------|-----------|-------------|
| **Expecting** | Pre-birth | Partner is pregnant, baby not yet born |
| **Newborn** | 0-6 months | Baby is brand new, sleep deprivation phase |
| **Infant** | 7-18 months | Baby is mobile, learning to walk/talk |
| **Toddler** | 19-36 months | Child is walking, talking, exploring |

### Using the Matching System

#### Admin Dashboard Access
1. Navigate to the Admin page: `http://localhost:3000/admin`
2. Click on the **"Matching"** tab
3. You'll see three panels:
   - **Statistics**: Total users, matched, and unmatched counts
   - **Actions**: Buttons to run matching and manage test data
   - **Formed Groups**: List of all created groups

#### Available Commands

**Via Admin UI:**
- **Run Test Match**: Creates test groups (marked as `test_mode: true`, can be cleaned up)
- **Run Production Match**: Creates real groups (permanent, would send emails in production)
- **Seed Test Data**: Creates 50 test users across multiple cities
- **Clear Test Data**: Removes all test users and test groups

**Via Command Line:**
```bash
# Seed 50 test users
npm run seed:test

# Clean test data
npm run clean:test

# View matching logs
npm run logs:matching
```

### Test Data Distribution

When you seed test data, you get 50 users distributed as follows:

| City | State | Total Users | Expecting | Newborn | Infant | Toddler |
|------|-------|-------------|-----------|---------|--------|---------|
| Ann Arbor | MI | 15 | 8 | 3 | 3 | 1 |
| Austin | TX | 12 | 6 | 3 | 2 | 1 |
| Boulder | CO | 10 | 5 | 2 | 2 | 1 |
| Portland | OR | 8 | 4 | 2 | 1 | 1 |
| Various | Various | 5 | 2 | 0 | 2 | 1 |

**Note**: The 5 users in "Various" cities are intentionally scattered (Seattle, Denver, Nashville, Phoenix, Miami) and won't form groups - they serve as controls to test the "unmatched" scenario.

### Expected Matching Results

With the default test data, running the matching algorithm should create approximately:
- **6-8 groups** total
- **Ann Arbor**: 2-3 groups (1 Expecting, 1-2 others)
- **Austin**: 2 groups (1 Expecting, 1 other)
- **Boulder**: 1-2 groups (1 Expecting, possibly 1 other)
- **Portland**: 1 group (1 Expecting)
- **45-48 users matched** (out of 50)
- **2-5 users unmatched** (scattered cities + small groups)

### API Endpoints

The matching system exposes several REST API endpoints:

```
POST /api/matching/run
Body: { testMode: boolean, city?: string, stateCode?: string }
Description: Run the matching algorithm

GET /api/matching/stats
Description: Get matching statistics (total, matched, unmatched users)

GET /api/matching/groups
Description: Get all formed groups

GET /api/matching/profiles
Description: Get all user profiles
```

### Database Schema

**Profiles Collection** (`profiles`):
```typescript
{
  session_id: string;           // Unique identifier
  email?: string;               // User's email
  onboarded: boolean;           // Completed onboarding?
  onboarding_step: string;      // Current step
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
  interests?: string[];
  matching_eligible: boolean;   // Ready for matching?
  group_id?: string;            // Assigned group (if matched)
  matched_at?: number;          // Timestamp of matching
  last_updated: number;
}
```

**Groups Collection** (`groups`):
```typescript
{
  group_id: string;             // Unique identifier
  name: string;                 // e.g., "Ann Arbor Expecting Dads - Group 1"
  location: {
    city: string;
    state_code: string;
  };
  life_stage: string;           // Expecting, Newborn, Infant, or Toddler
  member_ids: string[];         // Array of session_ids
  member_emails: string[];      // Array of emails
  status: string;               // pending, active, or inactive
  test_mode: boolean;           // Is this a test group?
  created_at: number;           // Timestamp
  emailed_member_ids: string[]; // Who has been notified
}
```

### Testing Workflow

1. **Start Fresh**:
   ```bash
   # Terminal 1: Start emulator
   npm run emulator
   
   # Terminal 2: Start dev server
   npm run dev:server
   ```

2. **Seed Test Data**:
   - Go to Admin → Matching tab
   - Click "Seed Test Data" button
   - Wait for success message
   - Verify: Should show "50 Total Eligible Users"

3. **Run Matching**:
   - Click "Run Test Match" button
   - Wait for completion (a few seconds)
   - Check results: Should see "Created X groups, matched Y users"

4. **Verify Groups**:
   - Scroll down to "Formed Groups" section
   - Each group should show:
     - City and state
     - Life stage
     - 4-6 members
     - "Test Group" badge
     - "pending" status

5. **Clean Up**:
   - Click "Clear Test Data" button
   - Verify: Stats reset to 0, groups disappear

6. **Repeat**:
   - You can seed and match multiple times
   - Each run creates fresh data

### Troubleshooting

**Issue**: "Clean test data disabled in production"
- **Solution**: Make sure you're running on `localhost` with the emulator

**Issue**: No groups created after matching
- **Solution**: Check that you have at least 4 users in the same city with the same life stage

**Issue**: Stats show 0 users after seeding
- **Solution**: Refresh the page or click the refresh button next to "Total Eligible Users"

**Issue**: Emulator data persists after clearing
- **Solution**: Stop the emulator and delete the `firebase-emulator-data` folder, then restart

### Production Considerations

⚠️ **Important**: The matching system is currently configured for testing with the Firebase emulator.

**Before deploying to production:**
1. Update Firebase security rules to restrict access
2. Configure email service (currently in test mode)
3. Add authentication to admin endpoints
4. Set up proper error monitoring
5. Test with staging environment first
6. Add confirmation dialogs for production matching
7. Implement rollback procedures

**Email Integration** (Future):
- Groups are created with `status: 'pending'`
- Email service will notify members when groups are activated
- Currently emails are not sent (test mode)
- Email templates are ready in `functions/src/emailService.ts`

### Architecture Notes

**Why JavaScript for Matching API?**
The matching algorithm is implemented in JavaScript (`api/matching.js`) rather than TypeScript to avoid build complexity. The Express server (`server.js`) imports this directly.

**Why Separate from Database Module?**
The matching API initializes its own Firebase connection to avoid circular dependencies and ensure it works independently of the frontend database module.

**Logging**:
All matching operations are logged to `logs/matching.log` for debugging. View logs with:
```bash
npm run logs:matching
```

---

## 📧 Email Notification System

The matching system includes an automated email notification service that sends group introduction emails to dads when they're matched into circles. This helps facilitate initial connections and provides group members with each other's contact information.

### Current Status

⚠️ **Email notifications are currently in TEST MODE**

- ✅ Email templates are fully designed and ready
- ✅ Email service code is implemented (`functions/src/emailService.ts`)
- ✅ Integration with matching algorithm is complete
- ⚠️ **Emails are NOT being sent in test mode** (intentional)
- ⚠️ Email service provider (Resend) requires configuration for production

**Why emails aren't sending:**
When you run matching with `testMode: true` (the "Run Test Match" button), emails are simulated but not actually sent. This is intentional to prevent spamming test users during development.

### Email Templates

The system includes three professionally designed email templates:

#### 1. Welcome Email
**Sent when:** A user joins the waitlist (not currently triggered)
**Purpose:** Confirm signup and set expectations
**Subject:** "Welcome to DadCircles! 🎉"
**Content:**
- Welcome message
- Confirmation of their location
- What to expect next
- Information about the matching process

#### 2. Follow-Up Email
**Sent when:** Periodic updates to waitlist members (not currently triggered)
**Purpose:** Keep leads engaged while building community
**Subject:** "Building your local dad network in [postcode]"
**Content:**
- Progress update
- What's happening in their area
- Timeline expectations
- Community building updates

#### 3. Group Introduction Email ⭐ (Active)
**Sent when:** A group is formed via matching algorithm
**Purpose:** Introduce group members to each other
**Subject:** "Meet Your DadCircles Group: [Group Name]"
**Content:**
- Group name and welcome message
- List of all group members with their info:
  - Name
  - Child information (age/stage)
- Next steps for connecting
- Call-to-action to reply and introduce themselves

**Example:**
```
Subject: Meet Your DadCircles Group: Ann Arbor Expecting Dads - Group 1

Welcome to Ann Arbor Expecting Dads - Group 1! 🎉

Your Group Members:
• John Smith - Expecting June 2025, boy
• Mike Johnson - Expecting July 2025
• David Lee - Expecting May 2025, girl
• Tom Wilson - Expecting August 2025, boy
• Chris Brown - Expecting June 2025

What's next?
- Reply all to introduce yourself
- Share what you're looking forward to
- Plan your first meetup
```

### Email Service Provider: Resend

The system uses [Resend](https://resend.com) as the email service provider.

**Why Resend?**
- Developer-friendly API
- Reliable delivery
- Good free tier (100 emails/day)
- Easy to set up and test
- Excellent documentation

**Current Configuration:**
- API key is configured in `functions/.env`
- Default sender: `DadCircles <noreply@dadcircles.com>`
- HTML email templates with responsive design
- Comprehensive logging for debugging

### How Email Sending Works

**Flow:**
1. Matching algorithm creates groups
2. For each group, it calls `EmailService.sendGroupIntroductionEmail()`
3. Email service checks if `testMode` is true:
   - **If test mode:** Logs "SIMULATED EMAIL" and returns success (no email sent)
   - **If production mode:** Sends real emails via Resend API
4. Tracks which members were successfully emailed
5. Updates group record with `emailed_member_ids`

**Code Location:**
- Email service: `functions/src/emailService.ts`
- Email templates: Inside `EmailService` class methods
- Integration: Called from matching algorithm in `api/matching.js`

### Testing Email Templates

You can test email templates without sending real emails:

**Option 1: View in Logs**
When running matching in test mode, email content is logged:
```bash
npm run logs:matching
# Look for "SIMULATED EMAIL" entries
```

**Option 2: Manual Test Script**
A test script exists to send real test emails:
```bash
cd functions
npm run test:email
```

**Option 3: Copy HTML to Browser**
1. Open `functions/src/emailService.ts`
2. Copy the HTML from any `generateXXXEmail()` method
3. Save as `.html` file and open in browser
4. Preview the email design

### Enabling Email Sending in Production

To enable real email sending, follow these steps:

#### Step 1: Verify Resend API Key
```bash
# Check functions/.env file
cat functions/.env
# Should show: RESEND_API_KEY=re_xxxxx
```

If missing or shows placeholder:
1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add to `functions/.env`:
   ```
   RESEND_API_KEY=re_your_actual_api_key_here
   ```

#### Step 2: Verify Domain (Production Only)
For production, you need to verify your sending domain:
1. Go to Resend dashboard
2. Add your domain (e.g., `dadcircles.com`)
3. Add DNS records they provide
4. Wait for verification
5. Update sender email in code if needed

**For testing:** You can use Resend's test domain without verification.

#### Step 3: Use Production Mode
When running matching, use `testMode: false`:
- Click "Run Production Match" button in admin UI
- OR via API: `POST /api/matching/run` with `{ "testMode": false }`

#### Step 4: Monitor Email Delivery
Check Resend dashboard for:
- Delivery status
- Bounce rates
- Open rates (if tracking enabled)
- Any errors or issues

### Email Configuration

**Environment Variables:**
```bash
# functions/.env
RESEND_API_KEY=re_your_api_key_here
```

**Sender Configuration:**
Located in `functions/src/emailService.ts`:
```typescript
private static readonly DEFAULT_FROM = "DadCircles <noreply@dadcircles.com>";
```

To change sender email:
1. Update `DEFAULT_FROM` constant
2. Ensure domain is verified in Resend
3. Rebuild functions: `cd functions && npm run build`

### Email Logs and Debugging

**Log Locations:**
- Firebase Functions logs: `firebase functions:log`
- Local logs: `logs/matching.log`
- Resend dashboard: Real-time delivery tracking

**Common Log Messages:**
```
✅ Email sent successfully - Real email was delivered
⚠️ SIMULATED EMAIL - Test mode, no email sent
❌ Resend API error - Check API key and configuration
⚠️ RESEND_API_KEY not configured - Email service not initialized
```

**Debugging Checklist:**
1. ✅ Is `RESEND_API_KEY` set in `functions/.env`?
2. ✅ Is the API key valid (not placeholder)?
3. ✅ Are you using `testMode: false` for real emails?
4. ✅ Is the recipient email valid?
5. ✅ Check Resend dashboard for delivery status
6. ✅ Check Firebase Functions logs for errors

### Email Rate Limits

**Resend Free Tier:**
- 100 emails per day
- 3,000 emails per month
- Sufficient for testing and small-scale launches

**Scaling Considerations:**
- If matching 50 users into 8 groups = 50 emails
- Can run matching ~2 times per day on free tier
- Upgrade to paid plan for production scale

**Rate Limit Handling:**
Currently, the system does not implement rate limiting. For production:
1. Add rate limiting logic
2. Queue emails if limit reached
3. Implement retry mechanism
4. Monitor usage in Resend dashboard

### Email Content Customization

To customize email templates:

1. **Open the email service:**
   ```bash
   code functions/src/emailService.ts
   ```

2. **Find the template method:**
   - `generateWelcomeEmail()` - Welcome emails
   - `generateFollowUpEmail()` - Follow-up emails
   - `generateGroupIntroductionEmail()` - Group emails

3. **Edit the HTML:**
   - Modify text content
   - Update styling in `<style>` tags
   - Change colors, fonts, layout
   - Add/remove sections

4. **Rebuild functions:**
   ```bash
   cd functions
   npm run build
   ```

5. **Test the changes:**
   - Run matching in test mode
   - Check logs for simulated email content
   - OR send real test email to yourself

### Security and Privacy

**Email Addresses:**
- Stored in Firestore `profiles` collection
- Only shared with group members
- Not exposed in public APIs
- Included in group introduction emails

**Best Practices:**
- ✅ Users opt-in during onboarding
- ✅ Emails only sent to matched group members
- ✅ Clear unsubscribe mechanism (future)
- ✅ No spam or marketing emails
- ✅ Secure API key storage

**Privacy Considerations:**
- Group emails reveal member emails to each other
- This is intentional for connection purposes
- Consider adding privacy preferences in future
- Allow users to opt-out of email sharing

### Troubleshooting

**Issue**: "RESEND_API_KEY not configured"
- **Solution**: Add valid API key to `functions/.env`
- **Check**: Key should start with `re_`

**Issue**: Emails not sending in test mode
- **Solution**: This is intentional! Use `testMode: false` for real emails
- **Check**: Look for "SIMULATED EMAIL" in logs

**Issue**: "Resend API error"
- **Solution**: Check API key is valid and not expired
- **Check**: Verify domain in Resend dashboard
- **Check**: Ensure recipient email is valid

**Issue**: Emails going to spam
- **Solution**: Verify sending domain in Resend
- **Solution**: Add SPF/DKIM records
- **Solution**: Warm up domain with gradual sending

**Issue**: Rate limit exceeded
- **Solution**: Upgrade Resend plan
- **Solution**: Implement email queuing
- **Solution**: Spread matching runs over time

### Future Enhancements

**Planned Features:**
- [ ] Email preferences (opt-in/opt-out)
- [ ] Email templates for different life stages
- [ ] Scheduled follow-up emails
- [ ] Email analytics and tracking
- [ ] Unsubscribe functionality
- [ ] Email queue for rate limiting
- [ ] Retry mechanism for failed sends
- [ ] A/B testing for email content
- [ ] Personalized email content
- [ ] Email notification preferences

### Production Checklist

Before enabling emails in production:

- [ ] Verify Resend API key is configured
- [ ] Verify sending domain in Resend dashboard
- [ ] Add SPF and DKIM DNS records
- [ ] Test email delivery to various providers (Gmail, Outlook, etc.)
- [ ] Check spam score of email templates
- [ ] Review email content for accuracy
- [ ] Test unsubscribe flow (when implemented)
- [ ] Set up email monitoring and alerts
- [ ] Document email sending procedures
- [ ] Train team on email troubleshooting
- [ ] Plan for rate limit handling
- [ ] Consider email queue implementation

---