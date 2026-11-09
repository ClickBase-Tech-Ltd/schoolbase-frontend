export type AssistantConversationIntent =
  | "greeting"
  | "how_are_you"
  | "acknowledgement"
  | "thanks"
  | "welcome"
  | "goodbye"
  | "apology"
  | "anything_else"
  | "assistant_identity"
  | "logout"
  | "help"
  | "capabilities"
  | "interesting"
  | "identity_name"
  | "identity_summary"
  | "identity_role"
  | "identity_school"
  | "identity_portal"
  | "identity_permissions"
  | "current_time"
  | "current_date"
  | "current_day";

export type AssistantConversationRequest = {
  intent: AssistantConversationIntent;
  greeting: string | null;
};

export type VerifiedAssistantContext = {
  name: string | null;
  role: string | null;
  schoolName: string | null;
  timezone: string | null;
  serverNow: string;
};

const requestPatterns: Array<[AssistantConversationIntent, RegExp]> = [
  ["logout", /^(?:(?:please|can you|could you|i want to|i'd like to)\s+)?(?:log\s*me\s*out|log\s*out|logout|sign\s*me\s*out|sign\s*out|log\s*off|sign\s*off)(?:\s+please)?$/i],
  ["assistant_identity", /^(?:who are you|what are you|are you (?:a )?human|are you a real person)$/i],
  ["identity_name", /^what(?:'s| is) my name$/i],
  ["identity_summary", /^(?:who am i|tell me about myself)$/i],
  ["identity_role", /^(?:what(?:'s| is) my role|what role do i have|which role do i have)$/i],
  ["identity_school", /^(?:which school do i work for|what school do i work at|what(?:'s| is) my school)$/i],
  ["identity_portal", /^(?:which portal am i using|what portal am i in|which workspace am i using)$/i],
  ["identity_permissions", /^(?:what permissions do i have|what am i allowed to do)$/i],
  ["current_time", /^(?:what(?:'s| is) the time(?: now)?|what time is it(?: now)?|current time)$/i],
  ["current_date", /^(?:what(?:'s| is) (?:today(?:'s)? date|the date today)|what date is it today|today(?:'s)? date)$/i],
  ["current_day", /^(?:what day is today|what(?:'s| is) today|which day is it today|what day is it)$/i],
  ["how_are_you", /^(?:how are you|how(?:'s| is) everything|how are things)(?: going)?$/i],
  ["anything_else", /^(?:no(?:,?\s+(?:thanks?|thank you))?|nothing else|that(?:['’]s| is) all(?:[,!\s]+(?:thanks?|thank you))?|i(?:'m| am) all set|not right now|no more questions)$/i],
  ["acknowledgement", /^(?:ok|okay|alright|all right|got it|understood|sure|sounds good|that works|perfect|great|noted)$/i],
  ["thanks", /^(?:thanks|thank you|thanks a lot|thank you very much|much appreciated|i appreciate it|appreciate it)$/i],
  ["welcome", /^(?:you(?:'re|’re| are) welcome|no problem|my pleasure|anytime)$/i],
  ["apology", /^(?:sorry|i(?:['’]m| am) sorry|my apologies|i apologize)$/i],
  ["goodbye", /^(?:(?:ok(?:ay)?|alright|thanks|thank you)[,!\s]+)?(?:goodbye|bye|see you|talk to you later|see you later)(?:\s+(?:for now|later|tomorrow))?$/i],
  ["help", /^(?:can you help me|could you help me|i need help|help me)$/i],
  ["capabilities", /^(?:what can you do|how can you help|what can you help me with|show me around)$/i],
  ["interesting", /^(?:tell me something interesting|tell me an interesting fact)$/i],
  ["greeting", /^(?:hello|hi|hey|morning|afternoon|evening|good morning|good afternoon|good evening)(?: there)?$/i],
];

const greetingPattern = /^(good morning|good afternoon|good evening|morning|afternoon|evening|hello|hi|hey)(?:\s+there)?\b[,.!:\s]+/i;

export function splitAssistantGreeting(input: string): { greeting: string | null; question: string } {
  const trimmed = input.trim();
  const match = trimmed.match(greetingPattern);
  if (!match) return { greeting: null, question: trimmed };
  const question = trimmed.slice(match[0].length).trim();
  return question
    ? { greeting: match[1], question }
    : { greeting: null, question: trimmed };
}

export function getAssistantConversationRequest(input: string): AssistantConversationRequest | null {
  const trimmed = input.trim();
  const greetingMatch = trimmed.match(greetingPattern);
  const greeting = greetingMatch?.[1] ?? null;
  const question = greetingMatch
    ? trimmed.slice(greetingMatch[0].length).trim().replace(/[?.!]+$/, "")
    : trimmed.replace(/[?.!]+$/, "");
  const normalized = question.trim();

  if (!normalized && greeting) {
    return { intent: "greeting", greeting };
  }

  const match = requestPatterns.find(([, pattern]) => pattern.test(normalized));
  if (!match) return null;
  return { intent: match[0], greeting };
}

export function getAssistantConversationReply(
  request: AssistantConversationRequest,
  context: VerifiedAssistantContext | null,
  portalRoot: string | null,
): string {
  const opening = request.greeting ? `${request.greeting[0].toUpperCase()}${request.greeting.slice(1)}! ` : "";
  switch (request.intent) {
    case "greeting":
      return `${opening}How can I help you today?`;
    case "how_are_you":
      return `${opening}I’m doing well, thank you—and ready to help with SchoolBase. What would you like to do?`;
    case "acknowledgement":
      return `${opening}Okay. Let me know if you need anything else.`;
    case "thanks":
      return `${opening}You’re welcome. I’m here if you need anything else.`;
    case "welcome":
      return `${opening}Thank you. Let me know if there’s anything else I can help with.`;
    case "goodbye":
      return `${opening}Take care. I’ll be here when you need help with SchoolBase.`;
    case "apology":
      return `${opening}No worries. What would you like help with?`;
    case "anything_else":
      return `${opening}All right. I’ll be here if you need anything later.`;
    case "assistant_identity":
      return `${opening}I’m SchoolBase AI, an assistant built into SchoolBase. I’m not a person; I can help navigate the portal and answer supported questions from verified SchoolBase information.`;
    case "logout":
      return `${opening}I’ve highlighted the Sign out button in the left sidebar. Select it when you’re ready; I won’t sign you out automatically.`;
    case "help":
      return `${opening}${portalRoot === "/admin"
        ? "Of course. I can explain a page or help with supported student counts and rosters, admission-status summaries, recorded fee balances and collections, individual student fee history, and published timetable lookups. Attendance analytics and examination comparisons aren’t connected yet. What would you like to check?"
        : "Of course. I can explain a page, help find a section in your portal, or answer supported questions using verified SchoolBase information. What do you need help with?"}`;
    case "capabilities":
      return `${opening}${portalRoot === "/admin"
        ? "I can help you navigate and understand pages; check school-wide or class student counts and supported student and staff lists; summarize admission statuses; review recorded fee balances, collections, and an individual student’s fee history; and check the published timetable for today, now, or next when the school date and timezone are verified. For example, ask “How many active students are in Primary 4?”, “How many applications await review?”, or “What is the next scheduled lesson for Primary 5?” You can also ask me to prepare student form details for your review. I won’t submit forms, change records, or send an individual fee reminder without your confirmation. Attendance analytics, examination comparisons, school-calendar exceptions, and broad cross-module reports are not enabled here yet. A published timetable does not confirm that a person is free or account for cancellations, substitutions, or closures."
        : portalRoot === "/schoolbase-admin"
          ? "I can help you navigate and explain SchoolBase Admin pages and answer the verified, role-authorized questions available in this portal. School-level records and sensitive operational data are not included unless an approved capability explicitly provides them."
          : "I can help you navigate and explain the sections available in this portal and check your own published timetable where that feature is enabled. I can’t confirm free periods, closures, cancellations, or substitutions."}`;
    case "interesting":
      return `${opening}I don’t have an approved general-knowledge source connected yet, so I won’t make up a fact. I can help with verified SchoolBase information available in this portal.`;
    case "identity_name":
      return `${opening}${context?.name?.trim()
        ? `Your verified account name is ${context.name.trim()}.`
        : "I can’t verify your name from the current session information."}`;
    case "identity_role":
      return `${opening}${context?.role
        ? `Your verified SchoolBase role is ${formatRole(context.role)}.`
        : "I can’t verify your role from the current session information."}`;
    case "identity_school":
      return `${opening}${context?.schoolName?.trim()
        ? `Your current session is associated with ${context.schoolName.trim()}.`
        : "I can’t verify a school for your current session."}`;
    case "identity_portal": {
      const portalName = getPortalName(portalRoot);
      return `${opening}${portalName
        ? `You’re currently using the ${portalName}.`
        : "I can’t identify the current portal from this page."}`;
    }
    case "identity_permissions":
      return `${opening}${context?.role
        ? `I can verify that your role is ${formatRole(context.role)}, but I don’t have a verified summary of your individual permissions here, so I won’t guess.`
        : "I can’t verify your role or individual permissions from the current session information, so I won’t guess."}`;
    case "identity_summary": {
      if (!context?.name?.trim() && !context?.role) {
        return `${opening}I can’t verify your identity from the current session information.`;
      }
      const details = [
        context.name?.trim(),
        context.role ? `your role is ${formatRole(context.role)}` : null,
        context.schoolName?.trim() ? `your school is ${context.schoolName.trim()}` : null,
      ].filter((detail): detail is string => Boolean(detail));
      return `${opening}From your verified session, ${details.join(" and ")}.`;
    }
    case "current_time":
    case "current_date":
    case "current_day":
      return `${opening}${formatCurrentTime(request.intent, context)}`;
  }
}

function formatRole(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getPortalName(portalRoot: string | null): string | null {
  const portalNames: Record<string, string> = {
    "/admin": "School Admin workspace",
    "/accounting": "Accounting workspace",
    "/teacher": "Teacher workspace",
    "/staff": "Staff workspace",
    "/schoolbase-admin": "SchoolBase Admin portal",
    "/country-admin": "Country Admin portal",
  };
  return portalRoot ? portalNames[portalRoot] ?? null : null;
}

function formatCurrentTime(
  intent: "current_time" | "current_date" | "current_day",
  context: VerifiedAssistantContext | null,
): string {
  if (!context?.timezone || !context.serverNow || Number.isNaN(Date.parse(context.serverNow))) {
    return "I can’t give the school-local time or date because a verified school timezone or server time is unavailable.";
  }

  try {
    const instant = new Date(context.serverNow);
    const dayAndDate = new Intl.DateTimeFormat("en-GB", {
      timeZone: context.timezone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(instant);

    if (intent === "current_date") {
      return `Today is ${dayAndDate} (${context.timezone}).`;
    }
    if (intent === "current_day") {
      const weekday = new Intl.DateTimeFormat("en", {
        timeZone: context.timezone,
        weekday: "long",
      }).format(instant);
      return `Today is ${weekday} (${context.timezone}); the date is ${dayAndDate}.`;
    }

    const time = new Intl.DateTimeFormat("en", {
      timeZone: context.timezone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(instant);
    return `The current time is ${time} in ${context.timezone} (${dayAndDate}).`;
  } catch {
    return "I can’t give the school-local time or date because the school’s configured timezone is invalid.";
  }
}
