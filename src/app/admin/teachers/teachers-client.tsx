"use client";

import { useMemo, useState, useTransition, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/ui/error-modal";
import { UserGuide } from "@/components/ui/user-guide";
import { getBackendUrl } from "@/lib/backend-url";
import { X, Plus, Search, UserPlus, AlertCircle, Trash2, Users, ArrowUpRight } from "lucide-react";

function parseApiErrorMessage(body: any, status: number): string {
  if (!body) return `Server error: ${status}`;

  const payload = body.error ?? body.message ?? body;
  if (typeof payload === 'string' && payload.trim()) return payload;

  if (typeof payload === 'object') {
    if (payload === null) return `Server error: ${status}`;
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
    if (Object.keys(payload).length > 0) return JSON.stringify(payload);
  }

  return `Server error: ${status}`;
}

const TEACHER_GUIDE = {
  title: "Staff Management",
  overview: "Manage teacher and bursar profiles, class assignments, and staff allocations. Staff can mark attendance, enter results, manage finances, and communicate with parents.",
  steps: [
    "Click 'Add teacher' or 'Add bursar' to create a staff account",
    "Fill in staff details: name, email, and password",
    "Assign teachers to classes and subjects when needed",
    "Staff account is created and they receive login credentials via email",
    "Click 'Details' on any staff member to view or edit their assignments"
  ],
  commonTasks: [
    {
      title: "Add a new staff member",
      description: "Use a professional email (not personal Gmail) for better email deliverability. Include the staff member's phone number in the form if available."
    },
    {
      title: "Assign a teacher to a class",
      description: "Teachers can be assigned to multiple classes and subjects. This allows flexibility for specialists or part-time teachers."
    },
    {
      title: "Edit staff assignments",
      description: "Click 'Details' on any staff row to view their current classes and subjects. Make updates and save."
    },
    {
      title: "Search for staff",
      description: "Use the search bar to find staff by name, email, class name, or subject. Searches are case-insensitive."
    },
    {
      title: "View staffing statistics",
      description: "The header shows total staff assigned to classes and subjects. This helps track staffing levels."
    }
  ],
  faqs: [
    {
      question: "Can I assign a teacher to multiple classes?",
      answer: "Yes, teachers can be assigned to multiple classes. This is useful for specialists or teachers who teach multiple grades."
    },
    {
      question: "Can I assign a teacher to multiple subjects?",
      answer: "Yes, teachers can teach multiple subjects. For example, a teacher can teach both English and Literature."
    },
    {
      question: "What happens when I delete a teacher?",
      answer: "Deactivating a teacher disables their login and removes current class and subject assignments. Their employee record and historical records are retained."
    },
    {
      question: "Can teachers reset their passwords?",
      answer: "Teachers can reset their passwords from the login page. As an admin, you can also reset passwords from the teacher details page."
    },
    {
      question: "How do I bulk import teachers?",
      answer: "Currently, teachers are added one at a time. For bulk imports, contact support or use the admin dashboard with CSV upload (coming soon)."
    }
  ],
  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
};

function getTeacherInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "T";
}

export default function TeachersPageClient({
  classes,
  subjects,
  teachers,
}: {
  classes: any[];
  subjects: any[];
  teachers: any[];
}) {
  const normalizeTeacher = (teacher: any) => ({
    ...teacher,
    role: teacher.role ?? "TEACHER",
    id: teacher.id ?? teacher._id ?? teacher.email ?? `teacher-${Math.random().toString(36).slice(2, 10)}`,
    teacherClasses: teacher.teacherClasses ?? [],
    teacherSubjects: teacher.teacherSubjects ?? [],
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [formRole, setFormRole] = useState<"TEACHER" | "BURSAR">("TEACHER");
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [teacherList, setTeacherList] = useState(() => teachers.map(normalizeTeacher));
  const [isTransitioning, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalTitle, setSuccessModalTitle] = useState<string>("Success");
  const [successModalMessage, setSuccessModalMessage] = useState<string>("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);
  const [deletingTeacherName, setDeletingTeacherName] = useState("");
  const [deleteAnimateState, setDeleteAnimateState] = useState<"enter" | "exit">("enter");
  const [isDeleting, setIsDeleting] = useState(false);

  const renderTeacherAvatar = (teacher: any) => {
    const imageUrl = [
      teacher.avatarUrl,
      teacher.profileImageUrl,
      teacher.profileImage,
      teacher.imageUrl,
      teacher.image,
      typeof teacher.avatar === "string" ? teacher.avatar : null,
    ].find((value) => typeof value === "string" && value.trim());
    const initials = getTeacherInitials(teacher.name ?? "Teacher");

    return (
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/10 text-xs font-semibold text-brand">
        <span aria-hidden="true">{initials}</span>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
      </span>
    );
  };

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    setTeacherList(teachers.map(normalizeTeacher));
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const source = teacherList;
    if (!searchQuery.trim()) return source;
    const query = searchQuery.toLowerCase();
    return source.filter((teacher) => {
      const classNames = teacher.teacherClasses
        .map((assignment: any) => assignment.class?.name ?? "")
        .join(" ")
        .toLowerCase();
      const subjectNames = teacher.teacherSubjects
        .map((assignment: any) => assignment.subject?.name ?? "")
        .join(" ")
        .toLowerCase();
      return (
        teacher.name.toLowerCase().includes(query) ||
        teacher.email.toLowerCase().includes(query) ||
        classNames.includes(query) ||
        subjectNames.includes(query)
      );
    });
  }, [teacherList, searchQuery]);

  const openDeleteModal = (teacher: any) => {
    setDeletingTeacherId(teacher.id);
    setDeletingTeacherName(teacher.name ?? "this teacher");
    setDeleteAnimateState("enter");
    setDeleteModalOpen(true);
    playOpenTone();
  };

  const closeDeleteModal = () => {
    setDeleteAnimateState("exit");
    playCloseTone();
    setTimeout(() => {
      setDeleteModalOpen(false);
      setDeletingTeacherId(null);
      setDeletingTeacherName("");
    }, 320);
  };

  const handleDeleteTeacher = async () => {
    if (!deletingTeacherId) return;

    setIsDeleting(true);
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/admin/teachers/${deletingTeacherId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(parseApiErrorMessage(errorBody, response.status));
      }

      closeDeleteModal();
      window.location.reload();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        setShowErrorModal(true);
      } else {
        setErrorMessage("An unexpected error occurred while deleting the teacher.");
        setShowErrorModal(true);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
            <Users className="h-4 w-4" /> People operations
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Staff</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Manage teachers, bursars, assignments, and staff access from one central workspace.</p>
        </div>

        <div className="relative flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center">
          {/* Animated Search Panel - slides out on same line */}
          <div className={`overflow-hidden transition-all duration-300 ease-out flex-shrink-0 ${isSearchOpen ? "w-72 opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-full"}`}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, email, class, or subject..."
              className="w-full border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder-muted outline-none focus:border-brand"
            />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsSearchOpen((open) => !open)}
            className="h-9 w-full border border-border bg-background px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand-light sm:w-auto"
          >
            <Search className="h-4 w-4" />
            {isSearchOpen ? "Close Search" : "Search Staff"}
          </Button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              onClick={() => {
                setFormRole("TEACHER");
                setIsOpen(true);
                playOpenTone();
              }}
              className="h-9 w-full bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-hover sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Add teacher
            </Button>
            <Button
              onClick={() => {
                setFormRole("BURSAR");
                setIsOpen(true);
                playOpenTone();
              }}
              variant="secondary"
              className="h-9 w-full border border-border bg-background px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand-light sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Add bursar
            </Button>
          </div>
        </div>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">{teacherList.length} staff member{teacherList.length === 1 ? "" : "s"} across teaching and finance roles.</p>
        <span className="hidden items-center gap-1 text-xs font-semibold text-brand sm:inline-flex">Staff directory <ArrowUpRight className="h-3 w-3" /></span>
      </div>

      <div className="overflow-hidden border border-border bg-surface">
        {/* Desktop Table */}
        <table className="hidden sm:table w-full text-left text-sm">
          <thead className="border-b border-border bg-background text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Classes</th>
              <th className="px-4 py-2 font-medium">Subjects</th>
              <th className="px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((teacher, index) => (
                <tr key={teacher.id ?? `teacher-${index}`} className="border-t border-border hover:bg-background/50 transition-colors">
                  <td className="px-4 py-2 font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      {renderTeacherAvatar(teacher)}
                      <span>{teacher.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted">{teacher.email}</td>
                  <td className="px-4 py-2">
                    <span className="border border-border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-muted">
                      {teacher.role === "BURSAR" ? "Bursar" : "Teacher"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-muted">
                    { (teacher.teacherClasses?.length ?? 0) > 0 ? (
                      <span>{teacher.teacherClasses.length} class{teacher.teacherClasses.length === 1 ? "" : "es"}</span>
                    ) : (
                      <span>No classes</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-muted">
                    { (teacher.teacherSubjects?.length ?? 0) > 0 ? (
                      <span>{teacher.teacherSubjects.length} subject{teacher.teacherSubjects.length === 1 ? "" : "s"}</span>
                    ) : (
                      <span>No subjects</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs px-2 py-1"
                      onClick={() => {
                        setSelectedTeacher(teacher);
                        playOpenTone();
                      }}
                    >
                      Details
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-sm text-muted">
                  No staff found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile List */}
        <div className="sm:hidden space-y-2 p-4">
          {filteredTeachers.length > 0 ? (
            filteredTeachers.map((teacher, index) => (
              <button
                key={teacher.id ?? `teacher-mobile-${index}`}
                onClick={() => {
                  setSelectedTeacher(teacher);
                  playOpenTone();
                }}
                className="block w-full text-left rounded-lg border border-border bg-surface px-3 py-2 hover:bg-background/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    {renderTeacherAvatar(teacher)}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{teacher.name}</p>
                      <p className="truncate text-xs text-muted">{teacher.role === "BURSAR" ? "Bursar" : "Teacher"}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right ml-2">
                    <p className="text-xs text-muted">
                      {teacher.teacherClasses.length} class{teacher.teacherClasses.length === 1 ? "" : "es"}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center text-sm text-muted py-8">
              No staff found.
            </div>
          )}
        </div>
      </div>
      </div>
      </main>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <style>{`
            @keyframes teachers_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
            @keyframes teachers_modal_exit  { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }
          `}</style>

          <div
            className="w-full max-w-2xl overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
            style={{ animation: `teachers_modal_enter 320ms cubic-bezier(.2,.9,.2,1)` }}
          >
            <div className="border-b border-border/70 bg-brand/10 px-6 py-5">
              <div className="mb-0 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {formRole === "BURSAR" ? "Add bursar / accountant" : "Add teacher"}
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    {formRole === "BURSAR"
                      ? "Create a bursar account with the same school login flow."
                      : "Create a teacher account and assign classes and subjects in one place."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playCloseTone();
                    setIsOpen(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30"
                  aria-label="Close add staff modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement;
                const nameInput = form.querySelector('input[name="name"]') as HTMLInputElement | null;
                const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement | null;
                const passwordInput = form.querySelector('input[name="password"]') as HTMLInputElement | null;
                if (!nameInput || !emailInput || !passwordInput) {
                  setErrorMessage('Form fields not found. Please try again.');
                  setShowErrorModal(true);
                  return;
                }

                const role = formRole;
                const name = nameInput.value.trim();
                const email = emailInput.value.trim();
                const password = passwordInput.value.trim();

                if (!name || !email || !password) {
                  setErrorMessage('Please fill all required fields.');
                  setShowErrorModal(true);
                  return;
                }

                const classIds = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="classIds"]:checked'))
                  .map((input) => input.value);

                const subjectIds = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="subjectIds"]:checked'))
                  .map((input) => input.value);

                const assignedTeacherClasses = classIds.map((classId) => {
                  const classItem = classes.find((item) => item.id === classId);
                  return {
                    classId,
                    class: classItem ? { id: classItem.id, name: classItem.name, arm: classItem.arm } : null,
                  };
                });

                const assignedTeacherSubjects = subjectIds.map((subjectId) => {
                  const subject = subjects.find((item) => item.id === subjectId);
                  return {
                    subjectId,
                    subject: subject ? { id: subject.id, name: subject.name } : null,
                  };
                });

                const backendUrl = getBackendUrl();
                setIsSaving(true);
                try {
                  console.log('Creating staff:', { name, email, role, classIds, subjectIds });

                  const response = await fetch(`${backendUrl}/api/admin/teachers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      name,
                      email,
                      password,
                      role,
                      classIds: role === 'TEACHER' ? classIds : [],
                      subjectIds: role === 'TEACHER' ? subjectIds : [],
                    }),
                  });

                  if (!response.ok) {
                    const errorBody = await response.json().catch(() => null);
                    throw new Error(parseApiErrorMessage(errorBody, response.status));
                  }

                  const data = await response.json();
                  console.log('Staff created:', data);
                  const createdTeacher = data?.teacher ?? data;
                  if (!createdTeacher || !createdTeacher.id) {
                    throw new Error('Unexpected response from server when creating staff.');
                  }

                  setTeacherList((current) => [
                    ...current,
                    normalizeTeacher({
                      ...createdTeacher,
                      role,
                      teacherClasses: assignedTeacherClasses,
                      teacherSubjects: assignedTeacherSubjects,
                    }),
                  ]);

                  setIsOpen(false);
                  setErrorMessage(null);
                  setSuccessModalTitle(role === 'BURSAR' ? 'Bursar added' : 'Teacher added');
                  setSuccessModalMessage(`${createdTeacher?.name || name} has been added successfully as ${role === 'BURSAR' ? 'Bursar / Accountant' : 'Teacher'}.`);
                  setShowSuccessModal(true);
                } catch (error: unknown) {
                  if (error instanceof Error) {
                    setErrorMessage(error.message);
                  } else {
                    setErrorMessage('An unexpected error occurred. Please try again.');
                  }
                  setShowErrorModal(true);
                } finally {
                  setIsSaving(false);
                }
              }}
              className="space-y-4 px-6 py-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Full name
                  <input
                    name="name"
                    required
                    placeholder="Aisha Bello"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium">
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="aisha@example.com"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Password
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="Create a secure password"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>

                {formRole === 'BURSAR' && (
                  <div className="flex items-end">
                    <div className="w-full rounded-lg border border-dashed border-border bg-background/40 px-3 py-3 text-sm text-muted">
                      This account will use the same school login and redirect to the accounting portal.
                    </div>
                  </div>
                )}
              </div>

              {formRole === "TEACHER" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <fieldset className="text-sm font-medium">
                    <legend>Assign classes</legend>
                    <div className="mt-1 max-h-32 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-3">
                      {classes.map((classItem) => (
                        <label key={classItem.id} className="flex cursor-pointer items-center gap-2 font-normal text-foreground">
                          <input
                            type="checkbox"
                            name="classIds"
                            value={classItem.id}
                            className="h-4 w-4 accent-brand"
                          />
                          <span>{classItem.name}{classItem.arm ? ` ${classItem.arm}` : ""}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="text-sm font-medium">
                    <legend>Assign subjects</legend>
                    <div className="mt-1 max-h-32 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-3">
                      {subjects.map((subject) => (
                        <label key={subject.id} className="flex cursor-pointer items-center gap-2 font-normal text-foreground">
                          <input
                            type="checkbox"
                            name="subjectIds"
                            value={subject.id}
                            className="h-4 w-4 accent-brand"
                          />
                          <span>{subject.name}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}

              {formRole === "BURSAR" && (
                <div className="rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted">
                  Bursar / accountant roles are created for financial management and will access the accounting portal after login.
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving} className="inline-flex items-center gap-2">
                  {isSaving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    formRole === "BURSAR" ? "Save bursar" : "Save teacher"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTeacher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <style>{`
            @keyframes teachers_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
            @keyframes teachers_modal_exit  { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }
          `}</style>

          <div
            className="w-full max-w-2xl overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
            style={{ animation: `teachers_modal_enter 320ms cubic-bezier(.2,.9,.2,1)` }}
          >
            <div className="border-b border-border/70 bg-brand/10 px-6 py-5">
              <div className="mb-0 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Edit {selectedTeacher.role === "BURSAR" ? "bursar" : "teacher"}</h2>
                  <p className="mt-2 text-sm text-muted">
                    Update staff information and assign classes and subjects.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openDeleteModal(selectedTeacher)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30"
                    aria-label="Delete staff member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playCloseTone();
                      setSelectedTeacher(null);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30"
                    aria-label="Close modal"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement;
                startTransition(async () => {
                  try {
                    const idInput = form.querySelector('input[name="id"]') as HTMLInputElement | null;
                    const nameInput = form.querySelector('input[name="name"]') as HTMLInputElement | null;
                    const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement | null;
                    const passwordInput = form.querySelector('input[name="password"]') as HTMLInputElement | null;
                    if (!idInput || !nameInput || !emailInput) {
                      throw new Error('Form fields not found. Please try again.');
                    }

                    const id = idInput.value.trim();
                    const name = nameInput.value.trim();
                    const email = emailInput.value.trim();
                    const password = passwordInput?.value.trim() || '';

                    if (!id) throw new Error('Teacher ID is missing');
                    if (!name) throw new Error('Name is required');
                    if (!email) throw new Error('Email is required');

                    const classIds = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="classIds"]:checked'))
                      .map((input) => input.value);

                    const subjectIds = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="subjectIds"]:checked'))
                      .map((input) => input.value);

                    const backendUrl = getBackendUrl();
                    console.log('Updating teacher:', { id, name, email, classIds, subjectIds });

                    const body: any = {
                      name,
                      email,
                      classIds,
                      subjectIds,
                    };

                    if (password) {
                      body.password = password;
                    }

                    const response = await fetch(`${backendUrl}/api/admin/teachers/${id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify(body),
                    });

                    if (!response.ok) {
                      const errorBody = await response.json().catch(() => null);
                      throw new Error(parseApiErrorMessage(errorBody, response.status));
                    }

                    const data = await response.json();
                    console.log('Teacher updated:', data);
                    setSelectedTeacher(null);
                    setErrorMessage(null);
                    window.location.reload();
                  } catch (error: unknown) {
                    if (error instanceof Error) {
                      setErrorMessage(error.message);
                      setShowErrorModal(true);
                    } else {
                      setErrorMessage("An unexpected error occurred. Please try again.");
                      setShowErrorModal(true);
                    }
                  }
                });
              }}
              className="space-y-4 px-6 py-6"
            >
              <input type="hidden" name="id" value={selectedTeacher.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Full name
                  <input
                    name="name"
                    defaultValue={selectedTeacher.name}
                    required
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium">
                  Email address
                  <input
                    name="email"
                    type="email"
                    defaultValue={selectedTeacher.email}
                    required
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="text-sm font-medium">
                Password (leave blank to keep current)
                <input
                  name="password"
                  type="password"
                  placeholder="Leave blank to keep current"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>

              {selectedTeacher.role !== "BURSAR" && <div className="grid gap-4 sm:grid-cols-2">
                <fieldset className="text-sm font-medium">
                  <legend>Assign classes</legend>
                  <div className="mt-1 max-h-32 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-3">
                    {classes.map((classItem) => (
                      <label key={classItem.id} className="flex cursor-pointer items-center gap-2 font-normal text-foreground">
                        <input
                          type="checkbox"
                          name="classIds"
                          value={classItem.id}
                          defaultChecked={selectedTeacher.teacherClasses.some((t: any) => t.classId === classItem.id)}
                          className="h-4 w-4 accent-brand"
                        />
                        <span>{classItem.name}{classItem.arm ? ` ${classItem.arm}` : ""}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="text-sm font-medium">
                  <legend>Assign subjects</legend>
                  <div className="mt-1 max-h-32 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-3">
                    {subjects.map((subject) => (
                      <label key={subject.id} className="flex cursor-pointer items-center gap-2 font-normal text-foreground">
                        <input
                          type="checkbox"
                          name="subjectIds"
                          value={subject.id}
                          defaultChecked={selectedTeacher.teacherSubjects.some((t: any) => t.subjectId === subject.id)}
                          className="h-4 w-4 accent-brand"
                        />
                        <span>{subject.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>}

              <div className="flex justify-end">
                <Button type="submit">Save {selectedTeacher.role === "BURSAR" ? "bursar" : "teacher"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <style>{`
            @keyframes teacher_delete_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
            @keyframes teacher_delete_exit { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }
          `}</style>

          <div
            className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(220,38,38,0.16)]"
            style={{
              animation: `${deleteAnimateState === "enter" ? "teacher_delete_enter" : "teacher_delete_exit"} 320ms cubic-bezier(.2,.9,.2,1)`,
            }}
          >
            <div className="border-b border-border/70 bg-error/10 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-error/20 bg-error/10">
                  <AlertCircle className="h-6 w-6 text-error" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Deactivate staff account?</h2>
                  <p className="mt-1 text-sm text-muted">This action cannot be undone.</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-muted">
                You are about to disable sign-in for <strong>“{deletingTeacherName}”</strong>.
              </p>
              <div className="mt-4 border border-error/20 bg-error/10 p-3">
                <p className="text-xs text-error">
                  <strong>Effect:</strong> Current class and subject assignments will be removed. The employee record and historical records will be retained.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-border/70 bg-background px-6 py-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface disabled:opacity-50 text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTeacher}
                disabled={isDeleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-error px-4 py-2.5 text-sm font-medium text-white hover:bg-error/90 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Deactivate account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setErrorMessage(null);
        }}
        title="Unable to Add Staff"
        message={errorMessage ?? "An unexpected error occurred. Please try again."}
        type="error"
        confirmLabel="Close"
      />

      <ErrorModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successModalTitle}
        message={successModalMessage}
        type="success"
        confirmLabel="Okay"
      />
      <UserGuide guide={TEACHER_GUIDE} />
    </>
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
    // ignore
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
