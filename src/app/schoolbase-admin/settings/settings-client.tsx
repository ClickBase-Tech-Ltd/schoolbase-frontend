"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import {
  User,
  Shield,
  Server,
  Save,
  Loader2,
  KeyRound,
  BarChart3,
  Activity,
  Mail,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import AdminSkeleton from "@/components/ui/skeleton";

interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface PlatformStats {
  totalSchools: number;
  activeSchools: number;
  totalUsers: number;
  supportRequests: number;
  trialSchools: number;
  activePercentage: number;
}

interface AuditLog {
  id: string;
  event: string;
  details: string | null;
  createdAt: string;
  user?: { name?: string | null; email?: string | null } | null;
  school?: { name?: string | null } | null;
}

const competitionFeatureOptions = [
  { key: "competition.enabled", label: "Competition module", description: "Master switch. All Competition capabilities remain unavailable while this is off." },
  { key: "competition.dailyChallenge.enabled", label: "Daily challenges", description: "Student access to daily challenge practice." },
  { key: "competition.examPractice.enabled", label: "Exam practice", description: "WAEC, BECE, and other configured exam-practice tracks. Requires the question bank." },
  { key: "competition.questionBank.enabled", label: "Question bank", description: "Competition question authoring and review workflows." },
  { key: "competition.leaderboard.enabled", label: "Leaderboards", description: "Private or explicitly approved competition rankings." },
  { key: "competition.gamification.enabled", label: "XP and achievements", description: "Competition-only XP, badges, and achievements." },
  { key: "competition.studentVsStudent.enabled", label: "Student challenges", description: "Student-to-student asynchronous challenges." },
  { key: "competition.classCompetition.enabled", label: "Class competitions", description: "Class-level participation and ranking." },
  { key: "competition.schoolTournament.enabled", label: "School tournaments", description: "School registration and tournament operations." },
  { key: "competition.publicTournament.enabled", label: "Public tournament pages", description: "Public-facing tournament information and approved results." },
  { key: "competition.sponsors.enabled", label: "Sponsors", description: "Competition sponsor management and approved placements." },
  { key: "competition.prizes.enabled", label: "Prizes", description: "Prize assignment and fulfillment workflows." },
  { key: "competition.certificates.enabled", label: "Certificates", description: "Certificate issuance and public verification." },
  { key: "competition.regional.enabled", label: "Regional competitions", description: "Regional tournament scopes and rankings." },
  { key: "competition.national.enabled", label: "National competitions", description: "National tournament scopes and rankings." },
  { key: "competition.international.enabled", label: "International competitions", description: "Cross-country competition scopes and rankings." },
] as const;

type CompetitionFeatureKey = typeof competitionFeatureOptions[number]["key"];

interface PlatformSettingsState {
  maintenanceMode: boolean;
  allowSignup: boolean;
  allowTrial: boolean;
  autoApproveSchools: boolean;
  supportEmail: string;
  signupNotificationRecipients: string[];
  supportNotificationRecipients: string[];
  competitionFeatures: Record<CompetitionFeatureKey, boolean>;
  paymentPlans: {
    STARTER: { label: string; priceLabel: string; amountMinor: number; studentLimit: number | null };
    GROWTH: { label: string; priceLabel: string; amountMinor: number; studentLimit: number | null };
    ENTERPRISE: { label: string; priceLabel: string; amountMinor: number; studentLimit: number | null };
  };
}

const defaultSettings: PlatformSettingsState = {
  maintenanceMode: false,
  allowSignup: true,
  allowTrial: true,
  autoApproveSchools: false,
  supportEmail: "support@schoolbase.live",
  signupNotificationRecipients: [],
  supportNotificationRecipients: [],
  competitionFeatures: Object.fromEntries(competitionFeatureOptions.map(({ key }) => [key, false])) as Record<CompetitionFeatureKey, boolean>,
  paymentPlans: {
    STARTER: { label: "", priceLabel: "", amountMinor: 0, studentLimit: null },
    GROWTH: { label: "", priceLabel: "", amountMinor: 0, studentLimit: null },
    ENTERPRISE: { label: "", priceLabel: "", amountMinor: 0, studentLimit: null },
  },
};

export default function SettingsClient() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<{ open: boolean; type: "success" | "error"; title?: string; message: string }>({
    open: false,
    type: "success",
    message: "",
  });
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<PlatformSettingsState>(defaultSettings);
  const [recipientDrafts, setRecipientDrafts] = useState({ signup: "", support: "" });
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [openPanels, setOpenPanels] = useState({
    overview: false,
    admin: false,
    system: false,
    preferences: false,
    activity: false,
    security: false,
  });
  const [openPreferencePanels, setOpenPreferencePanels] = useState({
    controls: false,
    supportEmail: false,
    notifications: false,
    paymentPlans: false,
  });

  function togglePanel(panel: keyof typeof openPanels) {
    setOpenPanels((current) => ({ ...current, [panel]: !current[panel] }));
  }

  function togglePreferencePanel(panel: keyof typeof openPreferencePanels) {
    setOpenPreferencePanels((current) => ({ ...current, [panel]: !current[panel] }));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [profileRes, statsRes, settingsRes, activityRes] = await Promise.all([
        fetch("/schoolbase-admin/api/profile", { credentials: "include" }),
        fetch("/schoolbase-admin/api/stats", { credentials: "include" }),
        fetch("/schoolbase-admin/api/settings", { credentials: "include" }),
        fetch("/schoolbase-admin/api/audit-logs", { credentials: "include" }),
      ]);

      if (!profileRes.ok) {
        if (profileRes.status === 401 || profileRes.status === 403 || profileRes.status === 404) {
          window.location.href = "/schoolbase-admin/login";
          return;
        }

        const error = await profileRes.json().catch(() => null);
        throw new Error(error?.message || "Failed to load profile.");
      }

      const profileData = await profileRes.json();
      const adminData = profileData.admin;
      setAdmin(adminData);
      setFormData({
        name: adminData.name || "",
        email: adminData.email || "",
      });

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const loadedPlans = settingsData?.settings?.paymentPlans ?? {};
        const loadedCompetitionFeatures = settingsData?.settings?.competitionFeatures ?? settingsData?.defaults?.competitionFeatures ?? {};
        const nextSettings: PlatformSettingsState = {
          maintenanceMode: Boolean(settingsData?.settings?.maintenanceMode ?? settingsData?.defaults?.maintenanceMode ?? false),
          allowSignup: Boolean(settingsData?.settings?.allowSignup ?? settingsData?.defaults?.allowSignup ?? true),
          allowTrial: Boolean(settingsData?.settings?.allowTrial ?? settingsData?.defaults?.allowTrial ?? true),
          autoApproveSchools: Boolean(settingsData?.settings?.autoApproveSchools ?? settingsData?.defaults?.autoApproveSchools ?? false),
          supportEmail: String(settingsData?.settings?.supportEmail ?? settingsData?.defaults?.supportEmail ?? defaultSettings.supportEmail),
          signupNotificationRecipients: Array.isArray(settingsData?.settings?.signupNotificationRecipients) ? settingsData.settings.signupNotificationRecipients : defaultSettings.signupNotificationRecipients,
          supportNotificationRecipients: Array.isArray(settingsData?.settings?.supportNotificationRecipients) ? settingsData.settings.supportNotificationRecipients : defaultSettings.supportNotificationRecipients,
          competitionFeatures: Object.fromEntries(competitionFeatureOptions.map(({ key }) => [key, loadedCompetitionFeatures[key] === true])) as Record<CompetitionFeatureKey, boolean>,
          paymentPlans: {
            STARTER: { ...defaultSettings.paymentPlans.STARTER, ...(loadedPlans.STARTER ?? {}) },
            GROWTH: { ...defaultSettings.paymentPlans.GROWTH, ...(loadedPlans.GROWTH ?? {}) },
            ENTERPRISE: { ...defaultSettings.paymentPlans.ENTERPRISE, ...(loadedPlans.ENTERPRISE ?? {}) },
          },
        };
        setSettings(nextSettings);
        setRecipientDrafts({
          signup: nextSettings.signupNotificationRecipients.join(", "),
          support: nextSettings.supportNotificationRecipients.join(", "),
        });
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivity(activityData?.logs ?? []);
      }
    } catch (error) {
      console.error(error);
      setProfileMessage(error instanceof Error ? error.message : "Unable to load platform settings.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSettingToggle(key: keyof PlatformSettingsState) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleCompetitionFeatureToggle(key: CompetitionFeatureKey) {
    setSettings((prev) => {
      const enabled = !prev.competitionFeatures[key];
      if (key === "competition.enabled" && !enabled) {
        return {
          ...prev,
          competitionFeatures: Object.fromEntries(competitionFeatureOptions.map((option) => [option.key, false])) as Record<CompetitionFeatureKey, boolean>,
        };
      }
      return { ...prev, competitionFeatures: { ...prev.competitionFeatures, [key]: enabled } };
    });
  }

  function handleSettingInputChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name as keyof PlatformSettingsState]: value }));
  }

  function handleRecipientChange(key: "signupNotificationRecipients" | "supportNotificationRecipients", value: string) {
    setRecipientDrafts((prev) => ({
      ...prev,
      [key === "signupNotificationRecipients" ? "signup" : "support"]: value,
    }));
  }

  function handlePlanChange(plan: keyof PlatformSettingsState["paymentPlans"], field: "label" | "priceLabel" | "amountMinor" | "studentLimit", value: string) {
    setSettings((prev) => ({
      ...prev,
      paymentPlans: {
        ...prev.paymentPlans,
        [plan]: {
          ...prev.paymentPlans[plan],
          [field]: field === "label" || field === "priceLabel"
            ? value
            : value === ""
            ? null
            : field === "amountMinor"
            ? Math.round(Number(value) * 100)
            : Number(value),
        },
      },
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setProfileMessage(null);

      const res = await fetch("/schoolbase-admin/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save profile.");
      }

      setAdmin(data.admin);
      setStatusModal({ open: true, type: "success", title: "Profile Updated", message: "Your profile was updated successfully." });
    } catch (error) {
      console.error(error);
      setStatusModal({ open: true, type: "error", title: "Profile Update Failed", message: error instanceof Error ? error.message : "Unable to save profile." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSettings() {
    try {
      setSavingSettings(true);

      const settingsToSave = {
        ...settings,
        signupNotificationRecipients: recipientDrafts.signup.split(",").map((item) => item.trim()).filter(Boolean),
        supportNotificationRecipients: recipientDrafts.support.split(",").map((item) => item.trim()).filter(Boolean),
      };

      const res = await fetch("/schoolbase-admin/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ settings: settingsToSave }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save settings.");
      }

      setSettings((prev) => ({
        ...prev,
        signupNotificationRecipients: settingsToSave.signupNotificationRecipients,
        supportNotificationRecipients: settingsToSave.supportNotificationRecipients,
      }));

      setStatusModal({ open: true, type: "success", title: "Preferences Saved", message: "Platform preferences were saved successfully." });
    } catch (error) {
      console.error(error);
      setStatusModal({ open: true, type: "error", title: "Save Failed", message: error instanceof Error ? error.message : "Unable to save platform preferences." });
    } finally {
      setSavingSettings(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20">
        <AdminSkeleton />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-muted">
        {profileMessage ?? "Failed to load settings."}
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <ErrorModal
        isOpen={statusModal.open}
        onClose={() => setStatusModal((prev) => ({ ...prev, open: false }))}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        confirmLabel={statusModal.type === "success" ? "Okay" : "Try again"}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border border-border bg-surface p-5">
          <button type="button" onClick={() => togglePanel("overview")} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={openPanels.overview} aria-controls="platform-overview-panel">
            <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-brand" /><span className="font-semibold text-foreground">Platform Overview</span></span>
            <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.overview ? "rotate-90 text-foreground" : ""}`} />
          </button>

          {openPanels.overview && <div id="platform-overview-panel" className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="border border-border bg-background p-3">
              <p className="text-xs text-muted">Total schools</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{stats?.totalSchools ?? 0}</p>
            </div>
            <div className="border border-border bg-background p-3">
              <p className="text-xs text-muted">Active schools</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{stats?.activeSchools ?? 0}</p>
            </div>
            <div className="border border-border bg-background p-3">
              <p className="text-xs text-muted">Trial schools</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{stats?.trialSchools ?? 0}</p>
            </div>
            <div className="border border-border bg-background p-3">
              <p className="text-xs text-muted">Support requests</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{stats?.supportRequests ?? 0}</p>
            </div>
          </div>}
        </div>

        <div className="border border-border bg-surface p-5">
          <button type="button" onClick={() => togglePanel("admin")} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={openPanels.admin} aria-controls="platform-admin-panel">
            <span className="flex items-center gap-2"><User className="h-4 w-4 text-brand" /><span className="font-semibold text-foreground">Platform Admin</span></span>
            <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.admin ? "rotate-90 text-foreground" : ""}`} />
          </button>

          {openPanels.admin && <div id="platform-admin-panel" className="mt-4 space-y-3">
            <div>
              <p className="text-xs text-muted">Name</p>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <p className="text-xs text-muted">Email</p>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand/90 text-sm"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>}
        </div>

        <div className="border border-border bg-surface p-5">
          <button type="button" onClick={() => togglePanel("system")} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={openPanels.system} aria-controls="system-info-panel">
            <span className="flex items-center gap-2"><Server className="h-4 w-4 text-brand" /><span className="font-semibold text-foreground">System Info</span></span>
            <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.system ? "rotate-90 text-foreground" : ""}`} />
          </button>

          {openPanels.system && <div id="system-info-panel" className="mt-4 space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted">Admin ID</p>
              <p className="font-mono text-xs text-foreground">{admin.id}</p>
            </div>

            <div>
              <p className="text-xs text-muted">Role</p>
              <p className="text-foreground font-medium">{admin.role}</p>
            </div>

            <div>
              <p className="text-xs text-muted">Member Since</p>
              <p className="text-foreground">{new Date(admin.createdAt).toLocaleDateString()}</p>
            </div>

            <div>
              <p className="text-xs text-muted">Environment</p>
              <p className="text-foreground">Production</p>
            </div>

            <div>
              <p className="text-xs text-muted">Service</p>
              <p className="text-foreground text-xs">Platform admin tools</p>
            </div>
          </div>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-border bg-surface p-5">
          <button type="button" onClick={() => togglePanel("preferences")} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={openPanels.preferences} aria-controls="platform-preferences-panel">
            <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-brand" /><span className="font-semibold text-foreground">Platform Preferences</span></span>
            <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.preferences ? "rotate-90 text-foreground" : ""}`} />
          </button>

          {openPanels.preferences && <div id="platform-preferences-panel" className="mt-4 space-y-4">
            <div className="space-y-3 border border-border bg-background p-3">
              <button type="button" onClick={() => togglePreferencePanel("controls")} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={openPreferencePanels.controls} aria-controls="platform-controls-panel">
                <span className="font-medium text-foreground">Platform controls</span>
                <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPreferencePanels.controls ? "rotate-90 text-foreground" : ""}`} />
              </button>
              {openPreferencePanels.controls && <div id="platform-controls-panel" className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Maintenance mode</p>
                  <p className="text-xs text-muted">Pause new signups during maintenance windows.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSettingToggle("maintenanceMode")}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${settings.maintenanceMode ? "bg-warning/10 text-warning" : "bg-muted/20 text-muted"}`}
                >
                  {settings.maintenanceMode ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Allow new signups</p>
                  <p className="text-xs text-muted">Open the platform for new schools and users.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSettingToggle("allowSignup")}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${settings.allowSignup ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}
                >
                  {settings.allowSignup ? "On" : "Off"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Allow trials</p>
                  <p className="text-xs text-muted">Permit trial accounts for new schools.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSettingToggle("allowTrial")}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${settings.allowTrial ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}
                >
                  {settings.allowTrial ? "On" : "Off"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Auto-approve schools</p>
                  <p className="text-xs text-muted">Automatically approve schools after registration.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSettingToggle("autoApproveSchools")}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${settings.autoApproveSchools ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}
                >
                  {settings.autoApproveSchools ? "On" : "Off"}
                </button>
              </div>
              </div>}
            </div>

            <div className="border-t border-border pt-4">
              <button type="button" onClick={() => togglePreferencePanel("supportEmail")} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={openPreferencePanels.supportEmail} aria-controls="support-email-panel">
                <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand" /><span className="text-sm font-semibold text-foreground">Support email</span></span>
                <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPreferencePanels.supportEmail ? "rotate-90 text-foreground" : ""}`} />
              </button>
              {openPreferencePanels.supportEmail && <div id="support-email-panel" className="mt-3">
                <div className="flex items-center gap-2 border border-border bg-background px-3 py-2">
                  <Mail className="h-4 w-4 text-muted" />
                  <input name="supportEmail" value={settings.supportEmail} onChange={handleSettingInputChange} className="w-full bg-transparent text-sm text-foreground outline-none" />
                </div>
              </div>
              }
            </div>

            <div className="border-t border-border pt-5">
              <button type="button" onClick={() => togglePreferencePanel("notifications")} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={openPreferencePanels.notifications} aria-controls="notification-recipients-panel">
                <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand" /><span><span className="block text-sm font-semibold text-foreground">Notification recipients</span><span className="block text-xs text-muted">Signup and support notification addresses</span></span></span>
                <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPreferencePanels.notifications ? "rotate-90 text-foreground" : ""}`} />
              </button>
              {openPreferencePanels.notifications && <div id="notification-recipients-panel" className="mt-4">
              <p className="mb-3 text-xs text-muted">Use comma-separated email addresses. Changes apply to future notifications.</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-medium text-muted">
                  New school signups
                  <textarea
                    value={recipientDrafts.signup}
                    onChange={(event) => handleRecipientChange("signupNotificationRecipients", event.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-brand"
                    placeholder="onboarding@example.com, team@example.com"
                  />
                </label>
                <label className="block text-xs font-medium text-muted">
                  Support tickets
                  <textarea
                    value={recipientDrafts.support}
                    onChange={(event) => handleRecipientChange("supportNotificationRecipients", event.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-brand"
                    placeholder="support@example.com, team@example.com"
                  />
                </label>
              </div>
              </div>}
            </div>

            <div className="border-t border-border pt-5">
              <button type="button" onClick={() => togglePreferencePanel("paymentPlans")} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={openPreferencePanels.paymentPlans} aria-controls="payment-plans-panel">
                <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-brand" /><span><span className="block text-sm font-semibold text-foreground">Payment plans</span><span className="block text-xs text-muted">Prices, labels, and student limits</span></span></span>
                <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPreferencePanels.paymentPlans ? "rotate-90 text-foreground" : ""}`} />
              </button>
              {openPreferencePanels.paymentPlans && <div id="payment-plans-panel" className="mt-4">
              <p className="mb-3 text-xs text-muted">Enter prices in naira. The system converts them to kobo automatically for secure payment processing.</p>
              <div className="overflow-x-auto border border-border">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-border bg-background text-xs text-muted">
                    <tr><th className="px-3 py-2">Plan</th><th className="px-3 py-2">Display name</th><th className="px-3 py-2">Public price label</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Student limit</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(Object.keys(settings.paymentPlans) as Array<keyof PlatformSettingsState["paymentPlans"]>).map((plan) => (
                      <tr key={plan}>
                        <td className="px-3 py-3 font-semibold text-foreground">{plan}</td>
                        <td className="px-3 py-3"><input value={settings.paymentPlans[plan].label ?? ""} onChange={(event) => handlePlanChange(plan, "label", event.target.value)} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" /></td>
                        <td className="px-3 py-3"><input value={settings.paymentPlans[plan].priceLabel ?? ""} onChange={(event) => handlePlanChange(plan, "priceLabel", event.target.value)} placeholder="Custom pricing" className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" /></td>
                        <td className="px-3 py-3"><div className="flex items-center rounded-lg border border-border bg-background"><span className="pl-2 text-sm text-muted">₦</span><input type="number" min="0" step="100" value={settings.paymentPlans[plan].amountMinor == null ? "" : settings.paymentPlans[plan].amountMinor / 100} onChange={(event) => handlePlanChange(plan, "amountMinor", event.target.value)} className="w-full rounded-lg bg-transparent px-2 py-1.5 text-sm outline-none" /></div></td>
                        <td className="px-3 py-3"><input type="number" min="0" value={settings.paymentPlans[plan].studentLimit ?? ""} onChange={(event) => handlePlanChange(plan, "studentLimit", event.target.value)} placeholder="Unlimited" className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>}
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-foreground">Competition feature controls</h3>
              <p className="mt-1 text-xs text-muted">No Competition workflows are active yet. Keep these off until each feature is implemented and reviewed. Server access also requires the master switch and user permissions.</p>
              <div className="mt-3 divide-y divide-border border border-border bg-background px-3">
                {competitionFeatureOptions.map(({ key, label, description }) => {
                  const enabled = settings.competitionFeatures[key];
                  const parentDisabled = key !== "competition.enabled" && !settings.competitionFeatures["competition.enabled"];
                  return (
                    <div key={key} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted">{description}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={label}
                        disabled={parentDisabled}
                        onClick={() => handleCompetitionFeatureToggle(key)}
                        className={`shrink-0 border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${enabled ? "border-brand bg-brand text-white" : "border-border bg-surface text-muted"}`}
                      >
                        {enabled ? "On" : "Off"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
            >
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Preferences
            </button>
          </div>}
        </div>

        <div className="border border-border bg-surface p-5">
          <button type="button" onClick={() => togglePanel("activity")} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={openPanels.activity} aria-controls="recent-activity-panel">
            <span className="flex items-center gap-2"><Activity className="h-4 w-4 text-brand" /><span className="font-semibold text-foreground">Recent Activity</span></span>
            <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.activity ? "rotate-90 text-foreground" : ""}`} />
          </button>

          {openPanels.activity && <div id="recent-activity-panel" className="mt-4 space-y-2">
            {activity.length === 0 ? (
                <div className="border border-dashed border-border bg-background p-4 text-sm text-muted">
                No recent platform activity yet.
              </div>
            ) : (
              activity.slice(0, 3).map((item) => (
                <div key={item.id} className="border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.event}</p>
                      <p className="mt-1 text-xs text-muted">{item.details || "No details available."}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Activity className="h-3.5 w-3.5" />
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                    {item.user?.name ? <span className="rounded-full bg-muted/20 px-2 py-0.5">{item.user.name}</span> : null}
                    {item.school?.name ? <span className="rounded-full bg-muted/20 px-2 py-0.5">{item.school.name}</span> : null}
                  </div>
                </div>
              ))
            )}
          </div>}
        </div>
      </div>

      <div className="border border-border bg-surface p-5">
        <button type="button" onClick={() => togglePanel("security")} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={openPanels.security} aria-controls="security-notes-panel">
          <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-brand" /><span className="font-semibold text-foreground">Security &amp; Operational Notes</span></span>
          <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.security ? "rotate-90 text-foreground" : ""}`} />
        </button>

        {openPanels.security && <div id="security-notes-panel" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted" />
              <p className="text-sm font-medium text-foreground">Password</p>
            </div>
            <p className="mt-2 text-xs text-muted">Change login details through auth settings if needed.</p>
          </div>
          <div className="border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted" />
              <p className="text-sm font-medium text-foreground">Session health</p>
            </div>
            <p className="mt-2 text-xs text-muted">Your current session is protected by the platform admin cookie.</p>
          </div>
          <div className="border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted" />
              <p className="text-sm font-medium text-foreground">Issue tracking</p>
            </div>
            <p className="mt-2 text-xs text-muted">Monitor support and trial counts above to spot platform health issues.</p>
          </div>
        </div>}
      </div>
    </div>
  );
}
