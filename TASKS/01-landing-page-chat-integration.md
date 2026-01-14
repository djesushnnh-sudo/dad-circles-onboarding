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

## 🔨 Core Tasks

### 1. Email-Based Session Management
**File:** `api/leads.ts`

- Check if email exists in `leads` collection
- If exists: retrieve `session_id` from lead document
- If new: generate UUID for `session_id`
- Create/update UserProfile in `profiles` with:
  - `session_id`
  - `email`
  - `onboarding_step: 'WELCOME'`
  - `onboarded: false`
- Update Lead document with `session_id`
- Return `session_id` to frontend

### 2. Landing Page Navigation
**File:** `LandingPage.tsx`

- After form submit, check `signupForOther` flag
- If `false`: Navigate to `/chat?session={sessionId}` using React Router's `useNavigate()`
- If `true`: Show success message, no navigation

### 3. Make Chat User-Facing
**File:** `ChatInterface.tsx` + Router config

- Add `/chat` route in App.tsx
- Remove test persona selector UI
- Accept `session_id` from URL query params (`?session=...`)
- Load profile and message history by `session_id`
- **CRITICAL:** Match landing page styling (colors, fonts, button styles)
- **CRITICAL:** Mobile responsive:
  - Chat input sticky at bottom
  - Messages scroll in middle
  - No horizontal scroll
  - Touch-friendly buttons (min 44px)

### 4. Returning User Support
**File:** `api/leads.ts` + `ChatInterface.tsx`

- Query messages by `session_id` on load
- Display full chat history
- Resume from current `onboarding_step` (don't restart from WELCOME)
- Show "Welcome back!" if user has existing messages

### 5. FAQ Mode After Onboarding
**File:** `services/geminiService.ts`

- When `onboarding_step === 'COMPLETE'`, switch to FAQ system prompt
- Agent answers questions about DadCircles instead of collecting info
- Add visual indicator in chat UI: "Onboarding Complete"

### 6. Basic Protection
**File:** `ChatInterface.tsx`

- Add 500ms debounce on send button (prevents accidental double-clicks)
- Disable send button while message is processing

---

## ✅ Success Criteria

- [ ] Signup with `signupForOther: false` redirects to `/chat`
- [ ] Signup with `signupForOther: true` stays on landing page with success message
- [ ] Chat interface works perfectly on mobile (test on actual device!)
- [ ] Returning users with same email resume their session (not restart)
- [ ] Chat progresses through onboarding steps (WELCOME → ... → COMPLETE → FAQ mode)
- [ ] All messages saved to Firestore
- [ ] Email stored in both `leads` and `profiles` collections
- [ ] `session_id` links leads and profiles
- [ ] Send button has 500ms debounce
- [ ] Deployed to Firebase and working in production

---

## 🧪 Quick Testing Guide

### Test 1: New User Flow
1. Go to landing page, enter new email, leave "signup for other" unchecked
2. Submit → should redirect to `/chat?session=...`
3. Send a message → should get agent response
4. Check Firestore: lead + profile + messages all exist

### Test 2: Returning User
1. Use same email from Test 1 on landing page
2. Submit → should load existing chat with full message history
3. Verify it resumes from last step (not WELCOME)

### Test 3: Signup for Others
1. Enter email, CHECK "signup for other"
2. Submit → should stay on page with success message
3. Check Firestore: lead created, but NO profile or session

### Test 4: Mobile Responsiveness (CRITICAL!)
1. Test in browser DevTools with mobile emulation
2. **MUST test on actual phone:** Use `npx http-server -p 8080`, then visit `http://<your-local-ip>:8080` from phone on same WiFi
3. Verify:
   - No horizontal scroll
   - Input stays at bottom when keyboard opens
   - Buttons are easily tappable
   - Text doesn't overflow

### Test 5: Full Onboarding Flow
1. Complete all steps from WELCOME to COMPLETE
2. Verify FAQ mode activates with "Onboarding Complete" message
3. Ask a question about DadCircles → should get helpful answer (not try to collect info)

---

## 🔧 Quick Technical Notes

**Session ID:** Use UUID v4 (already in package.json)
```javascript
import { v4 as uuidv4 } from 'uuid';
const session_id = uuidv4();
```

**Routing:** Use query param `/chat?session={id}` - simplest to implement

**Mobile CSS Fix:** Use flexbox with sticky input
```css
.chat-container {
  height: 100dvh; /* dynamic viewport height for mobile */
  display: flex;
  flex-direction: column;
}
.messages-container { flex: 1; overflow-y: auto; }
.input-container { position: sticky; bottom: 0; }
```

## ✅ Done When

1. All success criteria checked off
2. Tested on actual mobile device (not just DevTools)
3. Deployed to Firebase
4. Can complete full user journey: landing page → chat → onboarding → FAQ mode
