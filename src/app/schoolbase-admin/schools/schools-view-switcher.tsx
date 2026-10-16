"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import AdminSkeleton from "@/components/ui/skeleton";
import Link from "next/link";
import { Activity, AlertTriangle, Building2, CheckCircle2, Clock, Mail, MapPin, Phone, ShieldCheck, Users, X, XCircle, Zap } from "lucide-react";
import { SchoolTable, type SchoolRow, ActionMenu } from "@/components/platform-admin/school-table";
import { getPlanStudentLimit } from "@/lib/pricing";
import { resolveSchoolAssetUrl } from "@/lib/asset-urls";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function getStatusClasses(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";
    case "TRIAL":
      return "bg-sky-100 text-sky-700";
    case "SUSPENDED":
      return "bg-amber-100 text-amber-800";
    case "CANCELLED":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(date?: string | Date | null) {
  if (!date) return "n/a";
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type SchoolDetailsRow = SchoolRow & {
  tagline?: string | null;
  address?: string | null;
  country?: string | null;
  principalName?: string | null;
  principalComment?: string | null;
  stampUrl?: string | null;
  principalSignatureUrl?: string | null;
};

export default function SchoolsViewSwitcher({
  initialSchools,
  viewMode,
}: {
  initialSchools: SchoolRow[];
  viewMode: "list" | "grid";
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"NAME_ASC" | "REGISTERED_DESC" | "PLAN_ASC" | "STATUS_ASC" | "TRIAL_END_ASC" | "STUDENTS_DESC">("REGISTERED_DESC");
  const [schools, setSchools] = useState<SchoolRow[]>(initialSchools);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedSchool, setSelectedSchool] = useState<SchoolRow | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<SchoolDetailsRow | null>(null);
  const [schoolDetailsLoading, setSchoolDetailsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSchools() {
      setLoading(true);
      setLoadError(null);
      try {
        let allSchools: SchoolRow[] = [];
        let page = 1;

        while (true) {
          const res = await fetch(`/schoolbase-admin/api/schools?page=${page}&limit=100`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });

          if (!res.ok) {
            throw new Error(`Could not load schools (request failed with status ${res.status}).`);
          }

          const data = await res.json();
          if (!Array.isArray(data.schools) || !data.pagination) {
            throw new Error("The schools response was incomplete. Please try again.");
          }

          allSchools = [...allSchools, ...data.schools];
          const currentPage = Number(data.pagination.page);
          const totalPages = Number(data.pagination.pages);
          if (!Number.isFinite(currentPage) || !Number.isFinite(totalPages) || currentPage < page) {
            throw new Error("The schools response had invalid pagination data. Please try again.");
          }
          if (data.schools.length === 0 || currentPage >= totalPages) break;
          page = currentPage + 1;
        }

        if (active) setSchools(allSchools);
      } catch (err) {
        console.error("Error loading schools:", err);
        if (active) setLoadError(err instanceof Error ? err.message : "Could not load schools. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSchools();
    return () => { active = false; };
  }, [reloadToken]);

  const countries = useMemo(() => {
    return Array.from(new Set(schools.map((school) => school.country).filter(Boolean))).sort();
  }, [schools]);

  const stats = useMemo(() => {
    const summary = {
      total: schools.length,
      active: 0,
      trial: 0,
      suspended: 0,
      cancelled: 0,
      verified: 0,
      unverified: 0,
      pupils: 0,
    };

    schools.forEach((school) => {
      summary[school.status.toLowerCase() as keyof typeof summary] =
        (summary[school.status.toLowerCase() as keyof typeof summary] as number) + 1;
      if (school.isVerified) summary.verified += 1;
      else summary.unverified += 1;
      summary.pupils += school.pupilCount ?? 0;
    });

    return summary;
  }, [schools]);

  const filteredSchools = useMemo(() => {
    const searchValue = search.toLowerCase();

    const filtered = schools.filter((school: SchoolRow) => {
      const matchesSearch = [
        school.name,
        school.country,
        school.email,
        school.phone,
        school.plan,
        school.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchValue);

      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "VERIFIED_ONLY"
          ? Boolean(school.isVerified)
          : statusFilter === "UNVERIFIED_ONLY"
          ? !school.isVerified
          : school.status === statusFilter;
      const matchesCountry = countryFilter === "ALL" || school.country === countryFilter;

      return matchesSearch && matchesStatus && matchesCountry;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "NAME_ASC":
          return a.name.localeCompare(b.name);
        case "REGISTERED_DESC":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "PLAN_ASC":
          return a.plan.localeCompare(b.plan);
        case "STATUS_ASC":
          return a.status.localeCompare(b.status);
        case "TRIAL_END_ASC":
          return (a.trialEndsAt ? new Date(a.trialEndsAt).getTime() : 0) -
            (b.trialEndsAt ? new Date(b.trialEndsAt).getTime() : 0);
        case "STUDENTS_DESC":
          return (b.pupilCount ?? 0) - (a.pupilCount ?? 0);
        default:
          return 0;
      }
    });
  }, [schools, search, statusFilter, countryFilter, sortBy]);

  const [busy, setBusy] = useState(false);

  const performAction = async (
    schoolId: string,
    action: string,
    payload?: Record<string, unknown>,
  ) => {
    setBusy(true);
    try {
      const response = await fetch("/schoolbase-admin/api/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schoolId, action, ...payload }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error(result.message || "Action failed.");
        return;
      }
      setSchools((current) => current.map((s) => (s.id === schoolId ? { ...s, ...(result.school || {}) } : s)));
    } catch (err) {
      console.error("Action failed", err);
    } finally {
      setBusy(false);
    }
  };

  const sendReminder = async (schoolId: string) => {
    setBusy(true);
    try {
      const response = await fetch("/schoolbase-admin/api/reminders/send-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schoolId }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error(result.message || "Failed to send reminder.");
      }
    } catch (err) {
      console.error("Failed to send reminder", err);
    } finally {
      setBusy(false);
    }
  };

  const impersonate = async (schoolId: string) => {
    setBusy(true);
    try {
      const response = await fetch("/schoolbase-admin/api/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schoolId }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error(result.message || "Impersonation failed.");
        return;
      }
      if (result.success !== true || result.redirectUrl !== "/admin") {
        console.error("Impersonation response did not establish a school session.");
        return;
      }
      window.location.assign(result.redirectUrl);
    } catch (err) {
      console.error("Impersonation failed", err);
    } finally {
      setBusy(false);
    }
  };

  const openSchoolDetails = async (school: SchoolRow) => {
    setSelectedSchool(school);
    setSchoolDetails(school);
    setSchoolDetailsLoading(true);
    try {
      const response = await fetch(`/schoolbase-admin/api/schools/${encodeURIComponent(school.id)}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const details = await response.json();
        setSchoolDetails({ ...school, ...details });
      }
    } catch (error) {
      console.error("Failed to load school details:", error);
    } finally {
      setSchoolDetailsLoading(false);
    }
  };

  const closeSchoolDetails = () => {
    setSelectedSchool(null);
    setSchoolDetails(null);
  };

  useEffect(() => {
    if (!selectedSchool) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSchoolDetails();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedSchool]);

  const drawerPlan = schoolDetails?.plan || selectedSchool?.plan || "FREE";
  const drawerPlanLimit = schoolDetails?.planLimit ?? selectedSchool?.planLimit ?? getPlanStudentLimit(drawerPlan);
  const drawerStudentCount = schoolDetails?.pupilCount ?? selectedSchool?.pupilCount ?? 0;
  const drawerUsageRatio = drawerPlanLimit ? Math.min(drawerStudentCount / drawerPlanLimit, 1) : 0;
  const drawerUsageStatus = drawerPlanLimit
    ? drawerStudentCount >= drawerPlanLimit
      ? "Limit reached"
      : drawerStudentCount >= drawerPlanLimit * 0.7
      ? "Approaching limit"
      : "Healthy"
    : "Unlimited capacity";
  const drawerUsageColor = drawerPlanLimit
    ? drawerUsageRatio >= 1
      ? "bg-rose-500"
      : drawerUsageRatio >= 0.7
      ? "bg-amber-500"
      : "bg-emerald-500"
    : "bg-brand";

  if (loading) {
    return (
      <div className="py-12">
        <AdminSkeleton />
      </div>
    );
  }

  const filterControls = (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search schools..."
        className="h-9 min-w-[180px] flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 sm:max-w-[220px]"
      />
      <select
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        className="h-9 min-w-[150px] flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-brand sm:max-w-[180px]"
      >
        <option value="ALL">All schools</option>
        <option value="TRIAL">Trial</option>
        <option value="ACTIVE">Active</option>
        <option value="SUSPENDED">Suspended</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="VERIFIED_ONLY">Verified</option>
        <option value="UNVERIFIED_ONLY">Unverified</option>
      </select>
      <select
        value={countryFilter}
        onChange={(event) => setCountryFilter(event.target.value)}
        className="h-9 min-w-[130px] flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-brand sm:max-w-[170px]"
      >
        <option value="ALL">All countries</option>
        {countries.map((country) => (
          <option key={country} value={country}>{country}</option>
        ))}
      </select>
      <select
        value={sortBy}
        onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
        className="h-9 min-w-[170px] flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-brand sm:max-w-[200px]"
      >
        <option value="REGISTERED_DESC">Newest registered</option>
        <option value="NAME_ASC">Name</option>
        <option value="PLAN_ASC">Plan</option>
        <option value="STATUS_ASC">Status</option>
        <option value="TRIAL_END_ASC">Trial ending soon</option>
        <option value="STUDENTS_DESC">Students</option>
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={() => setReloadToken((value) => value + 1)} className="font-semibold underline underline-offset-2">
            Retry loading schools
          </button>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total schools",
            value: stats.total,
            sub: "All registered schools",
            icon: Building2,
            iconClass: "bg-slate-100 text-slate-700",
            href: "/schoolbase-admin/schools",
          },
          {
            label: "Active",
            value: stats.active,
            sub: "Currently active",
            icon: Users,
            iconClass: "bg-emerald-100 text-emerald-700",
            href: "/schoolbase-admin/schools",
          },
          {
            label: "Trial",
            value: stats.trial,
            sub: "Currently on trial",
            icon: Zap,
            iconClass: "bg-sky-100 text-sky-700",
            href: "/schoolbase-admin/schools?status=TRIAL",
          },
          {
            label: "Students",
            value: stats.pupils,
            sub: "Total pupils",
            icon: Activity,
            iconClass: "bg-violet-100 text-violet-700",
            href: "/schoolbase-admin/schools",
          },
          {
            label: "Verified",
            value: stats.verified,
            sub: "Verified accounts",
            icon: CheckCircle2,
            iconClass: "bg-emerald-100 text-emerald-700",
            href: "/schoolbase-admin/schools",
          },
          {
            label: "Unverified",
            value: stats.unverified,
            sub: "Pending verification",
            icon: AlertTriangle,
            iconClass: "bg-amber-100 text-amber-800",
            href: "/schoolbase-admin/schools",
          },
          {
            label: "Suspended",
            value: stats.suspended,
            sub: "Suspended schools",
            icon: Clock,
            iconClass: "bg-orange-100 text-orange-700",
            href: "/schoolbase-admin/schools",
          },
          {
            label: "Cancelled",
            value: stats.cancelled,
            sub: "Cancelled accounts",
            icon: XCircle,
            iconClass: "bg-rose-100 text-rose-700",
            href: "/schoolbase-admin/schools",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="group cursor-pointer border border-border bg-surface p-4 transition hover:border-brand/50 hover:bg-brand/5">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted">{card.sub}</p>
            </Link>
          );
        })}
      </div>

      {viewMode === "list" ? (
        <SchoolTable schools={filteredSchools} filterControls={filterControls} onOpenDetails={openSchoolDetails} />
      ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredSchools.length === 0 ? (
            <div className="col-span-2 text-center py-12">
              <p className="text-muted">No schools found</p>
            </div>
          ) : (
            filteredSchools.map((school: SchoolRow) => {
              const planLimit = school.planLimit ?? getPlanStudentLimit(school.plan);
              const studentCount = school.pupilCount ?? 0;
              const isTrialPlan = school.status === "TRIAL" || school.plan === "TRIAL";
              const usageRatio = planLimit ? Math.min(studentCount / planLimit, 1) : 0;
              const usageColor = planLimit
                ? usageRatio >= 1
                  ? "bg-rose-500"
                  : usageRatio >= 0.7
                  ? "bg-amber-500"
                  : "bg-emerald-500"
                : "bg-brand";

              const usageStatus = planLimit
                ? studentCount >= planLimit
                  ? "Limit reached"
                  : studentCount >= planLimit * 0.7
                  ? "Approaching limit"
                  : "Healthy"
                : isTrialPlan
                ? "Trial plan"
                : "Unlimited";

              const planLimitLabel = planLimit
                ? `${planLimit.toLocaleString()}`
                : isTrialPlan
                ? "Trial"
                : "Unlimited";

              return (
                <div
                  key={school.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openSchoolDetails(school)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openSchoolDetails(school);
                    }
                  }}
                      className="group cursor-pointer border border-border bg-surface p-4 transition-colors hover:border-brand/40 hover:bg-brand/5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 cursor-pointer items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-brand/10 text-brand">
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
                          <span className="text-sm font-semibold">{getInitials(school.name)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{school.name}</p>
                        <p className="mt-1 truncate text-xs text-muted">{school.email || school.country || "No contact available"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                      <span
                            className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${getStatusClasses(school.status)}`}
                      >
                        {school.status}
                      </span>
                      <ActionMenu
                        school={school}
                        performAction={performAction}
                        sendReminder={sendReminder}
                        impersonate={impersonate}
                        busy={busy}
                        compact
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-muted">
                    <p className="text-muted">
                      {school.plan} plan • {school.country || "Unknown country"} • {studentCount.toLocaleString()} students
                    </p>
                    {school.trialEndsAt ? (
                      <p className="text-muted">Trial ends {formatDate(school.trialEndsAt)}</p>
                    ) : null}
                  </div>

                  <div className="mt-4 border-t border-border pt-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Capacity</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{planLimit ? `${studentCount} / ${planLimit}` : planLimitLabel}</p>
                      </div>
                          <span className="rounded-md bg-background px-2 py-1 text-[11px] text-muted">{usageStatus}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-200">
                      <div
                        className={`${usageColor} h-full rounded-full transition-all duration-300`}
                        style={{ width: `${planLimit ? usageRatio * 100 : 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {selectedSchool && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="school-details-title">
          <style>{`@keyframes school_details_slide_in { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
          <button type="button" aria-label="Close school details" onClick={closeSchoolDetails} className="absolute inset-0 bg-black/40" />
          <aside className="relative ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-border bg-background shadow-2xl" style={{ animation: "school_details_slide_in 280ms cubic-bezier(.2,.9,.2,1)" }}>
            <div
              className="flex items-start justify-between border-b border-slate-100 px-6 py-5"
              style={{ background: "linear-gradient(90deg, rgba(10,102,194,0.12), rgba(10,102,194,0.04))" }}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">School profile</p>
                <h2 id="school-details-title" className="mt-1 truncate text-2xl font-semibold text-foreground">{schoolDetails?.name || selectedSchool.name}</h2>
                <p className="mt-1 text-sm text-muted">Complete account information and usage details</p>
              </div>
              <button type="button" onClick={closeSchoolDetails} className="rounded-xl border border-border p-2 text-muted transition hover:bg-background hover:text-foreground" aria-label="Close school details">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {schoolDetailsLoading ? (
                <div className="flex min-h-48 items-center justify-center text-sm text-muted">Loading school details...</div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-start gap-4 border-b border-border pb-6">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand/10 text-xl font-semibold text-brand">
                      {schoolDetails?.logoUrl ? <Image src={resolveSchoolAssetUrl(schoolDetails.logoUrl) || schoolDetails.logoUrl || ""} alt={`${schoolDetails.name} logo`} width={64} height={64} unoptimized className="h-full w-full object-cover" /> : getInitials(schoolDetails?.name || selectedSchool.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{schoolDetails?.plan || selectedSchool.plan}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(schoolDetails?.status || selectedSchool.status)}`}>{schoolDetails?.status || selectedSchool.status}</span>
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{schoolDetails?.isVerified ? "✓ Verified" : "Unverified"}</span>
                      </div>
                      {schoolDetails?.tagline ? <p className="mt-3 text-sm text-muted">{schoolDetails.tagline}</p> : null}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Account overview</h3>
                      <span className="text-xs text-muted">Current usage</span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border border-y border-border sm:grid-cols-3">
                    {[
                      ["Students", `${schoolDetails?.pupilCount ?? selectedSchool.pupilCount ?? 0}${schoolDetails?.planLimit ? ` / ${schoolDetails.planLimit}` : ""}`],
                      ["Admins and users", schoolDetails?.userCount ?? selectedSchool.userCount ?? 0],
                      ["Classes", schoolDetails?.classCount ?? selectedSchool.classCount ?? 0],
                      ["Trial ends", formatDate(schoolDetails?.trialEndsAt ?? selectedSchool.trialEndsAt)],
                      ["Subscription ends", formatDate(schoolDetails?.subscriptionExpiresAt)],
                      ["Registered", formatDate(schoolDetails?.createdAt ?? selectedSchool.createdAt)],
                    ].map(([label, value]) => (
                      <div key={label} className="border-b border-border px-3 py-4 last:border-b-0 sm:border-b-0">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
                        <p className="mt-1.5 text-sm font-semibold text-foreground">{value || "Not set"}</p>
                      </div>
                    ))}
                    </div>
                    <div className="mt-5 border-b border-border pb-5">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted">Student capacity</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {drawerPlanLimit ? `${drawerStudentCount.toLocaleString()} / ${drawerPlanLimit.toLocaleString()} students` : `${drawerStudentCount.toLocaleString()} students`}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-muted">{drawerUsageStatus}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" aria-label={`${drawerUsageStatus}: ${drawerPlanLimit ? Math.round(drawerUsageRatio * 100) : 100}% used`}>
                        <div className={`${drawerUsageColor} h-full rounded-full transition-all duration-300`} style={{ width: `${drawerPlanLimit ? drawerUsageRatio * 100 : 100}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {drawerPlanLimit ? `${Math.max(drawerPlanLimit - drawerStudentCount, 0).toLocaleString()} student${Math.max(drawerPlanLimit - drawerStudentCount, 0) === 1 ? "" : "s"} remaining` : "No student capacity limit on this plan"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Building2 className="h-4 w-4 text-brand" /> Contact and location</div>
                    <div className="divide-y divide-border border-y border-border text-sm">
                      <p className="flex gap-3 py-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><span className="break-all">{schoolDetails?.email || "Not set"}</span></p>
                      <p className="flex gap-3 py-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><span>{schoolDetails?.phone || "Not set"}</span></p>
                      <p className="flex gap-3 py-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><span>{[schoolDetails?.address, schoolDetails?.country].filter(Boolean).join(" • ") || "Not set"}</span></p>
                    </div>
                  </div>

                  <div className="grid gap-8 border-t border-border pt-6 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck className="h-4 w-4 text-brand" /> School details</div>
                      <div className="mt-4 space-y-3 text-sm"><p><span className="text-muted">Principal:</span> {schoolDetails?.principalName || "Not set"}</p><p><span className="text-muted">Comment:</span> {schoolDetails?.principalComment || "Not set"}</p></div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Branding assets</p>
                      <div className="mt-4 space-y-3 text-sm"><p>Stamp: {schoolDetails?.stampUrl ? "Available" : "Not set"}</p><p>Signature: {schoolDetails?.principalSignatureUrl ? "Available" : "Not set"}</p></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
