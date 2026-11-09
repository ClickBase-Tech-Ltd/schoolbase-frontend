"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AudioLines, Bot, Compass, Eraser, LoaderCircle, MessageSquareText, Mic, MicOff, Send, Volume2, VolumeX, X } from "lucide-react";
import { formatMoney } from "@/lib/format";
import {
  getAssistantConversationReply,
  getAssistantConversationRequest,
  type VerifiedAssistantContext,
} from "./assistant-conversation";
import {
  getTimetableQuestion,
  getAssistantDestinations,
  getAssistantPortalRoot,
  getAdmissionsQuestion,
  getSchoolIntelligenceIntent,
  isReadOnlyAiEngineQuery,
  isTimetablePlanningRequest,
  getStudentFieldLabel,
  isUnsupportedSchoolDataQuestion,
  isStudentFormAssistanceRequest,
  parseStudentIntakeDetails,
  resolveAssistantRequest,
  type AssistantDestination,
  type SchoolIntelligenceIntent,
  type StudentIntakeField,
} from "./assistant-engine";
import type { TimetableQuestion } from "./timetable-intelligence";
import type { NavItem } from "@/components/shared-layout";

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

type StudentIntakeDraft = Partial<Record<StudentIntakeField, string>>;

type FeeAssistantInvoice = {
  id: string;
  invoiceNo: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: string;
  dueDate: string | null;
  feeSchedule: { name: string; term: { name: string; academicYear: { name: string } } | null };
};

type FeeAssistantStudent = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string | null;
  class: { name: string; arm: string | null } | null;
};

type FeeAssistantLookup =
  | { kind: "not_found" }
  | { kind: "matches"; students: FeeAssistantStudent[]; hasMore: boolean }
  | {
      kind: "student";
      student: FeeAssistantStudent;
      currency: string;
      totalDue: number;
      totalPaid: number;
      totalBalance: number;
      hasMoreInvoices: boolean;
      invoices: FeeAssistantInvoice[];
      paymentHistory: Array<{
        id: string;
        amount: number;
        method: string;
        paidAt: string;
        invoice: { invoiceNo: string; feeSchedule: { name: string; term: { name: string; academicYear: { name: string } } | null } } | null;
      }>;
      hasMorePayments: boolean;
    };

type OutstandingFeesResult = {
  currency: string;
  period: null;
  className: string | null;
  totalOutstanding: number;
  studentsWithInvoices: number;
  studentsOwing: number;
  studentsPartiallyPaid: number;
  studentsWithNoRecordedPayment: number;
  studentsFullyPaid: number;
  students: Array<FeeAssistantStudent & { balance: number; amountPaid: number }>;
  hasMoreStudents: boolean;
};

type SchoolIntelligenceResult =
  | { kind: "active_student_count"; count: number; className: string | null; scope: string }
  | {
      kind: "payment_summary";
      currency: string;
      period: { academicYear: string; term: string };
      className: string | null;
      totalCollected: number;
      paymentCount: number;
      recentPayments: Array<{
        id: string;
        amount: number;
        method: string;
        paidAt: string;
        invoice: { invoiceNo: string; pupil: { firstName: string; lastName: string } } | null;
      }>;
    }
  | (OutstandingFeesResult & { kind: "outstanding_summary" })
  | (OutstandingFeesResult & { kind: "outstanding_students" });
type ClassResolutionResult = {
  kind: "class_not_found" | "class_match_required";
  requestedClass: string;
  availableClasses: string[];
};

type AdmissionSummaryResult = {
  kind: "admission_summary";
  total: number;
  pendingReview: number;
  awaitingFamily: number;
  openTotal: number;
  approved: number;
  rejected: number;
  withdrawn: number;
};

type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

function extractStudentFeeSearch(input: string): string | null {
  const patterns = [
    /\bhow much\s+(?:is|does|has)\s+(.+?)\s+(?:owe|owes|owing|paid|pay)\b/i,
    /\bhow much did\s+(.+?)\s+pay\b/i,
    /\bhow much\s+(.+?)\s+(?:owe|owes|owing|paid|pay)\b/i,
    /\bhas\s+(.+?)\s+paid\b/i,
    /\bwhen did\s+(.+?)\s+(?:pay|make a payment)\b/i,
    /\b(?:is|does)\s+(.+?)\s+(?:owe|owes|owing)\b/i,
    /\b(?:send|prepare)\s+(?:a\s+)?reminder\s+(?:for|to)\s+(.+)/i,
    /\bremind\s+(.+)/i,
    /\b(?:fees?|payment history|payments?|balance)\s+(?:for|of)\s+(.+)/i,
    /\b(?:check|show|tell me)\s+(?:the\s+)?(?:fees?|balance|payments?)\s+(?:for\s+)?(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (!match?.[1]) continue;
    const candidate = match[1]
      .replace(/\b(?:student|school|fees?|tuition|payment|please|today)\b\s*$/i, "")
      .replace(/[?!.,;]+$/g, "")
      .trim();
    if (candidate.length >= 2 && !/^(?:the student|a student|this student)$/i.test(candidate)) return candidate;
  }
  return null;
}

function isStudentFeeQuestion(input: string): boolean {
  return /\b(fees?|tuition|owe|owes|owing|outstanding|paid|pay|payment history|payments?|balance|reminder)\b/i.test(input)
    && /\b(how much|owe|owes|owing|outstanding|paid|when did|has .+ paid|check|show|tell me|what is|balance|fees? for|remind|send .*reminder|prepare .*reminder)\b/i.test(input);
}

function isExplicitStudentFeeLookup(input: string): boolean {
  return [
    /\bhow much\s+(?:is|does|has)\s+.+?\s+(?:owe|owes|owing|paid|pay)\b/i,
    /\bhow much did\s+.+?\s+pay\b/i,
    /\bhas\s+.+?\s+paid\b/i,
    /\bwhen did\s+.+?\s+(?:pay|make a payment)\b/i,
    /\b(?:fees?|payment history|payments?|balance)\s+(?:for|of)\s+.+/i,
    /\b(?:check|show|tell me)\s+(?:the\s+)?(?:fees?|balance|payments?)\s+for\s+.+/i,
  ].some((pattern) => pattern.test(input));
}

function setFormControlValue(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string): void {
  if (control instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  if (control instanceof HTMLSelectElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setter?.call(control, value);
    control.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(control, value);
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function findNavigationTarget(href: string): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("[data-assistant-target]"))
    .filter((element) => element.dataset.assistantTarget === href && isVisible(element));
  const inViewport = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
  };
  const visibleTarget = candidates.find(inViewport);
  if (visibleTarget) return visibleTarget;
  const scrollableTarget = candidates[0];
  if (!scrollableTarget) return null;
  scrollableTarget.scrollIntoView({ block: "nearest", behavior: "auto" });
  return inViewport(scrollableTarget) ? scrollableTarget : null;
}

export default function SchoolBaseAssistant({
  navItems,
  logoHref,
  userId,
}: {
  navItems: NavItem[];
  logoHref: string;
  userId?: string;
  userName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const portalRoot = getAssistantPortalRoot(logoHref);
  const destinations = useMemo(
    () => (portalRoot ? getAssistantDestinations(navItems) : []),
    [navItems, portalRoot],
  );
  const [assistantMode, setAssistantMode] = useState<"voice" | "text" | null>(null);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voicePaused, setVoicePaused] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [pendingNavigation, setPendingNavigation] = useState<AssistantDestination | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [studentFillMode, setStudentFillMode] = useState(false);
  const [studentDraft, setStudentDraft] = useState<StudentIntakeDraft | null>(null);
  const [feeLookup, setFeeLookup] = useState<FeeAssistantLookup | null>(null);
  const [schoolIntelligence, setSchoolIntelligence] = useState<SchoolIntelligenceResult | null>(null);
  const [admissionSummary, setAdmissionSummary] = useState<AdmissionSummaryResult | null>(null);
  const [showIntelligenceStudents, setShowIntelligenceStudents] = useState(false);
  const [isLookingUpFees, setIsLookingUpFees] = useState(false);
  const [pendingFeeReminder, setPendingFeeReminder] = useState<FeeAssistantInvoice | null>(null);
  const [isSendingFeeReminder, setIsSendingFeeReminder] = useState(false);
  const messageId = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldListenRef = useRef(false);
  const recognitionStartingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const launcherRef = useRef<HTMLDivElement | null>(null);
  const voiceButtonRef = useRef<HTMLButtonElement | null>(null);
  const voiceStartButtonRef = useRef<HTMLButtonElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startListeningRef = useRef<() => void>(() => undefined);
  const sendMessageRef = useRef<(text: string) => void>(() => undefined);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedHrefRef = useRef<string | null>(null);
  const highlightedElementRef = useRef<HTMLElement | null>(null);
  const pendingStudentRegistrationRef = useRef(false);
  const aiContextTokenRef = useRef<string | null>(null);
  const voicePreferenceKey = portalRoot && userId
    ? `schoolbase-assistant-voice:${portalRoot}:${userId}`
    : null;

  const addMessage = useCallback((role: Message["role"], text: string) => {
    messageId.current += 1;
    setMessages((current) => [...current, { id: messageId.current, role, text }]);
    if (role === "assistant") {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  const promptForStudentDetails = useCallback(() => {
    setStudentFillMode(true);
    addMessage(
      "assistant",
      "I can prepare the student registration form for you. Tell me the details using field names, for example: first name Ama, surname Mensah, gender female, date of birth 2015-03-05, class Basic 4, guardian phone +233.... You can include only the details you want to enter. I’ll show you a review first, and I will not submit the form.",
    );
  }, [addMessage]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const closeAssistant = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
    recognitionRef.current?.stop();
    setIsListening(false);
    setVoicePaused(false);
    stopSpeaking();
    setAssistantMode(null);
    setIsModeMenuOpen(false);
    window.requestAnimationFrame(() => launcherRef.current?.querySelector("button")?.focus());
  }, [stopSpeaking]);

  const switchToText = useCallback(() => {
    if (shouldListenRef.current) {
      shouldListenRef.current = false;
      if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoicePaused(true);
    }
    stopSpeaking();
    setAssistantMode("text");
  }, [stopSpeaking]);

  const switchToVoice = useCallback(() => {
    if (shouldListenRef.current) {
      shouldListenRef.current = false;
      if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    setAssistantMode("voice");
    setVoiceError("");
    setVoicePaused(false);
  }, []);

  const startListening = useCallback(() => {
    if (!shouldListenRef.current || recognitionStartingRef.current || isSpeakingRef.current) return;
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      shouldListenRef.current = false;
      setIsListening(false);
      setVoiceError("Voice input isn’t available in this browser. Switch to Text to continue.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = navigator.language || "en";
    recognition.interimResults = false;
    recognition.continuous = assistantMode === "voice" && continuousMode;
    recognition.onresult = (event) => {
      if (isSpeakingRef.current) return;
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        if (assistantMode !== "voice" || !continuousMode) shouldListenRef.current = false;
        isProcessingRef.current = true;
        setIsProcessing(true);
        recognition.stop();
        setIsListening(false);
        sendMessageRef.current(transcript);
      }
    };
    recognition.onerror = (event) => {
      recognitionStartingRef.current = false;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldListenRef.current = false;
        setIsListening(false);
        setVoiceError("Microphone access was denied. Allow microphone access in your browser settings, or switch to Text.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        shouldListenRef.current = false;
        setIsListening(false);
        setVoiceError("Voice input stopped unexpectedly. Try the microphone again or switch to Text.");
      }
    };
    recognition.onend = () => {
      recognitionStartingRef.current = false;
      if (!shouldListenRef.current || isSpeakingRef.current || isProcessingRef.current) return;
      if (!continuousMode || assistantMode !== "voice") {
        shouldListenRef.current = false;
        setIsListening(false);
        setStatusMessage("I didn’t catch that. Select the microphone to try again, or switch to Text.");
        return;
      }
      if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
      recognitionRestartTimerRef.current = setTimeout(() => startListeningRef.current(), 450);
    };

    recognitionRef.current = recognition;
    recognitionStartingRef.current = true;
    try {
      recognition.start();
      setIsListening(true);
      setVoiceError("");
      setStatusMessage("Listening. Select the microphone again to pause.");
    } catch {
      recognitionStartingRef.current = false;
      shouldListenRef.current = false;
      setIsListening(false);
      setVoiceError("Voice input couldn’t start. Check microphone permission and try again, or switch to Text.");
    }
  }, [assistantMode, continuousMode]);
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || assistantMode !== "voice" || typeof window === "undefined") {
      if (shouldListenRef.current && assistantMode === "voice" && continuousMode && !voiceEnabled) {
        startListeningRef.current();
      }
      return;
    }
    if (!("speechSynthesis" in window)) {
      setVoiceError("Spoken replies aren’t supported by this browser. Your answer is available in Text mode.");
      if (shouldListenRef.current && continuousMode) startListeningRef.current();
      return;
    }
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-NG";
    utterance.rate = 1;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((voice) => voice.lang.toLowerCase() === "en-ng")
      ?? voices.find((voice) => /^en-(gh|ke|za|ug|tz|rw|sl)\b/i.test(voice.lang))
      ?? voices.find((voice) => /^en\b/i.test(voice.lang));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    }
    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      if (shouldListenRef.current) startListeningRef.current();
    };
    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setVoiceError("Speech playback failed. You can still read the response in Text mode.");
      if (shouldListenRef.current) startListeningRef.current();
    };
    window.speechSynthesis.speak(utterance);
  }, [assistantMode, continuousMode, voiceEnabled]);

  const answerConversationQuestion = useCallback(async (
    request: NonNullable<ReturnType<typeof getAssistantConversationRequest>>,
  ) => {
    if (
      request.intent === "greeting"
      || request.intent === "how_are_you"
      || request.intent === "acknowledgement"
      || request.intent === "thanks"
      || request.intent === "goodbye"
      || request.intent === "logout"
      || request.intent === "help"
      || request.intent === "capabilities"
      || request.intent === "interesting"
      || request.intent === "identity_portal"
    ) {
      let reply = getAssistantConversationReply(request, null, portalRoot);
      if (request.intent === "logout") {
        const logoutControl = findNavigationTarget("/logout");
        if (logoutControl) {
          highlightedHrefRef.current = "/logout";
          highlightedElementRef.current = logoutControl;
          setHighlightRect(logoutControl.getBoundingClientRect());
          setStatusMessage("The Sign out button in the left sidebar is highlighted.");
          if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = setTimeout(() => {
            highlightedHrefRef.current = null;
            highlightedElementRef.current = null;
            setHighlightRect(null);
          }, 6500);
        } else {
          reply = "I can’t see the Sign out button in the current layout. Open the left sidebar and select Sign out when you’re ready. I won’t sign you out automatically.";
          setStatusMessage("");
        }
      }
      addMessage("assistant", reply);
      speak(reply);
      return;
    }

    try {
      const response = await fetch("/api/assistant/context", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json() as VerifiedAssistantContext & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Verified account information is temporarily unavailable.");
      }
      const reply = getAssistantConversationReply(request, data, portalRoot);
      addMessage("assistant", reply);
      speak(reply);
    } catch (error) {
      console.error("Assistant could not retrieve verified conversation context:", error);
      const reply = error instanceof Error
        ? error.message
        : "Verified account information is temporarily unavailable.";
      addMessage("assistant", reply);
      speak(reply);
    }
  }, [addMessage, portalRoot, speak]);

  const queryTimetable = useCallback(async (question: TimetableQuestion) => {
    const params = new URLSearchParams({ intent: question.intent });
    if (question.className) params.set("className", question.className);
    if (question.teacherName) params.set("teacherName", question.teacherName);
    if (question.subjectName) params.set("subjectName", question.subjectName);
    if (question.personal) params.set("personal", "true");

    try {
      const response = await fetch(`/api/assistant/timetable?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json() as { reply?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "The published timetable could not be checked.");
      }
      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("The timetable service returned an unexpected answer.");
      }
      addMessage("assistant", data.reply);
      speak(data.reply);
    } catch (error) {
      console.error("Assistant timetable query failed:", error);
      const reply = error instanceof Error
        ? error.message
        : "The published timetable could not be checked. Please try again.";
      addMessage("assistant", reply);
      speak(reply);
    }
  }, [addMessage, speak]);

  const lookupStudentFees = useCallback(async (search: string) => {
    setIsLookingUpFees(true);
    setFeeLookup(null);
    setSchoolIntelligence(null);
    setAdmissionSummary(null);
    setShowIntelligenceStudents(false);
    setPendingFeeReminder(null);
    try {
      const response = await fetch(`/api/admin/fees/assistant/lookup?search=${encodeURIComponent(search)}`, {
        credentials: "include",
      });
      const data = await response.json() as FeeAssistantLookup & { error?: string };
      if (!response.ok) {
        throw new Error(response.status === 403
          ? "Your account does not have school accounting access, so I can’t view fee records."
          : data.error || "I couldn’t retrieve the fee record. Please try again or open the Fees page.");
      }
      if (!data || !["not_found", "matches", "student"].includes(data.kind)) {
        throw new Error("The fee lookup returned an unexpected response. Please open the Fees page or try again.");
      }

      if (data.kind === "not_found") {
        const reply = `I couldn’t find an active student matching “${search}” in this school. Check the spelling or use the student’s admission number.`;
        addMessage("assistant", reply);
        speak(reply);
        return;
      }

      if (data.kind === "matches") {
        const candidates = data.students.map((student) => {
          const classLabel = student.class?.name ? ` — ${student.class.name}${student.class.arm ? ` ${student.class.arm}` : ""}` : "";
          const admissionLabel = student.admissionNo ? ` (admission ${student.admissionNo})` : "";
          return `${student.firstName} ${student.lastName}${classLabel}${admissionLabel}`;
        });
        const reply = `I found more than one student matching “${search}”. Please ask again with the student’s full name or admission number: ${candidates.join("; ")}${data.hasMore ? "; there are additional matches, so use an admission number to narrow the search." : "."}`;
        setFeeLookup(data);
        addMessage("assistant", reply);
        speak(reply);
        return;
      }

      setFeeLookup(data);
      const studentName = `${data.student.firstName} ${data.student.lastName}`;
      const classLabel = data.student.class?.name
        ? `, ${data.student.class.name}${data.student.class.arm ? ` ${data.student.class.arm}` : ""}`
        : "";
      const recentPayments = data.paymentHistory.slice(0, 3).map((payment) => {
        const date = new Date(payment.paidAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
        return `${formatMoney(payment.amount, data.currency)} on ${date} (${payment.invoice?.invoiceNo || "invoice"})`;
      });
      const paymentLine = recentPayments.length
        ? ` Recent recorded payments: ${recentPayments.join("; ")}.`
        : data.totalPaid > 0
          ? " The invoice records show payments, but no linked payment dates were returned."
          : " No payment records were found for the student’s active invoices.";
      const paymentStatus = data.totalDue <= 0
        ? "No issued fees were found."
        : data.totalBalance <= 0
          ? "Status: paid in full."
          : data.totalPaid > 0
            ? "Status: part-paid."
            : "Status: no payment recorded.";
      const reply = `${studentName}${classLabel}: ${paymentStatus} Fees issued ${formatMoney(data.totalDue, data.currency)}, recorded as paid ${formatMoney(data.totalPaid, data.currency)}, balance owing ${formatMoney(data.totalBalance, data.currency)}.${paymentLine}${data.hasMorePayments ? " I’m showing the 25 most recent payment records." : ""}`;
      addMessage("assistant", reply);
      speak(reply);
    } catch (error) {
      const reply = error instanceof Error ? error.message : "I couldn’t retrieve the fee record. Please try again.";
      console.error("Assistant fee lookup failed:", error);
      addMessage("assistant", reply);
      speak(reply);
    } finally {
      setIsLookingUpFees(false);
    }
  }, [addMessage, speak]);

  const querySchoolIntelligence = useCallback(async (
    intent: SchoolIntelligenceIntent,
    className: string | null,
  ) => {
    setIsLookingUpFees(true);
    setFeeLookup(null);
    setSchoolIntelligence(null);
    setAdmissionSummary(null);
    setShowIntelligenceStudents(intent === "outstanding_students");
    setPendingFeeReminder(null);
    try {
      const params = new URLSearchParams({ intent });
      if (className) params.set("className", className);
      const response = await fetch(`/api/admin/fees/assistant/query?${params.toString()}`, { credentials: "include" });
      const result = await response.json() as (SchoolIntelligenceResult | ClassResolutionResult) & { error?: string };
      if (!response.ok) {
        throw new Error(response.status === 403
          ? "Your account does not have permission to access this school information."
          : result.error || "I couldn’t retrieve that school information. Please try again.");
      }
      if ("requestedClass" in result) {
        const classResult = result;
        const examples = classResult.availableClasses.length
          ? ` Classes in this school include: ${classResult.availableClasses.join(", ")}.`
          : "";
        const reply = classResult.kind === "class_match_required"
          ? `I found more than one class matching “${classResult.requestedClass}”. Please specify one: ${examples}`
          : `I couldn’t match “${classResult.requestedClass}” to a class or phase in this school, so I haven’t treated it as zero students.${examples}`;
        addMessage("assistant", reply);
        speak(reply);
        return;
      }
      if (
        result.kind !== "active_student_count"
        && result.kind !== "outstanding_summary"
        && result.kind !== "outstanding_students"
        && result.kind !== "payment_summary"
      ) {
        throw new Error("The school-data query returned an unexpected response. Please try again.");
      }

      setSchoolIntelligence(result);
      if (result.kind === "active_student_count") {
        const scope = result.className ? ` in ${result.className}` : " in your school";
        const reply = `There ${result.count === 1 ? "is" : "are"} ${result.count} active student${result.count === 1 ? "" : "s"}${scope}, based on SchoolBase’s active enrolment records.`;
        addMessage("assistant", reply);
        speak(reply);
        return;
      }

      const period = result.period ? `${result.period.term}, ${result.period.academicYear}` : "across all terms";
      const scope = result.className ? ` for ${result.className}` : "";
      if (result.kind === "payment_summary") {
        const reply = `For ${period}${scope}, SchoolBase records ${formatMoney(result.totalCollected, result.currency)} collected across ${result.paymentCount} linked payment transaction${result.paymentCount === 1 ? "" : "s"}.`;
        addMessage("assistant", reply);
        speak(reply);
        return;
      }

      const studentListNote = result.kind === "outstanding_students"
        ? ` I’ve shown up to ${Math.min(result.students.length, 100)} students with balances below.`
        : "";
      const reply = `The recorded outstanding balance${scope} ${period} is ${formatMoney(result.totalOutstanding, result.currency)} across ${result.studentsOwing} student${result.studentsOwing === 1 ? "" : "s"} with balances. ${result.studentsPartiallyPaid} student${result.studentsPartiallyPaid === 1 ? " has" : "s have"} made a partial payment and ${result.studentsWithNoRecordedPayment} have no recorded payment. ${result.studentsFullyPaid} billed student${result.studentsFullyPaid === 1 ? " is" : "s are"} fully paid.${studentListNote}`;
      addMessage("assistant", reply);
      speak(reply);
    } catch (error) {
      const reply = error instanceof Error ? error.message : "I couldn’t retrieve that school information.";
      console.error("Assistant school intelligence query failed:", error);
      addMessage("assistant", reply);
      speak(reply);
    } finally {
      setIsLookingUpFees(false);
    }
  }, [addMessage, speak]);

  const queryReadOnlyAiEngine = useCallback(async (question: string): Promise<void> => {
    const isFollowup = /^(?:show|list|find|display)\s+(?:me\s+)?(?:them|those students|those pupils|those learners|the same students|the same pupils|those staff|those employees|those teachers|the same staff|the same employees|the same teachers)[?.!]*$/i.test(question);
    if (!isFollowup) aiContextTokenRef.current = null;
    setIsLookingUpFees(true);
    try {
      const response = await fetch('/api/ai/query/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          ...(aiContextTokenRef.current ? { contextToken: aiContextTokenRef.current } : {}),
        }),
      });

      const payload = await response.json() as {
        ok?: boolean;
        error?: string;
        contextToken?: string;
        result?: { model: string; action: 'count' | 'list'; matched: number; filters: Record<string, unknown>; data: { count?: number; items?: Array<Record<string, unknown>>; total?: number; limit?: number } };
      };

      if (response.status === 422) {
        aiContextTokenRef.current = null;
        const reply = "I can’t safely resolve that query with the currently enabled data capabilities, so I haven’t treated it as zero results. Please ask about student, staff, class, subject, or academic-year records using a direct count or list request.";
        addMessage('assistant', reply);
        speak(reply);
        return;
      }
      if (!response.ok || !payload.ok || !payload.result || !payload.contextToken) {
        aiContextTokenRef.current = null;
        const reply = payload.error
          || (response.status === 503
            ? "Read-only data queries are not enabled for this environment yet. I haven’t queried or changed any records."
            : "I couldn’t complete the read-only SchoolBase data query.");
        addMessage('assistant', reply);
        speak(reply);
        return;
      }

      aiContextTokenRef.current = payload.contextToken;
      const { result } = payload;
      if (result.action === 'count') {
        const count = result.data.count ?? result.matched;
        const studentStatus = result.filters.isActive === false ? 'inactive' : 'active';
        const label = result.model === 'pupil' ? `${studentStatus} student records`
          : result.model === 'employeeProfile' ? 'matching linked employee profiles'
          : result.model === 'class' ? 'classes'
            : result.model === 'subject' ? 'subjects'
              : result.model === 'academicYear' ? 'academic years'
                : 'school profiles';
        const reply = `SchoolBase found ${count.toLocaleString()} ${label} in your school.`;
        addMessage('assistant', reply);
        speak(reply);
        return;
      }

      const items = result.data.items ?? [];
      const labels = items.map((item) => {
        if (result.model === 'pupil') {
          return [item.firstName, item.lastName, item.admissionNo ? `(${item.admissionNo})` : null]
            .filter((value) => typeof value === 'string' && value.length > 0)
            .join(' ');
        }
        if (result.model === 'employeeProfile') {
          const name = [item.firstName, item.lastName]
            .filter((value) => typeof value === 'string' && value.length > 0)
            .join(' ');
          const details = [item.jobTitle, item.department, item.employmentStatus]
            .filter((value) => typeof value === 'string' && value.length > 0)
            .join(' · ');
          return [name, details].filter(Boolean).join(' — ');
        }
        return [item.name, item.phase, item.arm, item.code, item.isCurrent === true ? '(current)' : null]
          .filter((value) => typeof value === 'string' && value.length > 0)
          .join(' · ');
      }).filter(Boolean);
      const total = result.data.total ?? result.matched;
      const studentStatus = result.filters.isActive === false ? 'inactive' : 'active';
      const label = result.model === 'pupil' ? `${studentStatus} students`
        : result.model === 'employeeProfile' ? 'linked staff profiles'
        : result.model === 'class' ? 'classes'
          : result.model === 'subject' ? 'subjects'
            : result.model === 'academicYear' ? 'academic years'
              : 'school profiles';
      const reply = total === 0
        ? `There are no matching ${label} for that query.${result.model === 'employeeProfile' ? ' This directory does not include staff accounts without a linked employee profile.' : ''}`
        : labels.length
          ? `Showing ${labels.length} of ${total} matching ${label}: ${labels.join('; ')}${total > labels.length ? ` (limited to ${labels.length} records; further pages are not available yet).${result.model === 'employeeProfile' ? ' This directory does not include staff accounts without a linked employee profile.' : ''}` : result.model === 'employeeProfile' ? '. This directory does not include staff accounts without a linked employee profile.' : '.'}`
          : `SchoolBase found ${total} matching ${label}, but no displayable names were returned.`;
      addMessage('assistant', reply);
      speak(reply);
    } catch (error) {
      aiContextTokenRef.current = null;
      console.error('Assistant read-only AI query failed:', error);
      const reply = 'I couldn’t reach the read-only data query service. No changes were made.';
      addMessage('assistant', reply);
      speak(reply);
    } finally {
      setIsLookingUpFees(false);
    }
  }, [addMessage, speak]);

  const queryAdmissionsSummary = useCallback(async (question: NonNullable<ReturnType<typeof getAdmissionsQuestion>>) => {
    setIsLookingUpFees(true);
    setFeeLookup(null);
    setSchoolIntelligence(null);
    setAdmissionSummary(null);
    setShowIntelligenceStudents(false);
    setPendingFeeReminder(null);
    try {
      const response = await fetch("/api/admin/admissions/assistant/summary", { credentials: "include" });
      const result = await response.json() as AdmissionSummaryResult & { error?: string };
      if (!response.ok) {
        throw new Error(response.status === 403
          ? "Admissions summaries are available to school administrators only."
          : result.error || "I couldn’t retrieve the admissions summary. Please try again.");
      }
      if (!result || result.kind !== "admission_summary") {
        throw new Error("The admissions query returned an unexpected response. Please try again.");
      }
      const counts = [
        result.total,
        result.pendingReview,
        result.awaitingFamily,
        result.openTotal,
        result.approved,
        result.rejected,
        result.withdrawn,
      ];
      if (!counts.every((count) => Number.isSafeInteger(count) && count >= 0)) {
        throw new Error("The admissions query returned invalid counts. Please try again.");
      }

      setAdmissionSummary(result);
      let reply: string;
      switch (question) {
        case "pending":
          reply = `There are ${result.openTotal} open admission application${result.openTotal === 1 ? "" : "s"}: ${result.pendingReview} awaiting school review and ${result.awaitingFamily} awaiting information from families.`;
          break;
        case "pendingReview":
          reply = `There are ${result.pendingReview} admission application${result.pendingReview === 1 ? "" : "s"} awaiting school review.`;
          break;
        case "awaitingFamily":
          reply = `${result.awaitingFamily} admission application${result.awaitingFamily === 1 ? " is" : "s are"} awaiting information from families.`;
          break;
        case "approved":
          reply = `${result.approved} admission application${result.approved === 1 ? " has" : "s have"} been approved.`;
          break;
        case "rejected":
          reply = `${result.rejected} admission application${result.rejected === 1 ? " has" : "s have"} been rejected.`;
          break;
        case "withdrawn":
          reply = `${result.withdrawn} admission application${result.withdrawn === 1 ? " has" : "s have"} been withdrawn.`;
          break;
        default:
          reply = `SchoolBase has recorded ${result.total} admission application${result.total === 1 ? "" : "s"}: ${result.openTotal} still open and ${result.approved} approved.`;
      }
      addMessage("assistant", reply);
      speak(reply);
    } catch (error) {
      const reply = error instanceof Error ? error.message : "I couldn’t retrieve the admissions summary.";
      console.error("Assistant admissions summary failed:", error);
      addMessage("assistant", reply);
      speak(reply);
    } finally {
      setIsLookingUpFees(false);
    }
  }, [addMessage, speak]);

  const confirmFeeReminder = useCallback(async () => {
    if (!pendingFeeReminder || isSendingFeeReminder || feeLookup?.kind !== "student") return;
    setIsSendingFeeReminder(true);
    try {
      const response = await fetch("/api/admin/fees/invoices/send-reminders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: pendingFeeReminder.id, currency: feeLookup.currency }),
      });
      const result = await response.json() as {
        error?: string;
        sent?: number;
        skipped?: number;
        totalGuardians?: number;
        errors?: string[];
      };
      if (!response.ok) {
        throw new Error(result.error || "The reminder could not be sent. Check the Fees page and WhatsApp/communication status.");
      }

      const deliveryCount = result.sent ?? 0;
      const skippedCount = result.skipped ?? 0;
      const reply = deliveryCount > 0
        ? `Reminder processing completed for ${feeLookup.student.firstName} ${feeLookup.student.lastName}, invoice ${pendingFeeReminder.invoiceNo}: ${deliveryCount} guardian message delivery${deliveryCount === 1 ? "" : "s"} sent or queued${skippedCount ? `; ${skippedCount} guardian${skippedCount === 1 ? "" : "s"} skipped because no contact was available` : ""}.${result.errors?.length ? ` Some deliveries reported errors: ${result.errors.join("; ")}` : ""}`
        : result.totalGuardians === 0
          ? `No reminder was sent for invoice ${pendingFeeReminder.invoiceNo} because no guardians are linked to this student.`
          : `No reminder delivery was completed for invoice ${pendingFeeReminder.invoiceNo}.${skippedCount ? ` ${skippedCount} guardian${skippedCount === 1 ? " had" : "s had"} no usable contact details.` : ""}${result.errors?.length ? ` Details: ${result.errors.join("; ")}` : ""}`;
      setPendingFeeReminder(null);
      addMessage("assistant", reply);
      speak(reply);
    } catch (error) {
      const reply = error instanceof Error ? error.message : "The reminder could not be sent.";
      console.error("Assistant fee reminder failed:", error);
      addMessage("assistant", reply);
      speak(reply);
    } finally {
      setIsSendingFeeReminder(false);
    }
  }, [addMessage, feeLookup, isSendingFeeReminder, pendingFeeReminder, speak]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    stopSpeaking();
    if (shouldListenRef.current) recognitionRef.current?.stop();
    isProcessingRef.current = true;
    setIsProcessing(true);
    addMessage("user", trimmed);
    setInput("");

    const conversationRequest = getAssistantConversationRequest(trimmed);
    if (conversationRequest) {
      aiContextTokenRef.current = null;
      void answerConversationQuestion(conversationRequest);
      return;
    }

    if (studentFillMode) {
      aiContextTokenRef.current = null;
      const extracted = parseStudentIntakeDetails(trimmed);
      if (Object.keys(extracted).length === 0) {
        const reply = "I couldn’t identify any supported field labels and values. Try “first name Ama, surname Mensah, guardian phone +233...” or say “cancel” to stop form assistance.";
        if (/\bcancel\b|\bstop\b/i.test(trimmed)) {
          setStudentFillMode(false);
          addMessage("assistant", "Form assistance cancelled. Nothing has been entered.");
        } else {
          addMessage("assistant", reply);
          speak(reply);
        }
        return;
      }
      setStudentDraft(extracted);
      setStudentFillMode(false);
      const reply = "I’ve prepared these details for your review. Nothing has been entered yet. Check the names, dates, contact details, and class below, then choose “Apply to form” if they’re correct. You will still review and submit the SchoolBase form yourself.";
      addMessage("assistant", reply);
      speak(reply);
      return;
    }

    const timetableQuestion = getTimetableQuestion(trimmed);
    if (timetableQuestion) {
      aiContextTokenRef.current = null;
      void queryTimetable(timetableQuestion);
      return;
    }

    const isAiEngineQuery = portalRoot === "/admin" && isReadOnlyAiEngineQuery(trimmed);
    const isAiEngineFollowup = portalRoot === "/admin"
      && /^(?:show|list|find|display)\s+(?:me\s+)?(?:them|those students|those pupils|those learners|the same students|the same pupils|those staff|those employees|those teachers|the same staff|the same employees|the same teachers)[?.!]*$/i.test(trimmed);
    if (!isAiEngineQuery && !isAiEngineFollowup) aiContextTokenRef.current = null;

    if (isStudentFormAssistanceRequest(trimmed) && portalRoot === "/admin") {
      const registrationPage = destinations.find((item) => item.href === "/admin/students");
      if (!registrationPage) {
        const reply = "Student registration is not available in this dashboard.";
        addMessage("assistant", reply);
        speak(reply);
        return;
      }
      if (pathname === "/admin/students/new") {
        if (document.querySelector('form[data-assistant-form="student-registration"]')) {
          setStudentDraft(null);
          promptForStudentDetails();
        } else {
          const reply = "The student registration form isn’t ready on this page yet. Please wait for it to finish loading, then ask me to help fill it in.";
          addMessage("assistant", reply);
          speak(reply);
        }
        return;
      }
      pendingStudentRegistrationRef.current = true;
      const destination = { href: "/admin/students/new", label: "New student registration" };
      setPendingNavigation(destination);
      addMessage("assistant", "I’ll open student registration. I’ll help you prepare the form details for review; you remain in control of saving the student.");
      router.push(destination.href);
      return;
    }

    if (
      portalRoot === "/admin"
      && schoolIntelligence
      && (schoolIntelligence.kind === "outstanding_summary" || schoolIntelligence.kind === "outstanding_students")
      && /\b(show|tell me|give me|list|who are)\b.*\b(their names|those students|them|the students)\b/i.test(trimmed)
    ) {
      setShowIntelligenceStudents(true);
      const reply = schoolIntelligence.students.length
        ? `Here are the ${Math.min(schoolIntelligence.students.length, 100)} students with recorded outstanding balances across all terms.`
        : "There are no students with recorded outstanding balances across all terms.";
      addMessage("assistant", reply);
      speak(reply);
      return;
    }

    if (portalRoot === "/admin" && isExplicitStudentFeeLookup(trimmed)) {
      const studentSearch = extractStudentFeeSearch(trimmed);
      if (!studentSearch) {
        const reply = "Please include the student’s full name or admission number so I can look up the correct fee record.";
        addMessage("assistant", reply);
        speak(reply);
        return;
      }
      void lookupStudentFees(studentSearch);
      return;
    }

    const admissionsQuestion = portalRoot === "/admin" ? getAdmissionsQuestion(trimmed) : null;
    if (admissionsQuestion) {
      void queryAdmissionsSummary(admissionsQuestion);
      return;
    }

    const intelligenceIntent = portalRoot === "/admin" ? getSchoolIntelligenceIntent(trimmed) : null;
    if (intelligenceIntent) {
      void querySchoolIntelligence(intelligenceIntent.intent, intelligenceIntent.className);
      return;
    }

    if (portalRoot === "/admin" && isStudentFeeQuestion(trimmed)) {
      const studentSearch = extractStudentFeeSearch(trimmed);
      if (!studentSearch) {
        const reply = "I can check fees, balances, and recorded payment dates. Please include the student’s full name or admission number so I can look up the correct record.";
        addMessage("assistant", reply);
        speak(reply);
        return;
      }
      void lookupStudentFees(studentSearch);
      return;
    }

    if (isAiEngineQuery || isAiEngineFollowup) {
      void queryReadOnlyAiEngine(trimmed);
      return;
    }

    if (portalRoot === "/admin" && isUnsupportedSchoolDataQuestion(trimmed)) {
      const reply = "I don’t have a verified query for that information yet, so I won’t guess or present an unsupported query as zero results. Please ask about student counts, outstanding fees, or recorded collections using the supported questions.";
      addMessage("assistant", reply);
      speak(reply);
      return;
    }

    if (portalRoot === "/admin" && /\bwhats\s?app\b/i.test(trimmed)) {
      const whatsappSettingsPath = "/admin/settings/whatsapp";
      if (pathname === whatsappSettingsPath) {
        const reply = "You’re on WhatsApp settings. Use Connect to start pairing, then scan the QR code in WhatsApp → Linked devices or enter the pairing code. After connecting, send a test message and review the sending limits, quiet hours, and bulk-approval policy before reminders are sent. I can guide you, but you must complete pairing and approve messages on this page.";
        addMessage("assistant", reply);
        speak(reply);
        return;
      }
      const destination = { href: whatsappSettingsPath, label: "WhatsApp settings" };
      setPendingNavigation(destination);
      const reply = "I’ll open your WhatsApp settings. You can connect by QR code or pairing code there, test delivery, and review the school’s sending safety policy. I won’t connect a device or send a message without your action.";
      addMessage("assistant", reply);
      speak(reply);
      router.push(destination.href);
      return;
    }

    const result = resolveAssistantRequest(trimmed, navItems, pathname);
    addMessage("assistant", result.message);
    speak(result.message);

    if (result.destination) {
      if (result.startStudentRegistration) {
        pendingStudentRegistrationRef.current = true;
      }
      setPendingNavigation(result.destination);
      if (result.destination.href === "/admin/timetable" && isTimetablePlanningRequest(trimmed)) {
        if (pathname === "/admin/timetable") {
          window.dispatchEvent(new Event("schoolbase:open-timetable-planner"));
        } else {
          router.push("/admin/timetable?assistant=planner");
        }
      } else if (pathname !== result.destination.href) {
        router.push(result.destination.href);
      }
    }
  }, [addMessage, answerConversationQuestion, destinations, lookupStudentFees, navItems, pathname, portalRoot, promptForStudentDetails, queryAdmissionsSummary, queryReadOnlyAiEngine, querySchoolIntelligence, queryTimetable, router, schoolIntelligence, speak, stopSpeaking, studentFillMode]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    aiContextTokenRef.current = null;
  }, [portalRoot, userId]);

  useEffect(() => {
    let savedPreference: string | null = null;
    let preferenceReadFailed = false;
    try {
      savedPreference = voicePreferenceKey
        ? window.localStorage.getItem(voicePreferenceKey)
        : null;
    } catch {
      preferenceReadFailed = true;
    }
    const frame = window.requestAnimationFrame(() => {
      if (savedPreference === "off") setVoiceEnabled(false);
      if (preferenceReadFailed) {
        setStatusMessage("I couldn’t load your voice preference. Spoken replies are available in Voice mode.");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [voicePreferenceKey]);

  useEffect(() => {
    if (isModeMenuOpen) {
      voiceButtonRef.current?.focus();
    }
  }, [isModeMenuOpen]);

  useEffect(() => {
    if (assistantMode === "text") textInputRef.current?.focus();
    if (assistantMode === "voice") voiceStartButtonRef.current?.focus();
  }, [assistantMode]);

  useEffect(() => {
    if (!isModeMenuOpen && !assistantMode) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isModeMenuOpen) {
        setIsModeMenuOpen(false);
        return;
      }
      closeAssistant();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (isModeMenuOpen && !launcherRef.current?.contains(event.target as Node)) {
        setIsModeMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [assistantMode, closeAssistant, isModeMenuOpen]);

  useEffect(() => {
    if (pathname !== "/admin/students/new" || !pendingStudentRegistrationRef.current) return;
    pendingStudentRegistrationRef.current = false;
    setStudentDraft(null);
    promptForStudentDetails();
  }, [pathname, promptForStudentDetails]);

  useEffect(() => {
    if (!pendingNavigation || !pathname || !(pathname === pendingNavigation.href || pathname.startsWith(`${pendingNavigation.href}/`))) return;
    const target = pendingNavigation.href;
    const destinationLabel = pendingNavigation.label;
    const timeout = setTimeout(() => {
      const element = findNavigationTarget(target);
      if (!element) {
        setStatusMessage(`${destinationLabel} is open. Its navigation link is available in the dashboard menu.`);
        setPendingNavigation(null);
        return;
      }
      highlightedHrefRef.current = target;
      setHighlightRect(element.getBoundingClientRect());
      setStatusMessage(`${destinationLabel} is open. Its navigation link is highlighted briefly.`);
      setPendingNavigation(null);
      highlightTimerRef.current = setTimeout(() => {
        highlightedHrefRef.current = null;
        highlightedElementRef.current = null;
        setHighlightRect(null);
      }, 6500);
    }, 350);
    return () => clearTimeout(timeout);
  }, [pathname, pendingNavigation]);

  useEffect(() => {
    if (!highlightRect) return;
    const updatePosition = () => {
      const highlightedElement = highlightedElementRef.current;
      if (highlightedElement?.isConnected) {
        setHighlightRect(highlightedElement.getBoundingClientRect());
        return;
      }
      const targetHref = highlightedHrefRef.current;
      if (!targetHref) return;
      const navigationElement = findNavigationTarget(targetHref);
      if (navigationElement) setHighlightRect(navigationElement.getBoundingClientRect());
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [highlightRect, pendingNavigation]);

  useEffect(() => () => {
    shouldListenRef.current = false;
    if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
    recognitionRef.current?.stop();
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  const startOrStopListening = () => {
    if (shouldListenRef.current) {
      shouldListenRef.current = false;
      if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoicePaused(true);
      setVoiceError("");
      setStatusMessage("Microphone paused. Select the microphone to resume.");
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("Voice input is not supported by this browser. Switch to Text to continue.");
      return;
    }

    stopSpeaking();
    setVoicePaused(false);
    setVoiceError("");
    shouldListenRef.current = true;
    setIsListening(true);
    setStatusMessage("Starting voice listening...");
    startListeningRef.current();
  };

  const toggleVoiceReplies = () => {
    const nextEnabled = !voiceEnabled;
    setVoiceEnabled(nextEnabled);
    try {
      if (voicePreferenceKey) window.localStorage.setItem(voicePreferenceKey, nextEnabled ? "on" : "off");
      if (!nextEnabled) {
        stopSpeaking();
        setStatusMessage("Spoken replies are off. Text and voice input remain available.");
        return;
      }
      setStatusMessage("Spoken replies are on.");
    } catch {
      if (!nextEnabled) {
        stopSpeaking();
        setStatusMessage("Spoken replies are off for this session, but the preference could not be saved.");
      } else {
        setStatusMessage("Spoken replies are on for this session, but the preference could not be saved.");
      }
    }
  };

  const toggleContinuousMode = () => {
    const nextEnabled = !continuousMode;
    setContinuousMode(nextEnabled);
    if (!nextEnabled && shouldListenRef.current) {
      shouldListenRef.current = false;
      if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoicePaused(true);
      setStatusMessage("Continuous conversation is off. Select Speak for each request.");
    }
  };

  const discardStudentDraft = () => {
    setStudentDraft(null);
    addMessage("assistant", "I’ve discarded the prepared details. Nothing has been entered into the form.");
  };

  const clearConversation = () => {
    aiContextTokenRef.current = null;
    recognitionRef.current?.stop();
    setIsListening(false);
    stopSpeaking();
    setStudentFillMode(false);
    setStudentDraft(null);
    setFeeLookup(null);
    setSchoolIntelligence(null);
    setAdmissionSummary(null);
    setShowIntelligenceStudents(false);
    setPendingFeeReminder(null);
    setMessages([{
      id: ++messageId.current,
      role: "assistant",
      text: "Conversation cleared from this page session. I’m here to help with another question.",
    }]);
    setStatusMessage("");
  };

  const applyStudentDraft = () => {
    if (!studentDraft) return;
    const form = document.querySelector<HTMLFormElement>('form[data-assistant-form="student-registration"]');
    if (!form) {
      setStatusMessage("I can’t find the student registration form on this page. No details were entered.");
      return;
    }

    const applied: StudentIntakeField[] = [];
    const unavailable: StudentIntakeField[] = [];
    let firstAppliedControl: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = null;
    const normalizeOption = (value: string) => value.toLocaleLowerCase().replace(/\s+/g, " ").trim();

    for (const [field, value] of Object.entries(studentDraft) as Array<[StudentIntakeField, string]>) {
      const item = form.elements.namedItem(field);
      if (
        !(item instanceof HTMLInputElement) &&
        !(item instanceof HTMLSelectElement) &&
        !(item instanceof HTMLTextAreaElement)
      ) {
        unavailable.push(field);
        continue;
      }
      if (item.disabled || ("readOnly" in item && item.readOnly)) {
        unavailable.push(field);
        continue;
      }

      let resolvedValue = value;
      if (item instanceof HTMLSelectElement) {
        const option = Array.from(item.options).find(
          (candidate) => normalizeOption(candidate.textContent ?? "") === normalizeOption(value),
        );
        if (!option) {
          unavailable.push(field);
          continue;
        }
        resolvedValue = option.value;
      }

      setFormControlValue(item, resolvedValue);
      applied.push(field);
      firstAppliedControl ??= item;
    }

    if (firstAppliedControl) {
      firstAppliedControl.scrollIntoView({ block: "center", behavior: "smooth" });
      firstAppliedControl.focus({ preventScroll: true });
      highlightedElementRef.current = firstAppliedControl;
      setHighlightRect(firstAppliedControl.getBoundingClientRect());
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        highlightedElementRef.current = null;
        setHighlightRect(null);
      }, 6500);
    }

    setStudentDraft(null);
    const appliedLabels = applied.map(getStudentFieldLabel).join(", ");
    const unavailableLabels = unavailable.map(getStudentFieldLabel).join(", ");
    const reply = applied.length
      ? `I’ve placed ${appliedLabels} in the form. Please review every value, complete any required fields that are still blank, and use SchoolBase’s Save student button when you’re ready. I have not submitted the form.${unavailable.length ? ` I couldn’t match these to an available form option, so I left them unchanged: ${unavailableLabels}.` : ""}`
      : `I couldn’t match the details to available form fields, so nothing was entered. Please check the field names and class/relationship options, then try again.`;
    addMessage("assistant", reply);
    speak(reply);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  };

  if (!portalRoot || destinations.length === 0) return null;
  const voiceVisualState = voiceError
    ? "error"
    : isListening
      ? "listening"
      : isProcessing
        ? "processing"
        : isSpeaking
          ? "speaking"
          : voicePaused
            ? "paused"
            : "idle";
  const voiceStatus = voiceError
    || (isListening
      ? "Listening"
      : isProcessing
        ? "Thinking"
        : isSpeaking
          ? "Speaking"
          : voicePaused
            ? "Paused"
            : "Ready when you are");

  return (
    <>
      {highlightRect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[103] rounded-sm border-2 border-amber-400"
          style={{
            left: highlightRect.left - 4,
            top: highlightRect.top - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            boxShadow: "0 0 0 4px rgba(251, 191, 36, 0.35), 0 0 0 9999px rgba(15, 23, 42, 0.24)",
            transition: "all 150ms ease-out",
          }}
        />
      ) : null}

      {assistantMode === "text" ? (
        <section
          aria-label="SchoolBase AI text assistant"
          aria-modal="false"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-[90] flex max-h-[min(680px,calc(100dvh-8rem))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface text-foreground shadow-2xl sm:right-6"
          role="dialog"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border bg-brand px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">SchoolBase AI</h2>
                <p className="text-xs text-white/80">Your guide to using SchoolBase</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={clearConversation}
                aria-label="Clear conversation"
                title="Clear conversation"
                className="rounded-lg p-2 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <Eraser className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={switchToVoice}
                aria-label="Switch to voice assistant"
                title="Switch to Voice"
                className="rounded-lg p-2 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <AudioLines className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={closeAssistant}
                aria-label="Close assistant"
                className="rounded-lg p-2 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="border-b border-border bg-background px-4 py-2 text-xs text-muted">
            {portalRoot === "/admin"
              ? "Fee information is available to accounting-authorized users. Please review and confirm before sending a reminder."
              : "Ask me to explain this page, find a feature, or guide you through a supported workflow."}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "ml-auto rounded-br-sm bg-brand text-white"
                    : "mr-auto rounded-bl-sm bg-background text-foreground"
                }`}
              >
                {message.text}
              </div>
            ))}
            {statusMessage ? <p role="status" className="text-xs text-muted">{statusMessage}</p> : null}
            {isProcessing ? (
              <p role="status" className="flex items-center gap-2 text-xs text-muted">
                <LoaderCircle className="h-4 w-4 animate-spin text-brand" aria-hidden="true" />
                Working on your request…
              </p>
            ) : null}
            {studentFillMode ? (
              <p className="rounded-lg border border-brand/20 bg-brand/5 px-3 py-2 text-xs text-foreground">
                Form assistance is ready. Dictate or type field labels with their values; you’ll review everything before it is entered.
              </p>
            ) : null}
            {studentDraft ? (
              <section className="rounded-xl border border-brand/30 bg-background p-3" aria-label="Review student details">
                <h3 className="text-sm font-semibold text-foreground">Review before applying</h3>
                <p className="mt-1 text-xs text-muted">These details stay in this page session. Nothing has been entered or saved yet.</p>
                <dl className="mt-3 space-y-2">
                  {(Object.entries(studentDraft) as Array<[StudentIntakeField, string]>).map(([field, value]) => (
                    <div key={field} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2 border-b border-border/70 pb-2 last:border-0">
                      <dt className="text-xs font-medium text-muted">{getStudentFieldLabel(field)}</dt>
                      <dd className="break-words text-xs text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={applyStudentDraft}
                    className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    Apply to form
                  </button>
                  <button
                    type="button"
                    onClick={discardStudentDraft}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    Discard details
                  </button>
                </div>
              </section>
            ) : null}
            {isLookingUpFees ? (
              <p role="status" className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted">
                Checking this school’s records…
              </p>
            ) : null}
            {schoolIntelligence?.kind === "active_student_count" ? (
              <section className="rounded-xl border border-brand/30 bg-background p-3" aria-label="Student count">
                <h3 className="text-sm font-semibold text-foreground">
                  Active students{schoolIntelligence.className ? ` · ${schoolIntelligence.className}` : ""}
                </h3>
                <p className="mt-2 text-2xl font-bold text-brand">{schoolIntelligence.count.toLocaleString("en-NG")}</p>
                <p className="mt-1 text-[11px] text-muted">{schoolIntelligence.scope}</p>
              </section>
            ) : null}
            {admissionSummary ? (
              <section className="rounded-xl border border-brand/30 bg-background p-3" aria-label="Admissions summary">
                <h3 className="text-sm font-semibold text-foreground">Admissions overview</h3>
                <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {([
                    ["Applications", admissionSummary.total],
                    ["Open", admissionSummary.openTotal],
                    ["Awaiting school review", admissionSummary.pendingReview],
                    ["Awaiting family information", admissionSummary.awaitingFamily],
                    ["Approved", admissionSummary.approved],
                    ["Rejected", admissionSummary.rejected],
                    ["Withdrawn", admissionSummary.withdrawn],
                  ] as const).map(([label, count]) => (
                    <div key={label} className="rounded-lg border border-border p-2">
                      <dt className="text-[10px] text-muted">{label}</dt>
                      <dd className="mt-1 text-xs font-semibold text-foreground">{count.toLocaleString("en-NG")}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[10px] text-muted">
                  “Open” includes applications awaiting school review or information from families.
                </p>
              </section>
            ) : null}
            {schoolIntelligence?.kind === "payment_summary" ? (
              <section className="rounded-xl border border-brand/30 bg-background p-3" aria-label="Payment collection summary">
                <h3 className="text-sm font-semibold text-foreground">Recorded collections</h3>
                <p className="mt-1 text-xs text-muted">
                  {schoolIntelligence.period.term}, {schoolIntelligence.period.academicYear}
                  {schoolIntelligence.className ? ` · ${schoolIntelligence.className}` : ""}
                </p>
                <p className="mt-3 text-2xl font-bold text-brand">{formatMoney(schoolIntelligence.totalCollected, schoolIntelligence.currency)}</p>
                <p className="mt-1 text-xs text-muted">
                  Across {schoolIntelligence.paymentCount.toLocaleString("en-NG")} recorded payment transaction{schoolIntelligence.paymentCount === 1 ? "" : "s"} linked to non-voided student invoices.
                </p>
                {schoolIntelligence.recentPayments.length ? (
                  <ul className="mt-3 space-y-2 border-t border-border pt-2">
                    {schoolIntelligence.recentPayments.map((payment) => (
                      <li key={payment.id} className="flex justify-between gap-2 text-xs">
                        <span className="text-muted">
                          {payment.invoice?.pupil ? `${payment.invoice.pupil.firstName} ${payment.invoice.pupil.lastName}` : "Student"}
                          {" · "}{payment.invoice?.invoiceNo || "Invoice"}
                          {" · "}{new Date(payment.paidAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="shrink-0 font-medium text-foreground">{formatMoney(payment.amount, schoolIntelligence.currency)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-muted">No linked payments were recorded for this reporting period.</p>
                )}
              </section>
            ) : null}
            {schoolIntelligence && (schoolIntelligence.kind === "outstanding_summary" || schoolIntelligence.kind === "outstanding_students") ? (
              <section className="rounded-xl border border-brand/30 bg-background p-3" aria-label="Outstanding fees summary">
                <h3 className="text-sm font-semibold text-foreground">Outstanding fees</h3>
                <p className="mt-1 text-xs text-muted">
                  Across all terms
                  {schoolIntelligence.className ? ` · ${schoolIntelligence.className}` : ""}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {([
                    ["Outstanding", formatMoney(schoolIntelligence.totalOutstanding, schoolIntelligence.currency)],
                    ["Students owing", schoolIntelligence.studentsOwing.toLocaleString("en-NG")],
                    ["Fully paid", schoolIntelligence.studentsFullyPaid.toLocaleString("en-NG")],
                    ["Part-paid", schoolIntelligence.studentsPartiallyPaid.toLocaleString("en-NG")],
                    ["No payment recorded", schoolIntelligence.studentsWithNoRecordedPayment.toLocaleString("en-NG")],
                    ["Students billed", schoolIntelligence.studentsWithInvoices.toLocaleString("en-NG")],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border p-2">
                      <dt className="text-[10px] text-muted">{label}</dt>
                      <dd className="mt-1 text-xs font-semibold text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
                {schoolIntelligence.studentsOwing > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowIntelligenceStudents((shown) => !shown)}
                    className="mt-3 text-xs font-medium text-brand underline underline-offset-2"
                  >
                    {showIntelligenceStudents ? "Hide student details" : `Show students owing (${schoolIntelligence.studentsOwing})`}
                  </button>
                ) : null}
                {showIntelligenceStudents && schoolIntelligence.students.length ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[330px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted">
                          <th className="py-2 pr-2 font-medium">Student</th>
                          <th className="py-2 pr-2 font-medium">Class</th>
                          <th className="py-2 text-right font-medium">Owing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schoolIntelligence.students.map((student) => (
                          <tr key={student.id} className="border-b border-border/70 last:border-0">
                            <td className="py-2 pr-2">
                              <button
                                type="button"
                                onClick={() => router.push(`/admin/students/${encodeURIComponent(student.id)}`)}
                                className="text-left font-medium text-brand underline underline-offset-2"
                              >
                                {student.firstName} {student.lastName}
                                {student.admissionNo ? <span className="block text-[10px] text-muted">{student.admissionNo}</span> : null}
                              </button>
                            </td>
                            <td className="py-2 pr-2 text-muted">
                              {student.class?.name || "—"}{student.class?.arm ? ` ${student.class.arm}` : ""}
                            </td>
                            <td className="py-2 text-right font-medium text-foreground">
                              {formatMoney(student.balance, schoolIntelligence.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {schoolIntelligence.hasMoreStudents ? <p className="mt-2 text-[10px] text-muted">Showing the 100 students with the largest balances. Open Fees for the full filtered list.</p> : null}
                  </div>
                ) : null}
              </section>
            ) : null}
            {feeLookup?.kind === "matches" ? (
              <section className="rounded-xl border border-border bg-background p-3" aria-label="Matching students">
                <h3 className="text-sm font-semibold text-foreground">Choose the correct student</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {feeLookup.students.map((student) => {
                    const fullName = `${student.firstName} ${student.lastName}`;
                    const label = `${fullName}${student.admissionNo ? ` · ${student.admissionNo}` : ""}`;
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => void lookupStudentFees(student.admissionNo || fullName)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                      >
                        Check {label}
                      </button>
                    );
                  })}
                </div>
                {feeLookup.hasMore ? <p className="mt-2 text-xs text-muted">More matches exist; use the student’s admission number to narrow the search.</p> : null}
              </section>
            ) : null}
            {feeLookup?.kind === "student" ? (
              <section className="rounded-xl border border-brand/30 bg-background p-3" aria-label="Student fee summary">
                <h3 className="text-sm font-semibold text-foreground">
                  {feeLookup.student.firstName} {feeLookup.student.lastName}
                  {feeLookup.student.class?.name ? ` · ${feeLookup.student.class.name}${feeLookup.student.class.arm ? ` ${feeLookup.student.class.arm}` : ""}` : ""}
                </h3>
                {feeLookup.student.admissionNo ? <p className="mt-1 text-xs text-muted">Admission no. {feeLookup.student.admissionNo}</p> : null}
                <button
                  type="button"
                  onClick={() => router.push(`/admin/students/${encodeURIComponent(feeLookup.student.id)}`)}
                  className="mt-2 text-xs font-medium text-brand underline underline-offset-2"
                >
                  Open student profile
                </button>
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {([
                    ["Fees issued", feeLookup.totalDue],
                    ["Recorded paid", feeLookup.totalPaid],
                    ["Balance owing", feeLookup.totalBalance],
                  ] as const).map(([label, amount]) => (
                    <div key={label} className="rounded-lg border border-border p-2">
                      <dt className="text-[10px] text-muted">{label}</dt>
                      <dd className="mt-1 text-xs font-semibold text-foreground">{formatMoney(amount, feeLookup.currency)}</dd>
                    </div>
                  ))}
                </dl>

                <h4 className="mt-4 text-xs font-semibold text-foreground">Invoices</h4>
                {feeLookup.invoices.length ? (
                  <ul className="mt-2 space-y-2">
                    {feeLookup.invoices.map((invoice) => (
                      <li key={invoice.id} className="rounded-lg border border-border p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium text-foreground">{invoice.feeSchedule.term?.academicYear.name || "Session"} · {invoice.feeSchedule.term?.name || invoice.feeSchedule.name}</p>
                            <p className="mt-0.5 text-[10px] text-muted">{invoice.invoiceNo} · {invoice.status.replaceAll("_", " ")} · Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-NG") : "date not set"}</p>
                          </div>
                          <p className="shrink-0 text-xs font-semibold text-foreground">{formatMoney(invoice.balance, feeLookup.currency)} owing</p>
                        </div>
                        {invoice.balance > 0 && ["SENT", "PART_PAID", "OVERDUE"].includes(invoice.status) ? (
                          <button
                            type="button"
                            onClick={() => setPendingFeeReminder(invoice)}
                            className="mt-2 rounded-lg border border-brand px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                          >
                            Prepare reminder
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted">No active fee invoices were found for this student.</p>
                )}
                {feeLookup.hasMoreInvoices ? <p className="mt-2 text-xs text-muted">Showing the 100 most recent invoices.</p> : null}

                <h4 className="mt-4 text-xs font-semibold text-foreground">Recorded payment history</h4>
                {feeLookup.paymentHistory.length ? (
                  <ul className="mt-2 space-y-1">
                    {feeLookup.paymentHistory.slice(0, 10).map((payment) => (
                      <li key={payment.id} className="flex justify-between gap-2 text-xs">
                        <span className="text-muted">
                          {new Date(payment.paidAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}{payment.method.replaceAll("_", " ")}
                          {payment.invoice?.invoiceNo ? ` · ${payment.invoice.invoiceNo}` : ""}
                        </span>
                        <span className="shrink-0 font-medium text-foreground">{formatMoney(payment.amount, feeLookup.currency)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted">No linked payment transactions were found.</p>
                )}
                {feeLookup.hasMorePayments ? <p className="mt-2 text-xs text-muted">Showing the 25 most recent transactions.</p> : null}

                {pendingFeeReminder ? (
                  <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-amber-950">
                    <p className="text-xs font-semibold">Confirm fee reminder</p>
                    <p className="mt-1 text-xs">
                      Send the school’s standard fee reminder for invoice {pendingFeeReminder.invoiceNo} with a balance of {formatMoney(pendingFeeReminder.balance, feeLookup.currency)}? It includes the fee details and may be delivered to the student’s guardians through configured channels such as WhatsApp and email.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void confirmFeeReminder()}
                        disabled={isSendingFeeReminder}
                        className="rounded-lg bg-amber-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {isSendingFeeReminder ? "Sending…" : "Confirm and send"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingFeeReminder(null)}
                        disabled={isSendingFeeReminder}
                        className="rounded-lg border border-amber-800/30 px-3 py-2 text-xs font-semibold disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
            {messages.length <= 1 ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {(pathname === "/admin/students/new"
                  ? ["Help me fill this form", "Explain this page"]
                  : ["Explain this page", "Show me around", ...destinations.slice(0, 2).map((destination) => `Open ${destination.label}`)]
                ).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
            {highlightRect ? (
              <button
                type="button"
                onClick={() => {
                  setHighlightRect(null);
                  highlightedHrefRef.current = null;
                  if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
                }}
                className="self-start text-xs font-medium text-brand underline underline-offset-2"
              >
                Hide page highlight
              </button>
            ) : null}
            {messages.some((message) => message.role === "assistant") ? (
              <button
                type="button"
                onClick={switchToVoice}
                className="self-start text-xs font-medium text-brand underline underline-offset-2"
              >
                Switch to Voice for spoken replies
              </button>
            ) : null}
          </div>

          <div className="border-t border-border p-3">
            <form onSubmit={submit} className="flex items-end gap-2">
              <textarea
                ref={textInputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onInputKeyDown}
                rows={1}
                maxLength={500}
                placeholder="Ask about this dashboard..."
                aria-label="Message the SchoolBase Assistant"
                className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="button"
                onClick={startOrStopListening}
                aria-label={isListening ? "Stop listening" : "Speak to the assistant"}
                title={isListening ? "Stop listening" : "Speak to the assistant"}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border transition hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${isListening ? "bg-rose-50 text-rose-700" : ""}`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted">Enter to send · Shift+Enter for a new line</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleVoiceReplies}
                  aria-label={voiceEnabled ? "Turn spoken replies off" : "Turn spoken replies on"}
                  title={voiceEnabled ? "Spoken replies on in Voice mode" : "Spoken replies off"}
                  className="rounded-lg p-1.5 text-muted transition hover:bg-background hover:text-foreground"
                >
                  {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                {isSpeaking ? (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="rounded-lg px-2 py-1 text-[11px] font-medium text-brand hover:bg-background"
                  >
                    Stop speech
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted">
              <Compass className="h-3 w-3" />
              {destinations.length} registered pages available in this dashboard
            </div>
          </div>
        </section>
      ) : null}

      {assistantMode === "voice" ? (
        <section
          aria-label="SchoolBase AI voice assistant"
          aria-modal="false"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-[90] flex max-h-[min(460px,calc(100dvh-8rem))] w-[min(360px,calc(100vw-1.5rem))] flex-col overflow-y-auto rounded-2xl border border-border bg-surface p-4 text-foreground shadow-2xl sm:right-6"
          role="dialog"
        >
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand">
                <AudioLines className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">SchoolBase AI</h2>
                <p className="text-xs text-muted">Voice mode</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={switchToText}
                aria-label="Switch to text conversation"
                title="Switch to Text"
                className="rounded-lg p-2 text-muted transition hover:bg-background hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                <MessageSquareText className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={closeAssistant}
                aria-label="Close voice assistant"
                className="rounded-lg p-2 text-muted transition hover:bg-background hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex flex-col items-center px-2 pb-3 pt-5">
            <div className={`assistant-orb assistant-orb--${voiceVisualState}`} aria-hidden="true">
              <span className="assistant-orb__ring assistant-orb__ring--outer" />
              <span className="assistant-orb__ring assistant-orb__ring--inner" />
              <span className="assistant-orb__core">
                {isProcessing ? <LoaderCircle className="h-7 w-7 animate-spin" /> : <AudioLines className="h-7 w-7" />}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold" role="status" aria-live="polite">{voiceStatus}</p>
            {voiceError ? (
              <p className="mt-1 max-w-[290px] text-center text-xs text-red-700">{voiceError}</p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                {isListening ? "Your microphone is active." : isSpeaking ? "Select Stop to interrupt the reply." : "Choose the microphone when you’re ready to speak."}
              </p>
            )}
            {isListening || isSpeaking ? (
              <div className={`assistant-waveform assistant-waveform--${voiceVisualState}`} aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6].map((bar) => <span key={bar} />)}
              </div>
            ) : null}
            {messages.length ? (
              <p className="mt-3 line-clamp-3 w-full rounded-xl bg-background px-3 py-2 text-xs leading-relaxed text-foreground">
                {[...messages].reverse().find((message) => message.role === "assistant")?.text || "Your conversation will appear here when you switch to Text."}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border pt-3">
            <button
              ref={voiceStartButtonRef}
              type="button"
              onClick={startOrStopListening}
              aria-label={isListening ? "Pause microphone" : "Start microphone"}
              aria-pressed={isListening}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${isListening ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-brand text-white hover:bg-brand-hover"}`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isListening ? "Pause" : "Speak"}
            </button>
            {isSpeaking ? (
              <button
                type="button"
                onClick={stopSpeaking}
                className="min-h-11 rounded-full border border-border px-4 text-sm font-medium hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                Stop speaking
              </button>
            ) : null}
            <button
              type="button"
              onClick={toggleVoiceReplies}
              aria-label={voiceEnabled ? "Mute spoken replies" : "Unmute spoken replies"}
              aria-pressed={voiceEnabled}
              title={voiceEnabled ? "Spoken replies on" : "Spoken replies off"}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted transition hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={toggleContinuousMode}
            aria-pressed={continuousMode}
            className="mt-3 self-center rounded-lg px-2 py-1 text-xs text-muted underline-offset-2 hover:text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          >
            Continuous conversation: {continuousMode ? "On" : "Off"}
          </button>
          {voiceError ? (
            <button
              type="button"
              onClick={startOrStopListening}
              className="mt-1 self-center text-xs font-medium text-brand underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              Try microphone again
            </button>
          ) : null}
          {!isSpeaking && voiceEnabled && messages.some((message) => message.role === "assistant") ? (
            <button
              type="button"
              onClick={() => {
                const lastReply = [...messages].reverse().find((message) => message.role === "assistant");
                if (lastReply) speak(lastReply.text);
              }}
              className="mt-2 self-center text-xs font-medium text-brand underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              Play last reply
            </button>
          ) : null}
        </section>
      ) : null}

      <div
        ref={launcherRef}
        className="fixed bottom-[calc(12.5rem+env(safe-area-inset-bottom))] right-4 z-[91] flex flex-col items-end gap-2 print:hidden sm:right-6"
      >
        {isModeMenuOpen ? (
          <div className="assistant-mode-menu flex items-center gap-2" role="group" aria-label="Choose assistant mode">
            <button
              ref={voiceButtonRef}
              type="button"
              onClick={() => {
                switchToVoice();
                setIsModeMenuOpen(false);
              }}
              aria-label="Use voice assistant"
              title="Voice"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-brand shadow-lg transition hover:scale-105 hover:bg-brand hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <AudioLines className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                switchToText();
                setIsModeMenuOpen(false);
              }}
              aria-label="Use text assistant"
              title="Text"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-brand shadow-lg transition hover:scale-105 hover:bg-brand hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <MessageSquareText className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (assistantMode) {
              closeAssistant();
              return;
            }
            setIsModeMenuOpen((open) => !open);
          }}
          aria-label={assistantMode ? "Close SchoolBase AI" : isModeMenuOpen ? "Close assistant choices" : "Open SchoolBase AI choices"}
          aria-expanded={isModeMenuOpen || assistantMode !== null}
          aria-haspopup="true"
          className={`assistant-launcher-button relative flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-brand text-white shadow-lg shadow-brand/20 transition duration-200 hover:scale-105 hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand/30 active:scale-95 ${!assistantMode && !isModeMenuOpen ? "assistant-launcher-button--attention" : ""}`}
          title="SchoolBase AI"
        >
          {!assistantMode && !isModeMenuOpen ? (
            <>
              <span className="assistant-launcher-glow" aria-hidden="true" />
              <span className="assistant-launcher-ring" aria-hidden="true" />
              <span className="assistant-launcher-orbit" aria-hidden="true">
                <span className="assistant-launcher-particle" />
              </span>
            </>
          ) : null}
          <span className="relative z-[1]">
            {assistantMode ? <X className="h-6 w-6" aria-hidden="true" /> : <Mic className="h-6 w-6" aria-hidden="true" />}
          </span>
        </button>
      </div>
    </>
  );
}
