# Task 01: Landing Page to Chat Integration

## 🎯 Goal

Connect the landing page signup form to the chat interface so users can immediately start conversational onboarding. **Priority: Get core functionality working, not UI polish.** Target completion: under 3 hours.

## 💡 Implementation Tips (Read This First!)

- **Start Simple:** Get navigation working, then add features incrementally
- **Mobile First:** Build responsive from the start - this MUST work perfectly on mobile
- **Test Locally on Mobile:** Use Nginx (or similar) to host locally and access from your phone. Quick setup: `npx http-server -p 8080` then access `http://<your-local-ip>:8080` from mobile on same WiFi
- **Leverage Existing Code:** `ChatInterface.tsx` already works - just adapt it for user-facing use
- **Commit Often:** After each working piece, commit to git (dev branch)
- **Firebase Emulator:** Use `npm run emulator` for local testing before deploying

---

## 📖 Background

**Current State:**
- Landing page collects email + postcode + signupForOther flag
- Chat interface exists but is admin-only (`/admin/chat`)
- No connection between landing page and chat

**What We're Building:**
1. User submits landing page form → creates/retrieves session
2. If `signupForOther = false` → redirect to `/chat`
3. Chat runs through onboarding steps (WELCOME → ... → COMPLETE)
4. After COMPLETE → FAQ mode
5. All messages saved to Firestore

---

## 🔨 Task Breakdown

### Subtask 1: Email-Based Session Management
**Goal:** Use email as the session identifier/retrieval key

**Implementation Steps:**
1. Modify `api/leads.ts` to check if email already exists in `leads` collection
2. If email exists and has a `session_id` field, retrieve it
3. If email doesn't have `session_id`, generate one (use UUID or email hash)
4. Create or update UserProfile document in `profiles` collection with:
   - `session_id` (linked to email)
   - `email` field (add to UserProfile schema)
   - `onboarding_step: 'WELCOME'` (if new)
   - `onboarded: false` (if new)
5. Update Lead document with `session_id` reference for future lookup
6. Return `session_id` in the API response

**Key Considerations:**
- Email is the persistent identifier across sessions
- Users can return days/weeks later and resume where they left off
- Session doesn't expire for 90 days (onboarding can be slow)
- Store email in both `leads` and `profiles` collections for easy bidirectional lookup

**Data Flow:**
```
Landing form submit (email: dad@example.com, postcode: 48104)
  ↓
Check: Does lead with this email exist?
  ↓
YES → Fetch session_id from lead document
  ↓
NO → Generate new session_id (UUID)
  ↓
Create/update UserProfile with session_id + email
  ↓
Update Lead document with session_id
  ↓
Return session_id to frontend
```

---

### Subtask 2: Conditional Navigation from Landing Page
**Goal:** Redirect to chat only if user is signing up for themselves

**Implementation Steps:**
1. In `LandingPage.tsx`, after successful form submission:
2. Check the `signupForOther` flag from form state
3. **If `signupForOther === false`:**
   - Extract `session_id` from API response
   - Navigate to `/chat` route (pass session_id via URL param or state)
   - Use single-page navigation (React Router's `useNavigate()` hook)
4. **If `signupForOther === true`:**
   - Show success message only (no navigation)
   - Display: "Thanks! We'll reach out to them via email."

**Key Considerations:**
- Single-page redirect (no full page reload)
- Must work on mobile (touch-friendly, responsive)
- Preserve session_id in URL or application state
- Handle navigation errors gracefully

**Routing Options:**
- **Option A:** `/chat?session={sessionId}` (query param)
- **Option B:** `/chat/{sessionId}` (path param, requires route config)
- **Option C:** Pass session_id via React Router state (not in URL)

**Recommendation:** Use Option A or C to avoid exposing session structure in URL

---

### Subtask 3: Make Chat Interface User-Facing
**Goal:** Transform admin-only chat into production-ready user interface

**Implementation Steps:**
1. Create new route in router configuration:
   - Path: `/chat` (or `/chat/:sessionId` if using path params)
   - Component: New wrapper component or modified ChatInterface
2. Update `ChatInterface.tsx`:
   - Remove test persona selector UI (keep backend logic for now)
   - Accept `session_id` from URL params or props
   - Load user profile and message history based on `session_id`
   - Style to match landing page aesthetics (colors, fonts, spacing)
3. Ensure mobile responsiveness:
   - Chat input sticky at bottom
   - Messages scrollable in middle viewport
   - No horizontal scroll on small screens
   - Touch-friendly input and send button
4. Add loading state while fetching session data
5. Add error boundary if session_id is invalid

**Design Requirements:**
- Match landing page color scheme (extract from LandingPage.tsx)
- Use same font family and sizing
- Consistent button styles
- Clean, minimal interface (remove admin features)
- Professional tone matching landing page

---

### Subtask 4: Session Retrieval for Returning Users
**Goal:** Load existing messages and state when user re-enters with same email

**Implementation Steps:**
1. In `api/leads.ts` (or new `api/session.ts`):
   - Query Firestore `leads` collection by email
   - Fetch associated `session_id`
   - Query `messages` collection filtered by `session_id`, ordered by timestamp
   - Query `profiles` collection by `session_id` to get current `onboarding_step`
2. Return to frontend:
   - `session_id`
   - `messages[]` array (all previous messages)
   - `onboarding_step` (current state)
   - `profile` object (existing user data)
3. In `ChatInterface.tsx`:
   - Pre-populate chat history from `messages[]`
   - Resume from current `onboarding_step` (don't restart from WELCOME)
   - Display "Welcome back!" message if returning user

**Edge Cases:**
- User completed onboarding before: Start in FAQ mode (step = COMPLETE)
- User abandoned mid-onboarding: Resume from last step
- User has no messages yet: Standard new user flow
- Email exists in leads but no profile: Create profile and start onboarding

---

### Subtask 5: Post-Onboarding FAQ Mode
**Goal:** Transition chat to informational support after onboarding completes

**Implementation Steps:**
1. In `services/geminiService.ts`, update system prompt to include:
   - Full description of what DadCircles is
   - How matching works (location + interests)
   - What happens next (group introduction email, first meeting)
   - FAQ topics: privacy, group size, meeting frequency, cost (free)
2. When `onboarding_step === 'COMPLETE'`:
   - Add conditional logic in `getAgentResponse()` function
   - Use different system prompt for FAQ mode
   - Agent should answer questions about DadCircles, not collect info
3. Display visual indicator in chat UI:
   - Badge or header text: "Onboarding Complete - Ask me anything!"
   - Agent's first message after completion: "You're all set! While we find your perfect dad group, feel free to ask me anything about DadCircles."

**FAQ System Prompt (High-Level):**
```
You are a helpful assistant for DadCircles, a community platform connecting dads.
The user has completed onboarding and will be matched with local dads based on:
- Location (city/postcode)
- Shared interests
- Children's ages (for relevant conversation topics)

Answer questions about:
- How matching works
- What to expect from groups
- Privacy and safety
- Meeting logistics
- The DadCircles mission
```

---

### Subtask 6: Intelligent Rate Limiting
**Goal:** Protect Gemini API from abuse while allowing natural onboarding flow

**Rate Limit Tiers:**

**Tier 1: During Onboarding (onboarding_step !== 'COMPLETE')**
- **Per-minute limit:** 20 messages/minute (very lenient)
- **Rationale:** Users may send multiple messages clarifying interests, correcting info, asking questions
- **Enforcement:** Client-side debouncing (500ms) + server-side check
- **Exceeded behavior:** Show gentle message: "Please slow down a bit! Take your time with your responses."

**Tier 2: Post-Onboarding (onboarding_step === 'COMPLETE')**
- **Per-minute limit:** 4 messages/minute
- **Session total limit:** 100 messages max
- **Rationale:** FAQ mode should be conversational but not abused
- **Enforcement:** Server-side tracking in Firestore profile
- **Exceeded behavior:**
  - If rate limit: "You're sending messages too quickly. Please wait a moment."
  - If 100-message cap: "You've reached the message limit for this session. We'll be in touch via email soon!"

**Implementation Steps:**
1. Add to UserProfile schema:
   - `messageCount: number` (total messages in session)
   - `lastMessageTimestamp: Timestamp` (for rate calculation)
   - `messagesInLastMinute: number` (rolling count)
2. In `api/chat.ts` (before calling Gemini):
   - Fetch user profile
   - Check if `onboarding_step === 'COMPLETE'`
   - If complete and `messageCount >= 100`: Return error, don't call Gemini
   - Calculate messages in last 60 seconds
   - If during onboarding and rate > 20/min: Return rate limit error
   - If post-onboarding and rate > 4/min: Return rate limit error
   - Increment `messageCount` and update `lastMessageTimestamp`
3. Client-side debouncing:
   - In `ChatInterface.tsx`, debounce send button (500ms)
   - Disable send button while message is being sent
   - Visual feedback (button grayed out, loading spinner)

**Rate Limit Formula (Server-Side):**
```javascript
const now = Date.now();
const oneMinuteAgo = now - 60000;

// Count messages in last minute from Firestore
const recentMessages = messages.filter(m => m.timestamp > oneMinuteAgo && m.role === 'USER');
const messagesInLastMinute = recentMessages.length;

// Get tier-specific limit
const isOnboarding = profile.onboarding_step !== 'COMPLETE';
const perMinuteLimit = isOnboarding ? 20 : 4;

if (messagesInLastMinute >= perMinuteLimit) {
  return { error: 'RATE_LIMIT_EXCEEDED', limit: perMinuteLimit };
}

// Check session total (only post-onboarding)
if (!isOnboarding && profile.messageCount >= 100) {
  return { error: 'SESSION_LIMIT_REACHED' };
}
```

**Non-Intrusive UX:**
- Don't show rate limit info upfront (no scary warnings)
- Only surface limit messages if actually exceeded
- Use friendly language ("slow down a bit" vs "RATE LIMIT ERROR")
- Visual feedback (disable send button temporarily when rate limit hit)

---

### Subtask 7: Abandoned Session Handling
**Goal:** Handle users who start but don't finish onboarding

**Strategy:**
- **No automatic cleanup** - Sessions persist indefinitely (low storage cost)
- **No timeout** - User can return weeks later and resume
- **Email reminders** (future enhancement) - Follow-up email after 3 days of inactivity

**Implementation:**
1. Track `last_updated` timestamp in UserProfile (already exists)
2. Admin dashboard shows abandoned sessions (onboarded: false, last_updated > 7 days ago)
3. No code changes needed for MVP - abandoned sessions just sit in database
4. Future: Cloud Function to send nudge emails to incomplete sessions

**Edge Case Handling:**
- User starts onboarding, closes tab, returns 2 weeks later with same email → Resume from last step
- User submits landing page twice with same email → Load existing session (don't create duplicate)
- User completes onboarding, closes tab, returns → FAQ mode immediately (don't restart onboarding)

---

## ✅ Success Criteria

### Functional Requirements
- [ ] User who submits landing page with `signupForOther: false` is redirected to chat
- [ ] User who submits landing page with `signupForOther: true` stays on landing page (success message only)
- [ ] Navigation to chat is single-page redirect (no full reload)
- [ ] Chat interface matches landing page visual style (colors, fonts, spacing)
- [ ] Chat is fully responsive on mobile (320px to 768px+ widths)
- [ ] Returning user with same email loads existing session and message history
- [ ] All messages (user + agent) are saved to Firestore `messages` collection
- [ ] Agent correctly progresses through onboarding steps (WELCOME → ... → COMPLETE)
- [ ] After onboarding completes, agent transitions to FAQ mode
- [ ] Rate limiting during onboarding: max 20 messages/minute (gentle)
- [ ] Rate limiting post-onboarding: max 4 messages/minute, 100 total (strict)
- [ ] Rate limit messages are friendly and non-intrusive
- [ ] Abandoned sessions can be resumed anytime (no timeout)

### Technical Requirements
- [ ] Email is stored in both `leads` and `profiles` collections
- [ ] `session_id` is generated and stored on first signup
- [ ] UserProfile includes new fields: `email`, `messageCount`, `lastMessageTimestamp`
- [ ] Lead document includes `session_id` reference
- [ ] Chat interface loads session via query param or route param
- [ ] Rate limiting logic executes server-side (in `api/chat.ts`)
- [ ] Client-side debouncing prevents accidental rapid sends (500ms delay)

### User Experience Requirements
- [ ] No error states visible to user under normal usage
- [ ] Loading states shown while fetching session data
- [ ] Invalid session_id shows user-friendly error (not 404 or blank page)
- [ ] Send button disabled during message processing (prevents double-sends)
- [ ] Chat input is sticky at bottom on mobile (doesn't disappear when keyboard opens)
- [ ] Visual confirmation when rate limit is hit (button disabled + message)

---

## 🧪 Testing Instructions

### Test 1: New User Signup Flow
**Steps:**
1. Navigate to landing page at `/`
2. Enter new email (e.g., `test-new-user@example.com`) and postcode (`48104`)
3. Leave "Signing up for someone else?" **unchecked**
4. Click "Join the Waitlist"
5. Observe navigation to `/chat` (or `/chat?session=...`)
6. Verify chat interface loads with welcome message
7. Send first message (e.g., "Hi")
8. Check Firestore:
   - `leads` collection has document with email + `session_id`
   - `profiles` collection has document with `session_id` + email
   - `messages` collection has user message and agent response

**Expected Result:**
- Single-page redirect to chat
- Chat shows agent's welcome message
- User can send messages and receive responses
- All data saved correctly in Firestore

---

### Test 2: Returning User Session Retrieval
**Steps:**
1. Complete Test 1 (create new user session)
2. Send 3-4 messages in chat, progressing through onboarding
3. Close browser tab (or navigate away)
4. Return to landing page at `/`
5. Enter **same email** from Test 1 and any postcode
6. Leave "Signing up for someone else?" **unchecked**
7. Click "Join the Waitlist"
8. Observe navigation to `/chat`

**Expected Result:**
- Chat loads with full message history from previous session
- Onboarding resumes from last step (not from WELCOME)
- User sees "Welcome back!" or similar returning user message
- No duplicate `session_id` or profile created

---

### Test 3: Signup for Others (No Redirect)
**Steps:**
1. Navigate to landing page at `/`
2. Enter email (`test-other@example.com`) and postcode (`48104`)
3. **Check** "Signing up for someone else?"
4. Click "Join the Waitlist"

**Expected Result:**
- User stays on landing page (no redirect)
- Success message displayed: "Thanks! We'll reach out to them via email."
- Lead document created in Firestore with `signupForOther: true`
- **No profile or session created** (they won't onboard)

---

### Test 4: Mobile Responsiveness
**Steps:**
1. Open browser DevTools (F12)
2. Toggle device emulation (iPhone SE, Pixel 5, etc.)
3. Navigate to landing page
4. Submit form (new email, `signupForOther: false`)
5. Verify chat interface on mobile:
   - Chat messages are readable (text doesn't overflow)
   - Input field is at bottom and stays visible when typing
   - Send button is touch-friendly (min 44px height)
   - No horizontal scroll
   - Messages scroll vertically without layout breaking
6. Test on actual mobile device if possible

**Expected Result:**
- Chat interface is fully functional on screens 320px - 768px wide
- No UI elements cut off or inaccessible
- Keyboard appearance doesn't break layout (chat input stays accessible)

---

### Test 5: Rate Limiting During Onboarding
**Steps:**
1. Start new chat session (submit landing page)
2. In chat, send messages rapidly (paste and send quickly, 25+ messages within 60 seconds)
3. Observe behavior after ~20 messages in 1 minute

**Expected Result:**
- First 20 messages send successfully
- 21st message within the same minute shows rate limit message
- User sees friendly message: "Please slow down a bit! Take your time with your responses."
- Send button temporarily disabled (or shows loading state)
- After 60 seconds pass, user can send again

**How to Test Easily:**
- Write a simple script to auto-send messages via chat API
- Or manually copy-paste 25 short messages rapidly

---

### Test 6: Rate Limiting Post-Onboarding (FAQ Mode)
**Steps:**
1. Complete full onboarding flow (progress through all steps to COMPLETE)
2. Verify chat shows "Onboarding Complete" indicator
3. Send 5 messages within 60 seconds (rapid-fire)

**Expected Result:**
- First 4 messages send successfully
- 5th message within same minute shows rate limit: "You're sending messages too quickly. Please wait a moment."
- After 60 seconds, user can send again

**Session Limit Test:**
1. (Optional, time-consuming) Send 100 messages total in FAQ mode
2. Attempt to send 101st message

**Expected Result:**
- 101st message blocked with message: "You've reached the message limit for this session. We'll be in touch via email soon!"
- No Gemini API call made for 101st message

---

### Test 7: Post-Onboarding FAQ Functionality
**Steps:**
1. Complete onboarding flow (reach COMPLETE step)
2. Ask FAQ-style questions:
   - "How does matching work?"
   - "Is this free?"
   - "When will I hear about my group?"
   - "What if I don't like my group?"

**Expected Result:**
- Agent provides informative answers about DadCircles
- Agent doesn't try to re-collect onboarding info
- Responses are contextual and helpful
- Agent references user's profile data if relevant (e.g., "We're finding dads in [city]")

---

### Test 8: Abandoned Session Resumption
**Steps:**
1. Start new session, send 2-3 messages, reach STATUS step
2. Close browser and wait 24 hours (or simulate by manually updating `last_updated` timestamp in Firestore)
3. Return to landing page with same email, submit form
4. Verify chat loads

**Expected Result:**
- Session resumes from STATUS step (not restarted)
- All previous messages visible
- Agent asks next question in flow (not welcome message)
- `last_updated` timestamp updates in Firestore

---

### Test 9: Invalid Session Handling
**Steps:**
1. Manually navigate to `/chat?session=invalid-session-id-12345`
2. Observe behavior

**Expected Result:**
- Error message displayed: "Session not found. Please return to the home page."
- Link to return to landing page
- No crash or blank page

---

### Test 10: Message Persistence
**Steps:**
1. Complete any test above (new or returning user)
2. Open Firestore console in Firebase dashboard
3. Navigate to `messages` collection
4. Filter by `session_id` from test user

**Expected Result:**
- All user messages have `role: 'USER'`
- All agent messages have `role: 'AGENT'`
- Messages ordered by `timestamp` ascending
- Each message has `content` field with text
- Each message has `session_id` linking to profile

---

## 🔧 Technical Considerations

### Session ID Strategy
**Recommended:** Use UUID v4 for session IDs
- **Pros:** Unique, unpredictable, no collision risk
- **Cons:** Not human-readable (doesn't matter for this use case)
- **Alternative:** Hash of email + timestamp (more predictable, potential security issue)

**Implementation:**
```javascript
import { v4 as uuidv4 } from 'uuid';
const session_id = uuidv4(); // e.g., "550e8400-e29b-41d4-a716-446655440000"
```

### URL Structure Options
**Option A: Query Param** (Recommended)
- URL: `/chat?session=550e8400-e29b-41d4-a716-446655440000`
- Pros: Easy to implement, doesn't require route config changes
- Cons: Session ID visible in URL (low security risk for this use case)

**Option B: Path Param**
- URL: `/chat/550e8400-e29b-41d4-a716-446655440000`
- Pros: Cleaner URL structure
- Cons: Requires route configuration in React Router

**Option C: React Router State**
- URL: `/chat` (no session ID in URL)
- Session passed via `navigate('/chat', { state: { sessionId } })`
- Pros: No session ID in URL
- Cons: State lost on page refresh (need localStorage fallback)

### Rate Limiting Storage
**Where to Store Rate Limit Data:**
- **Firestore Profile Document** (Recommended for MVP)
  - Fields: `messageCount`, `lastMessageTimestamp`
  - Pros: Persistent, survives server restarts, queryable
  - Cons: Write operation on every message (low cost)
- **Redis/Memcached** (Overkill for MVP)
  - Pros: Fast, designed for counters
  - Cons: Adds infrastructure complexity
- **In-Memory Map** (Not Recommended)
  - Pros: Fast
  - Cons: Lost on server restart, doesn't scale

### Mobile Keyboard Handling
**Common Issue:** On mobile, keyboard appearance pushes chat input out of viewport

**Solution:**
```css
.chat-container {
  height: 100vh;
  height: 100dvh; /* dynamic viewport height, accounts for mobile browser chrome */
  display: flex;
  flex-direction: column;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
}

.input-container {
  position: sticky;
  bottom: 0;
  background: white;
  padding: 1rem;
}
```

### Context Window Management
**Existing System:** Already implemented in `services/contextManager.ts`
- No changes needed for this task
- System automatically limits message history sent to Gemini API
- Keeps recent + first messages, drops middle messages if over token limit

**Verify:** FAQ mode doesn't break context slicing (still respects token limits)

---

## 🚨 Edge Cases to Handle

1. **Duplicate Email Submission:** User submits same email multiple times in quick succession
   - **Solution:** Check for existing lead/session before creating new one (already covered in Subtask 1)

2. **Session ID Collision:** Two users randomly assigned same UUID (astronomically unlikely)
   - **Solution:** UUID v4 has 2^122 possible values, collision probability negligible

3. **Browser localStorage Cleared:** User returns but localStorage doesn't have session_id
   - **Solution:** Email-based retrieval handles this (session tied to email, not localStorage)

4. **User Changes Email Mid-Onboarding:** Not possible in current flow (email entered at signup, not in chat)
   - **Future Enhancement:** Allow email update in settings

5. **User Completes Onboarding, Then Submits Landing Page Again:** Should they restart or load FAQ mode?
   - **Solution:** Load existing session in FAQ mode (don't restart onboarding)

6. **Admin Manually Resets onboarding_step in Firestore:** User returns, what happens?
   - **Solution:** Chat resumes from whatever step is set in database (expected behavior)

7. **Message Send Fails (Network Error):** User sees error, clicks send again
   - **Solution:** Client-side retry logic, show error message, allow re-send

8. **Gemini API Down:** Agent can't respond
   - **Solution:** Catch API error, show user-friendly message: "Our system is temporarily unavailable. Please try again in a few minutes."

---

## 📚 Related Files to Modify/Review

**Frontend:**
- `components/LandingPage.tsx` - Add navigation logic after form submit
- `components/ChatInterface.tsx` - Make user-facing, load session from URL, match site style
- `App.tsx` or router config - Add `/chat` route

**API Handlers:**
- `api/leads.ts` - Add session creation, email lookup, session_id assignment
- `api/chat.ts` - Add rate limiting logic, check onboarding_step for FAQ mode

**Services:**
- `services/geminiService.ts` - Add FAQ mode system prompt, conditional logic for COMPLETE step
- `services/contextManager.ts` - Review (likely no changes needed)

**Types:**
- `types.ts` - Add `email`, `messageCount`, `lastMessageTimestamp` to UserProfile interface

**Database:**
- `database.ts` - May need helper functions for session retrieval by email

**Configuration:**
- No config changes needed

**Styling:**
- Create or update CSS for chat interface to match landing page

---

## 📝 Definition of Done

This task is complete when:
1. All success criteria checkboxes are marked ✅
2. All 10 test cases pass successfully
3. Code is committed to version control with clear commit message
4. Chat interface is accessible to users (not just admin)
5. Mobile testing on at least one physical device confirms responsiveness
6. Rate limiting tested and confirmed working for both tiers
7. Firestore collections (`leads`, `profiles`, `messages`) contain expected data structure
8. No console errors in browser DevTools during normal usage
9. Admin dashboard can view new sessions created from landing page flow

---

## 💡 Implementation Tips

- **Start Small:** Get basic navigation working first, then add rate limiting
- **Test Incrementally:** Test each subtask independently before moving to next
- **Mobile First:** Build chat interface mobile-responsive from the start (easier than retrofitting)
- **Use Existing Code:** Leverage `ChatInterface.tsx` heavily, just remove admin UI and adjust styling
- **Error Handling:** Add try-catch blocks around Firestore queries (network can fail)
- **Console Logging:** Add debug logs during development, remove before production
- **Version Control:** Commit after each subtask (easier to rollback if something breaks)

---
