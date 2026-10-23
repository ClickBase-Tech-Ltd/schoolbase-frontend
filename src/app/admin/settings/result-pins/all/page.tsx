"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Printer, Search, ShieldOff, X } from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";
import { buildPinCardHtml } from "@/lib/pin-print";
import { resolveSchoolAssetUrl } from "@/lib/asset-urls";

interface PinRecord {
  id: string;
  pinValue?: string | null;
  studentId?: string | null;
  type?: string | null;
  status?: string | null;
  expiresAt?: string | null;
  generatedAt?: string | null;
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

export default function ResultPinsAllPage() {
  const [pins, setPins] = useState<PinRecord[]>([]);
  const [loadingPins, setLoadingPins] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPin, setSelectedPin] = useState<PinRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [schoolMeta, setSchoolMeta] = useState<SchoolMeta | null>(null);

  const backendUrl = getBackendUrl();

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

  const loadPins = async (searchValue = search, nextPage = 1) => {
    try {
      setLoadingPins(true);
      const response = await fetch(`/api/admin/result-pins/pins?search=${encodeURIComponent(searchValue)}&limit=${limit}&page=${nextPage}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load PIN records");
      const data = await response.json();
      setPins(data.pins || []);
      setTotal(typeof data.total === 'number' ? data.total : null);
      setPage(typeof data.page === 'number' ? data.page : nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load PIN records");
    } finally {
      setLoadingPins(false);
    }
  };

  useEffect(() => {
    void loadSchoolMeta();
    void loadPins(search, page);
  }, []);

  const filteredPins = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return pins;
    return pins.filter((pin) => {
      const studentName = `${pin.student?.firstName || ""} ${pin.student?.lastName || ""}`.trim().toLowerCase();
      const haystack = [
        pin.pinValue,
        studentName,
        pin.student?.admissionNo,
        pin.batch?.batchName,
        pin.term?.name,
        pin.term?.academicYear?.name,
        pin.status,
        pin.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [pins, search]);

  const handleViewPin = (pin: PinRecord) => {
    setSelectedPin(pin);
    setIsModalOpen(true);
  };

  const handlePrintPin = async (pin: PinRecord) => {
    const schoolCode = schoolMeta?.slug || "—";
    const admissionNo = pin.student?.admissionNo || "N/A";
    const studentName = pin.student ? `${pin.student.firstName || ""} ${pin.student.lastName || ""}`.trim() : "Unassigned";
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
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
      <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/settings/result-pins" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand/80">
            Back to registry
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">All result PINs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Browse the full PIN registry from a dedicated workspace.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadPins()}
          disabled={loadingPins}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className={`transition ${loadingPins ? "animate-spin" : ""}`}>↻</span>
          {loadingPins ? "Refreshing..." : "Refresh list"}
        </button>
      </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted">{loadingPins ? "Loading records..." : `${filteredPins.length} PIN${filteredPins.length === 1 ? "" : "s"} shown`}</div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={search}
              onChange={(event) => {
                const next = event.target.value;
                setSearch(next);
                void loadPins(next, 1);
              }}
              placeholder="Search PINs"
              className="w-52 bg-transparent text-sm text-foreground outline-none"
            />
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          {loadingPins ? (
            <div className="p-4 text-sm text-muted">Loading records...</div>
          ) : filteredPins.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full border border-border bg-background p-3">
                <ShieldOff className="h-5 w-5 text-muted" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">No Result PINs matched your search.</p>
                <p className="mt-1 text-sm text-muted">Try a different keyword or return to the registry.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-background/60 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-3 font-medium">PIN</th>
                    <th className="px-3 py-3 font-medium">Student</th>
                    <th className="px-3 py-3 font-medium">Admission No.</th>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Session</th>
                    <th className="px-3 py-3 font-medium">Term</th>
                    <th className="px-3 py-3 font-medium">Expiry</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface/60">
                  {filteredPins.map((pin) => (
                    <tr key={pin.id} className="align-top">
                      <td className="px-3 py-3">
                        <div className="font-semibold tracking-[0.2em] text-foreground">{pin.pinValue || "—"}</div>
                        <div className="mt-1 text-xs text-muted">{pin.batch?.batchName || "Standalone"}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-foreground">{pin.student ? `${pin.student.firstName || ""} ${pin.student.lastName || ""}`.trim() : "Unassigned"}</div>
                        <div className="text-xs text-muted">{pin.student?.class?.name || "—"}</div>
                      </td>
                      <td className="px-3 py-3 text-foreground">{pin.student?.admissionNo || "—"}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getTypeBadgeClass(pin.type || "GENERIC")}`}>
                          {pin.type || "GENERIC"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(pin.status || "ACTIVE")}`}>
                          {pin.status || "ACTIVE"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-foreground">{pin.term?.academicYear?.name || "—"}</td>
                      <td className="px-3 py-3 text-foreground">{pin.term?.name || "—"}</td>
                      <td className="px-3 py-3 text-foreground">{pin.expiresAt ? new Date(pin.expiresAt).toLocaleDateString() : "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => handleViewPin(pin)} className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100">
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          <button type="button" onClick={() => handlePrintPin(pin)} className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100">
                            <Printer className="h-3.5 w-3.5" /> Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted">Page {page} {total ? `of ${Math.max(1, Math.ceil((total || 0) / limit))}` : ''}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => void loadPins(search, Math.max(1, page - 1))}
                  className="rounded-md border px-3 py-1 text-sm"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={total !== null && page >= Math.ceil((total || 0) / limit)}
                  onClick={() => void loadPins(search, page + 1)}
                  className="rounded-md border px-3 py-1 text-sm"
                >
                  Next
                </button>
              </div>
              </div>
            </>
          )}
        </div>
      </div>

      {isModalOpen && selectedPin ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-lg overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]">
            <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-brand/10 px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">PIN preview</p>
                <h3 className="mt-2 text-xl font-semibold text-foreground">Result access sheet details</h3>
              </div>
              <button type="button" onClick={() => { setSelectedPin(null); setIsModalOpen(false); }} className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted/30">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4 text-sm text-muted sm:px-6 sm:py-5">
              <div className="border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">School code</span>
                  <span className="font-semibold text-foreground">{schoolMeta?.slug || "—"}</span>
                </div>
              </div>
              <div className="border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">Student</span>
                  <span className="font-semibold text-foreground">{selectedPin.student ? `${selectedPin.student.firstName || ""} ${selectedPin.student.lastName || ""}`.trim() : "Unassigned"}</span>
                </div>
              </div>
              <div className="border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">Admission number</span>
                  <span className="font-semibold text-foreground">{selectedPin.student?.admissionNo || "—"}</span>
                </div>
              </div>
              <div className="border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">PIN</span>
                  <span className="font-semibold tracking-[0.3em] text-brand">{selectedPin.pinValue || "—"}</span>
                </div>
              </div>
              <div className="border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">Session</span>
                  <span className="font-semibold text-foreground">{selectedPin.term?.academicYear?.name || "—"}</span>
                </div>
              </div>
              <div className="border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">Term</span>
                  <span className="font-semibold text-foreground">{selectedPin.term?.name || "—"}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => handlePrintPin(selectedPin)} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90">
                <Printer className="h-4 w-4" />
                Print sheet
              </button>
              <button type="button" onClick={() => { setSelectedPin(null); setIsModalOpen(false); }} className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/30">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </main>
  );
}
