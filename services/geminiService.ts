import { UserProfile, Message } from "../types";

const getApiKey = () => {
  // Debug environment variables
  console.log('Environment debug:');
  console.log('- import.meta.env:', import.meta.env);
  console.log('- VITE_GEMINI_API_KEY:', import.meta.env.VITE_GEMINI_API_KEY);
  
  // Get API key from environment variable (set in .env file)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.error('GEMINI API key not found. Please set VITE_GEMINI_API_KEY in your .env file');
    console.error('Current value:', apiKey);
    return null;
  }
  
  return apiKey;
};

const SYSTEM_PROMPT = `You are the Dad Circles Onboarding Agent. Your task is to onboard users into Dad Circles in a conversational, human, warm, and lightly enthusiastic way. You are always context-aware and must follow the state-driven onboarding flow defined by onboarding_step.

RESPONSE SPEED: Respond immediately without overthinking. Be natural and conversational.

GENERAL RULES:
- Always drive the conversation. Never hand control to the user.
- Always respond in a warm, friendly, slightly excited tone. Never bland or robotic.
- Never acknowledge user messages with filler phrases like:
  "Got it."
  "Let's keep going."
  "Okay."
  "What else?"
  "Anything else?"
  "What's next?"
- Always ask one thing at a time, in logical order.
- Never ask for information the user could not know (e.g., birth date for expecting dads).
- Only ask what makes sense in context.
- Keep responses concise and direct.

ONBOARDING STEPS:
welcome: Greet the user warmly and ask if they are an expecting dad or a current dad.
status: Confirm whether expecting or current dad (if not already known).
child_info: 
  - If expecting: Ask due month and year only.
  - If current dad: Ask birth month and year.
  - Optionally ask gender after timeline is known.
  - IMPORTANT: If user mentions MULTIPLE children, capture ALL of them in the children array.
  - MULTIPLE CHILDREN EXAMPLES:
    * "I have two kids, one born March 2023 and another due January 2026" = 
      children: [{"type": "existing", "birth_month": 3, "birth_year": 2023}, {"type": "expecting", "birth_month": 1, "birth_year": 2026}]
    * "My children are 5 and 2 years old" = Ask for specific birth dates, then capture both
    * "I only have two children! They are born March 2023, and Jan 2026" = 
      children: [{"type": "existing", "birth_month": 3, "birth_year": 2023}, {"type": "existing", "birth_month": 1, "birth_year": 2026}]
  - SMART FLOW: ONLY skip siblings step if user explicitly says "only one", "just one", "I only have one", "my only child", "no other kids", etc.
  - DO NOT SKIP siblings step just because user mentions "one" child - they might have existing children too.
  - Example: "I'm expecting one" = STILL ASK about siblings (they might have existing kids)
  - Example: "I only have one kid" = Skip to interests, don't ask about siblings.
  - Example: "This is my only child" = Skip to interests.
siblings: Ask "Do you have other kids?" or "Do you have any existing children?" Get details if they do.
  - ALWAYS ASK THIS STEP unless user explicitly said they have "only one" or "no other kids".
  - This step is CRITICAL - most dads have existing children when expecting.
  - Only skip if user clearly indicated they have no other children.
  - When user provides sibling info, capture names, birth dates, and add to the children array with type "existing".
interests: Ask for hobbies/interests once after child info. If user says none, accept and move on. Never probe repeatedly.
location: Ask for city and state. If user provides only city, infer US state, confirm with user. Do not include "(USA only)" — assume all locations are in the USA.
confirm: Present a full summary of all collected information. CRITICAL: Use exact line breaks as shown below.

YOU MUST FORMAT EXACTLY LIKE THIS WITH REAL LINE BREAKS:

"Perfect! Here's what I have:

Status: [Expecting Dad or Current Dad]
Children: [All children - existing and expecting, with details]
Interests: [Their interests or "None mentioned"]
Location: [City, State]

Does everything look correct?"

FORMATTING RULES:
- Start with "Perfect! Here's what I have:" followed by TWO line breaks
- Each field (Status, Children, Interests, Location) on separate lines
- One blank line before "Does everything look correct?"
- Use \n\n for double line breaks, \n for single line breaks
- NEVER put all information in one paragraph
- WAIT FOR USER RESPONSE - do not proceed to complete until user confirms
- STAY IN CONFIRM STEP until user says "yes", "correct", "looks good", etc.

If the user responds ambiguously, re-present the summary with proper line breaks and re-ask for confirmation.
complete: Once confirmed:
  - Set onboarded = true
  - Set onboarding_step = complete
  - Send a completion message: "You're officially onboarded! Welcome to Dad Circles — sit tight while we find a group that's a great fit for you."
  - Do not ask any more onboarding questions.
  - ONLY REACH THIS STEP AFTER USER EXPLICITLY CONFIRMS IN THE CONFIRM STEP`;

export const getAgentResponse = async (profile: UserProfile, history: Message[]) => {
  const recentHistory = history.slice(-6);
  const conversationContext = recentHistory.map(m => `${m.role}: ${m.content}`).join('\n');

  const fullPrompt = `${SYSTEM_PROMPT}

Current Profile State: ${JSON.stringify(profile)}
Onboarding Step: ${profile.onboarding_step}

Recent History:
${conversationContext}

Generate the next response based on the rules. Ensure the message is human-like and moves the state forward.

Respond in valid JSON format with NO THINKING or explanation:
{
  "message": "Your conversational response to the user",
  "next_step": "The next logical OnboardingStep",
  "profile_updates": {
    "location": {"city": "CityName", "state_code": "ST"},
    "interests": ["interest1", "interest2"],
    "children": [{"type": "expecting|existing", "birth_month": 6, "birth_year": 2026, "gender": "Girl"}]
  }
}

CRITICAL: 
- Respond IMMEDIATELY with JSON only
- NO thinking, reasoning, or explanation
- Extract gender from context (her/she = Girl, him/he = Boy)
- For confirmations, include \n for line breaks in the message text
- MULTIPLE CHILDREN PARSING: When user mentions multiple children with dates, create separate child objects for EACH ONE
  * "March 2023 and Jan 2026" = TWO separate children entries
  * "5 years old and 2 years old" = TWO separate children entries  
  * "born in 2020 and expecting in 2025" = TWO separate children entries
- NEVER lose child data - if user mentions multiple children, ALL must be captured
- MULTIPLE CHILDREN: If user mentions multiple kids, create separate entries for each
- MULTIPLE CHILDREN PARSING EXAMPLES:
  * "I have two children born March 2023 and Jan 2026" = children: [{"type": "existing", "birth_month": 3, "birth_year": 2023}, {"type": "existing", "birth_month": 1, "birth_year": 2026}]
  * "One is 5 years old, another is 2" = Ask for birth months/years, then create separate entries
  * "My kids are due June 2025 and I have a 3-year-old" = Mix of expecting and existing children
- SMART FLOW: ONLY set next_step to "interests" (skip siblings) if user explicitly says "only one", "just one", "I only have one", "no other kids", "this is my only child"
- IMPORTANT: "I only have two children" or "I only have three children" means they are telling you ALL their children - capture them all and skip siblings
- DO NOT SKIP siblings step for phrases like "I'm expecting one", "having a baby", "due in June" - these don't indicate they have no other children
- ALWAYS go to siblings step after child_info UNLESS user explicitly stated they have no other children OR gave you ALL their children
- Example that SKIPS siblings: "I only have one child" → next_step: "interests"  
- Example that GOES TO siblings: "I'm expecting one this June" → next_step: "siblings"
- Example that GOES TO siblings: "We're having a baby" → next_step: "siblings"
- Always include profile_updates when you collect new information
- SIBLING DATA CAPTURE: When user mentions existing children in siblings step, add them to the children array with type "existing"
- Example siblings response: "I have two more! Enzo born Jan 2022, Elias born March 2023" = 
  children: [{"type": "existing", "birth_month": 1, "birth_year": 2022, "name": "Enzo"}, {"type": "existing", "birth_month": 3, "birth_year": 2023, "name": "Elias"}]
- CONFIRMATION FORMAT: Use \n between each field: "Perfect! Here's what I have:\n\nStatus: Current Dad\nChildren: January 2023 Girl, Enzo (Jan 2022), Elias (Mar 2023)\nInterests: Hiking\nLocation: Lansing, Michigan\n\nDoes everything look correct?"
- FLOW CONTROL: 
  * SKIP siblings only if user says "only one child", "just one kid", "no other children", "this is my only child"
  * SKIP siblings if user says "I only have X children" and provides details for ALL X children
  * GO TO siblings for "I'm expecting one", "having a baby", "due in June" - these don't mean no other kids
  * Default behavior: ALWAYS ask about siblings unless explicitly told they have none OR given complete family info
- CONFIRMATION STEP: When in "confirm" step, set next_step to "confirm" and WAIT for user response. Only set next_step to "complete" when user confirms.
- NEVER AUTO-COMPLETE: Do not set next_step to "complete" unless user explicitly confirms in the confirm step
- NEVER LOSE CHILD DATA: If children are mentioned, they must appear in the confirmation summary`;

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key not found');
  }

  const models = [
    { name: 'gemini-2.5-flash', version: 'v1beta' },
    { name: 'gemini-2.0-flash-exp', version: 'v1beta' },
    { name: 'gemini-flash-latest', version: 'v1beta' },
    { name: 'gemini-2.5-pro', version: 'v1beta' }
  ];

  let lastError = null;

  for (let i = 0; i < models.length; i++) {
    const { name: model, version } = models[i];
    console.log(`Trying model: ${model} with API version ${version} (attempt ${i + 1}/${models.length})`);

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fullPrompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 512,
            topP: 0.8,
            topK: 20
          }
        })
      });

      console.log(`${model} - API Response status:`, response.status);

      if (response.status === 503 || response.status === 429) {
        console.log(`${model} is overloaded or rate limited, trying next model...`);
        if (i === models.length - 1) {
          return createFallbackResponse(profile, history);
        }
        continue;
      }

      if (response.status === 400) {
        const errorText = await response.text();
        console.error(`${model} - API Error Response:`, errorText);

        if (errorText.includes('quota') || errorText.includes('billing') || errorText.includes('API key not valid')) {
          console.log('API quota or billing issue detected, trying next model...');
          if (i === models.length - 1) {
            return createFallbackResponse(profile, history);
          }
          continue;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${model} - API Error Response:`, errorText);
        lastError = new Error(`API request failed: ${response.status} - ${errorText}`);
        if (i === models.length - 1) {
          return createFallbackResponse(profile, history);
        }
        continue;
      }

      const data = await response.json();
      console.log(`${model} - API Response data:`, data);

      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
        let responseText = data.candidates[0].content.parts[0].text;
        console.log('Raw API response text:', responseText);

        responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
        console.log('Cleaned response text:', responseText);

        try {
          if (!responseText || responseText.trim() === '') {
            console.log('Empty response from API, trying next model...');
            if (i === models.length - 1) {
              return createFallbackResponse(profile, history);
            }
            continue;
          }

          const result = JSON.parse(responseText);

          if (result.message && (result.message.includes('Status:') || result.message.includes("Here's what I have"))) {
            console.log('Detected confirmation message, fixing line breaks...');

            let fixedMessage = result.message
              .replace(/\\n/g, '\n')
              .replace(/\n+/g, ' ')
              .trim();

            fixedMessage = fixedMessage
              .replace(/Perfect! Here's what I have:/g, "Perfect! Here's what I have:\n\n")
              .replace(/Status:/g, 'Status:')
              .replace(/Children:/g, '\nChildren:')
              .replace(/Interests:/g, '\nInterests:')
              .replace(/Location:/g, '\nLocation:')
              .replace(/Does everything look correct\?/g, '\n\nDoes everything look correct?')
              .replace(/Does this look correct\?/g, '\n\nDoes this look correct?')
              .replace(/Is this correct\?/g, '\n\nIs this correct?');

            result.message = fixedMessage;
            console.log('Fixed message with line breaks:', result.message);
          }

          console.log(`API Success with ${model} - Parsed result:`, result);
          return result;

        } catch (parseError) {
          console.log('JSON parse failed, attempting to fix malformed JSON...');

          let fixedJson = responseText
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');

          try {
            const result = JSON.parse(fixedJson);

            if (result.message && (result.message.includes('Status:') || result.message.includes("Here's what I have"))) {
              let fixedMessage = result.message
                .replace(/\\n/g, '\n')
                .replace(/\n+/g, ' ')
                .trim();

              fixedMessage = fixedMessage
                .replace(/Perfect! Here's what I have:/g, "Perfect! Here's what I have:\n\n")
                .replace(/Status:/g, 'Status:')
                .replace(/Children:/g, '\nChildren:')
                .replace(/Interests:/g, '\nInterests:')
                .replace(/Location:/g, '\nLocation:')
                .replace(/Does everything look correct\?/g, '\n\nDoes everything look correct?');

              result.message = fixedMessage;
            }

            console.log(`API Success with ${model} - Parsed result:`, result);
            return result;
          } catch (secondParseError) {
            console.error('Failed to parse JSON even after fixing:', secondParseError);
            if (i === models.length - 1) {
              return createFallbackResponse(profile, history);
            }
            continue;
          }
        }
      } else {
        console.error(`${model} - Invalid API response structure:`, data);
        if (i === models.length - 1) {
          return createFallbackResponse(profile, history);
        }
        continue;
      }
    } catch (error) {
      console.error(`${model} - Error:`, error);
      lastError = error;
      if (i === models.length - 1) {
        return createFallbackResponse(profile, history);
      }
    }
  }

  return createFallbackResponse(profile, history);
};

const createFallbackResponse = (profile: UserProfile, history: Message[]) => {
  console.log('Creating fallback response for step:', profile.onboarding_step);

  const lastUserMessage = history.filter(m => m.role === 'user').pop()?.content || '';

  switch (profile.onboarding_step) {
    case 'welcome':
    case 'status':
      return {
        message: "Hey there! So glad you're here. To get started, are you an expecting dad or a current dad?",
        next_step: "status",
        profile_updates: {}
      };

    case 'child_info':
      return {
        message: "I'd love to hear about your little one! When are they due or when were they born?",
        next_step: "child_info",
        profile_updates: {}
      };

    case 'siblings':
      return {
        message: "Do you have any other children?",
        next_step: "siblings", 
        profile_updates: {}
      };

    case 'interests':
      return {
        message: "What are some of your hobbies or interests?",
        next_step: "interests",
        profile_updates: {}
      };

    case 'location':
      return {
        message: "What city and state are you located in?",
        next_step: "location",
        profile_updates: {}
      };

    case 'confirm':
      const status = profile.children?.some(c => c.type === 'expecting') ? 'Expecting Dad' : 'Current Dad';

      const allChildren = profile.children || [];
      const childrenInfo = allChildren.length > 0 ?
        allChildren.map(child => {
          const name = (child as any).name || '';
          const namePrefix = name ? `${name} ` : '';
          const typePrefix = child.type === 'expecting' ? 'Expecting ' : '';
          return `${namePrefix}${typePrefix}${child.birth_month}/${child.birth_year}${child.gender ? `, ${child.gender}` : ''}`;
        }).join(', ') :
        'Not specified';

      const interests = profile.interests?.join(', ') || 'None mentioned';
      const location = profile.location ? `${profile.location.city}, ${profile.location.state_code}` : 'Not specified';

      return {
        message: `Perfect! Here's what I have:\n\nStatus: ${status}\nChildren: ${childrenInfo}\nInterests: ${interests}\nLocation: ${location}\n\nDoes everything look correct?`,
        next_step: "confirm",
        profile_updates: {}
      };

    case 'complete':
      return {
        message: "You're officially onboarded! Welcome to Dad Circles — sit tight while we find a group that's a great fit for you.",
        next_step: "complete",
        profile_updates: {}
      };

    default:
      return {
        message: "I'm having a brief technical hiccup, but I'm back! Could you repeat that last bit?",
        next_step: profile.onboarding_step,
        profile_updates: {}
      };
  }
};