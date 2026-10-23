"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, KeyRound, RefreshCw, Sparkles, UserRoundPlus, Search, Printer, Eye, Download, ShieldOff, Copy, X, Users, CheckCircle2, Clock3, AlertTriangle, ClipboardList, ListFilter } from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";
import { buildPinCardHtml, buildPinSheetHtml } from "@/lib/pin-print";
import { resolveSchoolAssetUrl } from "@/lib/asset-urls";
import { ErrorModal } from "@/components/ui/error-modal";
import { UserGuide, type PageHelpGuide } from "@/components/ui/user-guide";

interface PinStatus {
  enabled: boolean;
  mode: string;
  pinType: string;
  pinValidity: string;
  allowRegeneration: boolean;
}

interface StudentPinResult {
  ok: boolean;
  pin?: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNo?: string | null;
  };


  pinRecord?: {
    id: string;
    status?: string;
  };
  sessionName?: string | null;
  termName?: string | null;
  assessmentName?: string | null;
  schoolName?: string | null;
}

interface TermOption {
  id: string;
  name: string;
  isCurrent?: boolean;
  academicYearId?: string;
  academicYearName?: string | null;
}

interface SessionOption {
  id: string;
  name: string;
  isCurrent?: boolean;
  terms: TermOption[];
}

interface AssessmentOption {
  id: string;
  name: string;
  phase?: string | null;
  classId?: string | null;
  term?: {
    id?: string;
    name?: string | null;
    academicYear?: {
      name?: string | null;
    } | null;
  } | null;
}

interface BatchPinResult {
  ok: boolean;
  batch?: {
    id: string;
    quantity?: number;
  };
  pins?: Array<{
    pin: string;
    recordId: string;
  }>;
  schoolCode?: string | null;
  schoolName?: string | null;
}

interface GuardianOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  relation?: string | null;
}

interface StudentOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  admissionNo?: string | null;
  class?: {
    id?: string | null;
    name?: string | null;
    phase?: string | null;
  } | null;
  guardians?: Array<{
    guardian: GuardianOption;
    relation?: string | null;
  }>;
}

interface PinRecord {
  id: string;
  pinValue?: string | null;
  studentId?: string | null;
  type?: string | null;
  status?: string | null;
  expiresAt?: string | null;
  generatedAt?: string | null;
  lastValidatedAt?: string | null;
  generatedBy?: string | null;
  student?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    admissionNo?: string | null;
    class?: {
      id: string;
      name?: string | null;
    } | null;
  } | null;
  batch?: {
    id: string;
    batchName?: string | null;
  } | null;
  term?: {
    id: string;
    name?: string | null;
    academicYear?: {
      name?: string | null;
    } | null;
  } | null;
}

interface SchoolMeta {
  id?: string;
  name?: string | null;
  slug?: string | null;
  logoUrl?: string | null;
}

const isToday = (value?: string | null) => {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

function PinModal({
  pin,
  schoolMeta,
  onClose,
  onPrint,
  onCopy,
}: {
  pin: PinRecord;
  schoolMeta: SchoolMeta | null;
  onClose: () => void;
  onPrint: (pin: PinRecord) => void;
  onCopy: () => void;
}) {
  return (
    <ErrorModal
      isOpen={true}
      onClose={onClose}
      type="success"
      title="PIN preview"
      message=""
      confirmLabel="Close"
    >
      <div className="mt-2 space-y-4 text-sm text-muted">
        <div className="text-center">
          <div className="mb-3 text-xs text-muted">PIN</div>
          <div className="inline-block rounded-lg border border-border bg-background px-6 py-4 text-2xl font-mono tracking-[0.3em] text-foreground">{pin.pinValue || '—'}</div>
        </div>

        <div className="space-y-2">
          <div><span className="font-medium text-foreground">Student:</span> {pin.student ? `${pin.student.lastName || ''} ${pin.student.firstName || ''}`.trim() : '—'}</div>
          <div><span className="font-medium text-foreground">School code:</span> {schoolMeta?.slug || '—'}</div>
          <div><span className="font-medium text-foreground">Admission number:</span> {pin.student?.admissionNo || '—'}</div>
          <div><span className="font-medium text-foreground">Session:</span> {pin.term?.academicYear?.name || '—'}</div>
          <div><span className="font-medium text-foreground">Term:</span> {pin.term?.name || '—'}</div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => { onCopy(); }} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90">
            <Copy className="h-4 w-4" /> Copy PIN
          </button>
          <button type="button" onClick={() => { onPrint(pin); }} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/30">
            <Printer className="h-4 w-4" /> Print sheet
          </button>
        </div>
      </div>
    </ErrorModal>
  );
}

function GeneratedPinModal({
  data,
  schoolMeta,
  onClose,
  onPrint,
  onCopy,
}: {
  data: StudentPinResult;
  schoolMeta: SchoolMeta | null;
  onClose: () => void;
  onPrint: () => void;
  onCopy: () => void;
}) {
  return (
    <ErrorModal
      isOpen={true}
      onClose={onClose}
      type="success"
      title="Generated PIN"
      message={data.pin || ''}
      confirmLabel="Close"
    >
      <div className="mt-2 space-y-4 text-sm text-muted">
        <div className="text-center">
          <div className="mb-3 text-xs text-muted">PIN</div>
          <div className="inline-block rounded-lg border border-border bg-background px-6 py-4 text-2xl font-mono tracking-[0.3em] text-foreground">{data.pin}</div>
        </div>

        <div className="space-y-2">
          <div><span className="font-medium text-foreground">Student:</span> {data.student ? `${data.student.lastName || ''} ${data.student.firstName || ''}`.trim() : '—'}</div>
          <div><span className="font-medium text-foreground">School code:</span> {schoolMeta?.slug || '—'}</div>
          <div><span className="font-medium text-foreground">Admission number:</span> {data.student?.admissionNo || '—'}</div>
          <div><span className="font-medium text-foreground">Session:</span> {data.sessionName || '—'}</div>
          <div><span className="font-medium text-foreground">Term:</span> {data.termName || '—'}</div>
          <div><span className="font-medium text-foreground">Assessment:</span> {data.assessmentName || '—'}</div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={onCopy} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90">
            <Copy className="h-4 w-4" /> Copy PIN
          </button>
          <button type="button" onClick={onPrint} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/30">
            <Printer className="h-4 w-4" /> Print sheet
          </button>
        </div>
      </div>
    </ErrorModal>
  );
}

export default function ResultPinsPage() {
  const [status, setStatus] = useState<PinStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [studentId, setStudentId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; phase?: string | null }>>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [submittingClass, setSubmittingClass] = useState(false);
  const [classPinError, setClassPinError] = useState<string | null>(null);
  const [classPinSummary, setClassPinSummary] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(10);
  const [batchName, setBatchName] = useState("");
  const [pinFormat, setPinFormat] = useState("XXXX-XXXX");
  const [pinLength, setPinLength] = useState(8);
  const [generatedStudent, setGeneratedStudent] = useState<StudentPinResult | null>(null);
  const [generatedBatch, setGeneratedBatch] = useState<BatchPinResult | null>(null);
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [pinSearch, setPinSearch] = useState("");
  const [pinFilterStatus, setPinFilterStatus] = useState("all");
  const [pinFilterType, setPinFilterType] = useState("all");
  const [pinFilterSession, setPinFilterSession] = useState("all");
  const [pinFilterTerm, setPinFilterTerm] = useState("all");
  const [pinFilterClass, setPinFilterClass] = useState("all");
  const [pinFilterGeneratedBy, setPinFilterGeneratedBy] = useState("all");
  const [pinFilterBatch, setPinFilterBatch] = useState("all");
  const [pins, setPins] = useState<PinRecord[]>([]);
  const [selectedStudentPinIds, setSelectedStudentPinIds] = useState<string[]>([]);
  const [selectedGenericPinIds, setSelectedGenericPinIds] = useState<string[]>([]);
  const [statusModal, setStatusModal] = useState<{ open: boolean; type: "success" | "error"; title?: string; message: string }>({ open: false, type: "success", message: "" });
  const [notifyModal, setNotifyModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Sending notifications", message: "Please wait while the selected PIN notifications are being sent." });
  const [isNotifying, setIsNotifying] = useState(false);
  const [loadingPins, setLoadingPins] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<PinRecord | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [schoolMeta, setSchoolMeta] = useState<SchoolMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const backendUrl = getBackendUrl();

  // Persist selection across pages using localStorage
  const SELECTION_KEY = 'resultPins:selectedIds';
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SELECTION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.student)) {
            setSelectedStudentPinIds(parsed.student.filter((v: unknown) => typeof v === 'string'));
          }
          if (Array.isArray(parsed.generic)) {
            setSelectedGenericPinIds(parsed.generic.filter((v: unknown) => typeof v === 'string'));
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SELECTION_KEY, JSON.stringify({
        student: selectedStudentPinIds,
        generic: selectedGenericPinIds,
      }));
    } catch (e) {
      // ignore
    }
  }, [selectedStudentPinIds, selectedGenericPinIds]);

  const loadSchoolMeta = async () => {
    try {
      const [schoolResponse, settingsResponse] = await Promise.all([
        fetch("/api/admin/school", { credentials: "include" }),
        fetch("/api/admin/settings/data", { credentials: "include" }),
      ]);

      const schoolData = schoolResponse.ok ? await schoolResponse.json() : null;
      const settingsData = settingsResponse.ok ? await settingsResponse.json() : null;
      const configuredLogoUrl = settingsData?.config?.logoUrl || schoolData?.logoUrl || schoolData?.school?.logoUrl || null;
      const resolvedLogoUrl = configuredLogoUrl ? resolveSchoolAssetUrl(configuredLogoUrl) : null;

      setSchoolMeta({
        id: schoolData?.id || schoolData?.school?.id,
        name: schoolData?.name || schoolData?.school?.name,
        slug: settingsData?.config?.slug || schoolData?.slug || schoolData?.school?.slug,
        logoUrl: resolvedLogoUrl,
      });
    } catch (err) {
      console.error("Unable to load school metadata", err);
    }
  };

  const loadStatus = async () => {
    try {
      setLoadingStatus(true);
      const response = await fetch(`/api/admin/result-pins/status`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load PIN settings");
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load PIN settings");
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadMetadataOptions = async () => {
    try {
      const [academicYearsResponse, assessmentsResponse, studentsResponse] = await Promise.all([
        fetch(`${backendUrl}/api/admin/academic-years`, { credentials: "include" }),
        fetch(`${backendUrl}/api/admin/results/data`, { credentials: "include" }),
        fetch(`${backendUrl}/api/admin/students/data`, { credentials: "include" }),
      ]);

      if (academicYearsResponse.ok) {
        const academicYearsData = await academicYearsResponse.json();
        const academicYearItems = Array.isArray(academicYearsData?.academicYears) ? academicYearsData.academicYears : [];
        const normalizedSessions = academicYearItems.map((year: any) => ({
          id: year.id,
          name: year.name,
          isCurrent: Boolean(year.isCurrent),
          terms: Array.isArray(year.terms)
            ? year.terms.map((term: any) => ({
                id: term.id,
                name: term.name,
                isCurrent: Boolean(term.isCurrent),
                academicYearId: term.academicYearId || year.id,
                academicYearName: year.name,
              }))
            : [],
        }));
        setSessions(normalizedSessions as SessionOption[]);
        const flattenedTerms = normalizedSessions.flatMap((session: SessionOption) =>
          session.terms.map((term) => ({
            ...term,
            academicYearName: session.name,
          })),
        );
        setTerms(flattenedTerms as TermOption[]);
      } else {
        const fallbackTermsResponse = await fetch(`${backendUrl}/api/admin/terms`, { credentials: "include" });
        if (fallbackTermsResponse.ok) {
          const fallbackTermsData = await fallbackTermsResponse.json();
          setTerms((fallbackTermsData.terms || []) as TermOption[]);
          setSessions([]);
        }
      }

      if (assessmentsResponse.ok) {
        const assessmentsData = await assessmentsResponse.json();
        const assessmentItems = Array.isArray(assessmentsData?.assessments) ? assessmentsData.assessments : [];
        setAssessments(assessmentItems as AssessmentOption[]);
      }

      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        const classItems = Array.isArray(studentsData?.classes) ? studentsData.classes : [];
        const studentItems = Array.isArray(studentsData?.pupils) ? studentsData.pupils : [];
        setClasses(classItems as Array<{ id: string; name: string; phase?: string | null }>);
        setStudents(studentItems as StudentOption[]);
      }
    } catch (err) {
      console.error("Failed to load metadata options", err);
    }
  };

  useEffect(() => {
    void loadSchoolMeta();
    void loadStatus();
    void loadPins();
    void loadMetadataOptions();
  }, []);

  const loadPins = async (searchValue = pinSearch) => {
    try {
      setLoadingPins(true);
      setCurrentPage(1);
      const response = await fetch(`/api/admin/result-pins/pins?search=${encodeURIComponent(searchValue)}&limit=50`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load PIN records");
      const data = await response.json();
      setPins(data.pins || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load PIN records");
    } finally {
      setLoadingPins(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return students;
    return students.filter((student) => student.class?.id === selectedClassId);
  }, [selectedClassId, students]);

  const selectedClassStudentCount = useMemo(() => {
    if (!selectedClassId) return 0;
    return students.filter((student) => student.class?.id === selectedClassId).length;
  }, [selectedClassId, students]);

  const selectedClassPhase = useMemo(() => {
    if (!selectedClassId) return null;
    return classes.find((classItem) => classItem.id === selectedClassId)?.phase || null;
  }, [classes, selectedClassId]);

  const filteredAssessments = useMemo(() => {
    const termFiltered = selectedTermId
      ? assessments.filter((assessment) => assessment.term?.id === selectedTermId)
      : assessments;

    if (!selectedClassId) return termFiltered;

    return termFiltered.filter((assessment) => {
      if (assessment.classId) {
        return assessment.classId === selectedClassId;
      }
      if (selectedClassPhase) {
        return assessment.phase === selectedClassPhase;
      }
      return true;
    });
  }, [assessments, selectedClassId, selectedClassPhase, selectedTermId]);

  useEffect(() => {
    if (selectedAssessmentId && !filteredAssessments.some((assessment) => assessment.id === selectedAssessmentId)) {
      setSelectedAssessmentId("");
    }
  }, [filteredAssessments, selectedAssessmentId]);

  const summaryCards = useMemo(() => {
    const totals = pins.reduce(
      (accumulator, pin) => {
        accumulator.total += 1;
        if (pin.status === "ACTIVE") accumulator.active += 1;
        if (pin.status === "USED" || pin.lastValidatedAt) accumulator.used += 1;
        if (pin.status === "EXPIRED") accumulator.expired += 1;
        if (pin.status === "REVOKED") accumulator.revoked += 1;
        if (pin.studentId) accumulator.assigned += 1;
        else accumulator.unassigned += 1;
        if (pin.lastValidatedAt && isToday(pin.lastValidatedAt)) accumulator.today += 1;
        if (pin.lastValidatedAt) {
          const identifier = pin.studentId || pin.pinValue || pin.id;
          accumulator.loggedIn.add(identifier);
        }
        return accumulator;
      },
      {
        total: 0,
        active: 0,
        used: 0,
        assigned: 0,
        unassigned: 0,
        expired: 0,
        revoked: 0,
        today: 0,
        loggedIn: new Set<string>(),
      } as {
        total: number;
        active: number;
        used: number;
        assigned: number;
        unassigned: number;
        expired: number;
        revoked: number;
        today: number;
        loggedIn: Set<string>;
      },
    );

    const unused = Math.max(0, totals.active - totals.used);

    return [
      { label: "Active PINs", value: totals.active, sub: "Ready for use", icon: CheckCircle2, iconClass: "bg-emerald-100 text-emerald-700" },
      { label: "Used PINs", value: totals.used, sub: "Validated at least once", icon: Users, iconClass: "bg-sky-100 text-sky-700" },
      { label: "Unused PINs", value: unused, sub: "Available and not validated", icon: Sparkles, iconClass: "bg-violet-100 text-violet-700" },
      { label: "Today's accesses", value: totals.today, sub: "PINs validated today", icon: Clock3, iconClass: "bg-orange-100 text-orange-700" },
    ];
  }, [pins]);

  const summary = useMemo(() => {
    const totals = pins.reduce(
      (accumulator, pin) => {
        accumulator.total += 1;
        if (pin.status === "ACTIVE") accumulator.active += 1;
        if (pin.status === "EXPIRED") accumulator.expired += 1;
        if (pin.status === "REVOKED") accumulator.revoked += 1;
        if (pin.studentId) accumulator.assigned += 1;
        else accumulator.unassigned += 1;
        return accumulator;
      },
      {
        total: 0,
        active: 0,
        assigned: 0,
        unassigned: 0,
        expired: 0,
        revoked: 0,
      },
    );

    return totals;
  }, [pins]);

  const filteredPins = useMemo(() => {
    return pins.filter((pin) => {
      if (pinFilterStatus !== "all" && (pin.status || "ACTIVE").toUpperCase() !== pinFilterStatus.toUpperCase()) {
        return false;
      }
      if (pinFilterType !== "all" && (pin.type || "GENERIC").toUpperCase() !== pinFilterType.toUpperCase()) {
        return false;
      }
      if (pinFilterSession !== "all" && (pin.term?.academicYear?.name || "") !== pinFilterSession) {
        return false;
      }
      if (pinFilterTerm !== "all" && (pin.term?.name || "") !== pinFilterTerm) {
        return false;
      }
      if (pinFilterClass !== "all" && (pin.student?.class?.name || "") !== pinFilterClass) {
        return false;
      }
      if (pinFilterGeneratedBy !== "all" && (pin.generatedBy || "system") !== pinFilterGeneratedBy) {
        return false;
      }
      if (pinFilterBatch !== "all" && (pin.batch?.batchName || "") !== pinFilterBatch) {
        return false;
      }
      return true;
    });
  }, [pins, pinFilterStatus, pinFilterType, pinFilterSession, pinFilterTerm, pinFilterClass, pinFilterGeneratedBy, pinFilterBatch]);

  const filteredStudentPins = useMemo(() => filteredPins.filter((pin) => (pin.type || "GENERIC").toUpperCase() !== "GENERIC"), [filteredPins]);
  const filteredGenericPins = useMemo(() => filteredPins.filter((pin) => (pin.type || "GENERIC").toUpperCase() === "GENERIC"), [filteredPins]);

  const totalFilteredRows = filteredStudentPins.length;
  const pageCount = Math.max(1, Math.ceil(totalFilteredRows / pageSize));
  const pagedPins = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredStudentPins.slice(startIndex, startIndex + pageSize);
  }, [filteredStudentPins, currentPage]);

  const pagePinIds = useMemo(() => pagedPins.map((pin) => pin.id), [pagedPins]);
  const studentPageAllSelected = pagePinIds.length > 0 && pagePinIds.every((id) => selectedStudentPinIds.includes(id));

  const handleTogglePinSelection = (pinId: string, scope: 'student' | 'generic') => {
    if (scope === 'generic') {
      setSelectedGenericPinIds((current) =>
        current.includes(pinId) ? current.filter((id) => id !== pinId) : [...current, pinId],
      );
      return;
    }

    setSelectedStudentPinIds((current) =>
      current.includes(pinId) ? current.filter((id) => id !== pinId) : [...current, pinId],
    );
  };

  const handleToggleSelectAll = (scope: 'student' | 'generic') => {
    if (scope === 'generic') {
      setSelectedGenericPinIds((current) => (pageAllSelectedGeneric ? current.filter((id) => !genericPagePinIds.includes(id)) : Array.from(new Set([...current, ...genericPagePinIds]))));
      return;
    }

    setSelectedStudentPinIds((current) => (studentPageAllSelected ? [] : pagePinIds));
  };

  const handleExportSelected = (scope: 'student' | 'generic') => {
    const selectedPins = scope === 'generic'
      ? genericServerPins.filter((pin) => selectedGenericPinIds.includes(pin.id))
      : pins.filter((pin) => selectedStudentPinIds.includes(pin.id));

    if (!selectedPins.length) return;
    const lines = selectedPins.map((pin) => `${pin.pinValue || "—"}\t${pin.student ? `${pin.student.lastName || ""} ${pin.student.firstName || ""}`.trim() : "Unassigned"}`).join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `result-pins-selected.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleNotifySelected = async (scope: 'student' | 'generic') => {
    const selectedIds = scope === 'generic' ? selectedGenericPinIds : selectedStudentPinIds;
    if (!selectedIds.length || isNotifying) return;

    setIsNotifying(true);
    setNotifyModal({ open: true, title: 'Sending notifications', message: 'Please wait while the selected PIN notifications are being sent.' });

    try {
      const response = await fetch('/api/admin/result-pins/pins/bulk/notify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-school-id': localStorage.getItem('schoolId') || '' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Failed to send PIN notifications');

      const batchCount = data?.batches ? ` in ${data.batches} safe batch${data.batches > 1 ? 'es' : ''}` : '';
      setStatusModal({
        open: true,
        type: 'success',
        title: 'Notifications sent',
        message: `Sent ${data?.sent || 0} PIN delivery notification(s) to guardians${batchCount}.`,
      });

      if (scope === 'generic') {
        setSelectedGenericPinIds([]);
      } else {
        setSelectedStudentPinIds([]);
      }
    } catch (err) {
      setStatusModal({
        open: true,
        type: 'error',
        title: 'Unable to send notifications',
        message: err instanceof Error ? err.message : 'PIN notifications could not be sent.',
      });
    } finally {
      setIsNotifying(false);
      setNotifyModal({ open: false, title: 'Sending notifications', message: 'Please wait while the selected PIN notifications are being sent.' });
    }
  };

  const handlePrintSelected = async (scope: 'student' | 'generic') => {
    const selectedPins = scope === 'generic'
      ? genericServerPins.filter((pin) => selectedGenericPinIds.includes(pin.id))
      : pins.filter((pin) => selectedStudentPinIds.includes(pin.id));
    if (!selectedPins.length) return;

    const cards = selectedPins.map((pin) => ({
      schoolName: schoolMeta?.name || undefined,
      schoolLogoUrl: schoolMeta?.logoUrl || (schoolMeta?.id ? `/api/school-logo/${encodeURIComponent(schoolMeta.id)}` : undefined),
      schoolId: schoolMeta?.id,
      schoolCode: schoolMeta?.slug || "—",
      studentName: pin.student ? `${pin.student.lastName || ""} ${pin.student.firstName || ""}`.trim() : "Student",
      admissionNo: pin.student?.admissionNo || "N/A",
      session: pin.term?.academicYear?.name || "—",
      term: pin.term?.name || "—",
      pin: pin.pinValue || "—",
      printedAt: new Date().toLocaleString(),
    }));

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    const html = await buildPinSheetHtml(cards, { title: `Selected PINs` });
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (printError) {
        console.error("Unable to print selected PIN sheet", printError);
      }

      setTimeout(() => {
        try {
          printWindow.close();
        } catch (closeError) {
          console.error("Unable to close PIN sheet popup", closeError);
        }
      }, 900);
    }, 900);
  };

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; kind: 'deactivate' | 'delete' | null; scope: 'student' | 'generic' | null }>({ open: false, kind: null, scope: null });

  const handleOpenConfirm = (kind: 'deactivate' | 'delete', scope: 'student' | 'generic') => {
    setConfirmModal({ open: true, kind, scope });
  };

  const performBulkAction = async () => {
    if (!confirmModal.kind || !confirmModal.scope) return;
    const selectedIds = confirmModal.scope === 'generic' ? selectedGenericPinIds : selectedStudentPinIds;
    if (!selectedIds.length) return;

    try {
      if (confirmModal.kind === 'deactivate') {
        const response = await fetch('/api/admin/result-pins/pins/bulk/status', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds, status: 'INACTIVE' }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || 'Failed to deactivate selected PINs');
        setStatusModal({ open: true, type: 'success', title: 'Deactivated', message: `Deactivated ${data.updated || selectedIds.length} PIN(s).` });
      } else if (confirmModal.kind === 'delete') {
        const response = await fetch('/api/admin/result-pins/pins/bulk/delete', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || 'Failed to delete selected PINs');
        setStatusModal({ open: true, type: 'success', title: 'Deleted', message: `Deleted ${data.deleted || selectedIds.length} PIN(s).` });
      }

      if (confirmModal.scope === 'generic') {
        setSelectedGenericPinIds([]);
      } else {
        setSelectedStudentPinIds([]);
      }
      await loadPins();
      await loadGenericPins(pinSearch, genericCurrentPage);
    } catch (err) {
      setStatusModal({ open: true, type: 'error', title: 'Failed', message: err instanceof Error ? err.message : 'Bulk action failed' });
    } finally {
      setConfirmModal({ open: false, kind: null, scope: null });
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [pinFilterStatus, pinFilterType, pinFilterSession, pinFilterTerm, pinFilterClass, pinFilterGeneratedBy, pinFilterBatch, pinSearch]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  // Generic (scratch card) pagination + selection
  const [genericCurrentPage, setGenericCurrentPage] = useState(1);
  const GENERIC_PAGE_SIZE = pageSize;
  const [genericServerPins, setGenericServerPins] = useState<PinRecord[]>([]);
  const [genericTotal, setGenericTotal] = useState<number>(0);
  const genericPageCount = Math.max(1, Math.ceil((genericTotal || 0) / GENERIC_PAGE_SIZE));

  const loadGenericPins = async (searchValue = pinSearch, page = genericCurrentPage) => {
    try {
      const params = new URLSearchParams();
      params.set('search', String(searchValue || ''));
      params.set('limit', String(GENERIC_PAGE_SIZE));
      params.set('page', String(page));
      params.set('type', 'GENERIC');
      if (pinFilterStatus && pinFilterStatus !== 'all') params.set('status', pinFilterStatus);
      if (pinFilterBatch && pinFilterBatch !== 'all') params.set('batch', pinFilterBatch);
      if (pinFilterTerm && pinFilterTerm !== 'all') params.set('term', pinFilterTerm);
      if (pinFilterSession && pinFilterSession !== 'all') params.set('session', pinFilterSession);
      if (pinFilterGeneratedBy && pinFilterGeneratedBy !== 'all') params.set('generatedBy', pinFilterGeneratedBy);
      if (pinFilterClass && pinFilterClass !== 'all') params.set('classId', pinFilterClass);

      const response = await fetch(`/api/admin/result-pins/pins?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load generic PIN records');
      const data = await response.json();
      setGenericServerPins(data.pins || []);
      setGenericTotal(Number(data.total || 0));
      setGenericCurrentPage(Number(data.page || page));
    } catch (err) {
      console.error('Failed to load generic pins', err);
    }
  };

  const genericPagePinIds = useMemo(() => genericServerPins.map((pin) => pin.id), [genericServerPins]);
  const pageAllSelectedGeneric = genericPagePinIds.length > 0 && genericPagePinIds.every((id) => selectedGenericPinIds.includes(id));

  const handleToggleSelectAllGeneric = () => {
    setSelectedGenericPinIds((current) =>
      pageAllSelectedGeneric ? current.filter((id) => !genericPagePinIds.includes(id)) : Array.from(new Set([...current, ...genericPagePinIds])),
    );
  };

  useEffect(() => {
    setGenericCurrentPage(1);
  }, [pinFilterStatus, pinFilterType, pinFilterSession, pinFilterTerm, pinFilterClass, pinFilterGeneratedBy, pinFilterBatch, pinSearch]);

  useEffect(() => {
    void loadGenericPins(pinSearch, genericCurrentPage);
  }, [pinSearch, genericCurrentPage, pinFilterStatus, pinFilterBatch, pinFilterSession, pinFilterTerm, pinFilterGeneratedBy, pinFilterClass]);

  const handleGenerateStudentPin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmittingStudent(true);

    try {
      const response = await fetch(`/api/admin/result-pins/generate/student`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pupilId: studentId.trim(),
          termId: selectedTermId || undefined,
          assessmentId: selectedAssessmentId || undefined,
          generatedBy: "admin-ui",
          pinFormat,
          pinLength,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to generate student PIN");
      const selectedStudent = students.find((entry) => entry.id === studentId);
      setGeneratedStudent({
        ...data,
        student: {
          ...(data.student || {}),
          admissionNo: selectedStudent?.admissionNo || data.student?.admissionNo || null,
        },
        schoolName: schoolMeta?.name || null,
      });
      setStudentId("");
      await loadPins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate student PIN");
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handlePrintSheet = async () => {
    if (!generatedStudent?.pin) return;

    const studentName = generatedStudent.student ? `${generatedStudent.student.lastName || ""} ${generatedStudent.student.firstName || ""}`.trim() : "Student";
    const schoolCode = schoolMeta?.slug || "—";
    const admissionNo = generatedStudent.student?.admissionNo || "N/A";
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const schoolLogoUrl = schoolMeta?.logoUrl || (schoolMeta?.id ? `/api/school-logo/${encodeURIComponent(schoolMeta.id)}` : undefined);
    const html = await buildPinCardHtml({
      schoolName: generatedStudent.schoolName || schoolMeta?.name || undefined,
      schoolLogoUrl,
      schoolId: schoolMeta?.id,
      schoolCode,
      studentName,
      admissionNo,
      session: generatedStudent.sessionName || "—",
      term: generatedStudent.termName || "—",
      pin: generatedStudent.pin,
      printedAt: new Date().toLocaleString(),
    });

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (printError) {
        console.error("Unable to print PIN card", printError);
      }

      setTimeout(() => {
        try {
          printWindow.close();
        } catch (closeError) {
          console.error("Unable to close PIN card popup", closeError);
        }
      }, 900);
    }, 900);
  };

  const handleGenerateClassPins = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setClassPinError(null);
    setClassPinSummary(null);
    setSubmittingClass(true);

    if (!selectedClassId) {
      setClassPinError("Please select a class to generate PINs for.");
      setSubmittingClass(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/result-pins/generate/class`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          termId: selectedTermId || undefined,
          assessmentId: selectedAssessmentId || undefined,
          generatedBy: "admin-ui",
          pinFormat,
          pinLength,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to generate PINs for the selected class");

      const cards = (data.cards || []).map((entry: any) => ({
        schoolName: data.school?.name || schoolMeta?.name || undefined,
        schoolLogoUrl: schoolMeta?.logoUrl || (schoolMeta?.id ? `/api/school-logo/${encodeURIComponent(schoolMeta.id)}` : undefined),
        schoolId: data.school?.id || schoolMeta?.id,
        schoolCode: schoolMeta?.slug || "—",
        studentName: `${entry.student?.lastName || ""} ${entry.student?.firstName || ""}`.trim(),
        admissionNo: entry.student?.admissionNo || "N/A",
        session: entry.sessionName || data.sessionName || "—",
        term: entry.termName || data.termName || "—",
        pin: entry.pin,
        printedAt: new Date().toLocaleString(),
      }));

      if (!cards.length) {
        throw new Error("No active students were found for the selected class.");
      }

      const printWindow = window.open("", "_blank", "width=1200,height=900");
      if (!printWindow) {
        throw new Error("Your browser blocked the print window. Please allow pop-ups and try again.");
      }

      const className = classes.find((entry) => entry.id === selectedClassId)?.name || "Selected class";
      const html = await buildPinSheetHtml(cards, {
        title: `${className} PIN Sheet`,
      });

      printWindow.document.write(html);
      printWindow.document.close();

      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (printError) {
          console.error("Unable to print class PIN sheet", printError);
        }

        setTimeout(() => {
          try {
            printWindow.close();
          } catch (closeError) {
            console.error("Unable to close class PIN sheet popup", closeError);
          }
        }, 900);
      }, 800);

      setClassPinSummary(`Generated ${cards.length} PIN${cards.length === 1 ? "" : "s"} for ${className}.`);
      await loadPins();
    } catch (err) {
      setClassPinError(err instanceof Error ? err.message : "Failed to generate class PINs");
    } finally {
      setSubmittingClass(false);
    }
  };

  const handleGenerateBatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmittingBatch(true);

    try {
      const response = await fetch(`/api/admin/result-pins/generate/batch`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          batchName: batchName.trim() || undefined,
          generatedBy: "admin-ui",
          pinFormat,
          pinLength,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to generate PIN batch");
      setGeneratedBatch(data);
      setQuantity(10);
      setBatchName("");
      await loadPins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PIN batch");
    } finally {
      setSubmittingBatch(false);
    }
  };

  const handleCopyPin = async () => {
    if (!generatedStudent?.pin) return;
    try {
      await navigator.clipboard.writeText(generatedStudent.pin);
      setError(null);
    } catch (clipboardError) {
      console.error("Unable to copy PIN", clipboardError);
    }
  };

  const handleExportBatch = () => {
    if (!generatedBatch?.pins?.length) return;
    const lines = generatedBatch.pins.map((entry) => entry.pin).join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `result-pins-${generatedBatch.batch?.id || "batch"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPinValue = async (pinValue?: string | null) => {
    if (!pinValue) return;
    try {
      await navigator.clipboard.writeText(pinValue);
      setError(null);
      setStatusModal({ open: true, type: "success", title: "PIN copied", message: `Copied ${pinValue} to clipboard.` });
    } catch (clipboardError) {
      console.error("Unable to copy PIN", clipboardError);
      setError("Unable to copy PIN to clipboard.");
    }
  };

  const handleExportPin = (pinValue?: string | null) => {
    if (!pinValue) return;
    const blob = new Blob([pinValue], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `result-pin-${pinValue}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleViewPin = (pin: PinRecord) => {
    setSelectedPin(pin);
    setIsPinModalOpen(true);
  };

  const handlePrintPin = async (pin: PinRecord) => {
    const schoolCode = schoolMeta?.slug || "—";
    const admissionNo = pin.student?.admissionNo || "N/A";
    const studentName = pin.student ? `${pin.student.lastName || ""} ${pin.student.firstName || ""}`.trim() : "Unassigned";
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const schoolLogoUrl = schoolMeta?.logoUrl || (schoolMeta?.id ? `/api/school-logo/${encodeURIComponent(schoolMeta.id)}` : undefined);
    const html = await buildPinCardHtml({
      schoolName: schoolMeta?.name || undefined,
      schoolLogoUrl,
      schoolId: schoolMeta?.id,
      schoolCode,
      studentName,
      admissionNo,
      session: pin.term?.academicYear?.name || "—",
      term: pin.term?.name || "—",
      pin: pin.pinValue || "—",
      printedAt: new Date().toLocaleString(),
    });

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (printError) {
        console.error("Unable to print PIN card", printError);
      }

      setTimeout(() => {
        try {
          printWindow.close();
        } catch (closeError) {
          console.error("Unable to close PIN card popup", closeError);
        }
      }, 900);
    }, 900);
  };

  const handleStudentPrintClick = async () => {
    // Prefer the freshly generated student PIN, otherwise try to print an existing PIN for the selected student
    if (generatedStudent?.pin) {
      await handlePrintSheet();
      setGeneratedStudent(null);
      return;
    }

    const existingPin = pins.find((p) => p.student?.id === studentId);
    if (existingPin) {
      await handlePrintPin(existingPin);
      return;
    }

    setStatusModal({ open: true, type: "error", title: "No PIN to print", message: "No generated or existing PIN found for the selected student." });
  };

  const getTypeBadgeClass = (type?: string | null) => {
    const normalized = (type || "GENERIC").toUpperCase();
    if (normalized === "STUDENT") {
      return "border-violet-200 bg-violet-100 text-violet-700";
    }
    if (normalized === "GENERIC") {
      return "border-sky-200 bg-sky-100 text-sky-700";
    }
    return "border-slate-200 bg-slate-100 text-slate-700";
  };

  const getStatusBadgeClass = (status?: string | null) => {
    const normalized = (status || "ACTIVE").toUpperCase();
    if (normalized === "ACTIVE") {
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    }
    if (normalized === "USED") {
      return "border-sky-200 bg-sky-100 text-sky-700";
    }
    if (normalized === "EXPIRED") {
      return "border-amber-200 bg-amber-100 text-amber-700";
    }
    if (normalized === "REVOKED") {
      return "border-rose-200 bg-rose-100 text-rose-700";
    }
    return "border-slate-200 bg-slate-100 text-slate-700";
  };

  return (
    <main className="min-h-screen pb-12">
    <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
      <ErrorModal
        isOpen={statusModal.open}
        onClose={() => setStatusModal((prev) => ({ ...prev, open: false }))}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        confirmLabel={statusModal.type === "success" ? "Okay" : "Try again"}
      />

      <ErrorModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, kind: null, scope: null })}
        type="success"
        title={confirmModal.kind === 'delete' ? 'Delete selected PINs' : 'Deactivate selected PINs'}
        message={`Are you sure you want to ${confirmModal.kind === 'delete' ? 'delete' : 'deactivate'} ${(confirmModal.scope === 'generic' ? selectedGenericPinIds : selectedStudentPinIds).length} selected PIN(s)?`}
        action={{ label: 'Cancel', onClick: () => setConfirmModal({ open: false, kind: null, scope: null }) }}
        onSuccessAction={performBulkAction}
        confirmLabel="Confirm"
      />
      {isPinModalOpen && selectedPin ? (
        <PinModal
          pin={selectedPin}
          schoolMeta={schoolMeta}
          onClose={() => {
            setIsPinModalOpen(false);
            setSelectedPin(null);
          }}
          onPrint={handlePrintPin}
          onCopy={() => {
            if (!selectedPin?.pinValue) return;
            void handleCopyPinValue(selectedPin.pinValue);
          }}
        />
      ) : null}
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
      <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
            <KeyRound className="h-4 w-4" /> Results operations
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Result access PINs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Generate, print, and manage secure PINs for result publishing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/settings" className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-background">
            <ArrowLeft className="h-4 w-4" /> Settings
          </Link>
          <button
            type="button"
            onClick={() => document.getElementById('student-pin-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light"
          >
            <UserRoundPlus className="h-4 w-4" />
            Student PIN
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('class-pin-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light"
          >
            <Users className="h-4 w-4" />
            Class PINs
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('batch-pin-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light"
          >
            <Sparkles className="h-4 w-4" />
            Scratch Cards
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('pin-registry')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light"
          >
            <Printer className="h-4 w-4" />
            Print Sheet
          </button>
          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={loadingStatus}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${loadingStatus ? "animate-spin" : ""}`} />
            {loadingStatus ? "Syncing..." : "Sync status"}
          </button>
        </div>
      </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground">
            <KeyRound className="h-4 w-4 text-brand" />
            {loadingStatus ? "Loading status..." : status?.enabled ? "PIN access enabled" : "PIN access disabled"}
          </div>
          {status ? (
            <>
              <span className="text-sm text-muted">Mode: {status.mode}</span>
              <span className="text-sm text-muted">PIN type: {status.pinType}</span>
              <span className="text-sm text-muted">Validity: {status.pinValidity}</span>
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!status?.enabled ? (
        <div className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted">
          The feature is currently disabled for this school. Enable it from the Result Access PIN section in settings before generating PINs.
        </div>
      ) : null}

      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="border border-border bg-surface p-5 transition hover:border-brand/50">
                <div className="mb-4 flex items-center gap-2 text-brand">
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{card.label}</span>
                </div>
                <div className="text-3xl font-semibold text-foreground">{card.value}</div>
                <div className="mt-1 text-xs text-muted">{card.sub}</div>
              </div>
            );
          })}
        </section>

        <div className="mt-6 border-t border-border pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-brand"><ClipboardList className="h-[18px] w-[18px]" /><span className="text-xs font-bold uppercase tracking-[.12em] text-muted">PIN operations</span></div>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Result PIN Registry</h2>
            <p className="text-sm text-muted">Search by PIN, student name, admission number, or batch.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <Search className="h-4 w-4 text-muted" />
              <input
                value={pinSearch}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setPinSearch(nextValue);
                  void loadPins(nextValue);
                }}
                placeholder="Search PINs"
                className="w-44 bg-transparent text-sm text-foreground outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setPinSearch("");
                setPinFilterStatus("all");
                setPinFilterType("all");
                setPinFilterSession("all");
                setPinFilterTerm("all");
                setPinFilterClass("all");
                setPinFilterGeneratedBy("all");
                setPinFilterBatch("all");
                void loadPins("");
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/30"
            >
              Reset filters
            </button>
          </div>
        </div>
        </div>

        <div className="mt-4 border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><ListFilter className="h-4 w-4 text-brand" /> Filter registry</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select value={pinFilterStatus} onChange={(event) => setPinFilterStatus(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="all">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="REVOKED">Revoked</option>
          </select>
          <select value={pinFilterType} onChange={(event) => setPinFilterType(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="all">All PIN types</option>
            <option value="STUDENT">Student</option>
            <option value="GENERIC">Generic</option>
          </select>
          <select value={pinFilterSession} onChange={(event) => setPinFilterSession(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="all">All sessions</option>
            {Array.from(new Set(pins.map((pin) => pin.term?.academicYear?.name).filter(Boolean) as string[])).map((session) => (
              <option key={session} value={session}>{session}</option>
            ))}
          </select>
          <select value={pinFilterTerm} onChange={(event) => setPinFilterTerm(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="all">All terms</option>
            {Array.from(new Set(pins.map((pin) => pin.term?.name).filter(Boolean) as string[])).map((term) => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
          <select value={pinFilterClass} onChange={(event) => setPinFilterClass(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="all">All classes</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.name}>{classItem.name}</option>
            ))}
          </select>
          <select value={pinFilterGeneratedBy} onChange={(event) => setPinFilterGeneratedBy(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="all">All generators</option>
            {Array.from(new Set(pins.map((pin) => pin.generatedBy).filter(Boolean) as string[])).map((generatedBy) => (
              <option key={generatedBy} value={generatedBy}>{generatedBy}</option>
            ))}
          </select>
          <select value={pinFilterBatch} onChange={(event) => setPinFilterBatch(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="all">All batches</option>
            {Array.from(new Set(pins.map((pin) => pin.batch?.batchName).filter(Boolean) as string[])).map((batchName) => (
              <option key={batchName} value={batchName}>{batchName}</option>
            ))}
          </select>
          </div>
        </div>

        <div className="mt-4 overflow-hidden border border-border" id="pin-registry">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/60 px-3 py-3 text-sm text-muted">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={studentPageAllSelected}
                  onChange={() => handleToggleSelectAll('student')}
                  className="h-4 w-4 rounded border border-border text-brand focus:ring-brand"
                />
                {selectedStudentPinIds.length ? `${selectedStudentPinIds.length} selected` : "Select rows"}
              </div>
              <div className="hidden sm:inline">Use the table to choose rows for print or export.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!selectedStudentPinIds.length}
                onClick={() => { void handlePrintSelected('student'); }}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedStudentPinIds.length ? 'bg-brand border-brand text-white hover:bg-brand/90' : 'border-border bg-background text-foreground hover:bg-muted/30'}`}
              >
                <Printer className="h-3.5 w-3.5" /> Print Selected
              </button>
              <button
                type="button"
                disabled={!selectedStudentPinIds.length}
                onClick={() => handleExportSelected('student')}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedStudentPinIds.length ? 'bg-brand border-brand text-white hover:bg-brand/90' : 'border-border bg-background text-foreground hover:bg-muted/30'}`}
              >
                <Download className="h-3.5 w-3.5" /> Export Selected
              </button>
              <button
                type="button"
                disabled={!selectedStudentPinIds.length || isNotifying}
                onClick={() => { void handleNotifySelected('student'); }}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedStudentPinIds.length && !isNotifying ? 'bg-brand border-brand text-white hover:bg-brand/90' : 'border-border bg-background text-foreground hover:bg-muted/30'}`}
              >
                <Users className="h-3.5 w-3.5" /> {isNotifying ? 'Sending…' : 'Notify Guardians'}
              </button>
              <button
                type="button"
                disabled={!selectedStudentPinIds.length}
                onClick={() => handleOpenConfirm('deactivate', 'student')}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedStudentPinIds.length ? 'bg-brand border-brand text-white hover:bg-brand/90' : 'border-border bg-background/80 text-foreground opacity-50'}`}
              >
                <ShieldOff className="h-3.5 w-3.5" /> Deactivate Selected
              </button>
              <button
                type="button"
                disabled={!selectedStudentPinIds.length}
                onClick={() => handleOpenConfirm('delete', 'student')}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedStudentPinIds.length ? 'bg-brand border-brand text-white hover:bg-brand/90' : 'border-border bg-background/80 text-foreground opacity-50'}`}
              >
                <X className="h-3.5 w-3.5" /> Delete Selected
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/60 px-3 py-3 text-sm text-muted">
            <div>
              <span className="text-xs font-semibold text-foreground">Showing {totalFilteredRows} record{totalFilteredRows === 1 ? "" : "s"}</span>
              <Link href="/admin/settings/result-pins/all" className="ml-3 text-xs font-medium text-brand hover:underline">View all</Link>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1 || totalFilteredRows === 0}
                className="rounded border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-foreground">
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                disabled={currentPage === pageCount || totalFilteredRows === 0}
                className="rounded border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
          {loadingPins ? (
            <div className="p-4 text-sm text-muted">Loading records...</div>
          ) : totalFilteredRows === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full border border-border bg-background p-3">
                <ShieldOff className="h-5 w-5 text-muted" />
              </div>
              <div>
                  <p className="text-base font-semibold text-foreground">No student-linked Result PINs have been generated yet.</p>
                  <p className="mt-1 text-sm text-muted">Generate a student PIN or class PIN to see records here.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-background/60 text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-3 font-medium">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={studentPageAllSelected}
                            onChange={() => handleToggleSelectAll('student')}
                            className="h-4 w-4 rounded border border-border text-brand focus:ring-0"
                          />
                          <span className="sr-only">Select all</span>
                        </label>
                      </th>
                      <th className="px-3 py-3 font-medium">PIN</th>
                      <th className="px-3 py-3 font-medium">Student</th>
                      <th className="px-3 py-3 font-medium">Admission No.</th>
                      <th className="px-3 py-3 font-medium">Type</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Session</th>
                      <th className="px-3 py-3 font-medium">Term</th>
                      <th className="px-3 py-3 font-medium">Expiry</th>
                      <th className="px-3 py-3 font-medium">Generated</th>
                      <th className="px-3 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface/60">
                    {pagedPins.map((pin) => (
                      <tr key={pin.id} className="align-top">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedStudentPinIds.includes(pin.id)}
                            onChange={() => handleTogglePinSelection(pin.id, 'student')}
                            className="h-4 w-4 rounded border border-border text-brand"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold tracking-[0.2em] text-foreground">{pin.pinValue || '—'}</div>
                          <div className="mt-1 text-xs text-muted">{pin.batch?.batchName || 'Generated individually'}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-foreground">{pin.student ? `${pin.student.lastName || ''} ${pin.student.firstName || ''}`.trim() : 'Unassigned'}</div>
                          <div className="text-xs text-muted">{pin.student?.class?.name || '—'}</div>
                        </td>
                        <td className="px-3 py-3 text-foreground">{pin.student?.admissionNo || '—'}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getTypeBadgeClass(pin.type || 'GENERIC')}`}>
                            {pin.type || 'GENERIC'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(pin.status || 'ACTIVE')}`}>
                            {pin.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-foreground">{pin.term?.academicYear?.name || '—'}</td>
                        <td className="px-3 py-3 text-foreground">{pin.term?.name || '—'}</td>
                        <td className="px-3 py-3 text-foreground">{pin.expiresAt ? new Date(pin.expiresAt).toLocaleDateString() : '—'}</td>
                        <td className="px-3 py-3 text-foreground">{pin.generatedAt ? new Date(pin.generatedAt).toLocaleDateString() : '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => handleViewPin(pin)} className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100">
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await handleCopyPinValue(pin.pinValue);
                              }}
                              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              <Copy className="h-3.5 w-3.5" /> Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportPin(pin.pinValue)}
                              className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <Download className="h-3.5 w-3.5" /> Export
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>

        {notifyModal.open ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brand/20 bg-brand/10 text-brand">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{notifyModal.title}</h3>
                  <p className="text-sm text-muted">{notifyModal.message}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div id="generic-pin-registry" className="mt-4 rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Scratch Card Registry</h2>
              <p className="text-sm text-muted">Generic scratch cards are shown separately and remain unassigned until redeemed.</p>
            </div>
            <div className="text-xs text-muted">Showing {filteredGenericPins.length} scratch card{filteredGenericPins.length === 1 ? "" : "s"}</div>
          </div>

          {filteredGenericPins.length === 0 ? (
            <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted">
              No generic scratch cards match the current filters.
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={pageAllSelectedGeneric}
                    onChange={handleToggleSelectAllGeneric}
                    className="h-4 w-4 rounded border border-border text-brand focus:ring-brand"
                  />
                  {selectedGenericPinIds.length ? `${selectedGenericPinIds.length} selected` : 'Select rows'}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!selectedGenericPinIds.length}
                    onClick={() => { void handlePrintSelected('generic'); }}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedGenericPinIds.length ? 'bg-brand border-brand text-white hover:bg-brand/90' : 'border-border bg-background text-foreground hover:bg-muted/30'}`}
                  >
                    Print Selected
                  </button>
                  <button
                    type="button"
                    disabled={!selectedGenericPinIds.length}
                    onClick={() => handleExportSelected('generic')}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedGenericPinIds.length ? 'bg-brand border-brand text-white hover:bg-brand/90' : 'border-border bg-background text-foreground hover:bg-muted/30'}`}
                  >
                    Export Selected
                  </button>
                  <button
                    type="button"
                    disabled={!selectedGenericPinIds.length || isNotifying}
                    onClick={() => { void handleNotifySelected('generic'); }}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedGenericPinIds.length && !isNotifying ? 'bg-brand border-brand text-white hover:bg-brand/90' : 'border-border bg-background text-foreground hover:bg-muted/30'}`}
                  >
                    Notify Guardians
                  </button>
                  <button
                    type="button"
                    disabled={!selectedGenericPinIds.length}
                    onClick={() => handleOpenConfirm('deactivate', 'generic')}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedGenericPinIds.length ? 'bg-brand border-brand text-white hover:bg-brand/90' : 'border-border bg-background/80 text-foreground opacity-50'}`}
                  >
                    Deactivate Selected
                  </button>
                  <button
                    type="button"
                    disabled={!selectedGenericPinIds.length}
                    onClick={() => handleOpenConfirm('delete', 'generic')}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedGenericPinIds.length ? 'bg-brand border-brand text-white hover:bg-brand/90' : 'border-border bg-background/80 text-foreground opacity-50'}`}
                  >
                    Delete Selected
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-background/60 text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-3 font-medium">
                        <input type="checkbox" checked={pageAllSelectedGeneric} onChange={handleToggleSelectAllGeneric} className="h-4 w-4 rounded border border-border text-brand focus:ring-brand" />
                      </th>
                      <th className="px-3 py-3 font-medium">PIN</th>
                      <th className="px-3 py-3 font-medium">Batch</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Session</th>
                      <th className="px-3 py-3 font-medium">Term</th>
                      <th className="px-3 py-3 font-medium">Generated</th>
                      <th className="px-3 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface/60">
                    {genericServerPins.map((pin) => (
                      <tr key={pin.id} className="align-top">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedGenericPinIds.includes(pin.id)}
                            onChange={() => handleTogglePinSelection(pin.id, 'generic')}
                            className="h-4 w-4 rounded border border-border text-brand focus:ring-brand"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold tracking-[0.2em] text-foreground">{pin.pinValue || '—'}</div>
                        </td>
                        <td className="px-3 py-3 text-foreground">{pin.batch?.batchName || '—'}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(pin.status || 'ACTIVE')}`}>
                            {pin.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-foreground">{pin.term?.academicYear?.name || '—'}</td>
                        <td className="px-3 py-3 text-foreground">{pin.term?.name || '—'}</td>
                        <td className="px-3 py-3 text-foreground">{pin.generatedAt ? new Date(pin.generatedAt).toLocaleDateString() : '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => handleViewPin(pin)} className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100">
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                            <button type="button" onClick={() => handlePrintPin(pin)} className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100">
                              <Printer className="h-3.5 w-3.5" /> Print
                            </button>
                            <button type="button" onClick={async () => { await handleCopyPinValue(pin.pinValue); }} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                              <Copy className="h-3.5 w-3.5" /> Copy
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted">Page {genericCurrentPage} of {genericPageCount}</div>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={genericCurrentPage <= 1} onClick={() => setGenericCurrentPage((p) => Math.max(1, p - 1))} className="rounded-md border px-3 py-1 text-sm">Previous</button>
                  <button type="button" disabled={genericCurrentPage >= genericPageCount} onClick={() => setGenericCurrentPage((p) => Math.min(genericPageCount, p + 1))} className="rounded-md border px-3 py-1 text-sm">Next</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div id="student-pin-form" className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-semibold text-foreground">Generate Student PIN</h2>
          </div>
          <form onSubmit={handleGenerateStudentPin} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Student</label>
                <select
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                  required
                >
                  <option value="">Select a student</option>
                  {filteredStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {`${student.lastName || ""} ${student.firstName || ""}`.trim() || student.admissionNo || student.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Session / Term</label>
                <select
                  value={selectedTermId}
                  onChange={(event) => {
                    setSelectedTermId(event.target.value);
                    setSelectedAssessmentId("");
                  }}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  <option value="">Optional term</option>
                  {sessions.length > 0 ? (
                    sessions.map((session) => (
                      <optgroup key={session.id} label={session.name}>
                        {session.terms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.name}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  ) : (
                    terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.academicYearName ? `${term.academicYearName} • ${term.name}` : term.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Assessment</label>
              <select
                value={selectedAssessmentId}
                onChange={(event) => {
                  const nextAssessmentId = event.target.value;
                  setSelectedAssessmentId(nextAssessmentId);
                  if (!nextAssessmentId) {
                    setSelectedTermId("");
                    return;
                  }
                  const assessment = assessments.find((item) => item.id === nextAssessmentId);
                  if (assessment?.term?.id) {
                    setSelectedTermId(assessment.term.id);
                  }
                }}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
              >
                <option value="">Optional assessment</option>
                {filteredAssessments.map((assessment) => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submittingStudent || !status?.enabled}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {submittingStudent ? "Generating..." : "Generate student PIN"}
              </button>
              <button
                type="button"
                onClick={handleStudentPrintClick}
                disabled={!generatedStudent?.pin && !studentId}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Printer className="h-4 w-4" />
                Print sheet
              </button>
            </div>
          </form>

          {classPinError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {classPinError}
            </div>
          ) : null}

          {classPinSummary ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {classPinSummary}
            </div>
          ) : null}
          </div>

          <div id="class-pin-form" className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Printer className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-semibold text-foreground">Generate Class PINs</h2>
          </div>
          <form onSubmit={handleGenerateClassPins} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Class</label>
                <select
                  value={selectedClassId}
                  onChange={(event) => {
                    setSelectedClassId(event.target.value);
                  }}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                  required
                >
                  <option value="">Select a class</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Session / Term</label>
                <select
                  value={selectedTermId}
                  onChange={(event) => {
                    setSelectedTermId(event.target.value);
                    setSelectedAssessmentId("");
                  }}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  <option value="">Optional term</option>
                  {sessions.length > 0 ? (
                    sessions.map((session) => (
                      <optgroup key={session.id} label={session.name}>
                        {session.terms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.name}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  ) : (
                    terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.academicYearName ? `${term.academicYearName} • ${term.name}` : term.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted">
              {selectedClassId ? (
                <>
                  {selectedClassStudentCount} active student{selectedClassStudentCount === 1 ? "" : "s"} will receive PINs for this class.
                </>
              ) : (
                "Select a class to preview the student count."
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Assessment</label>
              <select
                value={selectedAssessmentId}
                onChange={(event) => {
                  const nextAssessmentId = event.target.value;
                  setSelectedAssessmentId(nextAssessmentId);
                  if (!nextAssessmentId) {
                    setSelectedTermId("");
                    return;
                  }
                  const assessment = assessments.find((item) => item.id === nextAssessmentId);
                  if (assessment?.term?.id) {
                    setSelectedTermId(assessment.term.id);
                  }
                }}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
              >
                <option value="">Optional assessment</option>
                {filteredAssessments.map((assessment) => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Format</label>
                <select
                  value={pinFormat}
                  onChange={(event) => setPinFormat(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  <option value="XXXX-XXXX">XXXX-XXXX</option>
                  <option value="XXXX-XXXX-XXXX">XXXX-XXXX-XXXX</option>
                  <option value="ALPHA-NUMERIC">Alpha-numeric</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Length</label>
                <input
                  type="number"
                  min={4}
                  max={12}
                  value={pinLength}
                  onChange={(event) => setPinLength(Number(event.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingClass || !status?.enabled}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Printer className="h-4 w-4" />
                {submittingClass ? "Generating..." : "Generate & Print Class PINs"}
              </button>
            </div>
          </form>
          </div>
        </div>

        {/** Generated student modal moved to end to avoid JSX adjacency issues */}
        <div id="batch-pin-form" className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-semibold text-foreground">Generate Scratch Cards</h2>
          </div>
          <form onSubmit={handleGenerateBatch} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={250}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Batch name</label>
                <input
                  value={batchName}
                  onChange={(event) => setBatchName(event.target.value)}
                  placeholder="Optional batch label"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Format</label>
                <select
                  value={pinFormat}
                  onChange={(event) => setPinFormat(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  <option value="XXXX-XXXX">XXXX-XXXX</option>
                  <option value="XXXX-XXXX-XXXX">XXXX-XXXX-XXXX</option>
                  <option value="ALPHA-NUMERIC">Alpha-numeric</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Length</label>
                <input
                  type="number"
                  min={4}
                  max={12}
                  value={pinLength}
                  onChange={(event) => setPinLength(Number(event.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submittingBatch || !status?.enabled}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {submittingBatch ? "Generating..." : "Generate batch"}
              </button>
              <button
                type="button"
                onClick={handleExportBatch}
                disabled={!generatedBatch?.pins?.length}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                Export TXT
              </button>
            </div>
          </form>

          {generatedBatch ? (
            <div className="mt-4 rounded-lg border border-border bg-background p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-foreground">Generated {generatedBatch.batch?.quantity || 0} PINs</p>
                <button
                  type="button"
                  onClick={handleExportBatch}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/30"
                >
                  <Download className="h-4 w-4" />
                  Export TXT
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {generatedBatch.pins?.slice(0, 10).map((entry) => (
                  <div key={entry.recordId} className="rounded border border-border bg-background/70 px-3 py-2 font-mono text-sm text-foreground">
                    {entry.pin}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {generatedStudent ? (
            <GeneratedPinModal
              data={generatedStudent}
              schoolMeta={schoolMeta}
              onClose={() => setGeneratedStudent(null)}
              onPrint={async () => {
                await handlePrintSheet();
                setGeneratedStudent(null);
              }}
              onCopy={async () => {
                if (!generatedStudent?.pin) return;
                try {
                  await navigator.clipboard.writeText(generatedStudent.pin);
                  setStatusModal({ open: true, type: "success", title: "PIN copied", message: `Copied ${generatedStudent.pin} to clipboard.` });
                } catch (err) {
                  console.error('Copy failed', err);
                  setError('Unable to copy PIN to clipboard.');
                }
              }}
            />
          ) : null}

          <UserGuide guide={HELP_GUIDE} />
      </div>
    </div>
    </main>

  );
}

const HELP_GUIDE: PageHelpGuide = {
  title: 'Result PIN Management',
  overview: 'Use this page to generate student PINs, issue generic scratch cards, and manage the PIN registry with printing, export, and bulk actions.',
  steps: [
    'Search or filter the registry by PIN, student name, batch, status, session, or term.',
    'Generate student PINs, class PINs, or scratch cards from the forms below.',
    'Use row selection to print, export, deactivate, or delete multiple PINs at once.',
    'Share the public Result Checker link — https://schoolbase.live/result/check — with parents and students for secure result entry.',
  ],
  commonTasks: [
    {
      title: 'Generate a student PIN',
      description: 'Select the student, optional term and assessment, then generate a PIN that can be printed or copied.',
      tips: ['Use the student search to quickly locate learners by name or admission number.'],
    },
    {
      title: 'Issue generic scratch cards',
      description: 'Create a batch of generic PINs for distribution and track them separately in the scratch card registry.',
      tips: ['Choose a batch name to help identify the cards later.', 'Use the generic registry search and pagination to review active scratch cards.'],
    },
    {
      title: 'Perform bulk actions',
      description: 'Select multiple records and use Print, Export, Deactivate, or Delete to manage PIN lifecycle efficiently.',
      tips: ['Deactivate old or unused PINs so they cannot be redeemed again.', 'Export selected PINs as text for offline distribution.'],
    },
  ],
  faqs: [
    {
      question: 'Where can students use the PIN?',
      answer: 'Students use the public Result Checker entry page at https://schoolbase.live/result/check to enter their PIN and view results.',
    },
    {
      question: 'How do I revoke an old PIN?',
      answer: 'Select the PINs and choose Deactivate Selected to prevent further use while preserving history.',
    },
    {
      question: 'What if a PIN is invalid?',
      answer: 'Confirm the status, then regenerate a new PIN or delete the invalid record and issue a fresh code.',
    },
  ],
};
