"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CreditCard, Search, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";

type StudentResult = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string | null;
  class: { id: string; name: string; arm: string | null } | null;
};

type TermOption = { id: string; name: string; sortOrder: number };
type AcademicYearOption = { id: string; name: string; isCurrent: boolean; terms: TermOption[] };
type SchedulePreview = {
  id: string;
  name: string;
  amount: number;
  items: Array<{ id: string; name: string; amount: number; isRequired: boolean }>;
  invoice: null | { id: string; invoiceNo: string; amountDue: number; amountPaid: number; status: string };
};

export default function StudentInvoiceRecovery({ currency }: { currency: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [years, setYears] = useState<AcademicYearOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [schedules, setSchedules] = useState<SchedulePreview[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const terms = useMemo(() => years.flatMap((year) => year.terms.map((term) => ({
    ...term,
    label: `${year.name} · ${term.name}`,
  }))), [years]);
  const missingSchedules = schedules.filter((schedule) => !schedule.invoice);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!selectedStudent || !selectedTermId) {
      setSchedules([]);
      return;
    }

    const controller = new AbortController();
    setLoadingPreview(true);
    setConfirmIssue(false);
    setError("");
    fetch(`/api/admin/fees/invoices/students/${encodeURIComponent(selectedStudent.id)}/preview?termId=${encodeURIComponent(selectedTermId)}`, {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to load fee schedules.");
      setSchedules(result.schedules || []);
    }).catch((loadError) => {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      setSchedules([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load fee schedules.");
    }).finally(() => setLoadingPreview(false));

    return () => controller.abort();
  }, [selectedStudent, selectedTermId]);

  const searchStudents = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const search = query.trim();
    if (search.length < 2 || searching) return;
    setSearching(true);
    setSelectedStudent(null);
    setSchedules([]);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/fees/invoices/students?search=${encodeURIComponent(search)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Student search failed.");
      setStudents(result.students || []);
      setYears(result.academicYears || []);
      const currentYear = (result.academicYears || []).find((year: AcademicYearOption) => year.isCurrent);
      if (currentYear?.terms?.length) setSelectedTermId(currentYear.terms[0].id);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Student search failed.");
    } finally {
      setSearching(false);
    }
  };

  const issueMissingInvoices = async () => {
    if (!selectedStudent || !selectedTermId || !missingSchedules.length || issuing) return;
    setIssuing(true);
    setConfirmIssue(false);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/fees/invoices/issue-bills", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termId: selectedTermId, pupilId: selectedStudent.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Invoice issuance failed.");
      const failures = Array.isArray(result.failures)
        ? result.failures.filter((failure: { pupilId: string }) => failure.pupilId === selectedStudent.id)
        : [];
      setMessage(`${result.created || 0} invoice(s) issued; ${result.alreadyIssued || 0} already active; ${result.failed || 0} failed.${failures[0]?.reason ? ` ${failures[0].reason}` : ""}`);
      const refreshed = await fetch(`/api/admin/fees/invoices/students/${encodeURIComponent(selectedStudent.id)}/preview?termId=${encodeURIComponent(selectedTermId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const refreshedData = await refreshed.json().catch(() => ({}));
      if (refreshed.ok) setSchedules(refreshedData.schedules || []);
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : "Invoice issuance failed.");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setIsOpen(true)} className="h-9 gap-2 rounded-md px-3 py-2 text-sm">
        <UserRound size={16} />
        <span className="hidden lg:inline">Recover student invoice</span>
        <span className="lg:hidden">Recover invoice</span>
      </Button>

      {isOpen ? <div className="fixed inset-0 z-[80] overflow-hidden bg-black/50" onMouseDown={(event) => { if (event.target === event.currentTarget && !issuing) setIsOpen(false); }}>
        <aside role="dialog" aria-modal="true" aria-labelledby="student-invoice-recovery-title" className="absolute inset-y-0 right-0 flex w-full max-w-[640px] flex-col border-l border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]">
          <div className="flex items-center justify-between border-b border-border/70 bg-brand/10 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-brand/20 bg-surface text-brand"><UserRound size={18} /></span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Finance workspace</p>
                <h2 id="student-invoice-recovery-title" className="truncate text-lg font-semibold text-foreground">Student invoice recovery</h2>
                <p className="text-xs text-muted">Review the fees, then issue only missing invoices.</p>
              </div>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} disabled={issuing} aria-label="Close student invoice recovery" className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-background text-foreground transition hover:bg-surface disabled:opacity-50"><X size={17} /></button>
          </div>

          <div className="overflow-y-auto">
            <form onSubmit={searchStudents} className="border-b border-border bg-surface/70 px-5 py-4">
              <label htmlFor="bursar-student-search" className="mb-2 block text-xs font-semibold text-foreground">Find a student</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input id="bursar-student-search" value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} placeholder="Name or admission number" className="h-10 w-full border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                </div>
                <Button type="submit" disabled={searching || query.trim().length < 2} className="h-10 gap-2 px-4"><Search size={16} />{searching ? "Searching..." : "Search"}</Button>
              </div>
            </form>

            {students.length > 0 ? <div className="max-h-56 divide-y divide-border overflow-y-auto border-b border-border" aria-label="Student search results">
              {students.map((student) => <button key={student.id} type="button" onClick={() => { setSelectedStudent(student); setMessage(""); setError(""); }} className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition hover:bg-background ${selectedStudent?.id === student.id ? "bg-brand/5" : ""}`}>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground">{student.firstName} {student.lastName}</span><span className="mt-0.5 block truncate text-xs text-muted">{student.admissionNo || "No admission number"} · {student.class?.name || "No class"}{student.class?.arm ? ` ${student.class.arm}` : ""}</span></span>
                <span className="shrink-0 text-xs font-semibold text-brand">{selectedStudent?.id === student.id ? "Selected" : "Review"}</span>
              </button>)}
            </div> : query.trim().length >= 2 && !searching ? <p className="border-b border-border px-5 py-4 text-sm text-muted">No active students found. Check the spelling or admission number.</p> : null}

            {selectedStudent ? <div>
              <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-[11px] font-bold uppercase tracking-wide text-muted">Selected student</p><p className="mt-1 text-sm font-semibold text-foreground">{selectedStudent.firstName} {selectedStudent.lastName}</p><p className="mt-0.5 text-xs text-muted">{selectedStudent.admissionNo || "No admission number"} · {selectedStudent.class?.name || "No class"}</p></div>
                <label className="text-xs font-semibold text-muted sm:w-64">Academic term<select value={selectedTermId} onChange={(event) => setSelectedTermId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-brand"><option value="">Select term</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.label}</option>)}</select></label>
              </div>
              {loadingPreview ? <p className="px-5 py-5 text-sm text-muted">Loading applicable fee schedules...</p> : schedules.length > 0 ? <div className="divide-y divide-border">
                {schedules.map((schedule) => <div key={schedule.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-foreground">{schedule.name}</p>{schedule.items.length > 0 ? <p className="mt-1 text-xs leading-5 text-muted">{schedule.items.map((item) => `${item.name}: ${formatMoney(item.amount, currency)}`).join(" · ")}</p> : <p className="mt-1 text-xs text-muted">Schedule total</p>}</div><div className="shrink-0 text-right"><p className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(schedule.amount, currency)}</p><p className={`mt-1 text-xs font-medium ${schedule.invoice ? "text-emerald-700" : "text-amber-700"}`}>{schedule.invoice ? `${schedule.invoice.invoiceNo} · ${schedule.invoice.status}` : "Not issued"}</p></div></div>
                </div>)}
              </div> : selectedTermId && !loadingPreview ? <p className="border-b border-border px-5 py-5 text-sm text-muted">No fee schedule applies to this student’s class for the selected term.</p> : null}
              {schedules.length > 0 ? <div className="border-t border-border bg-background/70 px-5 py-4">
                {confirmIssue ? <div className="space-y-3"><p className="text-sm leading-5 text-foreground">Issue {missingSchedules.length} invoice(s) totaling {formatMoney(missingSchedules.reduce((sum, schedule) => sum + schedule.amount, 0), currency)}? Guardians may be notified by the configured channels.</p><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setConfirmIssue(false)}>Cancel</Button><Button type="button" onClick={issueMissingInvoices} disabled={issuing}>{issuing ? "Issuing..." : "Confirm issue"}</Button></div></div> : <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted">{missingSchedules.length ? `${missingSchedules.length} missing invoice(s) for this student and term.` : "Invoices are already issued for all applicable schedules."}</p><Button type="button" onClick={() => setConfirmIssue(true)} disabled={!missingSchedules.length || issuing} className="h-10 shrink-0 gap-2"><CreditCard size={16} />Issue missing</Button></div>}
              </div> : null}
            </div> : null}

            {message ? <p role="status" className="border-t border-border px-5 py-3 text-sm text-muted">{message}</p> : null}
            {error ? <p role="alert" className="border-t border-border px-5 py-3 text-sm text-red-700">{error}</p> : null}
          </div>
        </aside>
      </div> : null}
    </>
  );
}
