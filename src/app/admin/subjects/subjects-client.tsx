"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserGuide } from "@/components/ui/user-guide";
import { getBackendUrl } from "@/lib/backend-url";
import AcademicsTabs from "../academics-tabs";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Edit2,
  Layers,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

const SUBJECTS_GUIDE = {
  title: "Subjects Management",
  overview: "Manage your school curriculum by creating subjects and assigning them to classes. Each subject can be taught by multiple teachers.",
  steps: [
    "Click 'Add subject' to create a new subject",
    "Enter the subject name (e.g., Mathematics, English, Science)",
    "Select which classes will study this subject",
    "Click 'Create' to save the subject",
    "For a class-first workflow, open Classes and choose 'Subjects' beside the class",
    "Assign teachers to subjects from the Teachers page"
  ],
  commonTasks: [
    {
      title: "Create a new subject",
      description: "Use standard subject names (Math, English, Science) for consistency. Avoid abbreviations in the subject name."
    },
    {
      title: "Assign a subject to multiple classes",
      description: "When creating or editing a subject, select all applicable classes. For example, Mathematics is typically offered to all classes."
    },
    {
      title: "Assign teachers to subjects",
      description: "Go to Teachers page and assign each teacher to their subjects. One teacher can teach multiple subjects across different classes."
    },
    {
      title: "Search for a subject",
      description: "Use the search bar to find subjects by name, class assignment, or teacher name."
    },
    {
      title: "View subject assignments",
      description: "Click 'Details' on any subject to see which classes study it and which teachers teach it."
    }
  ],
  faqs: [
    {
      question: "Can I assign the same subject to multiple classes?",
      answer: "Yes, most subjects like Math and English are taught to all classes. You can select multiple classes when creating a subject."
    },
    {
      question: "Can a teacher teach multiple subjects?",
      answer: "Yes, teachers can be assigned to multiple subjects. Use the Teachers page to manage subject assignments."
    },
    {
      question: "What happens when I delete a subject?",
      answer: "Deleting a subject removes it from all class assignments and unassigns all teachers. Use caution as this affects results and timetables."
    },
    {
      question: "Can I rename a subject?",
      answer: "Yes, click 'Edit' on the subject to change its name. The change updates everywhere the subject is used."
    },
    {
      question: "Are there standard subject suggestions?",
      answer: "Consider your curriculum framework (WAEC, IGCSE, etc.). Standard subjects include Math, English, Science, Social Studies, Physical Education, Arts, etc."
    }
  ],
  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
};

export default function SubjectsPageClient({
  classes: initialClasses,
  subjects: initialSubjects,
  subjectClasses: initialSubjectClasses,
  teacherSubjects,
}: {
  classes: any[];
  subjects: any[];
  subjectClasses: any[];
  teacherSubjects: any[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [subjects, setSubjects] = useState(initialSubjects);
  const [subjectClasses, setSubjectClasses] = useState(initialSubjectClasses);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);
  const [deletingSubjectName, setDeletingSubjectName] = useState("");
  const [deleteAnimateState, setDeleteAnimateState] = useState<"enter" | "exit">("enter");

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  const activeSubjectCount = subjects.length;
  const activeClassCount = initialClasses.length;
  const totalSubjectClassLinks = subjectClasses.length;
  const subjectsWithoutClasses = subjects.filter(
    (subject) => !subjectClasses.some((assignment) => assignment.subjectId === subject.id),
  ).length;

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const query = searchQuery.toLowerCase();
    return subjects.filter((subject) => {
      const assignedClasses = subjectClasses
        .filter((sc) => sc.subjectId === subject.id)
        .map((sc) => sc.class?.name ?? "")
        .join(" ")
        .toLowerCase();
      const teacherNames = teacherSubjects
        .filter((ts) => ts.subjectId === subject.id)
        .map((ts) => ts.teacher?.name ?? "")
        .join(" ")
        .toLowerCase();
      return (
        subject.name.toLowerCase().includes(query) ||
        assignedClasses.includes(query) ||
        teacherNames.includes(query)
      );
    });
  }, [subjects, subjectClasses, teacherSubjects, searchQuery]);

  const openSubjectModal = (subject?: any) => {
    if (subject) {
      setSelectedSubject(subject);
      setSubjectName(subject.name);
      setClassSearchQuery("");
      setSelectedClassIds(
        subjectClasses.filter((sc) => sc.subjectId === subject.id).map((sc) => sc.classId),
      );
    } else {
      setSelectedSubject(null);
      setSubjectName("");
      setClassSearchQuery("");
      setSelectedClassIds([]);
    }
    setError(null);
    setIsOpen(true);
    playOpenTone();
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClassIds((current) =>
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId],
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      const backendUrl = getBackendUrl();

      // Create or update subject
      const subjectPayload = { name: subjectName };
      const subjectUrl = selectedSubject
        ? `${backendUrl}/api/admin/subjects/${selectedSubject.id}`
        : `${backendUrl}/api/admin/subjects`;
      const subjectMethod = selectedSubject ? 'PATCH' : 'POST';

      const subjectResponse = await fetch(subjectUrl, {
        method: subjectMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectPayload),
        credentials: 'include',
      });

      if (!subjectResponse.ok) {
        const errorData = await subjectResponse.json();
        throw new Error(errorData.error || 'Failed to save subject');
      }

      const savedSubject = await subjectResponse.json();
      const subjectId = savedSubject.id;
      if (!selectedSubject) {
        setSelectedSubject(savedSubject);
      }

      const assignmentResponse = await fetch(
        `${backendUrl}/api/admin/subjects/${subjectId}/classes`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classIds: selectedClassIds }),
          credentials: "include",
        },
      );
      if (!assignmentResponse.ok) {
        const errorData = await assignmentResponse.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to save subject class assignments");
      }

      const dataResponse = await fetch(`${backendUrl}/api/admin/subjects/data`, {
        credentials: 'include',
        cache: "no-store",
      });
      if (!dataResponse.ok) {
        throw new Error("Subject was saved, but updated curriculum data could not be refreshed.");
      }
      const data = await dataResponse.json();
      setSubjects(data.subjects || []);
      setSubjectClasses(data.subjectClasses || []);

      setIsOpen(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subject');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!selectedSubject) return;
    setDeletingSubjectId(selectedSubject.id);
    setDeletingSubjectName(selectedSubject.name);
    setDeleteAnimateState("enter");
    setDeleteModalOpen(true);
    playOpenTone();
  };

  const openDeleteModal = (subject: any) => {
    setSelectedSubject(subject);
    setDeletingSubjectId(subject.id);
    setDeletingSubjectName(subject.name);
    setDeleteAnimateState("enter");
    setDeleteModalOpen(true);
    playOpenTone();
  };

  const confirmDeleteSubject = async () => {
    if (!deletingSubjectId) return;
    try {
      setLoading(true);
      const backendUrl = getBackendUrl();

      const response = await fetch(`${backendUrl}/api/admin/subjects/${deletingSubjectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete subject');
      }

      const dataResponse = await fetch(`${backendUrl}/api/admin/subjects/data`, {
        credentials: 'include',
      });

      if (dataResponse.ok) {
        const data = await dataResponse.json();
        setSubjects(data.subjects);
        setSubjectClasses(data.subjectClasses);
      }

      setIsOpen(false);
      setSelectedSubject(null);
      setError(null);
      closeDeleteModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subject');
    } finally {
      setLoading(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteAnimateState("exit");
    playCloseTone();
    setTimeout(() => {
      setDeleteModalOpen(false);
      setDeletingSubjectId(null);
      setDeletingSubjectName("");
    }, 320);
  };

  const iconSubjectCount = (subject: any) =>
    subjectClasses.filter((sc) => sc.subjectId === subject.id).length;

  const teacherListForSubject = (subject: any) =>
    teacherSubjects
      .filter((ts) => ts.subjectId === subject.id)
      .map((ts) => ts.teacher?.name ?? "Unknown");

  return (
    <>
      <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="min-w-0">
              <Link
                href="/admin/academics?view=classes"
                className="mb-5 inline-flex items-center gap-2 border border-border bg-background px-3 py-2 text-sm font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-light hover:text-brand"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Classes
              </Link>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
                <BookOpen className="h-4 w-4" /> Academic setup
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Classes &amp; subjects
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Build your curriculum by connecting subjects to the classes that study them. Teacher allocations stay in Staff.
              </p>
            </div>
            <div className="relative flex flex-wrap items-center gap-3">
              <div className={`overflow-hidden transition-all duration-300 ease-out ${isSearchOpen ? "w-64 opacity-100" : "w-0 opacity-0"}`}>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search subjects..."
                  aria-label="Search subjects, classes, and teachers"
                  tabIndex={isSearchOpen ? 0 : -1}
                  className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted outline-none transition focus:border-brand"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsSearchOpen((open) => !open)}
                aria-expanded={isSearchOpen}
                aria-label={isSearchOpen ? "Close search" : "Search subjects"}
                title={isSearchOpen ? "Close search" : "Search subjects"}
                className="inline-flex items-center gap-2 border border-border bg-background px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">{isSearchOpen ? "Close" : "Search"}</span>
              </button>
              <Button
                type="button"
                variant="primary"
                onClick={() => openSubjectModal()}
                className="inline-flex items-center justify-center gap-2 border border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                <Plus className="h-4 w-4" /> Add subject
              </Button>
            </div>
          </div>
        </header>

        <AcademicsTabs activeView="subjects" />

        {error && (
          <div role="alert" className="border border-error/20 bg-error/10 p-4 text-sm text-error">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SubjectStat icon={<BookOpen size={18} />} label="Subjects" value={activeSubjectCount} detail="In your curriculum" />
          <SubjectStat icon={<Layers size={18} />} label="Classes" value={activeClassCount} detail="Available to assign" />
          <SubjectStat icon={<CheckCircle2 size={18} />} label="Curriculum links" value={totalSubjectClassLinks} detail="Subject-to-class assignments" />
          <SubjectStat icon={<UserRound size={18} />} label="Need class links" value={subjectsWithoutClasses} detail="Subjects not assigned to a class" />
        </section>

        <section className="overflow-hidden border border-border bg-surface">
          <div className="flex flex-col justify-between gap-3 border-b border-border bg-background px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Subject directory</p>
              <p className="mt-1 text-sm text-foreground">
                Showing {filteredSubjects.length} of {activeSubjectCount} subject{activeSubjectCount === 1 ? "" : "s"}
              </p>
            </div>
            <p className="text-xs text-muted">Select Edit to manage the classes connected to a subject.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="hidden w-full text-left text-sm sm:table">
              <thead className="border-b border-border/70 bg-surface text-[11px] font-bold uppercase tracking-[.12em] text-muted">
                <tr>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-4 py-3">Class coverage</th>
                  <th className="px-4 py-3">Teacher coverage</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSubjects.map((subject) => {
                  const assignments = subjectClasses.filter((sc) => sc.subjectId === subject.id);
                  const teacherNames = teacherListForSubject(subject);
                  return (
                    <tr key={subject.id} className="transition-colors hover:bg-brand-light/20">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-brand/20 bg-brand/10 text-brand">
                            <BookOpen className="h-4 w-4" />
                          </span>
                          <span className="font-semibold text-foreground">{subject.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {assignments.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {assignments.slice(0, 3).map((assignment) => (
                              <span key={assignment.classId} className="border border-border bg-background px-2 py-1 text-xs text-foreground">
                                {assignment.class?.name ?? initialClasses.find((item) => item.id === assignment.classId)?.name ?? "Class"}
                              </span>
                            ))}
                            {assignments.length > 3 && (
                              <span className="px-1 py-1 text-xs font-medium text-muted">+{assignments.length - 3} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted">
                        {teacherNames.length ? teacherNames.join(", ") : "Managed in Staff"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openSubjectModal(subject)}
                            className="inline-flex items-center gap-2 border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:border-brand/40 hover:bg-brand-light"
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(subject)}
                            aria-label={`Delete ${subject.name}`}
                            className="flex h-9 w-9 items-center justify-center border border-error/20 bg-error/10 text-error transition hover:bg-error/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 sm:hidden">
            {filteredSubjects.map((subject) => {
              const assignedClasses = iconSubjectCount(subject);
              const teacherNames = teacherListForSubject(subject);
              return (
                <article key={subject.id} className="border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-brand/20 bg-brand/10 text-brand">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <h2 className="truncate text-sm font-semibold text-foreground">{subject.name}</h2>
                    </div>
                    <span className="shrink-0 border border-border bg-surface px-2 py-1 text-xs font-medium text-muted">
                      {assignedClasses} {assignedClasses === 1 ? "class" : "classes"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    {teacherNames.length ? teacherNames.join(", ") : "Teacher assignments are managed in Staff"}
                  </p>
                  <div className="mt-4 flex gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => openSubjectModal(subject)}
                      className="inline-flex flex-1 items-center justify-center gap-2 border border-brand/30 bg-brand-light/50 px-3 py-2 text-sm font-semibold text-brand"
                    >
                      <Edit2 className="h-4 w-4" /> Edit subject
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(subject)}
                      aria-label={`Delete ${subject.name}`}
                      className="inline-flex items-center justify-center border border-error/20 bg-error/10 px-3 py-2 text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredSubjects.length === 0 && (
            <div className="px-6 py-14 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center border border-brand/20 bg-brand/10 text-brand">
                <BookOpen className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-foreground">
                {searchQuery ? "No matching subjects" : "No subjects yet"}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                {searchQuery
                  ? "Try a different search, or clear the search field to see every subject."
                  : "Create your school's subjects, then connect each one to the classes that study it."}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => openSubjectModal()}
                  className="mt-5 inline-flex items-center gap-2 bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
                >
                  <Plus className="h-4 w-4" /> Add your first subject
                </button>
              )}
            </div>
          )}
        </section>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-6">
          <style>{`
            @keyframes subject_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
          `}</style>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="subject-modal-title"
            className="w-full max-w-2xl overflow-hidden border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
            style={{ animation: "subject_modal_enter 320ms cubic-bezier(.2,.9,.2,1)" }}
          >
            <div className="border-b border-border/70 bg-brand/10 px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="subject-modal-title" className="text-2xl font-bold text-foreground">
                    {selectedSubject ? "Edit subject" : "Add new subject"}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {selectedSubject
                      ? "Update the subject name and the classes it belongs to."
                      : "Create a new subject and assign it to one or more classes."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playCloseTone();
                      setIsOpen(false);
                    }}
                    disabled={loading}
                    title="Close modal"
                    className="flex h-8 w-8 items-center justify-center border border-border bg-surface text-foreground transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
                    aria-label="Close modal"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[calc(90vh-100px)] space-y-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              {error && (
                <div role="alert" className="border border-error/20 bg-error/10 p-4">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="subject-name" className="mb-2 block text-sm font-medium text-foreground">
                  Subject name
                </label>
                <input
                  id="subject-name"
                  name="name"
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  required
                  placeholder="Mathematics"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <section aria-labelledby="assign-classes-label">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 id="assign-classes-label" className="text-sm font-medium text-foreground">Assign classes</h3>
                    <p className="mt-1 text-xs text-muted">Choose every class that studies this subject.</p>
                  </div>
                  <span className="w-fit border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted">
                    {selectedClassIds.length} selected
                  </span>
                </div>
                <div className="mt-3 border border-border bg-background p-3 sm:p-4">
                  {initialClasses.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted">Create a class before assigning subjects.</p>
                  ) : (
                    <>
                      <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input
                          type="search"
                          value={classSearchQuery}
                          onChange={(event) => setClassSearchQuery(event.target.value)}
                          placeholder="Find a class"
                          aria-label="Find a class"
                          className="w-full border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </label>
                      <div className="mt-3 max-h-[min(42vh,340px)] overflow-y-auto pr-1">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {initialClasses
                            .filter((classItem) =>
                              `${classItem.name} ${classItem.arm ?? ""}`.toLowerCase().includes(classSearchQuery.trim().toLowerCase()),
                            )
                            .map((classItem) => {
                              const isSelected = selectedClassIds.includes(classItem.id);
                              return (
                                <label
                                  key={classItem.id}
                                  className={`flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2.5 transition-colors ${
                                    isSelected
                                      ? "border-brand/40 bg-brand-light/50"
                                      : "border-border bg-surface hover:border-brand/30"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    name="classIds"
                                    value={classItem.id}
                                    checked={isSelected}
                                    onChange={() => handleClassToggle(classItem.id)}
                                    className="h-4 w-4 shrink-0 accent-brand"
                                  />
                                  <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                                    {classItem.name}
                                    {classItem.arm ? <span className="ml-1 text-muted">{classItem.arm}</span> : null}
                                  </span>
                                  {isSelected && <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />}
                                </label>
                              );
                            })}
                        </div>
                        {initialClasses.every((classItem) =>
                          !`${classItem.name} ${classItem.arm ?? ""}`.toLowerCase().includes(classSearchQuery.trim().toLowerCase()),
                        ) && (
                          <p className="py-8 text-center text-sm text-muted">No classes match that search.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </section>

              <div className="flex flex-col-reverse justify-between gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
                <div>
                  {selectedSubject && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={loading}
                      className="inline-flex items-center gap-2 border border-error/20 bg-error/10 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Delete subject
                    </button>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      playCloseTone();
                      setIsOpen(false);
                    }}
                    disabled={loading}
                    className="border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    title={selectedSubject ? "Save changes" : "Add subject"}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Saving..." : selectedSubject ? "Save changes" : "Add subject"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <style>{`
            @keyframes subjects_delete_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
            @keyframes subjects_delete_exit { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }
          `}</style>

          <div
            className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(220,38,38,0.16)]"
            style={{
              animation: `${deleteAnimateState === "enter" ? "subjects_delete_enter" : "subjects_delete_exit"} 320ms cubic-bezier(.2,.9,.2,1)`,
            }}
          >
            <div className="border-b border-border/70 bg-error/10 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-error/20 bg-error/10 shadow-sm">
                  <AlertCircle className="h-6 w-6 text-error" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Delete Subject?</h2>
                  <p className="mt-1 text-sm text-muted">This action cannot be undone.</p>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <p className="text-sm leading-6 text-muted">
                You are about to permanently delete <strong>“{deletingSubjectName}”</strong>.
              </p>
              <div className="mt-4 rounded-lg border border-error/20 bg-error/10 p-3">
                <p className="text-xs text-error">
                  <strong>Warning:</strong> This will remove the subject from the system and unassign it from all classes.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-border/70 bg-background px-6 py-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={loading}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface disabled:opacity-50 text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSubject}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error px-4 py-2.5 text-sm font-medium text-white hover:bg-error/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
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
      </div>
      </main>
      <UserGuide guide={SUBJECTS_GUIDE} />
    </>
  );
}

function SubjectStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2 text-brand">
        {icon}
        <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{label}</span>
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

    playTone(880, 0.16, 0.05, 0);
    playTone(1174, 0.16, 0.05, 0.08);
    setTimeout(() => ctx.close(), 700);
  } catch (e) {
    // ignore
  }
}

function playCloseTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 420;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.045, now + 0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    o.stop(now + 0.24);
    setTimeout(() => ctx.close(), 500);
  } catch (e) {
    // ignore
  }
}
