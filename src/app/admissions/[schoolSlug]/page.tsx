"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, GraduationCap, Mail, Phone, Send, Sparkles, Upload } from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";

export default function PublicAdmissionsPage() {
  const params = useParams<{ schoolSlug: string }>();
  const schoolSlug = params?.schoolSlug ?? "";
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    studentFirstName: "",
    studentMiddleName: "",
    studentLastName: "",
    studentEmail: "",
    studentPhone: "",
    gender: "Male",
    dateOfBirth: "",
    admissionDate: "",
    intendedClass: "",
    address: "",
    bloodGroup: "",
    genotype: "",
    medicalNotes: "",
    previousSchool: "",
    previousClass: "",
    guardianFirst: "",
    guardianLast: "",
    guardianRelationship: "Parent",
    guardianEmail: "",
    guardianPhone: "",
    guardianAltPhone: "",
    guardianOccupation: "",
    note: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalMessage, setModalMessage] = useState<string>('');
  const [modalDetails, setModalDetails] = useState<string>('');
  const [statusLink, setStatusLink] = useState<string>('');
  const [activeTab, setActiveTab] = useState<"applicant" | "student" | "guardian" | "photo">("applicant");
  const submissionKeyRef = useRef<string>(crypto.randomUUID());
  const statusTokenRef = useRef<string>(crypto.randomUUID() + crypto.randomUUID());

  useEffect(() => {
    async function loadSettings() {
      try {
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/admissions/${schoolSlug}/settings`);
        if (!response.ok) throw new Error("Unable to load admissions information");
        const data = await response.json();
        setSettings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load admissions information");
      }
    }

    if (schoolSlug) loadSettings();
  }, [schoolSlug]);

  const school = settings?.school;
  const fallbackGreenfield = {
    name: "Greenfield Academy",
    address: "12 Admiralty Way",
    city: "Lekki Phase 1, Lagos",
    email: "info@greenfieldacademy.ng",
    phone: "+2348012345678",
    logoUrl: "https://www.schoolbase.live/uploads/settings/1783056195488-q5rfiq.png",
  };
  const displaySchool = school ?? (schoolSlug === "greenfield" ? fallbackGreenfield : null);
  const primaryColor = useMemo(() => school?.primaryColor || "#0A66C2", [school]);
  const openingDate = useMemo(() => (settings?.openingDate ? new Date(settings.openingDate) : null), [settings]);
  const closingDate = useMemo(() => (settings?.closingDate ? new Date(settings.closingDate) : null), [settings]);
  const today = useMemo(() => new Date(), []);
  const admissionsOpen = useMemo(() => {
    if (!settings?.enabled) return false;
    if (openingDate && today < openingDate) return false;
    if (closingDate && today > closingDate) return false;
    return true;
  }, [settings, openingDate, closingDate, today]);

  const statusBadgeLabel = useMemo(() => {
    if (!settings?.enabled) return 'Admissions paused';
    if (openingDate && today < openingDate) return 'Opening soon';
    if (closingDate && today > closingDate) return 'Admissions closed';
    return 'Admissions are open now.';
  }, [settings, openingDate, closingDate, today]);

  const statusBadgeText = useMemo(() => {
    if (!settings?.enabled) return 'Currently Closed';
    if (openingDate && today < openingDate) return 'Opening Soon';
    if (closingDate && today > closingDate) return 'Currently Closed';
    return 'Admission ongoing';
  }, [settings, openingDate, closingDate, today]);

  const statusBadgeClass = useMemo(() => {
    if (!settings?.enabled) return 'bg-slate-100 text-slate-700';
    if (openingDate && today < openingDate) return 'bg-amber-100 text-amber-800';
    if (closingDate && today > closingDate) return 'bg-slate-100 text-slate-700';
    return 'bg-emerald-100 text-emerald-800';
  }, [settings, openingDate, closingDate, today]);

  const contactInfoItems = useMemo<string[]>(() => {
    const rawItems: string[] = settings?.contactInfo
      ? settings.contactInfo
          .split(/\r?\n/)
          .map((line: string) => line.trim())
          .filter(Boolean) as string[]
      : [
          school?.email ? `Email: ${school.email}` : null,
          school?.phone ? `Phone: ${school.phone}` : null,
          school?.address ? `${school.address}${school?.city ? `, ${school.city}` : ""}` : null,
        ].filter(Boolean) as string[];

    return rawItems.flatMap((item: string) => {
      if (!item) return [];
      const normalized = item.replace(/\s*•\s*|\s*·\s*|\s*\|\s*/g, '|');
      if (/email/i.test(item) && /phone/i.test(item)) {
        return normalized
          .split('|')
          .map((part: string) => part.trim())
          .filter(Boolean);
      }
      return [item];
    });
  }, [settings, school]);

  const contactButtonHref = useMemo(() => {
    if (school?.email) return `mailto:${school.email}`;
    if (school?.phone) return `tel:${school.phone.replace(/\s+/g, "")}`;
    return undefined;
  }, [school]);

  const schoolMotto = school?.motto || settings?.motto || "";

  const requirementItems = useMemo<string[]>(() => {
    if (Array.isArray(settings?.requirements)) {
      return settings.requirements.filter(Boolean).map((item: unknown) => String(item).trim());
    }

    if (typeof settings?.requirements === 'string') {
      return settings.requirements
        .split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter(Boolean);
    }

    return [
      'Provide the applicant details and parent contact information.',
      'Share your preferred class or grade level.',
      'Our admissions team will review your request and get back to you shortly.',
    ];
  }, [settings]);

  const admissionStatusLabel = useMemo(() => {
    if (!settings?.enabled) return 'Admissions are currently disabled.';
    if (openingDate && today < openingDate) return `Admissions open on ${openingDate.toLocaleDateString()}.`;
    if (closingDate && today > closingDate) return `Admissions closed on ${closingDate.toLocaleDateString()}.`;
    return 'Admissions are open now.';
  }, [settings, openingDate, closingDate, today]);

  const completedSteps = [
    Boolean(form.firstName.trim() && form.lastName.trim() && form.email.trim() && form.phone.trim()),
    Boolean(form.studentFirstName.trim() && form.studentLastName.trim()),
    Boolean(form.guardianFirst.trim() || form.guardianLast.trim() || form.guardianEmail.trim() || form.guardianPhone.trim()),
    Boolean(photoFile),
  ];

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview("");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setModalOpen(false);
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Applicant name, email, and phone are required.');
      setSubmitting(false);
      return;
    }

    if (!form.studentFirstName.trim() || !form.studentLastName.trim()) {
      setError('Student first and last name are required.');
      setSubmitting(false);
      return;
    }

    try {
      if (!photoFile) {
        setError('Please upload a student photo before submitting.');
        setSubmitting(false);
        return;
      }

      const backendUrl = getBackendUrl();
      const formData = new FormData();
      formData.append('schoolSlug', schoolSlug);
      formData.append('firstName', form.firstName.trim());
      formData.append('lastName', form.lastName.trim());
      formData.append('email', form.email.trim());
      formData.append('phone', form.phone.trim());
      formData.append('studentFirstName', form.studentFirstName.trim());
      formData.append('studentMiddleName', form.studentMiddleName.trim());
      formData.append('studentLastName', form.studentLastName.trim());
      formData.append('studentEmail', form.studentEmail.trim());
      formData.append('studentPhone', form.studentPhone.trim());
      formData.append('gender', form.gender);
      formData.append('dateOfBirth', form.dateOfBirth);
      formData.append('admissionDate', form.admissionDate);
      formData.append('intendedClass', form.intendedClass.trim());
      formData.append('address', form.address.trim());
      formData.append('bloodGroup', form.bloodGroup.trim());
      formData.append('genotype', form.genotype.trim());
      formData.append('medicalNotes', form.medicalNotes.trim());
      formData.append('previousSchool', form.previousSchool.trim());
      formData.append('previousClass', form.previousClass.trim());
      formData.append('guardianFirst', form.guardianFirst.trim() || form.firstName.trim());
      formData.append('guardianLast', form.guardianLast.trim() || form.lastName.trim());
      formData.append('guardianRelationship', form.guardianRelationship);
      formData.append('guardianEmail', form.guardianEmail.trim() || form.email.trim());
      formData.append('guardianPhone', form.guardianPhone.trim() || form.phone.trim());
      formData.append('guardianAltPhone', form.guardianAltPhone.trim());
      formData.append('guardianOccupation', form.guardianOccupation.trim());
      formData.append('note', form.note.trim());

      if (photoFile) formData.append('photo', photoFile);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 45_000);
      const response = await fetch(`${backendUrl}/api/admissions`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Admission-Request-Id': submissionKeyRef.current,
          'X-Admission-Status-Token': statusTokenRef.current,
        },
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Unable to submit your request');

      setModalTitle('Application submitted');
      setModalMessage('Your admission request has been received. Our admissions team will review it shortly.');
      const reference = data?.application?.applicationNumber || data?.application?.id;
      const statusUrl = `${window.location.origin}/admissions/${encodeURIComponent(schoolSlug)}/status#${encodeURIComponent(statusTokenRef.current)}`;
      setModalDetails(reference ? `Application reference: ${reference}` : '');
      setStatusLink(statusUrl);
      setModalOpen(true);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        studentFirstName: "",
        studentMiddleName: "",
        studentLastName: "",
        studentEmail: "",
        studentPhone: "",
        gender: "Male",
        dateOfBirth: "",
        admissionDate: "",
        intendedClass: "",
        address: "",
        bloodGroup: "",
        genotype: "",
        medicalNotes: "",
        previousSchool: "",
        previousClass: "",
        guardianFirst: "",
        guardianLast: "",
        guardianRelationship: "Parent",
        guardianEmail: "",
        guardianPhone: "",
        guardianAltPhone: "",
        guardianOccupation: "",
        note: "",
      });
      setPhotoFile(null);
      setPhotoPreview("");
      submissionKeyRef.current = crypto.randomUUID();
      statusTokenRef.current = crypto.randomUUID() + crypto.randomUUID();
    } catch (err) {
      setError(err instanceof DOMException && err.name === 'AbortError'
        ? 'Submission timed out. Please check your connection and try again.'
        : err instanceof Error ? err.message : 'Unable to submit your request');
    } finally {
      setSubmitting(false);
    }
  }

  const tabs = [
    { id: "applicant", label: "Applicant", detail: "Contact details" },
    { id: "student", label: "Student", detail: "Academic profile" },
    { id: "guardian", label: "Guardian", detail: "Family contact" },
    { id: "photo", label: "Photo", detail: "Final review" },
  ] as const;

  const contactItems = contactInfoItems;
  const pageContainerClass = admissionsOpen ? "mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_minmax(0,1fr)]" : "mx-auto max-w-7xl";

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8 sm:py-8">
      <div className="relative mx-auto mb-6 max-w-7xl overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
            <GraduationCap className="h-4 w-4" /> Admissions workspace
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Online application</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">A guided application experience for {school?.name || displaySchool?.name || 'your school'}</p>
        </div>
        <div className="relative flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className={`inline-flex items-center gap-2 border px-3 py-2 ${statusBadgeClass}`}>
            <span className="h-2 w-2 rounded-full bg-current" /> {statusBadgeText}
          </span>
          {settings?.closingDate ? <span className="border border-border bg-background px-3 py-2 text-muted">Closes {new Date(settings.closingDate).toLocaleDateString()}</span> : null}
        </div>
        </div>
      </div>

      {admissionsOpen ? (
        <div className="mx-auto mb-6 grid max-w-7xl gap-3 sm:grid-cols-3">
          <div className="border border-border bg-surface px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Application mode</p>
            <p className="mt-1 font-semibold text-slate-900">Guided submission</p>
          </div>
          <div className="border border-border bg-surface px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Application steps</p>
            <p className="mt-1 font-semibold text-slate-900">{completedSteps.filter(Boolean).length} of {tabs.length} completed</p>
          </div>
          <div className="border border-border bg-surface px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Expected time</p>
            <p className="mt-1 font-semibold text-slate-900">About 5 minutes</p>
          </div>
        </div>
      ) : null}

      <div className={pageContainerClass}>
        {admissionsOpen ? (
          <aside className="space-y-6">
            <div className="border border-border bg-surface p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-brand/15 bg-brand/5">
                  {school?.logoUrl ? (
                    <img src={school.logoUrl} alt={`${school?.name} logo`} className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-2xl font-semibold text-[#0A66C2]">{school?.name?.slice(0, 2).toUpperCase() || "S"}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-brand">Admissions workspace</p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{school?.name || "Apply now"}</h1>
                  {(school?.address || school?.city) ? (
                    <p className="mt-1 text-sm text-muted">
                      {[school?.address, school?.city].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-5">
                <p className="text-sm leading-6 text-foreground">
                {settings?.introText ?? `Apply online for ${school?.name || 'this school'} in just a few steps.`}
                </p>
              </div>

              {contactItems.length > 0 ? (
                <div className="mt-5 grid gap-2 text-sm text-muted">
                  {contactItems.map((item: string, index: number) => (
                    <div key={index} className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                      {index === 0 ? <Mail className="h-4 w-4 shrink-0 text-brand" /> : <Phone className="h-4 w-4 shrink-0 text-brand" />}
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 grid gap-2 text-xs sm:grid-cols-3">
                <span className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-center font-semibold ${statusBadgeClass}`}>
                  {statusBadgeLabel}
                </span>
                {settings?.openingDate ? (
                  <span className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-center text-muted">
                    Starts {new Date(settings.openingDate).toLocaleDateString()}
                  </span>
                ) : null}
                {settings?.closingDate ? (
                  <span className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-center text-muted">
                    Ends {new Date(settings.closingDate).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold text-slate-900">Admissions requirements</h2>
              <ol className="mt-4 space-y-3 text-sm text-slate-700">
                {requirementItems.map((item: string, index: number) => (
                  <li key={index} className="flex gap-3">
                    <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0A66C2]/10 text-[#0A66C2]">{index + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        ) : null}

        <section className="border border-border bg-surface p-5 sm:p-8">
          {admissionsOpen ? (
            <div className="mb-7">
              <div className="grid gap-2 sm:grid-cols-4">
                {tabs.map((tab, index) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`cursor-pointer rounded-lg border px-3 py-3 text-left transition ${activeTab === tab.id ? "border-[#0A66C2] bg-[#0A66C2] text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-[#0A66C2]/40 hover:bg-slate-50"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${activeTab === tab.id ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span>{tab.label}</span>
                      {completedSteps[index] ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </span>
                    <span className={`mt-1 block pl-8 text-[11px] ${activeTab === tab.id ? "text-white/75" : "text-slate-500"}`}>{tab.detail}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                Use the tabs to move between application sections. You can update any section before submitting.
              </p>
            </div>
          ) : null}

          {!settings?.enabled || (openingDate && today < openingDate) || (closingDate && today > closingDate) ? (
            <div className="mx-auto max-w-full rounded-[1.25rem] border border-slate-200 bg-white p-6 sm:p-8 shadow-lg shadow-slate-200/30">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.45fr_0.95fr] items-start">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-slate-100">
                    {displaySchool?.logoUrl ? (
                      <img src={displaySchool.logoUrl} alt={`${displaySchool?.name || 'School'} logo`} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-2xl font-semibold text-[#0A66C2]">{(displaySchool?.name || 'S').slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{displaySchool?.name || school?.name || 'School Admissions'}</h2>
                    {(displaySchool?.address || displaySchool?.city) ? (
                      <p className="mt-1 text-sm leading-6 text-slate-600 truncate">
                        {[displaySchool?.address, displaySchool?.city].filter(Boolean).join(', ')}
                      </p>
                    ) : null}
                    <div className="mt-2 space-y-2 text-sm text-slate-600">
                      {displaySchool?.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-[#0A66C2]" />
                          <span>Email: {displaySchool.email}</span>
                        </div>
                      ) : null}
                      {displaySchool?.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-[#0A66C2]" />
                          <span>Phone: {displaySchool.phone}</span>
                        </div>
                      ) : null}
                    </div>
                    {schoolMotto ? <p className="mt-1 text-sm leading-6 text-slate-600">{schoolMotto}</p> : null}
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A66C2]/10 text-[#0A66C2]">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Admissions Are Currently Closed</h1>
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-slate-600">
                    {!settings?.enabled
                      ? `Online application submission for ${displaySchool?.name || school?.name || 'this school'} is currently closed. Please contact us directly for the next admissions cycle.`
                      : openingDate && today < openingDate
                        ? `Applications will be accepted beginning ${openingDate.toLocaleDateString()}. Please return then or contact us directly for the next admissions cycle.`
                        : `Online application submission for ${displaySchool?.name || school?.name || 'this school'} is currently closed. Please contact us directly for the next admissions cycle.`
                    }
                  </p>

                  {contactButtonHref ? (
                    <div className="pt-1">
                      <a
                        href={contactButtonHref}
                        className="w-full inline-flex items-center justify-center rounded-full bg-[#0A66C2] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0959a8] focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30 sm:w-auto"
                      >
                        Contact the school
                      </a>
                    </div>
                  ) : null}

                  <div className="sm:col-span-full pt-2 text-center text-xs text-slate-500">Powered by SchoolBase</div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
            {activeTab === "applicant" && (
              <div className="space-y-4">
                <h3 className="w-full border-b border-slate-200 pb-3 text-xl font-semibold text-[#0A66C2]">
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Applicant details
                  </span>
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Your first name
                    <input placeholder="First name" required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Your last name
                    <input placeholder="Last name" required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Your email
                    <input placeholder="Email address" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Your phone
                    <input placeholder="Phone number" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "student" && (
              <div className="space-y-4">
                <h3 className="w-full border-b border-slate-200 pb-3 text-xl font-semibold text-[#0A66C2]">
                  <span className="inline-flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Student details
                  </span>
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Student first name
                    <input placeholder="First name" required value={form.studentFirstName} onChange={(event) => setForm({ ...form, studentFirstName: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Student middle name
                    <input placeholder="Middle name (optional)" value={form.studentMiddleName} onChange={(event) => setForm({ ...form, studentMiddleName: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Student last name
                    <input placeholder="Last name" required value={form.studentLastName} onChange={(event) => setForm({ ...form, studentLastName: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Student email
                    <input placeholder="Student email" type="email" value={form.studentEmail} onChange={(event) => setForm({ ...form, studentEmail: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Student phone
                    <input placeholder="Student phone" value={form.studentPhone} onChange={(event) => setForm({ ...form, studentPhone: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Gender
                    <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400">
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Date of birth
                    <input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Admission date
                    <input type="date" value={form.admissionDate} onChange={(event) => setForm({ ...form, admissionDate: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                    Intended class
                    {settings?.classes?.length ? (
                    <select value={form.intendedClass} onChange={(event) => setForm({ ...form, intendedClass: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400">
                      <option value="">Select class</option>
                      {settings.classes.map((cls: any) => (
                        <option key={cls.id} value={cls.name}>
                          {`${cls.name}${cls.arm ? ` (${cls.arm})` : ''}${cls.phase ? ` • ${cls.phase}` : ''}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input placeholder="Intended class" value={form.intendedClass} onChange={(event) => setForm({ ...form, intendedClass: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  )}
                  </label>
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                    Address
                    <input placeholder="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Blood group
                    <input placeholder="Blood group" value={form.bloodGroup} onChange={(event) => setForm({ ...form, bloodGroup: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Genotype
                    <input placeholder="Genotype" value={form.genotype} onChange={(event) => setForm({ ...form, genotype: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Medical notes
                    <textarea placeholder="Medical notes (allergies, conditions, medications)" value={form.medicalNotes} onChange={(event) => setForm({ ...form, medicalNotes: event.target.value })} rows={4} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Previous school
                    <input placeholder="Previous school (optional)" value={form.previousSchool} onChange={(event) => setForm({ ...form, previousSchool: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Previous class
                    <input placeholder="Previous class (optional)" value={form.previousClass} onChange={(event) => setForm({ ...form, previousClass: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "guardian" && (
              <div className="space-y-4">
                <h3 className="w-full border-b border-slate-200 pb-3 text-xl font-semibold text-[#0A66C2]">
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Guardian details
                  </span>
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Guardian first name
                    <input placeholder="First name" value={form.guardianFirst} onChange={(event) => setForm({ ...form, guardianFirst: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Guardian last name
                    <input placeholder="Last name" value={form.guardianLast} onChange={(event) => setForm({ ...form, guardianLast: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Relationship
                    <select value={form.guardianRelationship} onChange={(event) => setForm({ ...form, guardianRelationship: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400">
                      <option>Parent</option>
                      <option>Guardian</option>
                      <option>Aunt/Uncle</option>
                      <option>Grandparent</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Guardian email
                    <input placeholder="Email address" type="email" value={form.guardianEmail} onChange={(event) => setForm({ ...form, guardianEmail: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Guardian phone
                    <input placeholder="Phone number" value={form.guardianPhone} onChange={(event) => setForm({ ...form, guardianPhone: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Guardian alt phone
                    <input placeholder="Alternate phone (optional)" value={form.guardianAltPhone} onChange={(event) => setForm({ ...form, guardianAltPhone: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                    Guardian occupation
                    <input placeholder="Occupation (optional)" value={form.guardianOccupation} onChange={(event) => setForm({ ...form, guardianOccupation: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "photo" && (
              <div className="space-y-4">
                <h3 className="w-full border-b border-slate-200 pb-3 text-xl font-semibold text-[#0A66C2]">
                  <span className="inline-flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Student photo
                  </span>
                </h3>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <label htmlFor="photo-upload-input" className="flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-3xl bg-slate-100 text-slate-400 transition hover:bg-slate-200">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Selected student" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-8 w-8" />
                    )}
                  </label>
                  <label className="block text-sm font-medium text-slate-700 flex-1">
                    Upload photo
                    <input id="photo-upload-input" required type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handlePhotoChange} className="mt-2 block w-full text-sm text-slate-600" />
                  </label>
                </div>
                <p className="text-sm text-slate-500">JPG, PNG, WEBP only. Keep files under 4MB.</p>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              </div>
              <div className="flex items-center gap-2">
              {activeTab !== "applicant" ? (
                <button type="button" onClick={() => { const currentIndex = tabs.findIndex((tab) => tab.id === activeTab); setActiveTab(tabs[currentIndex - 1].id); }} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Back</button>
              ) : null}
              {activeTab !== "photo" ? (
                <button type="button" onClick={() => { const currentIndex = tabs.findIndex((tab) => tab.id === activeTab); if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1].id); }} className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-[#0A66C2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0959a8]">Next</button>
              ) : (
                <button type="submit" disabled={submitting} className="cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70" style={{ backgroundColor: primaryColor }}>
                  <Send className="h-4 w-4" />
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              )}
              </div>
            </div>
          </form>
          )}
        </section>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_rgba(10,102,194,0.16)]">
            <div className="border-b border-slate-100 px-6 py-5" style={{ background: "linear-gradient(90deg, rgba(10,102,194,0.12), rgba(10,102,194,0.04))" }}>
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/70 shadow-sm" style={{ background: "rgba(10,102,194,0.12)" }}>
                  <Sparkles className="h-6 w-6" style={{ color: "#0A66C2" }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{modalTitle}</h2>
                  <p className="mt-1 text-sm text-slate-600">Your request was completed successfully.</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-slate-700">{modalMessage}</p>
              {modalDetails ? (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-700">{modalDetails}</p>
                </div>
              ) : null}
              {statusLink ? <a href={statusLink} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#0A66C2] underline underline-offset-2">Check application status securely</a> : null}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="cursor-pointer w-full rounded-lg px-4 py-2.5 font-medium text-sm transition-colors text-white"
                style={{ background: "#0A66C2" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#084B8A")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#0A66C2")}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
