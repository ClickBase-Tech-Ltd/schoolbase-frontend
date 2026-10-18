"use client";

import { useMemo, useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { resolveSchoolAssetUrl } from "@/lib/asset-urls";
import { playCloseTone, playOpenTone } from "@/lib/sounds";
import Image from "next/image";
import { Bell, CalendarPlus, CheckSquare, Download, MoreVertical, Pause, Play, X } from "lucide-react";

export type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  plan: string;
  status: string;
  isVerified?: boolean;
  trialEndsAt: string | null;
  subscriptionExpiresAt?: string | null;
  createdAt: string;
  userCount?: number;
  pupilCount?: number;
  classCount?: number;
  planLimit?: number | null;
  archivedAt?: string | null;
  archiveReason?: string | null;
};

// Helper function to get the next plan tier
function getNextPlan(currentPlan: string): string {
  const planProgression: Record<string, string> = {
    'FREE': 'STARTER',
    'STARTER': 'GROWTH',
    'GROWTH': 'ENTERPRISE',
    'ENTERPRISE': 'ENTERPRISE'
  };
  return planProgression[currentPlan] || currentPlan;
}

export function ActionMenu({
  school,
  performAction,
  restoreSchool,
  impersonate,
  sendReminder,
  busy,
  compact,
}: {
  school: SchoolRow;
  performAction: (schoolId: string, action: string, payload?: Record<string, unknown>) => Promise<void>;
  restoreSchool: (schoolId: string) => Promise<void>;
  impersonate: (schoolId: string) => Promise<void>;
  sendReminder: (schoolId: string) => Promise<void>;
  busy: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuWidth = 176; // match w-44
    const top = rect.bottom + 8 + window.scrollY;
    const left = Math.max(8 + window.scrollX, rect.right - menuWidth + window.scrollX);
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node;
      if (btnRef.current && btnRef.current.contains(target)) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        type="button"
        className={`cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#0A66C2]/20 bg-white text-[#0A66C2] transition hover:bg-[#0A66C2]/5 ${compact ? "h-10 px-3 text-[11px]" : "h-10 px-3.5 text-xs font-semibold"}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Open school actions"
      >
        <MoreVertical className="h-3.5 w-3.5" />
        <span className={`${compact ? "sr-only sm:not-sr-only" : ""}`}>Actions</span>
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              style={{ position: "absolute", top: `${pos.top}px`, left: `${pos.left}px`, width: "176px" }}
              className="z-50 origin-top-right rounded-md border border-border bg-background shadow-lg"
            >
              <div className="py-1">
                {!school.archivedAt ? <>
                  <button
                    className="cursor-pointer flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface"
                    onClick={() => { setOpen(false); performAction(school.id, school.status === "SUSPENDED" ? "activate" : "suspend"); }}
                    disabled={busy}
                  >
                    {school.status === "SUSPENDED" ? "Activate" : "Suspend"}
                  </button>
                  <button
                    className="cursor-pointer flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface"
                    onClick={() => { setOpen(false); performAction(school.id, "upgrade"); }}
                    disabled={busy || school.plan === "ENTERPRISE"}
                  >
                    Upgrade to {getNextPlan(school.plan)}
                  </button>
                  <button
                    className="cursor-pointer flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface"
                    onClick={() => { setOpen(false); performAction(school.id, "extendTrial", { days: 30 }); }}
                    disabled={busy}
                  >
                    +30d trial
                  </button>
                  <button
                    className="cursor-pointer flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface"
                    onClick={() => { setOpen(false); performAction(school.id, "cancel"); }}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    className="cursor-pointer flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface"
                    onClick={() => { setOpen(false); sendReminder(school.id); }}
                    disabled={busy}
                  >
                    Send reminder
                  </button>
                </> : null}
                <button
                  className="cursor-pointer flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface"
                  onClick={() => { setOpen(false); impersonate(school.id); }}
                  disabled={busy || Boolean(school.archivedAt)}
                >
                  Impersonate
                </button>
                {school.archivedAt ? (
                  <button
                    className="cursor-pointer flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                    onClick={() => { setOpen(false); restoreSchool(school.id); }}
                    disabled={busy}
                  >
                    Restore school
                  </button>
                ) : (
                  <button
                    className="cursor-pointer flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("schoolbase:archive-school", { detail: school })); }}
                    disabled={busy}
                  >
                    Delete school
                  </button>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function SchoolTable({
  schools,
  filterControls,
  onOpenDetails,
  onRestoreSchool,
}: {
  schools: SchoolRow[];
  filterControls?: ReactNode;
  onOpenDetails?: (school: SchoolRow) => void;
  onRestoreSchool: (schoolId: string) => Promise<void>;
}) {
  const [schoolOverrides, setSchoolOverrides] = useState<Record<string, Partial<SchoolRow>>>({});
  const displaySchools = useMemo(
    () => schools.map((school) => ({ ...school, ...schoolOverrides[school.id] })),
    [schools, schoolOverrides],
  );
  const [editingExpiryId, setEditingExpiryId] = useState<string | null>(null);
  const [editingExpiryValue, setEditingExpiryValue] = useState<string | null>(null);
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<"NONE" | "TRIAL_ENDING" | "UNVERIFIED" | "SUSPENDED">("NONE");
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(new Set());
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  function toInputDate(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const filteredSchools = useMemo(() => {
    return displaySchools.filter((school) => {
      const matchesQuickFilter =
        quickFilter === "NONE" ||
        (quickFilter === "TRIAL_ENDING" && school.trialEndsAt && (() => {
          const endDate = new Date(school.trialEndsAt);
          const diffDays = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 14;
        })()) ||
        (quickFilter === "UNVERIFIED" && !school.isVerified) ||
        (quickFilter === "SUSPENDED" && school.status === "SUSPENDED");

      return matchesQuickFilter;
    });
  }, [displaySchools, quickFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSchools.slice(start, start + pageSize);
  }, [filteredSchools, currentPage, pageSize]);

  const pageItems = useMemo<(number | "ellipsis")[]>(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const items: (number | "ellipsis")[] = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) items.push("ellipsis");
    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) items.push(pageNumber);
    if (end < totalPages - 1) items.push("ellipsis");
    items.push(totalPages);

    return items;
  }, [currentPage, totalPages]);

  const currentPageIds = useMemo(
    () => paginated.map((school) => school.id),
    [paginated],
  );

  const allCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedSchoolIds.has(id));
  const someCurrentPageSelected = currentPageIds.some((id) => selectedSchoolIds.has(id));
  const selectedCount = selectedSchoolIds.size;
  const selectedSchools = useMemo(
    () => filteredSchools.filter((school) => selectedSchoolIds.has(school.id)),
    [filteredSchools, selectedSchoolIds],
  );

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someCurrentPageSelected && !allCurrentPageSelected;
    }
  }, [someCurrentPageSelected, allCurrentPageSelected]);

  const toggleSchoolSelection = (schoolId: string) => {
    setSelectedSchoolIds((current) => {
      const next = new Set(current);
      if (next.has(schoolId)) next.delete(schoolId);
      else next.add(schoolId);
      return next;
    });
  };

  const openExpiryModal = (school: SchoolRow) => {
    setEditingExpiryId(school.id);
    setEditingExpiryValue(toInputDate(school.subscriptionExpiresAt || school.trialEndsAt));
    playOpenTone();
  };

  const closeExpiryModal = () => {
    playCloseTone();
    setEditingExpiryId(null);
    setEditingExpiryValue(null);
  };

  const toggleSelectCurrentPage = () => {
    setSelectedSchoolIds((current) => {
      const next = new Set(current);
      if (allCurrentPageSelected) {
        currentPageIds.forEach((id) => next.delete(id));
      } else {
        currentPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedSchoolIds(new Set(filteredSchools.map((school) => school.id)));
  };

  const clearSelection = () => setSelectedSchoolIds(new Set());

  const exportSelectedCsv = () => {
    const rows = selectedCount > 0 ? selectedSchools : filteredSchools;
    const csvHeader = ["Name","Country","Email","Phone","Plan","Status","Verified","Expiry","Registered","Admins","Students","Classes"];
    const csvRows = rows.map((school) => [
      school.name,
      school.country,
      school.email || "",
      school.phone || "",
      school.plan,
      school.status,
      school.isVerified ? "Yes" : "No",
      (school.subscriptionExpiresAt || school.trialEndsAt) ? new Date((school.subscriptionExpiresAt || school.trialEndsAt) as string).toLocaleDateString() : "",
      new Date(school.createdAt).toLocaleDateString(),
      String(school.userCount ?? 0),
      String(school.pupilCount ?? 0),
      String(school.classCount ?? 0),
    ]);
    const content = [csvHeader, ...csvRows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schools-${selectedCount > 0 ? "selected" : "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const performBulkAction = async (action: string, payload?: Record<string, unknown>) => {
    const ids = Array.from(selectedSchoolIds);
    if (ids.length === 0) {
      setMessage("Select at least one school to perform a bulk action.");
      return;
    }
    setBusy(true);
    setMessage(null);

    try {
      const results = await Promise.all(ids.map(async (schoolId) => {
        const response = await fetch("/schoolbase-admin/api/schools", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ schoolId, action, ...payload }),
        });
        return response.json();
      }));

      setMessage(`Bulk action completed for ${ids.length} school${ids.length === 1 ? "" : "s"}.`);
      setSchoolOverrides((current) => {
        const next = { ...current };
        displaySchools.forEach((school) => {
          const updated = results.find((result: { school?: SchoolRow } | undefined) => result?.school?.id === school.id);
          if (updated?.school) next[school.id] = { ...next[school.id], ...updated.school };
        });
        return next;
      });
      clearSelection();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk action failed.");
    } finally {
      setBusy(false);
    }
  };

  const performAction = async (
    schoolId: string,
    action: string,
    payload?: Record<string, unknown>,
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/schoolbase-admin/api/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schoolId, action, ...payload }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message || "Action failed.");
      } else {
        setMessage(result.message || "Action completed.");
        setSchoolOverrides((current) => ({
          ...current,
          [schoolId]: { ...current[schoolId], ...result.school },
        }));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const sendReminder = async (schoolId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/schoolbase-admin/api/reminders/send-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schoolId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message || "Failed to send reminder.");
      } else {
        setMessage(result.message || "Reminder sent.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to send reminder.");
    } finally {
      setBusy(false);
    }
  };

  const sendBulkReminders = async () => {
    const ids = Array.from(selectedSchoolIds);
    if (ids.length === 0) {
      setMessage("Select at least one school to send reminders.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const results = await Promise.all(ids.map(async (schoolId) => {
        const response = await fetch("/schoolbase-admin/api/reminders/send-single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ schoolId }),
        });
        return response.json();
      }));

      const successCount = results.filter((result: { success?: boolean; message?: string } | undefined) => result?.success || !result?.message).length;
      setMessage(`Sent reminders to ${successCount} of ${ids.length} selected schools.`);
      clearSelection();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to send reminders.");
    } finally {
      setBusy(false);
    }
  };

  const sendReminderToIncompleteSchools = async () => {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/schoolbase-admin/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message || "Failed to send reminders to incomplete schools.");
      } else {
        const sentCount = result.sentCount ?? result.total ?? "all";
        setMessage(result.message || `Sent reminders to ${sentCount} incomplete schools.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to send reminders to incomplete schools.");
    } finally {
      setBusy(false);
    }
  };

  const impersonate = async (schoolId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/schoolbase-admin/api/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schoolId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message || "Impersonation failed.");
        return;
      }
      if (result.success !== true || result.redirectUrl !== "/admin") {
        setMessage("Impersonation response did not establish a school session.");
        return;
      }
      window.location.assign(result.redirectUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impersonation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-border bg-surface p-5">
      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          {filterControls ?? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`h-9 rounded-lg border px-3 text-xs font-semibold transition ${quickFilter === "NONE" ? "border-brand bg-brand text-white" : "border-border bg-background text-foreground hover:bg-surface"}`}
                onClick={() => setQuickFilter("NONE")}
              >
                All
              </button>
              <button
                type="button"
                className={`h-9 rounded-lg border px-3 text-xs font-semibold transition ${quickFilter === "TRIAL_ENDING" ? "border-brand bg-brand text-white" : "border-border bg-background text-foreground hover:bg-surface"}`}
                onClick={() => setQuickFilter("TRIAL_ENDING")}
              >
                Trials ending soon
              </button>
              <button
                type="button"
                className={`h-9 rounded-lg border px-3 text-xs font-semibold transition ${quickFilter === "UNVERIFIED" ? "border-brand bg-brand text-white" : "border-border bg-background text-foreground hover:bg-surface"}`}
                onClick={() => setQuickFilter("UNVERIFIED")}
              >
                Unverified
              </button>
              <button
                type="button"
                className={`h-9 rounded-lg border px-3 text-xs font-semibold transition ${quickFilter === "SUSPENDED" ? "border-brand bg-brand text-white" : "border-border bg-background text-foreground hover:bg-surface"}`}
                onClick={() => setQuickFilter("SUSPENDED")}
              >
                Suspended
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 self-start xl:max-w-[520px]">
          <button
            type="button"
            title={selectedCount > 0 ? `Export ${selectedCount} selected schools` : "Export all schools"}
            aria-label={selectedCount > 0 ? `Export ${selectedCount} selected schools` : "Export all schools"}
            className="inline-flex h-10 min-w-[42px] items-center justify-center rounded-xl border border-[#0A66C2] bg-[#0A66C2] px-3 text-white transition hover:bg-[#0952a4] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={exportSelectedCsv}
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Select all filtered schools"
            aria-label="Select all filtered schools"
            className="inline-flex h-10 min-w-[42px] items-center justify-center rounded-xl border border-[#0A66C2] bg-[#0A66C2] px-3 text-white transition hover:bg-[#0952a4]"
            onClick={selectAllFiltered}
          >
            <CheckSquare className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Clear selection"
            aria-label="Clear selection"
            className="inline-flex h-10 min-w-[42px] items-center justify-center rounded-xl border border-[#0A66C2] bg-[#0A66C2] px-3 text-white transition hover:bg-[#0952a4] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={clearSelection}
            disabled={selectedCount === 0}
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Send reminder to selected schools"
            aria-label="Send reminder to selected schools"
            className="inline-flex h-10 min-w-[42px] items-center justify-center rounded-xl border border-[#0A66C2] bg-[#0A66C2] px-3 text-white transition hover:bg-[#0952a4] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={sendBulkReminders}
            disabled={selectedCount === 0 || busy}
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Send reminders to all incomplete schools"
            aria-label="Send reminders to all incomplete schools"
            className="inline-flex h-10 min-w-[42px] items-center justify-center rounded-xl border border-[#0A66C2] bg-[#0A66C2] px-3 text-white transition hover:bg-[#0952a4] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={sendReminderToIncompleteSchools}
            disabled={busy}
          >
            <CalendarPlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Suspend selected schools"
            aria-label="Suspend selected schools"
            className="inline-flex h-10 min-w-[42px] items-center justify-center rounded-xl border border-[#0A66C2] bg-[#0A66C2] px-3 text-white transition hover:bg-[#0952a4] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => performBulkAction("suspend")}
            disabled={selectedCount === 0 || busy}
          >
            <Pause className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Activate selected schools"
            aria-label="Activate selected schools"
            className="inline-flex h-10 min-w-[42px] items-center justify-center rounded-xl border border-[#0A66C2] bg-[#0A66C2] px-3 text-white transition hover:bg-[#0952a4] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => performBulkAction("activate")}
            disabled={selectedCount === 0 || busy}
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Extend trial by 30 days for selected schools"
            aria-label="Extend trial by 30 days for selected schools"
            className="inline-flex h-10 min-w-[42px] items-center justify-center rounded-xl border border-[#0A66C2] bg-[#0A66C2] px-3 text-white transition hover:bg-[#0952a4] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => performBulkAction("extendTrial", { days: 30 })}
            disabled={selectedCount === 0 || busy}
          >
            <CalendarPlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {message ? (
        <div className="mb-4 rounded-2xl border border-border px-4 py-3 text-sm text-foreground bg-brand/5">
          {message}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-background text-left text-xs uppercase tracking-[0.15em] text-muted">
            <tr>
              <th className="px-4 py-3">
                <label className="flex items-center gap-2">
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleSelectCurrentPage}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                  />
                  <span className="sr-only">Select all current page</span>
                </label>
              </th>
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Registered</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((school) => (
              <tr key={school.id} className="hover:bg-brand/5 transition-colors">
                <td className="px-4 py-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSchoolIds.has(school.id)}
                      onChange={() => toggleSchoolSelection(school.id)}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    <span className="sr-only">Select {school.name}</span>
                  </label>
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => onOpenDetails?.(school)}
                    className="flex cursor-pointer items-center gap-3 text-left"
                    disabled={!onOpenDetails}
                  >
                    <div className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-brand/10 text-sm font-semibold text-brand">
                      {school.logoUrl ? (
                        <Image
                          src={resolveSchoolAssetUrl(school.logoUrl) || school.logoUrl || ""}
                          alt={`${school.name} logo`}
                          width={40}
                          height={40}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{school.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{school.name}</div>
                      <div className="text-xs text-muted">{school.email ?? "No email"}</div>
                    </div>
                  </button>
                </td>
                <td className="px-4 py-4 text-foreground">{school.country}</td>
                <td className="px-4 py-4 text-muted">{school.phone || "—"}</td>
                <td className="px-4 py-4 font-semibold text-foreground">
                  <div>{school.plan}</div>
                  <div className="text-xs text-muted">
                    {school.userCount ?? 0} admins · {school.pupilCount ?? 0} students
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                    school.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : school.status === "TRIAL"
                      ? "bg-sky-100 text-sky-700"
                      : school.status === "SUSPENDED"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-700"
                  }`}>
                    {school.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                    school.isVerified
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {school.isVerified ? "✓ Verified" : "Unverified"}
                  </span>
                </td>
                <td className="px-4 py-4 text-muted">
                  <div className="flex items-center gap-2">
                    <span>{(school.subscriptionExpiresAt || school.trialEndsAt) ? new Date((school.subscriptionExpiresAt || school.trialEndsAt) as string).toLocaleDateString() : 'n/a'}</span>
                    <button
                      type="button"
                      onClick={() => openExpiryModal(school)}
                      className="cursor-pointer rounded bg-brand px-2 py-1 text-xs font-semibold text-white hover:bg-brand/90 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </td>
                <td className="px-4 py-4 text-muted">{new Date(school.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-4">
                  <ActionMenu
                    school={school}
                    performAction={performAction}
                    restoreSchool={onRestoreSchool}
                    sendReminder={sendReminder}
                    impersonate={impersonate}
                    busy={busy}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingExpiryId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <style>{`
            @keyframes schools_expiry_modal_enter { from { transform: translateY(24px) scale(.98); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
          `}</style>
          <div
            className="w-full max-w-lg overflow-hidden border border-slate-200 bg-white shadow-none rounded-none"
            style={{ animation: `schools_expiry_modal_enter 260ms cubic-bezier(.2,.9,.2,1)` }}
          >
            <div className="border-b border-slate-100 px-6 py-5" style={{ background: "linear-gradient(90deg, rgba(10,102,194,0.12), rgba(10,102,194,0.04))" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Edit expiry date</h2>
                  <p className="mt-1 text-sm text-muted">Update the subscription expiry date for this school.</p>
                </div>
                <button
                  type="button"
                  onClick={closeExpiryModal}
                  className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-none border border-border hover:bg-background transition-colors"
                  aria-label="Close expiry modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              <label className="block text-sm font-medium text-foreground mb-2">Expiry date</label>
              <input
                type="date"
                value={editingExpiryValue ?? ""}
                onChange={(e) => setEditingExpiryValue(e.target.value)}
                className="w-full rounded-none border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeExpiryModal}
                disabled={savingExpiry}
                className="rounded-none border border-slate-300 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <Button
                type="button"
                className="rounded-none"
                onClick={async () => {
                  if (!editingExpiryId) return;
                  const expiresAt = editingExpiryValue;
                  if (!expiresAt) return;

                  try {
                    setSavingExpiry(true);
                    await performAction(editingExpiryId, 'setExpiry', { expiresAt });
                  } catch (err) {
                    console.error('Failed to set expiry', err);
                  } finally {
                    setSavingExpiry(false);
                    setEditingExpiryId(null);
                    setEditingExpiryValue(null);
                    playCloseTone();
                  }
                }}
                disabled={savingExpiry || !editingExpiryValue}
              >
                {savingExpiry ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Showing {paginated.length} of {filteredSchools.length} schools.</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="px-3 py-2 text-xs"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Prev
          </Button>
          <div className="flex items-center gap-1">
            {pageItems.map((pageItem, index) =>
              pageItem === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="inline-flex items-center px-1 py-2 text-xs text-muted" aria-hidden="true">
                  ...
                </span>
              ) : (
                <button
                  key={pageItem}
                  onClick={() => setPage(pageItem)}
                  className={`inline-flex items-center justify-center rounded px-3 py-2 text-xs font-semibold ${currentPage === pageItem ? "bg-brand text-white" : "border border-border bg-background text-foreground"}`}
                >
                  {pageItem}
                </button>
              ),
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="px-3 py-2 text-xs"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
