import type { NavItem } from "@/components/shared-layout";
import type { TimetableQuestion } from "./timetable-intelligence";

export type AssistantDestination = {
  href: string;
  label: string;
  description?: string;
};

export type AssistantEngineResult = {
  message: string;
  destination?: AssistantDestination;
  startStudentRegistration?: boolean;
};

export type SchoolIntelligenceIntent =
  | "active_student_count"
  | "outstanding_summary"
  | "outstanding_students"
  | "payment_summary";

export function getTimetableQuestion(input: string): TimetableQuestion | null {
  const normalized = input.trim().replace(/\s+/g, " ");
  const asksAvailability = /\b(?:free|available)\b/i.test(normalized)
    && /\b(?:now|today|period|lesson|timetable|schedule)\b/i.test(normalized);
  if (asksAvailability) {
    return {
      intent: "availability",
      className: null,
      teacherName: null,
      subjectName: null,
      personal: false,
    };
  }
  const classMatch = normalized.match(
    /\b(?:class|for|in)\s+((?:nursery|kindergarten|reception|primary|basic|jss|sss|junior secondary|senior secondary)\s*\d*[a-z]?)\b/i,
  ) ?? normalized.match(
    /\b((?:nursery|kindergarten|reception|primary|basic|jss|sss|junior secondary|senior secondary)\s*\d+[a-z]?)\b/i,
  );
  const hasTimetableTarget = /\b(?:lesson|class|period|teaching|timetable|schedule)\b/i.test(normalized)
    || /\bteachers?\b.*\b(?:teach|teaches|teaching|take|taking|have|has)\b/i.test(normalized)
    || /\bwho\b.*\b(?:teach|teaching|take|taking)\b/i.test(normalized)
    || Boolean(classMatch);
  const asksCurrent = /\b(?:now|right now|currently|ongoing|in progress|happening)\b/i.test(normalized)
    && hasTimetableTarget;
  const asksNext = /\bnext\s+(?:lesson|class|period)\b/i.test(normalized);
  const asksToday = /\b(?:today|this morning|this afternoon)\b/i.test(normalized)
    && hasTimetableTarget;
  const personMatch = normalized.match(/\b(?:does|is)\s+(.+?)\s+(?:have|has|teach|teaching|take|taking)\b/i)
    ?? normalized.match(/\bwhat(?:'s| is)\s+(.+?)(?:'s)?\s+next\s+(?:lesson|class|period)\b/i)
    ?? normalized.match(/\bwhat classes is\s+(.+?)\s+teaching\b/i);
  const teacherName = personMatch?.[1]?.trim() ?? null;
  const subjectMatch = normalized.match(
    /\b(?:taking|teaching|teach|teaches)\s+(.+?)(?=\s+(?:for|in|with|today|this morning|this afternoon|now|right now|currently)\b|[?.!,]|$)/i,
  );
  const subjectName = subjectMatch?.[1]?.trim() ?? null;
  const isSelfReference = teacherName && /^(?:i|me|my|we|us|our)(?:\s+(?:class|teacher|lesson|timetable))?$/i.test(teacherName);
  const intent = asksCurrent ? "now" : asksNext ? "next" : asksToday ? "today" : null;
  if (!intent) return null;
  const personal = /\b(?:my|me|i|we|our)\b/i.test(normalized);
  return {
    intent,
    className: classMatch?.[1]?.trim() ?? null,
    teacherName: isSelfReference ? null : teacherName,
    subjectName,
    personal,
  };
}

export function isTimetablePlanningRequest(input: string): boolean {
  return /\b(?:create|make|build|generate|prepare|plan)\b.{0,30}\b(?:school\s+)?(?:time\s*table|schedule)\b/i.test(input)
    || /\b(?:time\s*table|schedule)\b.{0,30}\b(?:create|make|build|generate|prepare|plan)\b/i.test(input);
}

export function isReadOnlyAiEngineQuery(input: string): boolean {
  const asksStudentCount = /\b(?:students?|pupils?|learners?)\s+do we have\b/i.test(input);
  const asksSupportedData = /\b(?:students?|pupils?|learners?|enrolments?|enrollments?|schoolchildren|staff|employees?|teachers?|educators?|workforce|personnel|classes?|classrooms?|arms?|sections?|subjects?|courses?|curriculum|academic years?|school years?|academic sessions?|school (?:settings?|details?|profile|configuration|information))\b/i.test(input);
  const asksSupportedOperation = /\b(?:show|list|find|search|look up|retrieve|fetch|display|pull up|get(?: me)?|who|which|give me|provide|how many|head\s?count|count|number of|what is|what are|tell me)\b/i.test(input);
  return asksStudentCount || (asksSupportedData && asksSupportedOperation);
}

export function getSchoolIntelligenceIntent(input: string): {
  intent: SchoolIntelligenceIntent;
  className: string | null;
} | null {
  if (/\b(graduated|withdrawn|transferred|admitted|admission|male|female|gender|absent|attendance)\b/i.test(input)) {
    return null;
  }
  if (
    /\bhow much\s+(?:is|does|has)\s+.+?\s+(?:owe|owes|owing|paid|pay)\b/i.test(input)
    || /\bhas\s+.+?\s+paid\b/i.test(input)
    || /\bwhen did\s+.+?\s+(?:pay|make a payment)\b/i.test(input)
  ) {
    return null;
  }
  const className = extractClassName(input);

  const asksOutstanding = /\b(owing|owen|owes|owe|outstanding|unpaid|balance)\b/i.test(input)
    && /\b(fees?|parents?|students?|pupils?|learners?|how much|how many|show|find|list|who|which|tell|total|what is)\b/i.test(input);
  if (asksOutstanding) {
    const intent = /\b(show|find|list|who are|which students|names of|give me .*names)\b/i.test(input)
      ? "outstanding_students"
      : "outstanding_summary";
    return { intent, className };
  }

  if (
    /\b(collected|collection|collections)\b/i.test(input)
    && /\b(this term|current term)\b/i.test(input)
  ) return { intent: "payment_summary", className };

  const asksStudentCount = /\b(?:how many|many|number of|count of|count)\b/i.test(input)
    && /\b(students?|pupils?|learners?)\b/i.test(input)
    && /\b(?:do we have|we have|have we|are there|in|from|within|currently|active|registered|enrolled|enrol)\b/i.test(input);
  if (asksStudentCount) return { intent: "active_student_count", className };
  return null;
}

function extractClassName(input: string): string | null {
  const match = input.match(/\b(?:in|from|within)\s+(?:the\s+)?(?:class|phase|level)?\s*(.+?)(?=\s+\b(?:who|that|with|owing|owen|owe|owes|have|has|are|is)\b|\s*[?.!]*$)/i);
  const candidate = match?.[1]
    ?.replace(/^(?:the\s+)?(?:school|my school|this school|our school)$/i, "")
    .trim();
  return candidate || null;
}

export function isUnsupportedSchoolDataQuestion(input: string): boolean {
  return /\b(students?|pupils?|learners?|classes?|enrolment|enrollment|fees?|payment|collected|collection|collections|revenue|attendance|absent|present|staff|teachers?|results?|report cards?|admissions?|applications?)\b/i.test(input)
    && /\b(how many|number of|count|show|find|list|who|which|how much|collected|collection|collections|revenue|owing|owen|paid|graduated|withdrawn|transferred|male|female|gender|admitted|absent|present|attendance|average|highest|lowest|compare)\b/i.test(input);
}

export function getAdmissionsQuestion(
  input: string,
): "pending" | "pendingReview" | "awaitingFamily" | "approved" | "rejected" | "withdrawn" | "total" | null {
  if (
    /\b(today|yesterday|this week|last week|this month|last month|this term|last term|this year|last year|since|between|class|term|month|week|year)\b/i.test(input)
    || /\b(?:nursery|kindergarten|primary|basic|jss|sss|junior secondary|senior secondary)\s*\d*\b/i.test(input)
    || /\bin\s+20\d{2}\b/i.test(input)
  ) {
    return null;
  }
  const asksAdmissionCount = /\b(how many|number of|count(?: of)?|total)\b/i.test(input)
    && /\b(admissions?|applications?)\b/i.test(input);
  if (!asksAdmissionCount) return null;
  const explicitStatuses = [
    { question: "approved", pattern: /\bapproved\b/i },
    { question: "rejected", pattern: /\brejected\b/i },
    { question: "withdrawn", pattern: /\bwithdrawn\b/i },
  ] as const;
  const matchedStatuses = explicitStatuses.filter(({ pattern }) => pattern.test(input));
  if (matchedStatuses.length > 1) return null;

  const asksAwaitingFamily = /\b(?:await(?:ing)?|wait(?:ing)? for)\s+(?:(?:the\s+)?(?:family|parent)\s+)?(?:information|details|response)\b|\b(?:await(?:ing)?|wait(?:ing)? for|needs?|missing)\s+(?:the\s+)?(?:family|parent)\s+(?:information|details|response)\b|\b(?:family|parent)\s+(?:information|response)\s+(?:is\s+)?(?:needed|pending)\b/i.test(input);
  const asksPendingReview = /\b(?:pending|awaiting|waiting for)\s+(?:school|our|staff)?\s*review\b|\bnot yet reviewed\b|\bawaiting school action\b/i.test(input);
  const asksPending = /\b(pending|open|not yet (?:reviewed|decided))\b/i.test(input);
  if (matchedStatuses.length === 1 && (asksAwaitingFamily || asksPendingReview || asksPending)) return null;
  if (asksAwaitingFamily && asksPendingReview) return null;
  if (matchedStatuses.length === 1) return matchedStatuses[0].question;
  if (asksAwaitingFamily) return "awaitingFamily";
  if (asksPendingReview) return "pendingReview";
  if (asksPending) return "pending";

  return "total";
}

export type StudentIntakeField =
  | "firstName"
  | "middleName"
  | "lastName"
  | "gender"
  | "dateOfBirth"
  | "studentEmail"
  | "studentPhone"
  | "classId"
  | "admissionDate"
  | "address"
  | "guardianFirst"
  | "guardianLast"
  | "guardianRelationship"
  | "guardianPhone"
  | "guardianAltPhone"
  | "guardianEmail"
  | "guardianOccupation"
  | "previousSchool"
  | "previousClass";

const studentFieldAliases: Array<{ field: StudentIntakeField; aliases: string[] }> = [
  { field: "firstName", aliases: ["first name", "given name"] },
  { field: "middleName", aliases: ["middle name"] },
  { field: "lastName", aliases: ["surname", "last name", "family name"] },
  { field: "gender", aliases: ["gender", "sex"] },
  { field: "dateOfBirth", aliases: ["date of birth", "birth date", "born"] },
  { field: "studentEmail", aliases: ["student email"] },
  { field: "studentPhone", aliases: ["student phone", "student mobile"] },
  { field: "classId", aliases: ["class name", "class"] },
  { field: "admissionDate", aliases: ["admission date", "date of admission"] },
  { field: "address", aliases: ["home address", "address"] },
  { field: "guardianFirst", aliases: ["guardian first name", "parent first name"] },
  { field: "guardianLast", aliases: ["guardian last name", "guardian surname", "parent last name"] },
  { field: "guardianPhone", aliases: ["guardian phone", "parent phone", "guardian telephone"] },
  { field: "guardianAltPhone", aliases: ["alternative phone", "alternate phone", "secondary guardian phone"] },
  { field: "guardianEmail", aliases: ["guardian email", "parent email"] },
  { field: "guardianRelationship", aliases: ["guardian relationship", "relationship"] },
  { field: "guardianOccupation", aliases: ["guardian occupation", "parent occupation", "occupation"] },
  { field: "previousSchool", aliases: ["previous school"] },
  { field: "previousClass", aliases: ["previous class", "previous grade"] },
];

export function isStudentRegistrationRequest(input: string): boolean {
  const normalized = normalize(input);
  return (
    /\b(register|enrol|enroll|add|create)\s+(?:a|an)?\s*(?:new|another)?\s*(student|pupil|learner)\b/.test(normalized) ||
    /\b(student|pupil|learner)\s+(registration|enrolment|enrollment)\b/.test(normalized)
  );
}

export function isStudentFormAssistanceRequest(input: string): boolean {
  const normalized = normalize(input);
  return (
    normalized.includes("help me fill") ||
    normalized.includes("fill the form") ||
    normalized.includes("fill in the form") ||
    normalized.includes("help fill") ||
    normalized.includes("enter these details")
  );
}

export function getStudentFieldLabel(field: StudentIntakeField): string {
  const labels: Record<StudentIntakeField, string> = {
    firstName: "First name",
    middleName: "Middle name",
    lastName: "Surname",
    gender: "Gender",
    dateOfBirth: "Date of birth",
    studentEmail: "Student email",
    studentPhone: "Student phone",
    classId: "Class",
    admissionDate: "Admission date",
    address: "Address",
    guardianFirst: "Parent/guardian first name",
    guardianLast: "Parent/guardian surname",
    guardianRelationship: "Parent/guardian relationship",
    guardianPhone: "Parent/guardian phone",
    guardianAltPhone: "Alternative phone",
    guardianEmail: "Parent/guardian email",
    guardianOccupation: "Parent/guardian occupation",
    previousSchool: "Previous school",
    previousClass: "Previous class",
  };
  return labels[field];
}

export function parseStudentIntakeDetails(input: string): Partial<Record<StudentIntakeField, string>> {
  const normalizedInput = input.replace(/\s+/g, " ").trim();
  const aliases = studentFieldAliases
    .flatMap(({ field, aliases: fieldAliases }) =>
      fieldAliases.map((alias) => ({ field, alias })),
    )
    .sort((a, b) => b.alias.length - a.alias.length);
  const matches: Array<{ field: StudentIntakeField; start: number; end: number }> = [];
  const claimedRanges: Array<{ start: number; end: number }> = [];

  for (const { field, alias } of aliases) {
    const expression = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    for (const match of normalizedInput.matchAll(expression)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (claimedRanges.some((range) => start < range.end && end > range.start)) continue;
      claimedRanges.push({ start, end });
      matches.push({ field, start, end });
    }
  }

  matches.sort((a, b) => a.start - b.start);
  const values: Partial<Record<StudentIntakeField, string>> = {};
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const valueEnd = matches[index + 1]?.start ?? normalizedInput.length;
    let value = normalizedInput.slice(match.end, valueEnd);
    value = value
      .replace(/^\s*(?:is|as|on|to|:|=)\s*/i, "")
      .replace(/^[\s,;:.-]+|[\s,;.!?-]+$/g, "")
      .trim();
    if (!value) continue;

    if (match.field === "gender") {
      if (/^(female|girl|woman)$/i.test(value)) value = "Female";
      else if (/^(male|boy|man)$/i.test(value)) value = "Male";
      else continue;
    }

    if (match.field === "dateOfBirth" || match.field === "admissionDate") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) continue;
      const parsed = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) continue;
    }

    if (match.field === "studentEmail" || match.field === "guardianEmail") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) continue;
    }

    values[match.field] = value;
  }

  return values;
}

const pageKnowledge: Record<string, { aliases: string[]; description: string }> = {
  attendance: {
    aliases: ["attendance", "present", "absent", "late", "register attendance"],
    description: "Attendance pages help authorised staff record and review attendance. The exact controls depend on the page and your role.",
  },
  fees: {
    aliases: ["fees", "fee", "school fees", "tuition", "payment", "payments", "invoice", "invoices"],
    description: "Fee and payment pages help authorised users review charges and payment information. Verify the selected student and amount in SchoolBase before confirming any financial action.",
  },
  whatsapp: {
    aliases: ["whatsapp settings", "whatsapp", "pairing", "qr code"],
    description: "WhatsApp settings let an authorised school administrator pair the school’s linked device, send a test message, and review delivery limits, quiet hours, retries, and bulk-send approval. Review the recipient and message before sending.",
  },
  students: {
    aliases: ["students", "student", "pupils", "pupil", "admission", "admissions", "enrolment", "enrollment", "register a student"],
    description: "Student pages provide access to student records and related school workflows. Use the page controls to review or update a record; the assistant will not submit changes.",
  },
  staff: {
    aliases: ["staff", "teacher", "teachers", "employee", "employees", "personnel"],
    description: "Staff pages provide access to staff records and role-specific tools. Account roles determine system access, so review permissions carefully when managing staff.",
  },
  results: {
    aliases: ["results", "exams", "exam", "examination", "report card", "report cards", "grades"],
    description: "Results pages support examination and academic-result workflows. Published results may be visible to families, so review the selected class, period, and records before publishing.",
  },
  timetable: {
    aliases: ["timetable", "schedule", "schedules", "lesson plan"],
    description: "Timetable pages provide access to schedule information and related controls available to your role.",
  },
  support: {
    aliases: ["support", "help", "ticket", "tickets", "support request"],
    description: "Support pages provide access to the support requests or help tools available in this dashboard.",
  },
  schools: {
    aliases: ["schools", "school", "onboarding", "onboard a school"],
    description: "School administration pages provide access to school records and country-level onboarding tools available to your account.",
  },
  settings: {
    aliases: ["settings", "configure", "configuration", "preferences"],
    description: "Settings pages contain configuration options. Available options depend on your role and dashboard.",
  },
};

function flattenNavigation(items: NavItem[]): AssistantDestination[] {
  const destinations: AssistantDestination[] = [];
  const visit = (item: NavItem) => {
    destinations.push({ href: item.href, label: item.label });
    item.children?.forEach(visit);
  };
  items.forEach(visit);
  return destinations;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9/ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPageKnowledge(destination: AssistantDestination): string | undefined {
  const text = normalize(`${destination.label} ${destination.href}`);
  const matchingEntry = Object.values(pageKnowledge).find((entry) =>
    entry.aliases.some((alias) => text.includes(normalize(alias))),
  );
  return matchingEntry?.description;
}

function findDestination(
  input: string,
  destinations: AssistantDestination[],
): AssistantDestination | undefined {
  const normalizedInput = normalize(input);
  const directMatch = destinations
    .filter((item) => normalizedInput.includes(normalize(item.label)))
    .sort((a, b) => b.label.length - a.label.length)[0];
  if (directMatch) return directMatch;

  const aliases = Object.entries(pageKnowledge)
    .flatMap(([key, entry]) => entry.aliases.map((alias) => ({ key, alias: normalize(alias) })))
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const { key, alias } of aliases) {
    if (!normalizedInput.includes(alias)) continue;
    const destination = destinations
      .filter((item) => normalize(`${item.label} ${item.href}`).includes(key))
      .sort((a, b) => a.href.length - b.href.length)[0];
    if (destination) return destination;
  }

  const words = normalizedInput.split(" ").filter((word) => word.length > 2);
  const ranked = destinations
    .map((item) => {
      const target = normalize(item.label);
      const score = words.reduce((total, word) => total + (target.includes(word) ? word.length : 0), 0);
      return { item, score };
    })
    .filter((candidate) => candidate.score >= 4)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.item;
}

export function resolveAssistantRequest(
  input: string,
  navItems: NavItem[],
  pathname: string,
): AssistantEngineResult {
  const normalizedInput = normalize(input);
  const destinations = flattenNavigation(navItems);
  const currentPage = [...destinations]
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!normalizedInput) {
    return { message: "Type a question or use the microphone to ask me to explain this page or find a dashboard section." };
  }

  if (
    normalizedInput.includes("what can you do") ||
    normalizedInput.includes("how can you help") ||
    normalizedInput.includes("show me around")
  ) {
    const available = destinations.slice(0, 6).map((item) => item.label).join(", ");
    return {
      message: `I can explain supported SchoolBase sections, find pages in this dashboard, and guide you through supported workflows. For school accounting users, I can also look up a student’s fees and payment history, and send an individual fee reminder only after you confirm. I can’t record payments or issue invoices. I can currently see: ${available || "the pages registered for this dashboard"}.`,
    };
  }

  if (isTimetablePlanningRequest(input)) {
    const timetable = destinations.find((item) => item.href === "/admin/timetable");
    if (timetable && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
      return {
        message: "I’ll open the school timetable planner. It will ask you for weekly lesson counts, use the school’s recorded teaching assignments, and prepare a conflict-checked draft for your review. It won’t publish the timetable.",
        destination: { href: "/admin/timetable", label: timetable.label },
      };
    }
  }

  if (isStudentRegistrationRequest(input)) {
    const studentList = destinations.find((item) => item.href === "/admin/students");
    if (studentList && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
      return {
        message: "I’ll open student registration. Once the form is ready, ask me to help fill it in. I’ll prepare the details for your review and leave the final submission to you.",
        destination: { href: "/admin/students/new", label: "New student registration" },
        startStudentRegistration: true,
      };
    }
  }

  if (
    normalizedInput.includes("explain this page") ||
    normalizedInput.includes("what is this page") ||
    normalizedInput.includes("what does this page") ||
    normalizedInput.includes("what can i do here") ||
    normalizedInput.includes("help me understand this page")
  ) {
    if (!currentPage) {
      return { message: "I can’t identify this page in the current dashboard navigation yet, so I don’t want to guess. You can ask me to open one of the sections listed in the sidebar." };
    }
    const description = getPageKnowledge(currentPage);
    return {
      message: description
        ? `You’re on ${currentPage.label}. ${description}`
        : `You’re on ${currentPage.label}. I can confirm this section is available in your dashboard, but I don’t yet have verified page-specific instructions for it. I can help you find another registered section.`,
    };
  }

  const destination = findDestination(normalizedInput, destinations);
  if (destination) {
    if (pathname === destination.href) {
      return {
        message: `You’re already on ${destination.label}. ${getPageKnowledge(destination) ?? "I can confirm this page is in your dashboard, but I don’t have verified detailed instructions for it yet."}`,
      };
    }
    return {
      message: `I found ${destination.label}. Opening it now.`,
      destination,
    };
  }

  return {
    message: "I don’t have verified instructions for that request yet. I can explain a supported page or help find a section that appears in this dashboard.",
  };
}

export function getAssistantPortalRoot(logoHref: string): string | null {
  const firstSegment = logoHref.split("/").filter(Boolean)[0];
  return firstSegment ? `/${firstSegment}` : null;
}

export function getAssistantDestinations(
  navItems: NavItem[],
): AssistantDestination[] {
  return flattenNavigation(navItems)
    .filter((item) => item.href.startsWith("/") && !item.href.startsWith("//"))
    .filter((item, index, list) => list.findIndex((candidate) => candidate.href === item.href) === index);
}
