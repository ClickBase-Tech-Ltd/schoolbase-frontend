"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, UserMinus, UserCheck, Eye, Pencil, MoreHorizontal, ChevronLeft, ChevronRight, RotateCcw, X, Upload, Download, Users, Send, Mail, CheckSquare } from "lucide-react";
import { playCloseTone, playOpenTone } from "@/lib/sounds";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/pagination";
import { UserGuide, type PageHelpGuide } from "@/components/ui/user-guide";
import { ErrorModal } from "@/components/ui/error-modal";
import { pupilName } from "@/lib/format";
import { resolveFileUrl } from "@/lib/api-client";

const PHASE_CONFIG = {
  EARLY_YEARS: { label: "Early Years", badge: "bg-amber-100 text-amber-800" },
  PRIMARY: { label: "Primary", badge: "bg-blue-100 text-blue-800" },
  SECONDARY: { label: "Secondary", badge: "bg-purple-100 text-purple-800" },
  ALL: { label: "All Students", badge: "bg-gray-100 text-gray-800" },
};

const PHASE_ORDER = ["ALL", "EARLY_YEARS", "PRIMARY", "SECONDARY"];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 500] as const;
const DEFAULT_ITEMS_PER_PAGE = 10;

const HELP_GUIDE: PageHelpGuide = {
  title: "Managing Students",
  overview: "Manage active and inactive student records. Deactivation preserves student history and can be reversed at any time.",
  steps: [
    "Click 'Add student' button to create a new student record",
    "Use the search bar to find students by name or admission number",
    "Filter by phase (Early Years, Primary, Secondary) using tabs",
    "Use the Active and Inactive tabs to manage enrollment status",
    "Deactivate students who leave; their academic history remains available",
    "Use pagination to browse through large student lists",
  ],
  commonTasks: [
    {
      title: "Add a New Student",
      description: "Create a new student record in the system",
      tips: [
        "Fill in first name, last name, and admission number",
        "Select the student's class and phase",
        "Add guardian contact information",
        "Upload a student photo (optional)",
      ],
    },
    {
      title: "Search for a Student",
      description: "Quickly find a student using the search box",
      example: "Search: 'John' or 'ADM001' or 'Smith'",
      tips: [
        "Search works on first name, last name, or admission number",
        "Searches are case-insensitive",
        "Results update as you type",
      ],
    },
    {
      title: "Filter by Phase/Grade",
      description: "View students in a specific phase or all phases",
      tips: [
        "Early Years: Pre-K and K students",
        "Primary: Grades 1-6 students",
        "Secondary: Grades 7-12 students",
        "Click 'All Students' to see everyone",
      ],
    },
  ],
  faqs: [
    {
      question: "What happens when I deactivate a student?",
      answer: "The student is removed from the active roster and active workflows, but the record and history are preserved. Use the Inactive tab to restore them if they return.",
    },
    {
      question: "Can I bulk import students?",
      answer: "Yes. Click 'Import CSV' and upload a file with columns: firstName, lastName, admissionNo, classId. Consult the template for exact format.",
    },
    {
      question: "Why is a student not appearing in fees/results?",
      answer: "Make sure the student is assigned to a class. Use edit student to verify class assignment and that 'Active' is checked.",
    },
  ],
};

export default function StudentsPageClient({ pupils, classes }: { pupils: any[]; classes: any[] }) {
  const router = useRouter();
  const [activePupils, setActivePupils] = useState(pupils);
  const [inactivePupils, setInactivePupils] = useState<any[]>([]);
  const [inactiveLoaded, setInactiveLoaded] = useState(false);
  const [rosterStatus, setRosterStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [rosterLoading, setRosterLoading] = useState(false);
  const [statusActionStudent, setStatusActionStudent] = useState<any | null>(null);
  const [statusActionBusy, setStatusActionBusy] = useState(false);
  const [activePhase, setActivePhase] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [sortMode, setSortMode] = useState("alphabet-asc");
  const [selectedClassId, setSelectedClassId] = useState("ALL");
  const [selectedLetter, setSelectedLetter] = useState("ALL");
  const searchParams = useSearchParams();
  const [feedbackModal, setFeedbackModal] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
    details?: string;
  } | null>(() => {
    const whatsappStatus = searchParams?.get("whatsappStatus");
    const whatsappError = searchParams?.get("whatsappError");
    const emailError = searchParams?.get("emailError");
    if (emailError) {
      return {
        type: "error",
        title: "Guardian email was not sent",
        message: "The student registration completed, but the guardian email failed.",
        details: `${emailError}\nVerify the guardian's email address and school email settings.`,
      };
    }
    if (searchParams?.get("saved")) {
      if (whatsappStatus === 'FAILED') {
        return { type: "error", title: "Student registered; WhatsApp notification failed", message: "The student is saved in the active roster, but the admission notification was not sent.", details: whatsappError || undefined };
      }
      if (whatsappStatus === 'PENDING') {
        return { type: "success", title: "Student registered", message: "The student is in the active roster. The WhatsApp admission notification is queued for delivery." };
      }
      if (whatsappStatus === 'SENT') {
        return { type: "success", title: "Student registered", message: "The student is in the active roster and the WhatsApp admission notification was sent." };
      }
      return { type: "success", title: "Student registered", message: "The student was saved successfully and is now enrolled in the school roster." };
    }
    if (searchParams?.get("updated")) {
      return { type: "success", title: "Student updated", message: "The student record was updated successfully." };
    }
    return null;
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileStudent, setProfileStudent] = useState<any | null>(null);
  const [whatsAppConnected, setWhatsAppConnected] = useState<boolean | null>(null);
  const [whatsAppStatusMessage, setWhatsAppStatusMessage] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewRows, setImportPreviewRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyChannels, setNotifyChannels] = useState<Array<'EMAIL' | 'WHATSAPP'>>(['EMAIL', 'WHATSAPP']);
  const [forceResend, setForceResend] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);
  const [isBulkDeactivateConfirmOpen, setIsBulkDeactivateConfirmOpen] = useState(false);
  const [notifyResult, setNotifyResult] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (isImportModalOpen) {
      playOpenTone();
    }
  }, [isImportModalOpen]);

  useEffect(() => {
    async function fetchWhatsAppStatus() {
      try {
        const res = await fetch(`/api/admin/whatsapp/status`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          setWhatsAppConnected(data?.session?.status === 'connected');
          setWhatsAppStatusMessage(data?.session?.statusMessage || data?.session?.status || null);
        } else {
          setWhatsAppConnected(false);
          setWhatsAppStatusMessage('Unable to retrieve WhatsApp status.');
        }
      } catch (err) {
        console.error('Error loading WhatsApp status:', err);
        setWhatsAppConnected(false);
        setWhatsAppStatusMessage('Unable to retrieve WhatsApp status.');
      }
    }

    fetchWhatsAppStatus();
  }, []);

  const openProfileModal = (student: any) => {
    setProfileStudent(student);
    setIsProfileOpen(true);
  };
  const closeProfileModal = () => {
    setIsProfileOpen(false);
    setProfileStudent(null);
  };



  const formatDate = (value?: string | Date | null) => {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
  };

  const formatAge = (value?: string | Date | null) => {
    if (!value) return "—";
    const dob = value instanceof Date ? value : new Date(value);
    const diff = Date.now() - dob.getTime();
    const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    return `${age} yrs`;
  };

  const getGuardian = (student: any) => {
    const entry = student.guardians?.[0] ?? null;
    return entry?.guardian ?? entry ?? null;
  };

  const getStudentInitials = (student: any) => {
    const displayName = [student?.lastName, student?.firstName].filter(Boolean).join(" ").trim();
    const parts = displayName.split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "S";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const profileGuardian = profileStudent ? getGuardian(profileStudent) : null;

  const classOptions = useMemo(() => {
    const filteredClasses = (classes || []).filter(Boolean);
    if (activePhase === "ALL") {
      return Array.from(new Map(filteredClasses.map((cls) => [cls.id, cls])).values());
    }

    return Array.from(
      new Map(
        filteredClasses
          .filter((cls) => cls.phase === activePhase)
          .map((cls) => [cls.id, cls])
      ).values()
    );
  }, [classes, activePhase]);

  const alphabetOptions = useMemo(() => {
    return ["ALL", ...Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index))];
  }, []);

  // Filter by phase, search, class, alphabet, and sort
  const filteredPupils = useMemo(() => {
    const rosterPupils = rosterStatus === "ACTIVE" ? activePupils : inactivePupils;
    let filtered = [...rosterPupils];

    // Filter by phase
    if (activePhase !== "ALL") {
      filtered = filtered.filter((p) => p.class?.phase === activePhase);
    }

    // Filter by search (name or admission number)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => {
        const firstLast = `${p.firstName} ${p.lastName}`.toLowerCase();
        const lastFirst = `${p.lastName} ${p.firstName}`.toLowerCase();
        const admissionNo = (p.admissionNo || "").toLowerCase();
        return firstLast.includes(query) || lastFirst.includes(query) || admissionNo.includes(query);
      });
    }

    // Filter by class
    if (selectedClassId !== "ALL") {
      filtered = filtered.filter((p) => p.class?.id === selectedClassId);
    }

    // Filter by starting letter
    if (selectedLetter !== "ALL") {
      const letter = selectedLetter.toLowerCase();
      filtered = filtered.filter((p) => {
        const displayName = [p.lastName, p.firstName].filter(Boolean).join(" ").trim().toLowerCase();
        return displayName.startsWith(letter);
      });
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (sortMode) {
        case "alphabet-desc": {
          const nameA = [a.lastName, a.firstName].filter(Boolean).join(" ").trim().toLowerCase();
          const nameB = [b.lastName, b.firstName].filter(Boolean).join(" ").trim().toLowerCase();
          return nameB.localeCompare(nameA);
        }
        case "date-asc": {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        }
        case "date-desc": {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        }
        case "admission-asc": {
          const admissionA = (a.admissionNo || "").toLowerCase();
          const admissionB = (b.admissionNo || "").toLowerCase();
          return admissionA.localeCompare(admissionB);
        }
        case "admission-desc": {
          const admissionA = (a.admissionNo || "").toLowerCase();
          const admissionB = (b.admissionNo || "").toLowerCase();
          return admissionB.localeCompare(admissionA);
        }
        case "alphabet-asc":
        default: {
          const nameA = [a.lastName, a.firstName].filter(Boolean).join(" ").trim().toLowerCase();
          const nameB = [b.lastName, b.firstName].filter(Boolean).join(" ").trim().toLowerCase();
          return nameA.localeCompare(nameB);
        }
      }
    });

    return filtered;
  }, [activePupils, inactivePupils, rosterStatus, activePhase, searchQuery, selectedClassId, selectedLetter, sortMode]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPupils.length / itemsPerPage));
  const paginatedPupils = filteredPupils.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  const handleRosterStatusChange = async (nextStatus: "ACTIVE" | "INACTIVE") => {
    setFeedbackModal(null);
    if (nextStatus === "INACTIVE" && !inactiveLoaded) {
      setRosterLoading(true);
      try {
        const response = await fetch("/api/admin/students/data?status=INACTIVE", { credentials: "include" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Inactive student records could not be loaded.");
        setInactivePupils(data.pupils || []);
        setInactiveLoaded(true);
      } catch (error) {
        setFeedbackModal({
          type: "error",
          title: "Inactive students could not be loaded",
          message: error instanceof Error ? error.message : "Inactive student records could not be loaded.",
        });
        setRosterLoading(false);
        return;
      }
      setRosterLoading(false);
    }
    setRosterStatus(nextStatus);
    setSelectedStudentIds(new Set());
    setCurrentPage(1);
    setSelectedClassId("ALL");
    setSelectedLetter("ALL");
  };

  const confirmStatusChange = async () => {
    if (!statusActionStudent) return;
    const nextStatus = rosterStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setStatusActionBusy(true);
    setFeedbackModal(null);
    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(statusActionStudent.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json().catch(() => ({}));
      if (data?.code === "STUDENT_CAPACITY_REACHED") {
        router.replace("/admin/subscribe");
        return;
      }
      if (!response.ok) throw new Error(data.error || `Student could not be marked ${nextStatus.toLowerCase()}.`);
      const updatedStudent = { ...statusActionStudent, ...data, status: nextStatus, isActive: nextStatus === "ACTIVE" };
      if (nextStatus === "INACTIVE") {
        setActivePupils((current) => current.filter((student) => student.id !== updatedStudent.id));
        setInactivePupils((current) => [updatedStudent, ...current.filter((student) => student.id !== updatedStudent.id)]);
        setInactiveLoaded(true);
        setFeedbackModal({
          type: "success",
          title: "Student deactivated",
          message: `${pupilName(updatedStudent.firstName, updatedStudent.lastName, updatedStudent.middleName)} was removed from the active roster. Their record and history remain available in Inactive.`,
        });
      } else {
        setInactivePupils((current) => current.filter((student) => student.id !== updatedStudent.id));
        setActivePupils((current) => [updatedStudent, ...current.filter((student) => student.id !== updatedStudent.id)]);
        setFeedbackModal({
          type: "success",
          title: "Student restored",
          message: `${pupilName(updatedStudent.firstName, updatedStudent.lastName, updatedStudent.middleName)} was restored to the active roster.`,
        });
      }
      setSelectedStudentIds((current) => {
        const next = new Set(current);
        next.delete(updatedStudent.id);
        return next;
      });
      setStatusActionStudent(null);
    } catch (error) {
      setStatusActionStudent(null);
      setFeedbackModal({
        type: "error",
        title: "Student status was not updated",
        message: error instanceof Error ? error.message : "Student status could not be updated.",
      });
    } finally {
      setStatusActionBusy(false);
    }
  };

  const confirmBulkDeactivate = async () => {
    const selectedIds = Array.from(selectedStudentIds);
    if (selectedIds.length === 0) return;
    setIsBulkDeactivating(true);
    setFeedbackModal(null);
    const outcomes = await Promise.all(selectedIds.map(async (id) => {
      const student = activePupils.find((pupil) => pupil.id === id);
      if (!student) return { id, student: null, sourceStudent: null, error: "Student is no longer in the active roster." };
      try {
        const response = await fetch(`/api/admin/students/${encodeURIComponent(id)}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "INACTIVE" }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Could not deactivate this student.");
        return { id, student: { ...student, ...result, status: "INACTIVE", isActive: false }, sourceStudent: student, error: null };
      } catch (error) {
        return { id, student: null, sourceStudent: student, error: error instanceof Error ? error.message : "Could not deactivate this student." };
      }
    }));

    const deactivated = outcomes.flatMap((outcome) => outcome.student ? [outcome.student] : []);
    const failed = outcomes.filter((outcome) => outcome.error);
    if (deactivated.length > 0) {
      const deactivatedIds = new Set(deactivated.map((student) => student.id));
      setActivePupils((current) => current.filter((student) => !deactivatedIds.has(student.id)));
      setInactivePupils((current) => [...deactivated, ...current.filter((student) => !deactivatedIds.has(student.id))]);
      setInactiveLoaded(true);
      setSelectedStudentIds(new Set(failed.map((outcome) => outcome.id)));
    }
    setIsBulkDeactivateConfirmOpen(false);
    setIsBulkDeactivating(false);
    setFeedbackModal({
      type: failed.length === 0 ? "success" : "error",
      title: failed.length === 0 ? "Students deactivated" : deactivated.length > 0 ? "Some students were not deactivated" : "Students could not be deactivated",
      message: failed.length === 0
        ? `${deactivated.length} student${deactivated.length === 1 ? " was" : "s were"} removed from the active roster. Their records and history are preserved in Inactive.`
        : `${deactivated.length} deactivated; ${failed.length} failed. Failed students remain selected so you can retry after reviewing the issue.`,
      details: failed.length > 0 ? failed.map((outcome) => `${outcome.sourceStudent ? pupilName(outcome.sourceStudent.firstName, outcome.sourceStudent.lastName, outcome.sourceStudent.middleName) : "Student"}: ${outcome.error}`).join("\n") : undefined,
    });
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortMode(event.target.value);
    setCurrentPage(1);
  };

  const handleClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(event.target.value);
    setCurrentPage(1);
  };

  const handleLetterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLetter(event.target.value);
    setCurrentPage(1);
  };

  const resetAdvancedFilters = () => {
    setSortMode("alphabet-asc");
    setSelectedClassId("ALL");
    setSelectedLetter("ALL");
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handlePhaseChange = (phase: string) => {
    setActivePhase(phase);
    setSelectedClassId("ALL");
    handleFilterChange();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    handleFilterChange();
  };

  const getPhaseStats = (phase: string) => {
    const rosterPupils = rosterStatus === "ACTIVE" ? activePupils : inactivePupils;
    if (phase === "ALL") {
      return rosterPupils.length;
    }
    return rosterPupils.filter((p) => p.class?.phase === phase).length;
  };

  const resetImportState = () => {
    setImportFile(null);
    setImportPreviewRows([]);
    setImportErrors([]);
    setImportSummary(null);
    if (importFileInputRef.current) {
      importFileInputRef.current.value = "";
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const visibleStudentIds = paginatedPupils.map((student) => student.id);
  const allVisibleSelected = visibleStudentIds.length > 0 && visibleStudentIds.every((id) => selectedStudentIds.has(id));

  const toggleVisibleSelection = () => {
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleStudentIds.forEach((id) => next.delete(id));
      else visibleStudentIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleNotifyParents = async () => {
    setIsNotifying(true);
    setNotifyResult(null);
    try {
      const response = await fetch('/api/admin/students/send-access-notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pupilIds: Array.from(selectedStudentIds),
          channels: notifyChannels,
          forceResend,
          approvedForBulk: true,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Parent notifications could not be sent.');
      setNotifyResult(data);
    } catch (error) {
      setNotifyResult({ error: error instanceof Error ? error.message : 'Parent notifications could not be sent.' });
    } finally {
      setIsNotifying(false);
    }
  };

  const closeNotifyModal = () => {
    playCloseTone();
    setIsNotifyModalOpen(false);
    setNotifyResult(null);
    setSelectedStudentIds(new Set());
    setForceResend(false);
  };

  const handleDownloadImportTemplate = () => {
    const template = [
      'firstName,lastName,middleName,className,guardianFirst,guardianLast,guardianPhone,guardianEmail,dateOfBirth,gender,address,status',
      'Ada,Okafor,,Primary 1,Ade,Okafor,08012345678,ade@example.com,2005-01-10,Female,12 Main Street,ACTIVE',
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreviewImport = async (event?: FormEvent) => {
    event?.preventDefault();

    if (!importFile) {
      setImportErrors(['Choose a CSV file before previewing the import.']);
      return;
    }

    setIsImporting(true);
    setImportErrors([]);
    setImportSummary(null);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await fetch('/api/admin/students/import?preview=true', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => '');
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = { error: text };
          }
        }
      }

      if (!res.ok) {
        if (data?.code === 'STUDENT_CAPACITY_REACHED') {
          router.replace('/admin/subscribe');
          return;
        }
        const fallbackMessage = typeof data?.error === 'string' && data.error.trim()
          ? data.error
          : 'The import preview could not be completed.';
        const detailMessage = typeof data?.details === 'string' && data.details.trim()
          ? data.details
          : null;
        setImportErrors([detailMessage ? `${fallbackMessage}: ${detailMessage}` : fallbackMessage]);
        return;
      }

      setImportPreviewRows(data.previewRows || []);
      setImportSummary(`${data.validRows || 0} valid records ready to import.`);
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        setImportErrors(data.errors);
      } else {
        setImportErrors([]);
      }
    } catch (error) {
      console.error('Error previewing student import:', error);
      setImportErrors(['The import preview failed. Please try again.']);
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile) {
      setImportErrors(['Choose a CSV file before importing students.']);
      return;
    }

    setIsImporting(true);
    setImportErrors([]);
    setImportSummary(null);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await fetch('/api/admin/students/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => '');
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = { error: text };
          }
        }
      }

      if (!res.ok) {
        if (data?.code === 'STUDENT_CAPACITY_REACHED') {
          router.replace('/admin/subscribe');
          return;
        }
        setImportErrors([data?.error || 'The student import could not be completed.']);
        return;
      }

      setImportSummary(`${data.importedCount || 0} students were imported successfully.`);
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        setImportErrors(data.errors);
      }
      resetImportState();
      router.refresh();
    } catch (error) {
      console.error('Error importing students:', error);
      setImportErrors(['The import failed. Please try again.']);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-10 sm:px-8 sm:pb-8 sm:pt-12">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
            <Users className="h-4 w-4" /> Student records
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Students</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {rosterStatus === "ACTIVE" ? activePupils.length : inactivePupils.length} {rosterStatus.toLowerCase()} student{(rosterStatus === "ACTIVE" ? activePupils.length : inactivePupils.length) !== 1 ? "s" : ""} across all phases.
          </p>
        </div>
        <div>
        <div className="flex flex-wrap gap-2 sm:justify-end sm:items-center">
          {whatsAppConnected !== null && (
            <div className="inline-flex items-center gap-2.5 self-start rounded-full border border-border bg-surface px-2.5 py-1.5 shadow-sm sm:self-auto" title={whatsAppConnected ? 'WhatsApp connected — Ready to send school messages' : 'WhatsApp disconnected — Reconnect via settings'}>
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${whatsAppConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <WhatsAppIcon className="h-4 w-4" />
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-foreground">
                  {whatsAppConnected ? 'Connected' : 'Disconnected'}
                </span>
                <span className="hidden text-[10px] text-muted sm:inline">
                  {whatsAppConnected ? 'Ready' : 'Reconnect'}
                </span>
              </div>
              <span className={`h-2 w-2 rounded-full ${whatsAppConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
          )}
          {/* Animated Search Panel - slides out on same line */}
            <div className={`overflow-hidden transition-all duration-300 ease-out flex-shrink-0 ${isSearchOpen ? "w-72 opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-full"}`}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name or admission number..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-lg border-2 border-[#0A66C2] bg-background px-3 py-1.5 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#0A66C2]"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsSearchOpen((open) => !open)}
              className="h-9 w-full rounded-md border border-[#0A66C2] bg-[#0A66C2] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0858a8] sm:w-auto"
            >
              {isSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              {isSearchOpen ? "Close Search" : "Search Student"}
            </Button>
            <Button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="h-9 w-full rounded-md border border-[#0A66C2] bg-[#0A66C2] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0858a8] sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button
              type="button"
              onClick={() => router.push('/admin/students/new')}
              className="h-9 w-full rounded-md border border-[#0A66C2] bg-[#0A66C2] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0858a8] sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Register Student
            </Button>
          </div>
        </div>
        </div>
      </header>

      <section aria-label="Enrollment status" className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="inline-flex border border-border bg-surface" role="tablist" aria-label="Student status">
          {(["ACTIVE", "INACTIVE"] as const).map((status) => {
            const selected = rosterStatus === status;
            const count = status === "ACTIVE" ? activePupils.length : inactiveLoaded ? inactivePupils.length : null;
            return (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => handleRosterStatusChange(status)}
                disabled={rosterLoading}
                className={`min-h-11 cursor-pointer border-r border-border px-4 text-sm font-semibold last:border-r-0 disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "bg-brand text-white" : "text-muted hover:bg-background hover:text-foreground"}`}
              >
                {status === "ACTIVE" ? "Active" : "Inactive"}{count === null ? "" : ` (${count})`}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted">Inactive records are retained and can be restored; they are not permanently deleted.</p>
      </section>

      {rosterLoading ? <p role="status" className="py-6 text-center text-sm text-muted">Loading inactive student records…</p> : null}

      <ErrorModal
        isOpen={Boolean(feedbackModal)}
        onClose={() => setFeedbackModal(null)}
        title={feedbackModal?.title}
        message={feedbackModal?.message || ""}
        details={feedbackModal?.details}
        type={feedbackModal?.type || "success"}
        confirmLabel={feedbackModal?.type === "error" ? "Okay" : "Done"}
      />

      {rosterStatus === "ACTIVE" && selectedStudentIds.size > 0 ? (
        <section aria-label="Selected student actions" className="sticky top-3 z-30 flex flex-wrap items-center justify-between gap-3 border border-brand/20 bg-surface px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CheckSquare className="h-4 w-4 text-brand" aria-hidden="true" />
            <span className="font-semibold">{selectedStudentIds.size} selected</span>
            <button type="button" onClick={() => setSelectedStudentIds(new Set())} className="ml-1 cursor-pointer text-xs font-semibold text-muted underline underline-offset-2 hover:text-foreground">Clear selection</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9 cursor-pointer px-3 text-sm"
              onClick={() => {
                playOpenTone();
                setNotifyResult(null);
                setIsNotifyModalOpen(true);
              }}
            >
              <Send className="h-4 w-4" aria-hidden="true" /> Notify parents
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 cursor-pointer border-red-200 px-3 text-sm text-red-700 hover:border-red-300 hover:bg-red-50"
              onClick={() => setIsBulkDeactivateConfirmOpen(true)}
            >
              <UserMinus className="h-4 w-4" aria-hidden="true" /> Deactivate selected
            </Button>
          </div>
        </section>
      ) : null}

        {/* Phase tabs + filters */}
        <div className="border border-border bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {PHASE_ORDER.map((phase) => {
              const count = getPhaseStats(phase);
              const config = PHASE_CONFIG[phase as keyof typeof PHASE_CONFIG];
              const isActive = activePhase === phase;

              return (
                <button
                  key={phase}
                  onClick={() => handlePhaseChange(phase)}
                  className={`cursor-pointer px-2 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                    isActive
                      ? "border-b-2 border-primary text-primary"
                      : "border-b-2 border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {config.label}
                  <span className="ml-1 inline-block rounded px-1.5 py-0.5 text-xs font-semibold bg-background text-foreground sm:ml-2 sm:px-2">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <p className="whitespace-nowrap text-sm text-muted">
              Showing {paginatedPupils.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–
              {Math.min(currentPage * itemsPerPage, filteredPupils.length)} of {filteredPupils.length}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>

            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="hidden sm:inline">Sort</span>
              <select
                value={sortMode}
                onChange={handleSortChange}
                className="cursor-pointer rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="alphabet-asc">A–Z</option>
                <option value="alphabet-desc">Z–A</option>
                <option value="date-desc">Newest</option>
                <option value="date-asc">Oldest</option>
                <option value="admission-asc">Admission ↑</option>
                <option value="admission-desc">Admission ↓</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="hidden sm:inline">Class</span>
              <select
                value={selectedClassId}
                onChange={handleClassChange}
                className="cursor-pointer rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="ALL">All classes</option>
                {classOptions.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}{cls.arm ? ` ${cls.arm}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="hidden sm:inline">Starts with</span>
              <select
                value={selectedLetter}
                onChange={handleLetterChange}
                className="cursor-pointer rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {alphabetOptions.map((letter) => (
                  <option key={letter} value={letter}>
                    {letter === "ALL" ? "All" : letter}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="hidden sm:inline">Rows</span>
              <select
                value={itemsPerPage}
                onChange={handlePageSizeChange}
                className="cursor-pointer rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            {(sortMode !== "alphabet-asc" || selectedClassId !== "ALL" || selectedLetter !== "ALL") && (
              <button
                type="button"
                onClick={resetAdvancedFilters}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-background"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
        </div>
        </div>

      {/* Table */}
      {paginatedPupils.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto border border-border bg-surface sm:block">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="border-b border-border bg-background text-muted">
                <tr>
                  <th className="w-12 px-4 py-2">
                    {rosterStatus === "ACTIVE" ? <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} aria-label="Select visible students" className="h-4 w-4 cursor-pointer accent-brand" /> : null}
                  </th>
                  <th className="px-4 py-2 font-medium">Photo</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Class</th>
                  <th className="px-4 py-2 font-medium">Admission No.</th>
                  <th className="px-4 py-2 font-medium">Parent Contact</th>
                  <th className="w-28 px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPupils.map((p) => {
                  const guardian = p.guardians[0]?.guardian;
                  const classLabel = p.class
                    ? `${p.class.name}${p.class.arm ? ` ${p.class.arm}` : ""}`
                    : "Unassigned";

                  return (
                    <tr key={p.id} className="border-t border-border transition-colors hover:bg-background/50">
                      <td className="px-4 py-2">
                        {rosterStatus === "ACTIVE" ? <input type="checkbox" checked={selectedStudentIds.has(p.id)} onChange={() => toggleStudentSelection(p.id)} aria-label={`Select ${p.firstName} ${p.lastName}`} className="h-4 w-4 cursor-pointer accent-brand" /> : null}
                      </td>
                      <td className="px-4 py-2">
                        {p.photoUrl ? (
                          <img
                            src={resolveFileUrl(p.photoUrl, p.id) ?? undefined}
                            alt={[p.lastName, p.firstName].filter(Boolean).join(" ")}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/10 bg-primary/10 text-xs font-semibold text-primary shadow-sm">
                            {getStudentInitials(p)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 font-medium text-foreground">
                        {[p.lastName, p.firstName].filter(Boolean).join(" ")}
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                          {classLabel}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted">
                        {p.admissionNo ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-muted">
                        {guardian?.phone ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/students/${p.id}`)}
                          title={`View ${pupilName(p.firstName, p.lastName, p.middleName)}`}
                          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          View
                        </button>
                        <details className="relative">
                          <summary aria-label={`More actions for ${pupilName(p.firstName, p.lastName, p.middleName)}`} title="More actions" className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-border text-muted transition hover:bg-background hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </summary>
                          <div className="absolute right-0 top-10 z-40 w-48 border border-border bg-surface p-1 shadow-lg">
                            <button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); router.push(`/admin/students/${p.id}/edit`); }} className="flex h-10 w-full cursor-pointer items-center gap-2 px-3 text-left text-sm font-medium text-foreground transition hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                              <Pencil className="h-4 w-4 text-muted" aria-hidden="true" /> Edit student
                            </button>
                            <button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setStatusActionStudent(p); }} className={`flex h-10 w-full cursor-pointer items-center gap-2 px-3 text-left text-sm font-medium transition hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${rosterStatus === "ACTIVE" ? "text-red-700" : "text-emerald-700"}`}>
                              {rosterStatus === "ACTIVE" ? <UserMinus className="h-4 w-4" aria-hidden="true" /> : <UserCheck className="h-4 w-4" aria-hidden="true" />}
                              {rosterStatus === "ACTIVE" ? "Deactivate" : "Restore"}
                            </button>
                          </div>
                        </details>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="sm:hidden space-y-2">
            {paginatedPupils.map((p) => {
              const classLabel = p.class
                ? `${p.class.name}${p.class.arm ? ` ${p.class.arm}` : ""}`
                : "Unassigned";

              return (
                <div
                  key={p.id}
                  className="border border-border bg-surface px-3 py-2 hover:bg-background/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {rosterStatus === "ACTIVE" ? <input type="checkbox" checked={selectedStudentIds.has(p.id)} onChange={() => toggleStudentSelection(p.id)} aria-label={`Select ${p.firstName} ${p.lastName}`} className="h-4 w-4 shrink-0 cursor-pointer accent-brand" /> : null}
                      <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {[p.lastName, p.firstName].filter(Boolean).join(" ")}
                      </p>
                      <p className="text-xs text-muted mt-1">{classLabel}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/students/${p.id}`)}
                        title={`View ${pupilName(p.firstName, p.lastName, p.middleName)}`}
                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        View
                      </button>
                      <details className="relative">
                        <summary aria-label={`More actions for ${pupilName(p.firstName, p.lastName, p.middleName)}`} title="More actions" className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-border text-muted transition hover:bg-background hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </summary>
                        <div className="absolute right-0 top-10 z-40 w-48 border border-border bg-surface p-1 shadow-lg">
                          <button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); router.push(`/admin/students/${p.id}/edit`); }} className="flex h-10 w-full cursor-pointer items-center gap-2 px-3 text-left text-sm font-medium text-foreground transition hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                            <Pencil className="h-4 w-4 text-muted" aria-hidden="true" /> Edit student
                          </button>
                          <button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setStatusActionStudent(p); }} className={`flex h-10 w-full cursor-pointer items-center gap-2 px-3 text-left text-sm font-medium transition hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${rosterStatus === "ACTIVE" ? "text-red-700" : "text-emerald-700"}`}>
                            {rosterStatus === "ACTIVE" ? <UserMinus className="h-4 w-4" aria-hidden="true" /> : <UserCheck className="h-4 w-4" aria-hidden="true" />}
                            {rosterStatus === "ACTIVE" ? "Deactivate" : "Restore"}
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first page, last page, current page, and ±1 pages around current
                    return (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    );
                  })
                  .map((page, index, arr) => (
                    <div key={page}>
                      {index > 0 && arr[index - 1] !== page - 1 && (
                        <span className="px-2 py-2 text-muted">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        aria-current={page === currentPage ? "page" : undefined}
                        className={`h-9 min-w-9 cursor-pointer rounded-md px-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                          page === currentPage
                            ? "bg-primary text-white"
                            : "border border-border text-foreground hover:bg-background"
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="border border-border bg-surface px-6 py-12 text-center">
          <p className="text-muted">
            {searchQuery
              ? `No students found matching "${searchQuery}"`
              : rosterStatus === "INACTIVE" && activePhase === "ALL"
                ? "No inactive student records. Students deactivated later will appear here."
                : `No ${rosterStatus.toLowerCase()} students in this phase`}
          </p>
        </div>
      )}

      {statusActionStudent ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 px-4 py-8" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="student-status-dialog-title" className="w-full max-w-lg border border-border bg-surface shadow-xl">
            <div className="border-b border-border px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Student enrollment</p>
              <h2 id="student-status-dialog-title" className="mt-1 text-xl font-semibold text-foreground">
                {rosterStatus === "ACTIVE" ? "Deactivate student?" : "Restore student?"}
              </h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-muted">
              <p className="font-semibold text-foreground">{pupilName(statusActionStudent.firstName, statusActionStudent.lastName, statusActionStudent.middleName)}</p>
              {rosterStatus === "ACTIVE" ? (
                <p>This removes the student from the active roster and active workflows. Their profile, academic history, attendance, and fee records are retained. You can restore the student later from the Inactive tab.</p>
              ) : (
                <p>This restores the student to the active roster. Their saved class assignment and student history will be kept.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button type="button" variant="secondary" disabled={statusActionBusy} onClick={() => setStatusActionStudent(null)} className="gap-1.5"><X className="h-4 w-4" aria-hidden="true" />Cancel</Button>
              <Button type="button" disabled={statusActionBusy} onClick={confirmStatusChange} className={rosterStatus === "ACTIVE" ? "bg-red-700 text-white hover:bg-red-800" : ""}>
                {rosterStatus === "ACTIVE" ? <UserMinus className="h-4 w-4" aria-hidden="true" /> : <UserCheck className="h-4 w-4" aria-hidden="true" />}
                {statusActionBusy ? "Updating…" : rosterStatus === "ACTIVE" ? "Deactivate student" : "Restore student"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {isBulkDeactivateConfirmOpen ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 px-4 py-8" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="bulk-deactivate-title" className="w-full max-w-lg border border-border bg-surface shadow-xl">
            <div className="border-b border-border px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Bulk enrollment action</p>
              <h2 id="bulk-deactivate-title" className="mt-1 text-xl font-semibold text-foreground">Deactivate {selectedStudentIds.size} students?</h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-muted">
              <p>The selected students will leave the active roster and active workflows. Their profiles, results, attendance, and fee history are retained and can be restored from Inactive.</p>
              <p className="font-medium text-foreground">This action applies only to the {selectedStudentIds.size} selected record{selectedStudentIds.size === 1 ? "" : "s"}.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button type="button" variant="secondary" disabled={isBulkDeactivating} onClick={() => setIsBulkDeactivateConfirmOpen(false)} className="gap-1.5"><X className="h-4 w-4" aria-hidden="true" />Cancel</Button>
              <Button type="button" variant="destructive" disabled={isBulkDeactivating || selectedStudentIds.size === 0} onClick={confirmBulkDeactivate} className="gap-1.5">
                <UserMinus className="h-4 w-4" aria-hidden="true" />{isBulkDeactivating ? "Deactivating…" : `Deactivate ${selectedStudentIds.size}`}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {isNotifyModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <style>{`
            @keyframes students_notify_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
          `}</style>
          <div className="w-full max-w-2xl overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]" style={{ animation: "students_notify_modal_enter 320ms cubic-bezier(.2,.9,.2,1)" }}>
            <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-brand/10 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-brand"><Send className="h-4 w-4" /> Parent engagement</div>
                  <h2 className="mt-2 text-2xl font-bold text-foreground">Notify selected parents</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">Send secure parent portal access details for {selectedStudentIds.size} selected student{selectedStudentIds.size === 1 ? '' : 's'}.</p>
                </div>
              </div>
              <button type="button" onClick={closeNotifyModal} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" aria-label="Close notification dialog"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-5 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
              <div>
                <p className="text-sm font-semibold text-foreground">Delivery channels</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {([
                    ['EMAIL', 'Email', Mail],
                    ['WHATSAPP', 'WhatsApp', WhatsAppIcon],
                  ] as const).map(([channel, label, Icon]) => {
                    const checked = notifyChannels.includes(channel);
                    return (
                      <label key={channel} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${checked ? 'border-brand bg-brand/5' : 'border-border bg-background'}`}>
                        <input type="checkbox" checked={checked} onChange={() => setNotifyChannels((current) => checked ? current.filter((item) => item !== channel) : [...current, channel])} className="h-4 w-4 cursor-pointer accent-brand" />
                        <Icon className="h-4 w-4 text-brand" />
                        <span className="text-sm font-semibold text-foreground">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted">
                <div className="flex items-start gap-3"><CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p>The message contains the student name, admission number, class, parent portal link, and sign-in instructions. It does not send private academic or medical records.</p></div>
              </div>

              <label className="flex items-start gap-3 text-sm text-foreground">
                <input type="checkbox" checked={forceResend} onChange={(event) => setForceResend(event.target.checked)} className="mt-0.5 h-4 w-4 cursor-pointer accent-brand" />
                <span><span className="font-semibold">Send again even if recently sent</span><span className="mt-1 block text-muted">Use this only when a parent confirms the previous message was lost.</span></span>
              </label>

              {notifyResult?.error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{notifyResult.error}</div> : null}
              {notifyResult?.totals ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Completed: {notifyResult.totals.sent} sent, {notifyResult.totals.queued} queued, {notifyResult.totals.failed} failed, {notifyResult.totals.duplicateSuppressed} duplicate{notifyResult.totals.duplicateSuppressed === 1 ? '' : 's'} suppressed.</div> : null}

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeNotifyModal} disabled={isNotifying} className="flex-1 cursor-pointer rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"><X className="mr-1.5 inline h-4 w-4" aria-hidden="true" />Cancel</button>
                <button type="button" disabled={isNotifying || notifyChannels.length === 0 || Boolean(notifyResult?.totals)} onClick={handleNotifyParents} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">
                  <Send className="mr-2 h-4 w-4" />{isNotifying ? 'Sending...' : 'Send notifications'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isImportModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <style>{`
            @keyframes students_import_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
          `}</style>

          <div
            className="w-full max-w-2xl overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
            style={{ animation: `students_import_modal_enter 320ms cubic-bezier(.2,.9,.2,1)` }}
          >
            <div className="border-b border-border bg-brand/10 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Import students from CSV</h2>
                  <p className="mt-1 text-sm text-muted">Upload a CSV file to add students without changing the existing manual registration flow.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playCloseTone();
                    setIsImportModalOpen(false);
                    resetImportState();
                  }}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  aria-label="Close import dialog"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-6">
              <div className="rounded-md border border-border bg-background p-4 text-sm text-muted">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Use the template below to prepare your file.</p>
                    <p className="mt-1">Required columns: firstName, lastName, and className. Admission numbers are assigned automatically by the system.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadImportTemplate}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-brand bg-surface px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <Download className="h-4 w-4" />
                    Download template
                  </button>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handlePreviewImport}>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-foreground">Choose CSV file</span>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setImportFile(file);
                      setImportErrors([]);
                      setImportSummary(null);
                      setImportPreviewRows([]);
                    }}
                    className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      playCloseTone();
                      setIsImportModalOpen(false);
                      resetImportState();
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <X className="h-4 w-4" aria-hidden="true" /> Cancel
                  </button>
                  <Button type="submit" className="inline-flex items-center gap-2" disabled={isImporting}>
                    <Upload className="h-4 w-4" />
                    {isImporting ? 'Checking file...' : 'Preview import'}
                  </Button>
                </div>
              </form>

              {importSummary ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  {importSummary}
                </div>
              ) : null}

              {importErrors.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <p className="font-semibold">We found issues in the file.</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {importErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {importPreviewRows.length > 0 ? (
                <div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-sm font-semibold text-foreground">Preview</h4>
                    <Button type="button" onClick={handleConfirmImport} disabled={isImporting}>
                      <Users className="h-4 w-4" aria-hidden="true" />
                      {isImporting ? 'Importing...' : 'Import students'}
                    </Button>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-xl border border-border">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-muted">
                        <tr>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Admission No.</th>
                          <th className="px-3 py-2">Class</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreviewRows.map((row) => (
                          <tr key={`${row.firstName}-${row.lastName}-${row.admissionNo}`} className="border-t border-border">
                            <td className="px-3 py-2">{row.firstName} {row.lastName}</td>
                            <td className="px-3 py-2">{row.admissionNo || '—'}</td>
                            <td className="px-3 py-2">{row.className || 'Unassigned'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isProfileOpen && profileStudent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]">
            <div className="flex flex-col gap-4 border-b border-border bg-brand/10 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Student Transcript</p>
                <h2 className="mt-2 text-3xl font-semibold text-foreground">{[profileStudent.lastName, profileStudent.firstName].filter(Boolean).join(" ")}</h2>
                <p className="mt-1 text-sm text-muted">{profileStudent.class?.name}{profileStudent.class?.arm ? ` ${profileStudent.class.arm}` : ""}</p>
              </div>
              <button
                type="button"
                onClick={closeProfileModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-surface"
                aria-label="Close student details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-8">
              <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,_1fr)]">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl bg-slate-100">
                      {profileStudent.photoUrl ? (
                        <img
                          src={resolveFileUrl(profileStudent.photoUrl, profileStudent.id) ?? undefined}
                          alt={[profileStudent.lastName, profileStudent.firstName].filter(Boolean).join(" ")}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-semibold text-primary">
                          {[profileStudent.lastName, profileStudent.firstName].filter(Boolean).join(" ")
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted">Admission No.</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{profileStudent.admissionNo ?? profileStudent.id}</p>
                      <p className="mt-3 text-sm text-muted">Enrolled {formatDate(profileStudent.createdAt)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm">
                    <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-4 border-b border-border py-3">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted">Class</span>
                      <span className="font-semibold text-foreground">{profileStudent.class?.name ?? "—"}{profileStudent.class?.arm ? ` ${profileStudent.class.arm}` : ""}</span>
                    </div>
                    <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-4 border-b border-border py-3">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted">Phase</span>
                      <span className="font-semibold text-foreground">{profileStudent.class?.phase ?? "—"}</span>
                    </div>
                    <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-4 border-b border-border py-3">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted">Date of birth</span>
                      <span className="font-semibold text-foreground">{formatDate(profileStudent.dateOfBirth)}</span>
                    </div>
                    <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-4 border-b border-border py-3">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted">Age</span>
                      <span className="font-semibold text-foreground">{formatAge(profileStudent.dateOfBirth)}</span>
                    </div>
                    <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-4 py-3">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted">Gender</span>
                      <span className="font-semibold text-foreground">{profileStudent.gender ?? "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Student details</h3>
                    <div className="mt-4 grid gap-2 text-sm">
                      <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-4 border-b border-border py-3">
                        <span className="text-xs uppercase tracking-[0.18em] text-muted">First name</span>
                        <span className="font-semibold text-foreground">{profileStudent.firstName ?? "—"}</span>
                      </div>
                      <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-4 border-b border-border py-3">
                        <span className="text-xs uppercase tracking-[0.18em] text-muted">Middle name</span>
                        <span className="font-semibold text-foreground">{profileStudent.middleName || "—"}</span>
                      </div>
                      <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-4 border-b border-border py-3">
                        <span className="text-xs uppercase tracking-[0.18em] text-muted">Last name</span>
                        <span className="font-semibold text-foreground">{profileStudent.lastName ?? "—"}</span>
                      </div>
                      <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-start gap-4 py-3">
                        <span className="text-xs uppercase tracking-[0.18em] text-muted">Address</span>
                        <span className="font-semibold text-foreground break-words">{profileStudent.address || "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-foreground">Parent / guardian</h3>
                    <div className="mt-4 grid gap-2 text-sm">
                      <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-4 border-b border-border py-3">
                        <span className="text-xs uppercase tracking-[0.18em] text-muted">Name</span>
                        <span className="font-semibold text-foreground">{profileGuardian ? `${profileGuardian.firstName ?? ""} ${profileGuardian.lastName ?? ""}`.trim() || "—" : "—"}</span>
                      </div>
                      <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-4 border-b border-border py-3">
                        <span className="text-xs uppercase tracking-[0.18em] text-muted">Relationship</span>
                        <span className="font-semibold text-foreground">{profileStudent.guardians?.[0]?.relation ?? "—"}</span>
                      </div>
                      <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-4 border-b border-border py-3">
                        <span className="text-xs uppercase tracking-[0.18em] text-muted">Phone</span>
                        <span className="font-semibold text-foreground">{profileGuardian?.phone ?? profileStudent.guardians?.[0]?.phone ?? "—"}</span>
                      </div>
                      <div className="grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-4 py-3">
                        <span className="text-xs uppercase tracking-[0.18em] text-muted">Email</span>
                        <span className="font-semibold text-foreground">{profileGuardian?.email ?? profileStudent.guardians?.[0]?.email ?? "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={closeProfileModal}
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <X className="h-4 w-4" aria-hidden="true" /> Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      </div>
      </main>
      <UserGuide guide={HELP_GUIDE} />
    </>
  );
}
