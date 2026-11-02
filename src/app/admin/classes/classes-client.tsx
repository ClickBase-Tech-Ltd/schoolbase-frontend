"use client";

import { getBackendUrl } from "@/lib/backend-url";
import Link from "next/link";




import { useMemo, useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/ui/error-modal";
import { UserGuide } from "@/components/ui/user-guide";
import SubscriptionModal from "@/components/subscription-modal";
import AdminSkeleton from "@/components/ui/skeleton";
import AcademicsTabs from "../academics-tabs";
import { BookOpen, Users, Plus, Edit2, Search, School, AlertCircle, Trash2, LayoutGrid, ArrowUpRight, X, Check, Loader2 } from "lucide-react";

const CLASS_GUIDE = {
  title: "Classes & Curriculum",
  overview: "Manage class groups and the subjects taught in each one. Teacher-to-class and teacher-to-subject allocations remain in Staff.",
  steps: [
    "Click 'Add class' to create a new class",
    "Enter class name (e.g., 'JSS 1', 'Primary 4'), phase, and arm if applicable",
    "Click 'Create' to save the class",
    "Classes appear in the list, color-coded by phase",
    "Choose 'Subjects' beside a class to build its curriculum",
    "Click 'Edit' to modify class details or 'Delete' to remove a class"
  ],
  commonTasks: [
    {
      title: "Create a new class",
      description: "Use consistent naming conventions (e.g., 'JSS 1', 'Primary 4 A'). This helps with student enrollment and fee tracking."
    },
    {
      title: "Assign students to a class",
      description: "Go to the Students page and assign each student to their class. Students inherit fee terms from their class."
    },
    {
      title: "Filter classes by phase",
      description: "Use the phase tabs (Early Years, Primary, Secondary) to quickly see classes in each section."
    },
    {
      title: "Search for a class",
      description: "Use the search bar to find specific classes by name, arm, or phase."
    },
    {
      title: "Archive vs Delete",
      description: "Avoid deleting classes with students. Instead, mark them as inactive or archive them to maintain historical records."
    }
  ],
  faqs: [
    {
      question: "What phases are available?",
      answer: "Three phases: Early Years (preschool), Primary (ages 6-11), Secondary (ages 12+). Choose based on your school structure."
    },
    {
      question: "What is an 'Arm'?",
      answer: "An arm is a suffix for the class name, typically used when there are multiple classes at the same level (e.g., Primary 4 A, Primary 4 B, Primary 4 C)."
    },
    {
      question: "Can I rename a class?",
      answer: "Yes, click 'Edit' on the class row to modify the name, phase, or arm. Changes take effect immediately."
    },
    {
      question: "What happens if I delete a class?",
      answer: "Deleting a class removes it and all associated student enrollments. Use caution, as this may affect fee invoicing for those students."
    },
    {
      question: "How many classes can I create?",
      answer: "You can create unlimited classes. However, keep your structure manageable for easy administration."
    }
  ],
  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
};

const PHASE_OPTIONS = [
  { value: "ALL", label: "All classes" },
  { value: "EARLY_YEARS", label: "Early Years" },
  { value: "PRIMARY", label: "Primary" },
  { value: "SECONDARY", label: "Secondary" },
];

function getPhaseLabel(phase: string) {
  return PHASE_OPTIONS.find((option) => option.value === phase)?.label ?? phase;
}

function getPhaseColor(phase: string): { bg: string; text: string; icon: string; row: string } {
  switch (phase) {
    case "EARLY_YEARS":
      return { bg: "bg-brand/10", text: "text-brand", icon: "text-brand", row: "border-l-2 border-l-brand/70" };
    case "PRIMARY":
      return { bg: "bg-emerald-100", text: "text-emerald-700", icon: "text-emerald-600", row: "border-l-2 border-l-emerald-500" };
    case "SECONDARY":
      return { bg: "bg-amber-100", text: "text-amber-700", icon: "text-amber-600", row: "border-l-2 border-l-amber-500" };
    default:
      return { bg: "bg-background", text: "text-muted", icon: "text-muted", row: "border-l-2 border-l-border" };
  }
}

type CurriculumSubject = { id: string; name: string };
type CurriculumAssignment = { classId: string; subjectId: string };

export default function ClassesPageClient({ classes: initialClasses }: { classes: any[] }) {
  const [classes, setClasses] = useState<any[]>(initialClasses || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalType, setStatusModalType] = useState<'success' | 'error'>('success');
  const [statusModalTitle, setStatusModalTitle] = useState<string | undefined>(undefined);
  const [statusModalMessage, setStatusModalMessage] = useState("");
  const [subscriptionBlocked, setSubscriptionBlocked] = useState<{ reason: string; schoolName?: string } | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [activePhase, setActivePhase] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [className, setClassName] = useState("");
  const [classPhase, setClassPhase] = useState("PRIMARY");
  const [classArm, setClassArm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [deletingClassName, setDeletingClassName] = useState("");
  const [deleteAnimateState, setDeleteAnimateState] = useState<"enter" | "exit">("enter");
  const [isDeleting, setIsDeleting] = useState(false);
  const [curriculumClass, setCurriculumClass] = useState<any | null>(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState<CurriculumSubject[]>([]);
  const [curriculumSubjectIds, setCurriculumSubjectIds] = useState<string[]>([]);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [curriculumDataLoaded, setCurriculumDataLoaded] = useState(false);
  const [curriculumSaving, setCurriculumSaving] = useState(false);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [curriculumSearch, setCurriculumSearch] = useState("");

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const backendUrl = getBackendUrl();
      const [response, verifyResponse] = await Promise.all([
        fetch(`${backendUrl}/api/admin/classes/data`, {
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch(`${backendUrl}/api/admin/verify`, {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
        }),
      ]);

      let schoolNameToUse = "";
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json().catch(() => null);
        if (verifyData?.authenticated && verifyData.session?.schoolId) {
          try {
            const schoolResponse = await fetch(`${backendUrl}/api/admin/school/${verifyData.session.schoolId}`, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            });
            if (schoolResponse.ok) {
              const schoolData = await schoolResponse.json().catch(() => null);
              schoolNameToUse = schoolData?.name || "";
            }
          } catch (err) {
            console.error("Error fetching school name:", err);
          }
        }
      }

      if (!response.ok) {
        if (response.status === 403) {
          const errorBody = await response.json().catch(() => null);
          if (errorBody?.code === 'SUBSCRIPTION_INACTIVE') {
            setSubscriptionBlocked({
              reason: errorBody.reason || 'Your school subscription is not active',
              schoolName: schoolNameToUse || undefined,
            });
            setSchoolName(schoolNameToUse);
            setLoading(false);
            return;
          }
        }
        throw new Error("Failed to fetch classes");
      }

      const data = await response.json();
      setSchoolName(schoolNameToUse);
      setClasses(data.classes || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classes");
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClasses();
  }, [fetchClasses]);

  const filteredClasses = useMemo(() => {
    let visible = classes;

    if (activePhase !== "ALL") {
      visible = visible.filter((classItem) => classItem.phase === activePhase);
    }

    if (!searchQuery.trim()) {
      return visible;
    }

    const query = searchQuery.toLowerCase();
    return visible.filter((classItem) => {
      return (
        classItem.name.toLowerCase().includes(query) ||
        (classItem.arm ?? "").toLowerCase().includes(query) ||
        classItem.phase.toLowerCase().includes(query)
      );
    });
  }, [classes, activePhase, searchQuery]);

  const getPhaseCount = (phase: string) => {
    if (phase === "ALL") return classes.length;
    return classes.filter((classItem) => classItem.phase === phase).length;
  };

  const openModal = (classItem?: any) => {
    if (classItem) {
      setSelectedClass(classItem);
      setClassName(classItem.name ?? "");
      setClassPhase(classItem.phase ?? "PRIMARY");
      setClassArm(classItem.arm ?? "");
    } else {
      setSelectedClass(null);
      setClassName("");
      setClassPhase("PRIMARY");
      setClassArm("");
    }
    setIsOpen(true);
    playOpenTone();
  };

  const openCurriculumEditor = async (classItem: any) => {
    setCurriculumClass(classItem);
    setCurriculumSubjectIds([]);
    setCurriculumError(null);
    setCurriculumSearch("");
    setCurriculumDataLoaded(false);
    setCurriculumLoading(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/admin/subjects/data`, {
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        subjects?: CurriculumSubject[];
        subjectClasses?: CurriculumAssignment[];
      } | null;
      if (!response.ok) {
        throw new Error(data?.error || "Could not load subjects for this class.");
      }
      setCurriculumSubjects(data?.subjects || []);
      setCurriculumDataLoaded(true);
      setCurriculumSubjectIds(
        (data?.subjectClasses || [])
          .filter((assignment) => assignment.classId === classItem.id)
          .map((assignment: any) => assignment.subjectId),
      );
    } catch (err) {
      setCurriculumError(err instanceof Error ? err.message : "Could not load subjects for this class.");
    } finally {
      setCurriculumLoading(false);
    }
  };

  const saveCurriculum = async () => {
    if (!curriculumClass) return;
    setCurriculumSaving(true);
    setCurriculumError(null);
    try {
      const response = await fetch(
        `${getBackendUrl()}/api/admin/classes/${curriculumClass.id}/subjects`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectIds: curriculumSubjectIds }),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Could not save this class curriculum.");
      }

      const [classesResponse, subjectsResponse] = await Promise.all([
        fetch(`${getBackendUrl()}/api/admin/classes/data`, {
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        }),
        fetch(`${getBackendUrl()}/api/admin/subjects/data`, {
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        }),
      ]);
      if (!classesResponse.ok || !subjectsResponse.ok) {
        throw new Error("Curriculum was saved, but refreshed data could not be loaded. Close and reopen this editor to verify.");
      }

      const [classesData, subjectsData] = await Promise.all([
        classesResponse.json() as Promise<{
          classes?: Array<{
            id: string;
            name: string;
            phase?: string;
            arm?: string | null;
            _count?: { pupils?: number; subjectClasses?: number };
          }>;
        }>,
        subjectsResponse.json() as Promise<{
          subjects?: CurriculumSubject[];
          subjectClasses?: CurriculumAssignment[];
        }>,
      ]);
      setClasses(classesData.classes || []);
      setCurriculumSubjects(subjectsData.subjects || []);
      setCurriculumSubjectIds(
        (subjectsData.subjectClasses || [])
          .filter((assignment) => assignment.classId === curriculumClass.id)
          .map((assignment: any) => assignment.subjectId),
      );
      setCurriculumClass(null);
    } catch (err) {
      setCurriculumError(err instanceof Error ? err.message : "Could not save this class curriculum.");
    } finally {
      setCurriculumSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      const backendUrl = getBackendUrl();

      const payload = {
        name: className,
        phase: classPhase,
        arm: classArm.trim() === "" ? null : classArm.trim(),
      };

      const url = selectedClass
        ? `${backendUrl}/api/admin/classes/${selectedClass.id}`
        : `${backendUrl}/api/admin/classes`;

      const method = selectedClass ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save class');
      }

      await fetchClasses();
      setIsOpen(false);
      setStatusModalType('success');
      setStatusModalTitle(selectedClass ? 'Class updated' : 'Class created');
      setStatusModalMessage(selectedClass ? 'Class updated successfully.' : 'Class created successfully.');
      setStatusModalOpen(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save class');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (classItem: any) => {
    setDeletingClassId(classItem.id);
    setDeletingClassName(classItem.name ?? "this class");
    setDeleteAnimateState("enter");
    setDeleteModalOpen(true);
    playOpenTone();
  };

  const closeDeleteModal = () => {
    setDeleteAnimateState("exit");
    playCloseTone();
    setTimeout(() => {
      setDeleteModalOpen(false);
      setDeletingClassId(null);
      setDeletingClassName("");
    }, 320);
  };

  const handleDelete = async (classItem: any) => {
    try {
      setLoading(true);
      const backendUrl = getBackendUrl();

      const response = await fetch(`${backendUrl}/api/admin/classes/${classItem.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete class');
      }

      // Refresh the classes list
      const classesResponse = await fetch(`${backendUrl}/api/admin/classes/data`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (classesResponse.ok) {
        const data = await classesResponse.json();
        setClasses(data.classes || []);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteClass = async () => {
    if (!deletingClassId) return;

    setIsDeleting(true);
    try {
      await handleDelete({ id: deletingClassId });
      setIsOpen(false);
      closeDeleteModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    } finally {
      setIsDeleting(false);
    }
  };

  if (subscriptionBlocked) {
    return <SubscriptionModal reason={subscriptionBlocked.reason} schoolName={subscriptionBlocked.schoolName || schoolName || 'Your School'} />;
  }

  return (
    <>
      {loading && (
        <div className="min-h-screen bg-background">
          <AdminSkeleton />
        </div>
      )}

      {!loading && (
        <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
          <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
                  <LayoutGrid className="h-4 w-4" /> Academic setup
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Classes &amp; subjects</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Build your school structure and define the subjects each class studies. Teacher allocations remain in Staff.</p>
              </div>
              <div className="relative flex flex-wrap items-center gap-3">
                <div className={`overflow-hidden transition-all duration-300 ease-out ${isSearchOpen ? "w-64 opacity-100" : "w-0 opacity-0"}`}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search classes..."
                  className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted outline-none transition focus:border-brand"
                />
                </div>
                <button type="button" onClick={() => setIsSearchOpen((open) => !open)} className="inline-flex items-center gap-2 border border-border bg-background px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light" title="Search classes">
                  <Search className="h-4 w-4" /> <span className="hidden sm:inline">Search</span>
                </button>
                <button type="button" onClick={() => openModal()} className="inline-flex items-center gap-2 bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover">
                  <Plus className="h-4 w-4" /> Add class
                </button>
              </div>
            </div>
          </header>

          <AcademicsTabs activeView="classes" />

          {error && (
            <div className="rounded-lg border border-error/20 bg-error/10 p-4">
              <p className="text-sm text-error">Error: {error}</p>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ClassStat
              icon={<BookOpen size={18} />}
              label="Total Classes"
              value={String(classes.length)}
              detail="Classes created"
            />
            <ClassStat
              icon={<Users size={18} />}
              label="Total Students"
              value={String(classes.reduce((sum, c) => sum + (c._count?.pupils ?? 0), 0))}
              detail="Enrolled across classes"
            />
            <ClassStat
              icon={<School size={18} />}
              label="Subject links"
              value={String(classes.reduce((sum, c) => sum + (c._count?.subjectClasses ?? 0), 0))}
              detail="Curriculum assignments"
            />
            <ClassStat
              icon={<LayoutGrid size={18} />}
              label="School Phases"
              value={String(new Set(classes.map((c) => c.phase)).size)}
              detail="Active phases"
            />
          </section>

          <section className="border border-border bg-surface px-4 py-3 sm:px-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Class directory</p>
                <p className="mt-1 text-sm text-foreground">{filteredClasses.length} {filteredClasses.length === 1 ? "class" : "classes"} in {getPhaseLabel(activePhase)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold text-muted">Filter by phase</span>
            {PHASE_OPTIONS.map((phaseOption) => {
              const isActive = activePhase === phaseOption.value;
              const count = getPhaseCount(phaseOption.value);

              return (
                <button
                  key={phaseOption.value}
                  type="button"
                  onClick={() => setActivePhase(phaseOption.value)}
                  className={`border px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-brand text-white"
                      : "border-border bg-background text-muted hover:border-brand/40 hover:text-brand"
                  }`}
                >
                  {phaseOption.label}
                  <span className="ml-1 inline-block">({count})</span>
                </button>
              );
            })}
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">Select a class to edit its structure or review its coverage.</p>
            <span className="hidden items-center gap-1 text-xs font-semibold text-brand sm:inline-flex">Live directory <ArrowUpRight className="h-3 w-3" /></span>
          </div>

          {/* Classes Grid/Table */}
          <div className="overflow-hidden border border-border bg-surface">
            {/* Desktop Table */}
            <table className="hidden sm:table w-full text-left text-sm">
              <thead className="border-b border-border/70 bg-background text-muted">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[.12em]">Class</th>
                  <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-[.12em]">Phase</th>
                  <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-[.12em]">Arm</th>
                  <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-[.12em]">Pupils</th>
                  <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-[.12em]">Subjects</th>
                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[.12em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((classItem) => {
                    const colors = getPhaseColor(classItem.phase);
                    return (
                      <tr key={classItem.id} className={`transition-colors hover:bg-brand-light/20 ${colors.row}`}>
                        <td className="px-5 py-4 font-semibold text-foreground">{classItem.name}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                            {getPhaseLabel(classItem.phase)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-muted">{classItem.arm ?? "—"}</td>
                        <td className="px-3 py-2 text-sm text-foreground font-medium">{classItem._count?.pupils ?? 0}</td>
                        <td className="px-3 py-2 text-sm text-foreground font-medium">{classItem._count?.subjectClasses ?? 0}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => void openCurriculumEditor(classItem)}
                              className="inline-flex items-center gap-2 border border-brand/30 bg-brand-light/50 px-3 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand-light"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              Subjects
                            </button>
                            <button
                              onClick={() => openModal(classItem)}
                              className="inline-flex items-center gap-2 border border-border bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:bg-brand-light"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(classItem)}
                              className="inline-flex items-center gap-2 border border-transparent px-3 py-1.5 text-sm font-medium text-error transition-colors hover:border-error/20 hover:bg-error/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted">
                      No classes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Mobile List */}
            <div className="space-y-3 p-4 sm:hidden">
              {filteredClasses.length > 0 ? (
                filteredClasses.map((classItem) => {
                  const colors = getPhaseColor(classItem.phase);
                  return (
                    <div
                      key={classItem.id}
                      className="border border-border bg-background p-4 transition-all hover:border-brand/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">{classItem.name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                              {getPhaseLabel(classItem.phase)}
                            </span>
                            {classItem.arm && (
                              <span className="text-xs text-muted">Arm {classItem.arm}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-muted mb-1">Pupils</p>
                          <p className="text-sm font-bold text-foreground">{classItem._count?.pupils ?? 0}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2 border-t border-border pt-3">
                        <button
                          type="button"
                          onClick={() => void openCurriculumEditor(classItem)}
                          className="inline-flex flex-1 items-center justify-center gap-2 border border-brand/30 bg-brand-light/50 px-3 py-2 text-sm font-semibold text-brand"
                        >
                          <BookOpen className="h-4 w-4" /> Manage subjects
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal(classItem)}
                          className="inline-flex items-center justify-center gap-2 border border-border px-3 py-2 text-sm font-medium text-foreground"
                        >
                          <Edit2 className="h-4 w-4" /> Edit
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-sm text-muted py-8">
                  No classes found.
                </div>
              )}
            </div>
          </div>

          {curriculumClass && (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !curriculumSaving) setCurriculumClass(null);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="curriculum-dialog-title"
                className="flex max-h-[min(90vh,760px)] w-full max-w-2xl flex-col overflow-hidden border border-border bg-surface shadow-2xl"
              >
                <header className="border-b border-border bg-brand/5 px-5 py-5 sm:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-brand/20 bg-brand/10 text-brand">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[.14em] text-brand">Class curriculum</p>
                        <h2 id="curriculum-dialog-title" className="mt-1 text-xl font-semibold text-foreground">
                          Subjects for {curriculumClass.name}
                        </h2>
                        <p className="mt-1 text-sm text-muted">
                          Select the subjects pupils in this class should study.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Close curriculum editor"
                      disabled={curriculumSaving}
                      onClick={() => setCurriculumClass(null)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center border border-border text-muted transition hover:bg-background hover:text-foreground disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <span className="border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
                      {curriculumSubjectIds.length} selected
                    </span>
                    <label className="relative w-full sm:max-w-xs">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                      <input
                        type="search"
                        value={curriculumSearch}
                        onChange={(event) => setCurriculumSearch(event.target.value)}
                        placeholder="Find a subject"
                        aria-label="Find a subject"
                        className="w-full border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      />
                    </label>
                  </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
                  {curriculumError && (
                    <div role="alert" className="mb-4 border border-error/20 bg-error/10 p-3 text-sm text-error">
                      {curriculumError}
                    </div>
                  )}
                  {curriculumLoading ? (
                    <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted" role="status">
                      <Loader2 className="h-5 w-5 animate-spin text-brand" />
                      Loading curriculum subjects…
                    </div>
                  ) : !curriculumDataLoaded ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-muted">The curriculum could not be loaded.</p>
                      <button
                        type="button"
                        onClick={() => void openCurriculumEditor(curriculumClass)}
                        className="mt-3 border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-background"
                      >
                        Try again
                      </button>
                    </div>
                  ) : curriculumSubjects.length === 0 ? (
                    <div className="border border-dashed border-border bg-background px-5 py-10 text-center">
                      <BookOpen className="mx-auto h-8 w-8 text-muted" />
                      <h3 className="mt-3 font-semibold text-foreground">No subjects created yet</h3>
                      <p className="mt-1 text-sm text-muted">Create subjects first, then assign them to this class.</p>
                      <Link
                        href="/admin/academics?view=subjects"
                        onClick={() => setCurriculumClass(null)}
                        className="mt-4 inline-flex items-center gap-2 bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                      >
                        Go to subjects <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {curriculumSubjects
                        .filter((subject) => subject.name.toLowerCase().includes(curriculumSearch.trim().toLowerCase()))
                        .map((subject) => {
                          const isSelected = curriculumSubjectIds.includes(subject.id);
                          return (
                            <label
                              key={subject.id}
                              className={`flex cursor-pointer items-center justify-between gap-4 border px-4 py-3 transition-colors ${
                                isSelected
                                  ? "border-brand/40 bg-brand-light/50"
                                  : "border-border bg-background hover:border-brand/30"
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => setCurriculumSubjectIds((current) =>
                                    isSelected
                                      ? current.filter((id) => id !== subject.id)
                                      : [...current, subject.id],
                                  )}
                                  className="h-4 w-4 accent-brand"
                                />
                                <span className="truncate text-sm font-medium text-foreground">{subject.name}</span>
                              </span>
                              {isSelected && <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />}
                            </label>
                          );
                        })}
                      {curriculumSubjects.every((subject) =>
                        !subject.name.toLowerCase().includes(curriculumSearch.trim().toLowerCase()),
                      ) && (
                        <p className="py-8 text-center text-sm text-muted">No subjects match that search.</p>
                      )}
                    </div>
                  )}
                </div>

                <footer className="flex flex-col-reverse justify-between gap-3 border-t border-border bg-background px-5 py-4 sm:flex-row sm:items-center sm:px-7">
                  <p className="text-xs text-muted">Changes are saved together, so the class curriculum stays consistent.</p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={curriculumSaving}
                      onClick={() => setCurriculumClass(null)}
                      className="border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!curriculumDataLoaded || curriculumLoading || curriculumSaving || curriculumSubjects.length === 0}
                      onClick={() => void saveCurriculum()}
                      className="inline-flex items-center justify-center gap-2 bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {curriculumSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                      {curriculumSaving ? "Saving…" : "Save curriculum"}
                    </button>
                  </div>
                </footer>
              </section>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
              <style>{`
                @keyframes classes_delete_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
                @keyframes classes_delete_exit { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }
              `}</style>

                <div
                className="w-full max-w-md overflow-hidden border border-border bg-surface shadow-[0_16px_50px_rgba(220,38,38,0.16)]"
                style={{
                  animation: `${deleteAnimateState === "enter" ? "classes_delete_enter" : "classes_delete_exit"} 320ms cubic-bezier(.2,.9,.2,1)`,
                }}
              >
                <div className="border-b border-border/70 bg-error/10 px-6 py-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-error/20 bg-error/10">
                      <AlertCircle className="h-6 w-6 text-error" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Delete Class?</h2>
                      <p className="mt-1 text-sm text-muted">This action cannot be undone.</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5">
                  <p className="text-sm leading-6 text-muted">
                    You are about to permanently delete <strong>“{deletingClassName}”</strong>.
                  </p>
                  <div className="mt-4 rounded-lg border border-error/20 bg-error/10 p-3">
                    <p className="text-xs text-error">
                      <strong>Warning:</strong> This will remove the class from the system and may affect related student assignments.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-border/70 bg-background px-6 py-4">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={isDeleting}
                    className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface disabled:opacity-50 text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteClass}
                    disabled={isDeleting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error px-4 py-2.5 text-sm font-medium text-white hover:bg-error/90 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete Permanently
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal */}
          {isOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
              <style>{`
                @keyframes classes_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
                @keyframes classes_modal_exit  { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }
              `}</style>

              <div
                className="w-full max-w-2xl overflow-hidden border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
                style={{ animation: `classes_modal_enter 320ms cubic-bezier(.2,.9,.2,1)` }}
              >
                <div className="border-b border-border/70 bg-brand/10 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        {selectedClass ? "Edit class" : "Add new class"}
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {selectedClass
                          ? "Update the class details and phase assignment."
                          : "Create a new class group for your school."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playCloseTone();
                        setIsOpen(false);
                      }}
                      className="flex h-8 w-8 items-center justify-center border border-border hover:bg-background transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 px-6 py-6"
                >
                  {selectedClass && <input type="hidden" name="id" value={selectedClass.id} />}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Class name
                      </label>
                      <input
                        name="name"
                        value={className}
                        onChange={(event) => setClassName(event.target.value)}
                        required
                        placeholder="Primary 1"
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Phase
                      </label>
                      <select
                        name="phase"
                        value={classPhase}
                        onChange={(event) => setClassPhase(event.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        {PHASE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Arm / section
                    </label>
                    <input
                      name="arm"
                      value={classArm}
                      onChange={(event) => setClassArm(event.target.value)}
                      placeholder="A"
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div className="flex justify-between gap-3 pt-4 border-t border-border">
                    <div>
                      {selectedClass && (
                        <button
                          type="button"
                          onClick={() => openDeleteModal(selectedClass)}
                          className="px-4 py-2 rounded-lg border border-error/20 bg-error/10 hover:bg-error/20 text-error text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          playCloseTone();
                          setIsOpen(false);
                        }}
                        className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-background transition-colors"
                      >
                        Cancel
                      </button>
                      <Button type="submit">{selectedClass ? "Save changes" : "Add class"}</Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
      <UserGuide guide={CLASS_GUIDE} />
      <ErrorModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        type={statusModalType}
        title={statusModalTitle}
        message={statusModalMessage}
        confirmLabel="Okay"
      />
    </>
  );
}

function ClassStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2 text-brand">
        {icon}
        <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">
          {label}
        </span>
      </div>
      <div className="text-3xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </div>
  );
}

function playOpenTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const playTone = (freq: number, duration: number, gain: number, delay = 0) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);
      gainNode.gain.setValueAtTime(0.0001, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + delay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    playTone(860, 0.14, 0.05, 0);
    playTone(1180, 0.14, 0.05, 0.07);
    setTimeout(() => ctx.close(), 700);
  } catch (e) {
    // ignore it
  }
}

function playCloseTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 410;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.04, now + 0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    o.stop(now + 0.24);
    setTimeout(() => ctx.close(), 500);
  } catch (e) {
    // ignore
  }
}
