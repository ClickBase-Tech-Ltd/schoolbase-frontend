export type AssistantConversationIntent =
  | "greeting"
  | "how_are_you"
  | "acknowledgement"
  | "thanks"
  | "goodbye"
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
  ["acknowledgement", /^(?:ok|okay|alright|all right|got it|understood|sure|sounds good|that works|perfect)$/i],
  ["thanks", /^(?:thanks|thank you|thanks a lot|thank you very much|much appreciated|appreciate it)$/i],
  ["goodbye", /^(?:(?:ok(?:ay)?|alright|thanks|thank you)[,!\s]+)?(?:goodbye|bye|see you|talk to you later|see you later)(?:\s+(?:for now|later))?$/i],
  ["help", /^(?:can you help me|could you help me|i need help|help me)$/i],
  ["capabilities", /^(?:what can you do|how can you help|what can you help me with|show me around)$/i],
  ["interesting", /^(?:tell me something interesting|tell me an interesting fact)$/i],
  ["greeting", /^(?:hello|hi|hey|good morning|good afternoon|good evening)(?: there)?$/i],
];

const greetingPattern = /^(good morning|good afternoon|good evening|hello|hi|hey)\b[,.!:\s]+/i;

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
    case "goodbye":
      return `${opening}Take care. I’ll be here when you need help with SchoolBase.`;
    case "logout":
      return `${opening}I’ve highlighted the Sign out button in the left sidebar. Select it when you’re ready; I won’t sign you out automatically.`;
    case "help":
      return `${opening}Of course. I can explain a page, help find a section in your portal, or answer supported questions using verified SchoolBase information. What do you need help with?`;
    case "capabilities":
      return `${opening}${portalRoot === "/admin"
        ? "I can explain pages, find sections, guide supported workflows, answer the read-only SchoolBase questions enabled in this portal, and check published timetable assignments for today when dates and timezones are verified. I can’t confirm free periods, closures, cancellations, or substitutions, and open-ended general-knowledge answers are not enabled yet."
        : "I can explain pages, help find sections, and check your own published timetable assignments for today when dates and timezones are verified. I can’t confirm free periods, closures, cancellations, or substitutions."}`;
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
