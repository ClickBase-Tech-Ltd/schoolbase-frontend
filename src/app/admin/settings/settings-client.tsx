"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorModal } from "@/components/ui/error-modal";
import { Building2, MapPin, DollarSign, FileText, Upload, Save, AlertCircle, Zap, X, KeyRound, CalendarDays, ShieldCheck, Copy, CheckCircle2, ChevronRight, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { UserGuide, type PageHelpGuide } from "@/components/ui/user-guide";
import SignatoriesClient from './signatories-client';
import { WhatsAppIcon } from "@/components/ui/icons";
import countriesData from "../../../../config/countries.json";
import { resolveSchoolAssetUrl } from "@/lib/asset-urls";
import { getBackendUrl } from "@/lib/backend-url";
import { playCloseTone, playOpenTone } from "@/lib/sounds";

interface SchoolSettingsProps {
  school: {
    id: string;
    name: string;
    initials?: string | null;
    slug: string;
    tagline?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    currency?: string | null;
    phone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
    principalSignatureUrl?: string | null;
    stampUrl?: string | null;
    principalName?: string | null;
    principalComment?: string | null;
    manualPaymentAccountName?: string | null;
    manualPaymentAccountNumber?: string | null;
    manualPaymentBankName?: string | null;
    paymentAccounts?: Array<{
      id?: string;
      label: string;
      bankName: string;
      accountName: string;
      accountNumber: string;
      branchName?: string | null;
      currency?: string | null;
      purpose?: string | null;
      isDefault?: boolean;
      isActive?: boolean;
      sortOrder?: number;
    }>;
    enabledPhases: Array<{ phase: string }>;
    partner?: { name: string } | null;
    admissionsCapabilityEnabled?: boolean;
    admissionsEnabled?: boolean;
    admissionsOpeningDate?: string | null;
    admissionsClosingDate?: string | null;
    admissionsIntroText?: string | null;
    admissionsRequirements?: string | null;
    admissionsContactInfo?: string | null;
    resultAccess?: {
      enabled?: boolean;
      mode?: string;
      pinType?: string;
      pinValidity?: string;
      allowRegeneration?: boolean;
    };
  };
  staff: Array<{ id: string; name: string; role: string }>;
  paystackConfigured: boolean;
  whatsappConfigured: boolean;
  isOnboarding?: boolean;
}

export default function SettingsPageClient({
  school,
  staff,
  paystackConfigured,
  whatsappConfigured,
  isOnboarding = false,
}: SchoolSettingsProps) {
  const router = useRouter();
  const [name, setName] = useState(school.name);
  const [initials, setInitials] = useState(school.initials ?? "");
  const [slug, setSlug] = useState(school.slug);
  const [tagline, setTagline] = useState(school.tagline ?? "");
  const [country, setCountry] = useState(school.country ?? countriesData.default ?? "NG");
  const [currency, setCurrency] = useState(
    countriesData.countries[(school.country ?? countriesData.default ?? "NG") as keyof typeof countriesData.countries]?.currency ?? school.currency ?? "NGN",
  );
  const [address, setAddress] = useState(school.address ?? "");
  const [email, setEmail] = useState(school.email ?? "");
  const [phone, setPhone] = useState(school.phone ?? "");
  const [principalName, setPrincipalName] = useState(school.principalName ?? "");
  const [principalComment, setPrincipalComment] = useState(school.principalComment ?? "");
  const [manualPaymentAccountName, setManualPaymentAccountName] = useState(school.manualPaymentAccountName ?? "");
  const [manualPaymentAccountNumber, setManualPaymentAccountNumber] = useState(school.manualPaymentAccountNumber ?? "");
  const [manualPaymentBankName, setManualPaymentBankName] = useState(school.manualPaymentBankName ?? "");
  const [paymentAccounts, setPaymentAccounts] = useState(() => {
    if (Array.isArray(school.paymentAccounts) && school.paymentAccounts.length > 0) {
      return school.paymentAccounts;
    }

    if (Array.isArray(school.paymentAccounts) && school.paymentAccounts.length === 0) {
      return [];
    }

    if (school.manualPaymentBankName || school.manualPaymentAccountName || school.manualPaymentAccountNumber) {
      return [{
        label: "General Fees",
        bankName: school.manualPaymentBankName ?? "",
        accountName: school.manualPaymentAccountName ?? "",
        accountNumber: school.manualPaymentAccountNumber ?? "",
        isDefault: true,
        isActive: true,
      }];
    }

    return [];
  });
  const [editingPaymentAccount, setEditingPaymentAccount] = useState<number | null>(null);
  
  const [logoUrl, setLogoUrl] = useState<string | null>(school.logoUrl ?? null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(school.principalSignatureUrl ?? null);
  const [stampUrl, setStampUrl] = useState<string | null>(school.stampUrl ?? null);
  
  const countryOptions = useMemo(
    () =>
      Object.entries(countriesData.countries).map(([code, data]) => ({
        code,
        name: (data as { name: string }).name,
        currency: (data as { currency: string }).currency,
      })),
    [],
  );

  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<{ index: number; label: string } | null>(null);
  const [deleteAccountAnimateState, setDeleteAccountAnimateState] = useState<"enter" | "exit">("enter");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPanels, setOpenPanels] = useState({
    profile: true,
    principal: false,
    admissions: false,
    resultAccess: false,
    security: false,
    payment: false,
    signatories: false,
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalTitle, setSuccessModalTitle] = useState<string | undefined>("Success");
  const [successModalMessage, setSuccessModalMessage] = useState<string>("Your settings were saved successfully.");
  const [status, setStatus] = useState<any>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [resultAccessEnabled, setResultAccessEnabled] = useState(Boolean(school.resultAccess?.enabled));
  const [resultAccessMode, setResultAccessMode] = useState(school.resultAccess?.mode || "NONE");
  const [resultAccessPinType, setResultAccessPinType] = useState(school.resultAccess?.pinType || "NONE");
  const [resultAccessPinValidity, setResultAccessPinValidity] = useState(school.resultAccess?.pinValidity || "TERM");
  const [resultAccessAllowRegeneration, setResultAccessAllowRegeneration] = useState(Boolean(school.resultAccess?.allowRegeneration));
  const [admissionsEnabled, setAdmissionsEnabled] = useState(Boolean(school.admissionsEnabled));
  const [admissionsCapabilityEnabled, setAdmissionsCapabilityEnabled] = useState(Boolean(school.admissionsCapabilityEnabled));
  const [admissionsOpeningDate, setAdmissionsOpeningDate] = useState(school.admissionsOpeningDate ? school.admissionsOpeningDate.slice(0, 10) : "");
  const [admissionsClosingDate, setAdmissionsClosingDate] = useState(school.admissionsClosingDate ? school.admissionsClosingDate.slice(0, 10) : "");
  const publicAdmissionsUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return slug ? `${window.location.origin}/admissions/${slug}` : "";
  }, [slug]);
  const [admissionsIntroText, setAdmissionsIntroText] = useState(school.admissionsIntroText ?? "");
  const [admissionsRequirements, setAdmissionsRequirements] = useState(school.admissionsRequirements ?? "");
  const [admissionsContactInfo, setAdmissionsContactInfo] = useState(school.admissionsContactInfo ?? "");

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const stampInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);

  const togglePanel = (panel: keyof typeof openPanels) => {
    setOpenPanels((current) => ({ ...current, [panel]: !current[panel] }));
  };

  const openDeleteAccountModal = (index: number) => {
    const target = paymentAccounts[index];
    setDeleteAccountTarget({ index, label: target?.label || "this payment account" });
    setDeleteAccountAnimateState("enter");
  };

  const closeDeleteAccountModal = () => {
    setDeleteAccountAnimateState("exit");
    setTimeout(() => {
      setDeleteAccountTarget(null);
      setDeleteAccountAnimateState("enter");
    }, 200);
  };

  const confirmDeleteAccount = async () => {
    if (deleteAccountTarget === null) return;

    const targetIndex = deleteAccountTarget.index;
    const nextAccounts = paymentAccounts.filter((_, itemIndex) => itemIndex !== targetIndex);
    setPaymentAccounts(nextAccounts);
    if (editingPaymentAccount === targetIndex) setEditingPaymentAccount(null);

    try {
      await saveSettings(nextAccounts);
      closeDeleteAccountModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete payment account");
      closeDeleteAccountModal();
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/admin/settings/status`, {
        credentials: "include",
      });
      if (response.ok) {
        const d = await response.json();
        setStatus(d);
      }
    } catch (err) {
      console.error("Error loading status:", err);
    }
  };

  const handleFileUpload = async (file: File, type: "logo" | "signature" | "stamp") => {
    if (!file) return;

    setUploading((prev) => ({ ...prev, [type]: true }));
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/admin/settings/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();
      if (type === "logo") setLogoUrl(data.url);
      else if (type === "signature") setSignatureUrl(data.url);
      else if (type === "stamp") setStampUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const saveSettings = async (nextPaymentAccounts: typeof paymentAccounts = paymentAccounts) => {
    const backendUrl = getBackendUrl();
    const hasModernPaymentAccounts = Array.isArray(nextPaymentAccounts) && nextPaymentAccounts.length > 0;
    const hadLegacyPaymentAccounts = Array.isArray(school.paymentAccounts) && school.paymentAccounts.length > 0;
    const hasLegacyManualFields = Boolean(manualPaymentAccountName.trim() || manualPaymentAccountNumber.trim() || manualPaymentBankName.trim());
    const shouldClearLegacyPaymentFields = hasModernPaymentAccounts && (hadLegacyPaymentAccounts || hasLegacyManualFields);

    const response = await fetch(`${backendUrl}/api/admin/settings`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        initials: initials.trim().toUpperCase(),
        slug: slug.trim() || null,
        tagline: tagline.trim() || null,
        country: country.trim() || null,
        currency: currency.trim() || null,
        address: address.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        principalName: principalName.trim() || null,
        principalComment: principalComment.trim() || null,
        manualPaymentAccountName: shouldClearLegacyPaymentFields ? null : (manualPaymentAccountName.trim() || null),
        manualPaymentAccountNumber: shouldClearLegacyPaymentFields ? null : (manualPaymentAccountNumber.trim() || null),
        manualPaymentBankName: shouldClearLegacyPaymentFields ? null : (manualPaymentBankName.trim() || null),
        paymentAccounts: nextPaymentAccounts.map((account, index) => ({ ...account, sortOrder: index })),
        principalSignatureUrl: signatureUrl,
        stampUrl: stampUrl,
        logoUrl: logoUrl,
        resultAccess: {
          enabled: resultAccessEnabled,
          mode: resultAccessMode,
          pinType: resultAccessPinType,
          pinValidity: resultAccessPinValidity,
          allowRegeneration: resultAccessAllowRegeneration,
        },
        admissionsEnabled,
        admissionsCapabilityEnabled,
        admissionsOpeningDate,
        admissionsClosingDate,
        admissionsIntroText,
        admissionsRequirements,
        admissionsContactInfo,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || "Failed to save settings");
    }

    return response;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      await saveSettings();

      setShowSuccessModal(true);
      setSuccessModalTitle("Settings Saved");
      setSuccessModalMessage("Your school settings were updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const savePanelSettings = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      await saveSettings();
      setShowSuccessModal(true);
      setSuccessModalTitle("Settings Saved");
      setSuccessModalMessage("Your school settings were updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setPasswordError(null);
    setPasswordSuccess(false);

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError("All fields are required.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/admin/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to change password");
      }

      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

      setTimeout(() => {
        playCloseTone();
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 1400);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const openPasswordModal = () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    setShowPasswordModal(true);
    playOpenTone();
  };

  const closePasswordModal = () => {
    if (changingPassword) return;

    playCloseTone();
    setShowPasswordModal(false);
    setPasswordError(null);
    setPasswordSuccess(false);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const previewPrefix = initials.trim() || "ABC";
  const phases = useMemo(
    () =>
      school.enabledPhases
        .map((phase) => phase.phase.replace(/_/g, " ").toLowerCase())
        .map((value) => value.charAt(0).toUpperCase() + value.slice(1)),
    [school.enabledPhases],
  );

  const HELP_GUIDE: PageHelpGuide = {
    title: "Managing School Settings",
    overview: "Configure your school profile, branding, payment information, and system integrations.",
    steps: [
      "Update your school name, location, and contact information.",
      "Upload your school logo, principal signature, and school stamp.",
      "Configure payment details for manual bank transfers.",
      "Set up Paystack for online payments (if enabled).",
      "Configure WhatsApp integration for notifications.",
    ],
    commonTasks: [
      {
        title: "Update School Profile",
        description: "Change your school name, location, and contact details.",
        tips: [
          "School name is displayed on all official documents",
          "Initials appear on student result sheets and reports",
          "Country and currency settings affect fee calculations",
          "Contact information is visible to parents and staff",
        ],
      },
      {
        title: "Upload School Branding",
        description: "Add your logo, principal signature, and school stamp for documents.",
        tips: [
          "Logo appears at the top of all reports and certificates",
          "Principal signature is printed on student result sheets",
          "School stamp authenticates official documents",
          "Use high-quality images (PNG or JPG format recommended)",
        ],
      },
      {
        title: "Configure Payment Methods",
        description: "Set up bank account details for manual payment collection.",
        tips: [
          "Provide accurate bank details to receive payments",
          "Account name must match your school registration",
          "Account number should be verified before saving",
          "These details appear on generated invoices sent to parents",
        ],
      },
    ],
    faqs: [
      {
        question: "What image format should I use for uploads?",
        answer: "PNG (with transparency) or JPG formats work best. Recommended sizes: Logo (200x200px), Signature (400x100px), Stamp (150x150px). Ensure images have good resolution for printing.",
      },
      {
        question: "Can I change the currency after creation?",
        answer: "Yes, you can change the currency in settings. However, existing fees and transactions are recorded in the original currency. Plan currency changes carefully.",
      },
      {
        question: "What happens if I don't configure payment details?",
        answer: "Parents can still pay online via Paystack if configured. If not configured, students won't have a payment method available and you'll need to enter payments manually.",
      },
      {
        question: "How do I integrate Paystack payments?",
        answer: "Paystack integration is configured by your system administrator. Once configured, it will show as 'Configured' in the status badges.",
      },
      {
        question: "Can I update settings during the school year?",
        answer: "Yes, you can update most settings anytime. Changes take effect immediately. However, be cautious with currency changes as they may affect reports and calculations.",
      },
    ],
  };

  return (
    <main className="min-h-screen pb-12">
    <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><Building2 className="h-4 w-4" /> School operations</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">School settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Manage your school profile, branding, payments, admissions, and result access from one workspace.</p>
        </div>
        <div className="relative flex flex-wrap gap-3">
          <Link
            href="/admin/settings/academic-years"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light"
          >
            <CalendarDays className="h-4 w-4" />
            Manage Session
          </Link>
          <Link
            href="/admin/settings/whatsapp"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light"
          >
            <WhatsAppIcon className="h-4 w-4" />
            WhatsApp Settings
          </Link>
          <Link
            href="/admin/settings/result-pins"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            <ShieldCheck className="h-4 w-4" />
            Result PINs
          </Link>
        </div>
      </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-5">
        <span className="text-sm font-semibold text-foreground">Integration status</span>
        <Badge variant={status?.paystack?.effective ? "success" : "default"}>
          {status?.paystack?.effective ? "✓ Paystack Configured" : "Paystack Not Configured"}
        </Badge>
      </div>

      {/* Messages */}
      {error && (
        <div className="border border-error/20 bg-error/10 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <ErrorModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successModalTitle}
        message={successModalMessage}
        type="success"
        confirmLabel="Okay"
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* School Profile Section */}
        <div className="border border-border bg-surface overflow-hidden">
          <div className="border-b border-border bg-surface px-6 py-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => togglePanel('profile')}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') togglePanel('profile'); }}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={openPanels.profile}
              aria-controls="school-profile-panel"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-brand" />
                <div>
                  <h2 className="font-semibold text-foreground">School Profile</h2>
                  <p className="text-xs text-muted">Name, location, and identification</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={savePanelSettings} disabled={isSaving} aria-label="Save school profile" title="Save school profile" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-brand transition hover:bg-brand-light disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
                <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.profile ? 'rotate-90 text-foreground' : 'rotate-0'}`} />
              </div>
            </div>
          </div>

          {openPanels.profile && (
            <div id="school-profile-panel" className="p-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">School Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Greenfield Academy"
                  required
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Initials *</label>
                <input
                  type="text"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="GFA"
                  required
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
                <p className="text-xs text-muted mt-1">{previewPrefix}-2025-0001</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">School Slug *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                  placeholder="greenfield-academy"
                  required
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
                <p className="text-xs text-muted mt-1">Used for your public admissions URL: <span className="font-semibold">/admissions/{slug || 'your-slug'}</span></p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tagline / Motto</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Excellence from early years to secondary"
                  maxLength={160}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Education Street, Lagos"
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Country *</label>
                <select
                  value={country}
                  onChange={(event) => {
                    const nextCountry = event.target.value;
                    const nextCountryData = countriesData.countries[nextCountry as keyof typeof countriesData.countries];
                    setCountry(nextCountry);
                    setCurrency(nextCountryData?.currency || currency);
                  }}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  {countryOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted">
                  Choose the country that matches your school’s market. The currency will update to the default for that country.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Currency</label>
                <input
                  value={currency}
                  readOnly
                  aria-readonly="true"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
                <p className="mt-2 text-xs text-muted">
                  Currency follows your billing country. Contact support for a billing-market change after paid billing begins.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@school.edu"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 123 456 7890"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Principal Section */}
        <div className="border border-border bg-surface overflow-hidden">
          <div className="border-b border-border bg-surface px-6 py-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => togglePanel('principal')}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') togglePanel('principal'); }}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={openPanels.principal}
              aria-controls="principal-information-panel"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-brand" />
                <div>
                  <h2 className="font-semibold text-foreground">Principal Information</h2>
                  <p className="text-xs text-muted">Details for documents and result sheets</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={savePanelSettings} disabled={isSaving} aria-label="Save principal information" title="Save principal information" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-brand transition hover:bg-brand-light disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
                <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.principal ? 'rotate-90 text-foreground' : 'rotate-0'}`} />
              </div>
            </div>
          </div>

          {openPanels.principal && (
            <div id="principal-information-panel" className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Principal Name</label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  placeholder="e.g. Mr. John Okafor"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
                <p className="text-xs text-muted mt-1">Appears on student result sheets</p>
              </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Principal's Comment</label>
              <textarea
                value={principalComment}
                onChange={(e) => setPrincipalComment(e.target.value)}
                placeholder="e.g. Keep up the good work..."
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
              />
              <p className="text-xs text-muted mt-1">Appears on each student's result sheet</p>
            </div>

            {/* File Uploads Grid (Logo + Signature + Stamp) styled like signatories cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background p-4 flex flex-col justify-between">
                <div>
                  <div className="text-sm font-semibold">School Logo</div>
                  <p className="text-xs text-muted mt-1">Logo appears on reports and documents</p>
                </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="h-16 w-16 overflow-hidden rounded bg-neutral-50 flex items-center justify-center">
                        {logoUrl ? <img src={logoUrl} alt="Logo" className="object-contain h-16 w-16" /> : <div className="text-xs text-muted">No logo</div>}
                      </div>
                      <div className="mt-4">
                        {logoUrl ? <Badge variant="success">Configured</Badge> : <Badge variant="outline">Not configured</Badge>}
                      </div>
                    </div>

                      <div className="flex items-center gap-3">
                        {!logoUrl ? (
                          <label className="flex items-center gap-2 p-2 border-2 border-dashed border-border rounded cursor-pointer bg-background">
                            <Upload className="h-4 w-4 text-muted" />
                            <span className="text-sm">Upload</span>
                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/*"
                              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "logo")}
                              disabled={uploading.logo}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="ghost" onClick={() => logoInputRef.current?.click()}>Edit</Button>
                            <Button type="button" variant="outline" onClick={() => setLogoUrl(null)}>Deactivate</Button>
                          </div>
                        )}
                      </div>
                  </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-4 flex flex-col justify-between">
                <div>
                  <div className="text-sm font-semibold">Principal Signature</div>
                  <p className="text-xs text-muted mt-1">Signature printed on result sheets (fallback when no signatory configured)</p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="h-16 w-32 overflow-hidden rounded bg-neutral-50 flex items-center justify-center">
                      {signatureUrl ? <img src={signatureUrl} alt="Principal signature" className="object-contain h-16" /> : <div className="text-xs text-muted">No signature</div>}
                    </div>
                    <div className="mt-2">
                      {signatureUrl ? <Badge variant="success">Configured</Badge> : <Badge variant="outline">Not configured</Badge>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!signatureUrl ? (
                      <label className="flex items-center gap-2 p-2 border-2 border-dashed border-border rounded cursor-pointer bg-background">
                        <Upload className="h-4 w-4 text-muted" />
                        <span className="text-sm">Upload</span>
                        <input
                          ref={signatureInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "signature")}
                          disabled={uploading.signature}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" onClick={() => signatureInputRef.current?.click()}>Edit</Button>
                        <Button type="button" variant="outline" onClick={() => setSignatureUrl(null)}>Deactivate</Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-4 flex flex-col justify-between">
                <div>
                  <div className="text-sm font-semibold">School Stamp</div>
                  <p className="text-xs text-muted mt-1">Appears on official documents</p>
                </div>

                  <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="h-16 w-16 overflow-hidden rounded bg-neutral-50 flex items-center justify-center">
                      {stampUrl ? <img src={stampUrl} alt="Stamp" className="object-contain h-16 w-16" /> : <div className="text-xs text-muted">No stamp</div>}
                    </div>
                    <div className="mt-2">
                      {stampUrl ? <Badge variant="success">Configured</Badge> : <Badge variant="outline">Not configured</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!stampUrl ? (
                      <label className="flex items-center gap-2 p-2 border-2 border-dashed border-border rounded cursor-pointer bg-background">
                        <Upload className="h-4 w-4 text-muted" />
                        <span className="text-sm">Upload</span>
                        <input
                          ref={stampInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "stamp")}
                          disabled={uploading.stamp}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" onClick={() => stampInputRef.current?.click()}>Edit</Button>
                        <Button type="button" variant="outline" onClick={() => setStampUrl(null)}>Deactivate</Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
        {/* Report Signatories Section */}
        <div className="border border-border bg-surface overflow-hidden">
          <div className="border-b border-border bg-surface px-6 py-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => togglePanel('signatories')}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') togglePanel('signatories'); }}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={openPanels.signatories}
              aria-controls="report-signatories-panel"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-brand" />
                <div>
                  <h2 className="font-semibold text-foreground">Report Signatories</h2>
                  <p className="text-xs text-muted">These signatures appear on student reports for each academic phase.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={savePanelSettings} disabled={isSaving} aria-label="Save report signatories" title="Save report signatories" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-brand transition hover:bg-brand-light disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
                <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.signatories ? 'rotate-90 text-foreground' : 'rotate-0'}`} />
              </div>
            </div>
          </div>

          {openPanels.signatories && (
            <div id="report-signatories-panel" className="p-6">
              <SignatoriesClient noCard />
            </div>
          )}
        </div>

        {/* Admissions Settings Section */}
        <div className="border border-border bg-surface overflow-hidden">
          <div className="border-b border-border bg-surface px-6 py-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => togglePanel('admissions')}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') togglePanel('admissions'); }}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={openPanels.admissions}
              aria-controls="online-admissions-panel"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-brand" />
                <div>
                  <h2 className="font-semibold text-foreground">Online Admissions</h2>
                  <p className="text-xs text-muted">Enable and configure the public admissions portal, application dates, guidance text, requirements, and contact details for families.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={savePanelSettings} disabled={isSaving} aria-label="Save admissions settings" title="Save admissions settings" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-brand transition hover:bg-brand-light disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
                <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.admissions ? 'rotate-90 text-foreground' : 'rotate-0'}`} />
              </div>
            </div>
          </div>

          {openPanels.admissions && (
            <div id="online-admissions-panel" className="p-6 space-y-5">
            <div className="flex flex-col gap-3 border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-start">
              <input id="admissions-capability-enabled" type="checkbox" checked={admissionsCapabilityEnabled} onChange={(event) => setAdmissionsCapabilityEnabled(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 border-border text-brand focus:ring-brand" />
              <div>
                <label htmlFor="admissions-capability-enabled" className="text-sm font-semibold text-amber-950">Enable admissions pilot capability</label>
                <p className="mt-1 text-xs leading-5 text-amber-900">Off by default. Enables the enhanced public application and secure applicant status/reply workflow for this school. This is separate from whether applications are currently open.</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <input
                  id="admissions-enabled"
                  type="checkbox"
                  checked={admissionsEnabled}
                  onChange={(e) => setAdmissionsEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                />
                <label htmlFor="admissions-enabled" className="text-sm font-medium text-foreground">
                  Enable online admissions
                </label>
              </div>
              {publicAdmissionsUrl ? (
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                  <span className="truncate rounded-full border border-slate-200 bg-white px-3 py-2">
                    {publicAdmissionsUrl}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(publicAdmissionsUrl);
                      setIsLinkCopied(true);
                      window.setTimeout(() => setIsLinkCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0A66C2] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0959a8]"
                  >
                    <Copy className="h-4 w-4" /> {isLinkCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Opening Date</label>
                <input
                  type="date"
                  value={admissionsOpeningDate}
                  onChange={(e) => setAdmissionsOpeningDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Closing Date</label>
                <input
                  type="date"
                  value={admissionsClosingDate}
                  onChange={(e) => setAdmissionsClosingDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Admission Intro Text</label>
              <textarea
                value={admissionsIntroText}
                onChange={(e) => setAdmissionsIntroText(e.target.value)}
                rows={3}
                placeholder="Welcome to our admissions portal..."
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Admission Requirements</label>
              <textarea
                value={admissionsRequirements}
                onChange={(e) => setAdmissionsRequirements(e.target.value)}
                rows={5}
                placeholder="One item per line"
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Contact Information</label>
              <textarea
                value={admissionsContactInfo}
                onChange={(e) => setAdmissionsContactInfo(e.target.value)}
                rows={3}
                placeholder="Email: admissions@school.com\nPhone: +234 ..."
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
              />
            </div>
          </div>
          )}
        </div>

        {/* Result Access PIN Section */}
        <div className="border border-border bg-surface overflow-hidden">
          <div className="border-b border-border bg-surface px-6 py-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => togglePanel('resultAccess')}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') togglePanel('resultAccess'); }}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={openPanels.resultAccess}
              aria-controls="result-access-panel"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-brand" />
                <div>
                  <h2 className="font-semibold text-foreground">Result Access PINs</h2>
                  <p className="text-xs text-muted">Optional school-managed result access control for parents and public checker pages</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={savePanelSettings} disabled={isSaving} aria-label="Save result access settings" title="Save result access settings" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-brand transition hover:bg-brand-light disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
                <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.resultAccess ? 'rotate-90 text-foreground' : 'rotate-0'}`} />
              </div>
            </div>
          </div>

          {openPanels.resultAccess && (
            <div id="result-access-panel" className="p-6 space-y-5">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
              <input
                id="result-access-enabled"
                type="checkbox"
                checked={resultAccessEnabled}
                onChange={(e) => setResultAccessEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
              <label htmlFor="result-access-enabled" className="text-sm font-medium text-foreground">
                Require a PIN to access results
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Result Access Mode</label>
                <select
                  value={resultAccessMode}
                  onChange={(e) => setResultAccessMode(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  <option value="NONE">No PIN Required</option>
                  <option value="PARENT_PORTAL_ONLY">Parent Portal Only</option>
                  <option value="PUBLIC_CHECKER_ONLY">Public Result Checker Only</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">PIN Type</label>
                <select
                  value={resultAccessPinType}
                  onChange={(e) => setResultAccessPinType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  <option value="NONE">None</option>
                  <option value="STUDENT">Student PIN</option>
                  <option value="GENERIC">Generic PIN Batch</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">PIN Validity</label>
                <select
                  value={resultAccessPinValidity}
                  onChange={(e) => setResultAccessPinValidity(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  <option value="TERM">Entire Term</option>
                  <option value="SESSION">Entire Session</option>
                  <option value="CUSTOM">Custom Expiry Date</option>
                </select>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
                <input
                  id="result-access-allow-regeneration"
                  type="checkbox"
                  checked={resultAccessAllowRegeneration}
                  onChange={(e) => setResultAccessAllowRegeneration(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                />
                <label htmlFor="result-access-allow-regeneration" className="text-sm font-medium text-foreground">
                  Allow PIN regeneration
                </label>
              </div>
            </div>

            <p className="text-sm text-muted">
              This setting is disabled by default. When left off, the current result experience remains unchanged for parents and staff.
            </p>
          </div>
          )}
        </div>

        {/* Security Section */}
        <div className="border border-border bg-surface overflow-hidden">
          <div className="border-b border-border bg-surface px-6 py-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => togglePanel('security')}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') togglePanel('security'); }}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={openPanels.security}
              aria-controls="security-panel"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-brand" />
                <div>
                  <h2 className="font-semibold text-foreground">Security</h2>
                  <p className="text-xs text-muted">Change your administrator password securely without leaving this settings page.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={savePanelSettings} disabled={isSaving} aria-label="Save security settings" title="Save security settings" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-brand transition hover:bg-brand-light disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
                <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.security ? 'rotate-90 text-foreground' : 'rotate-0'}`} />
              </div>
            </div>
          </div>

          {openPanels.security && (
            <div id="security-panel" className="p-6">
            <div className="border border-border bg-background p-5 sm:flex sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <p className="font-medium text-foreground">Change password</p>
                <p className="mt-1 text-sm text-muted">
                  Update your administrator password at any time to keep your account secure.
                </p>
              </div>

              <button
                type="button"
                onClick={openPasswordModal}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                <KeyRound className="h-4 w-4" />
                Change password
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Payment Section */}
        <div className="border border-border bg-surface overflow-hidden">
          <div className="border-b border-border bg-surface px-6 py-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => togglePanel('payment')}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') togglePanel('payment'); }}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={openPanels.payment}
              aria-controls="payment-information-panel"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-brand" />
                <div>
                  <h2 className="font-semibold text-foreground">Payment Information</h2>
                  <p className="text-xs text-muted">Manual payment details for invoices</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={savePanelSettings} disabled={isSaving} aria-label="Save payment settings" title="Save payment settings" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-brand transition hover:bg-brand-light disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
                <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${openPanels.payment ? 'rotate-90 text-foreground' : 'rotate-0'}`} />
              </div>
            </div>
          </div>

          {openPanels.payment && (
            <div id="payment-information-panel" className="p-6 space-y-5">
            <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Payment accounts</p>
                <p className="mt-1 max-w-2xl text-xs text-muted">Add labelled accounts such as Tuition, Books, Transport, or Boarding. Active accounts appear on invoices.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => { setPaymentAccounts((current) => [...current, { label: "", bankName: "", accountName: "", accountNumber: "", purpose: "", currency, isDefault: current.length === 0, isActive: true }]); setEditingPaymentAccount(paymentAccounts.length); }}><Plus className="mr-2 h-4 w-4" />Add account</Button>
            </div>
            {paymentAccounts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#9ac7ea] bg-[#f3f9fe] p-8 text-center">
                <DollarSign className="mx-auto text-brand" size={28} />
                <p className="mt-3 text-sm font-semibold text-foreground">No payment accounts configured</p>
                <p className="mt-1 text-xs text-muted">Add an account to show payment instructions on invoices.</p>
              </div>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
                {paymentAccounts.map((account, index) => (
                  <div key={`${account.id ?? 'new'}-${index}`} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{account.label || 'Untitled account'}</p>
                        {account.isDefault && <span className="rounded-full bg-[#e6f4ea] px-2.5 py-1 text-[11px] font-bold text-[#137333]">DEFAULT</span>}
                        {!account.isActive && <span className="rounded-full bg-[#fff4d6] px-2.5 py-1 text-[11px] font-bold text-[#8a5a00]">INACTIVE</span>}
                      </div>
                      <p className="mt-1 text-sm text-muted">{account.bankName || 'Bank not set'} · {account.accountName || 'Account name not set'}</p>
                      <p className="mt-1 font-mono text-xs text-muted">{account.accountNumber || 'Account number not set'}{account.currency ? ` · ${account.currency}` : ''}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-muted"><input type="checkbox" checked={account.isActive !== false} onChange={(event) => setPaymentAccounts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, isActive: event.target.checked } : item))} /> Active</label>
                      <Button type="button" variant="outline" onClick={() => setEditingPaymentAccount(editingPaymentAccount === index ? null : index)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
                      <button type="button" aria-label={`Remove ${account.label || 'payment account'}`} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50" onClick={() => openDeleteAccountModal(index)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {editingPaymentAccount === index && (
                      <div className="basis-full border-t border-border pt-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {([['label', 'Label'], ['bankName', 'Bank Name'], ['accountName', 'Account Name'], ['accountNumber', 'Account Number'], ['purpose', 'Purpose'], ['currency', 'Currency']] as const).map(([field, label]) => (
                            <label key={field} className="text-sm font-medium text-foreground">{label}<input value={account[field] ?? ''} onChange={(event) => setPaymentAccounts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: event.target.value } : item))} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" /></label>
                          ))}
                        </div>
                        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground"><input type="radio" name="default-payment-account" checked={Boolean(account.isDefault)} onChange={() => setPaymentAccounts((current) => current.map((item, itemIndex) => ({ ...item, isDefault: itemIndex === index })))} /> Use as default account</label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>

      {deleteAccountTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <style>{`
            @keyframes settings_payment_delete_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
            @keyframes settings_payment_delete_exit { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }
          `}</style>

          <div
            className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(220,38,38,0.16)]"
            style={{
              animation: `${deleteAccountAnimateState === "enter" ? "settings_payment_delete_enter" : "settings_payment_delete_exit"} 320ms cubic-bezier(.2,.9,.2,1)`,
            }}
          >
            <div className="border-b border-border/70 bg-error/10 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-error/20 bg-error/10">
                  <AlertCircle className="h-6 w-6 text-error" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Delete payment account?</h2>
                  <p className="mt-1 text-sm text-muted">This action cannot be undone.</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-muted">
                You are about to permanently remove <strong>“{deleteAccountTarget.label}”</strong>.
              </p>
              <div className="mt-4 border border-error/20 bg-error/10 p-3">
                <p className="text-xs text-error">
                  <strong>Warning:</strong> The account will be removed from invoice payment instructions immediately.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-border/70 bg-background px-6 py-4">
              <button
                type="button"
                onClick={closeDeleteAccountModal}
                className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAccount}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-error px-4 py-2.5 text-sm font-medium text-white hover:bg-error/90 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closePasswordModal();
            }
          }}
        >
          <style>{`
            @keyframes admin_settings_password_modal_enter { from { transform: translateY(24px) scale(.98); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
            @keyframes admin_settings_password_modal_exit  { from { transform: translateY(0) scale(1); opacity: 1 } to { transform: translateY(24px) scale(.98); opacity: 0 } }
          `}</style>

          <div
            className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
            role="dialog"
            aria-modal="true"
            style={{ animation: `admin_settings_password_modal_enter 320ms cubic-bezier(.2,.9,.2,1)` }}
          >
            <div className="border-b border-border/70 bg-brand/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Change password</h2>
                  <p className="mt-1 text-sm text-muted">Enter your current password and choose a new, stronger password.</p>
                </div>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={changingPassword}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-background transition-colors text-muted"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 px-6 py-6">
              {passwordError && (
                <div className="flex items-start gap-2 border border-error/20 bg-error/10 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm text-red-800">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm text-emerald-800">Password changed successfully.</p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Current password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">New password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                />
                <p className="mt-1.5 text-xs text-muted">Minimum 8 characters.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Confirm new password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                />
              </div>

              <div className="flex gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={changingPassword}
                  className="flex-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Help & Guide */}
      <UserGuide guide={HELP_GUIDE} />
    </div>
    </main>
  );
}
