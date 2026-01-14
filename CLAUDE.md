# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Dad Circles Onboarding MVP is a conversational onboarding application built with React and Gemini 2.0 Flash LLM. The application guides new and expecting dads through a structured onboarding flow while collecting relevant user information (status, children, interests, location). The backend uses Firebase (Firestore for data, Cloud Functions for email), and the frontend is a Vite-powered React app with a test persona system and admin monitoring dashboard.

## Quick Start Commands

```bash
# Install dependencies
npm install

# Development server (uses Vite)
npm run dev

# Development with local Gemini API key (set in command)
npm run dev:local

# Start Express server (separate, for serverless emulation)
npm run dev:server

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Firebase (hosting + functions)
npm run deploy

# Deploy only hosting
npm run deploy:hosting

# Start Firebase emulators (Firestore, Functions, Hosting)
npm run emulator

# Start emulators with data import/export
npm run emulator:seed
```

## Architecture

### High-Level Data Flow

1. **Frontend (React/Vite)** → User interacts with chat interface or landing page
2. **Chat API** (`api/chat.ts`) → Processes user messages, manages conversation state
3. **Gemini Service** (`services/geminiService.ts`) → Calls Google Gemini API with context, manages onboarding step logic
4. **Database** (`database.ts`) → Firestore operations (profiles, messages, leads)
5. **Firebase Functions** (`functions/src/`) → Cloud Functions trigger on lead creation or schedule to send emails
6. **Email Service** → Resend.com API for email delivery

### Key Directories

- **`/components`** - React components: ChatInterface, AdminDashboard, LandingPage, Layout, ContextTestPanel
- **`/api`** - Request/response interfaces and handlers (chat.ts, leads.ts)
- **`/services`** - Core business logic: Gemini API integration, context management
- **`/utils`** - Utilities: analytics, helper functions
- **`/config`** - Configuration files (e.g., contextConfig.ts for context window management)
- **`/functions`** - Firebase Cloud Functions (email service, scheduled tasks)
- **`/functions/src`** - TypeScript source for Cloud Functions

### Data Model

**UserProfile** (Firestore `profiles` collection):
- `session_id` - Unique session identifier
- `onboarding_step` - Current step (enum: WELCOME, STATUS, CHILD_INFO, SIBLINGS, INTERESTS, LOCATION, CONFIRM, COMPLETE)
- `onboarded` - Boolean indicating completion
- `children` - Array of child objects with type, birth_month, birth_year, optional gender
- `siblings` - Array of existing children (captured separately)
- `interests` - Array of user interests
- `location` - Object with city and state_code
- `last_updated` - Timestamp of last modification

**Message** (Firestore `messages` collection):
- `session_id` - Links to user profile
- `role` - USER, AGENT, or ADMIN
- `content` - Message text
- `timestamp` - When message was created

**Lead** (Firestore `leads` collection):
- `email`, `postcode`, `signupForOther` - Landing page form data
- Email tracking fields: `welcomeEmailSent`, `followUpEmailSent`, `welcomeEmailFailed`, etc.
- `source` - Always "landing_page"

## Key Architectural Patterns

### Onboarding State Machine
The system strictly follows a defined sequence of onboarding steps. The Gemini Service (`services/geminiService.ts`) receives the current `onboarding_step` and context, then returns:
- `message` - Next agent response
- `next_step` - Which step to transition to
- `profile_updates` - Any profile fields to update based on extracted user information

The system is designed to extract user intent from natural language and progress through the state machine strictly (no skipping steps without explicit user confirmation).

### Context Window Management
Context management is critical for cost and quality. The `services/contextManager.ts` implements smart message slicing:
- Recent messages are prioritized
- Token counting estimates context size
- Config in `config/contextConfig.ts` defines limits by onboarding step

This prevents overwhelming the Gemini API with unnecessary history while maintaining conversation state.

### Firebase Emulator for Development
The app supports Firebase Firestore emulator for local development. The emulator can be started with `npm run emulator`. Connection is configured in `firebase.js` but currently commented out (disabled while testing email functionality).

### Cloud Functions and Email
Firebase Cloud Functions (in `functions/`) trigger on:
1. **Document creation** - When a lead signs up, `sendWelcomeEmail` fires automatically
2. **Scheduled jobs** - Follow-up emails run on a schedule to nurture inactive leads

The `EmailService` class (`functions/src/emailService.ts`) abstracts Resend.com API calls.

## Environment Variables

Create a `.env` file in the root with:

```
# Gemini API
VITE_GEMINI_API_KEY=your_gemini_api_key

# Firebase (if not using emulator)
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=dad-circles
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id

# Resend Email Service (for Cloud Functions)
RESEND_API_KEY=your_resend_key
```

## Important Implementation Details

### Gemini System Prompt
The Gemini system prompt (`services/geminiService.ts` lines 22-95) is highly detailed and controls the agent's behavior:
- Enforces the onboarding step sequence
- Specifies response tone and style
- Defines how to handle multiple children (critical: capture ALL children in the array)
- Details for each step's specific questions
- Exact formatting rules for confirmation step (must use proper line breaks)

**Key rule**: The siblings step is critical and should only be skipped if user explicitly says "only one" or "no other kids". Most dads have existing children.

### Multiple Children Handling
The system can capture multiple children in a single conversation. The prompt includes examples of how to parse user input like "I have two kids, one born March 2023 and another due January 2026" and create appropriate children array entries.

### Test Persona System
The `ContextTestPanel.tsx` provides buttons to jump between different onboarding states for testing. This doesn't reset the actual user profile but simulates different conversation contexts.

### Admin Dashboard
The `AdminDashboard.tsx` shows:
- List of active sessions with their current onboarding step
- Real-time monitoring capability
- Manual message injection for testing

## Common Development Tasks

### Add a new onboarding step
1. Add step to `OnboardingStep` enum in `types.ts`
2. Update the Gemini system prompt in `services/geminiService.ts` with step logic
3. Update context config in `config/contextConfig.ts` if needed
4. Test with test persona buttons

### Modify the agent's behavior
Edit the system prompt in `services/geminiService.ts`. The prompt is the single source of truth for agent behavior—it's comprehensive and self-documenting.

### Add a new data field to user profile
1. Add field to `UserProfile` interface in `types.ts`
2. Update the Gemini prompt to instruct extraction of this field
3. Add extraction logic in the `getAgentResponse` function in `services/geminiService.ts`
4. Test and verify Firestore stores the new field

### Test with Firebase Emulator
```bash
npm run emulator:seed
# App will connect to local Firestore (port 8083)
# UI available at http://localhost:4004
```

### Deploy Cloud Functions
```bash
npm run deploy
# or for functions only:
firebase deploy --only functions
```

## Testing Considerations

- **Unit tests**: Not yet configured. Consider adding Jest or Vitest for service layer testing.
- **Integration testing**: Use test persona system in chat interface to test different onboarding paths.
- **Email testing**: Manual-test.ts in functions demonstrates how to test email service without triggering live sends.
- **Emulator**: Use Firebase Emulator UI to inspect Firestore data during development.

## Code Structure Notes

- **No src/ directory**: Unlike typical React projects, source files are in the root. This is intentional for this MVP.
- **TypeScript throughout**: All critical business logic is typed.
- **Vite configuration**: Simple setup in `vite.config.ts`. Alias `@` points to project root.
- **React Router**: Uses HashRouter for client-side routing (no server-side routing needed).
- **No state management library**: Uses props drilling and local state. Consider adding if complexity grows.

## Performance & Cost Considerations

- Gemini API calls are optimized via context window management to reduce tokens
- Firebase Firestore uses indexed queries for common patterns
- Cloud Functions are rate-limited to 10 concurrent instances (set in index.ts)
- Email sending uses Resend.com instead of Firebase Sendmail for better deliverability

## Troubleshooting

**"GEMINI API key not found"**
- Ensure `.env` file exists with `VITE_GEMINI_API_KEY` set
- Restart dev server after adding .env
- Check `console.log` output in dev tools

**Firestore emulator not connecting**
- Uncomment connection code in `firebase.js` (currently disabled)
- Ensure `firebase emulators:start` is running on port 8083

**Messages not persisting**
- If using emulator, ensure data export is configured: `npm run emulator:seed`
- Check Firestore browser console to verify collections exist

**Email not sending**
- Verify `RESEND_API_KEY` is correct and has production access
- Check Cloud Functions logs: `firebase functions:log`
- Test email service separately using `manual-test.ts`
