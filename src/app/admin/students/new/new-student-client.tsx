"use client";

import { getBackendUrl } from "@/lib/backend-url";




import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Camera, CameraOff, Check, CheckCircle2, ChevronDown, Loader2, Upload, X, UserPlus } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/icons";

export default function NewStudentClient() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [nextAdmissionNo, setNextAdmissionNo] = useState("---");
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const uploadPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [errorModalOpen, setErrorModalOpen] = useState(false);

  const [whatsAppConnected, setWhatsAppConnected] = useState<boolean | null>(null);
  const [whatsAppStatusMessage, setWhatsAppStatusMessage] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [gender, setGender] = useState("Male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [address, setAddress] = useState("");

  const [guardianFirst, setGuardianFirst] = useState("");
  const [guardianLast, setGuardianLast] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("Parent");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianAltPhone, setGuardianAltPhone] = useState("");
  const [guardianOccupation, setGuardianOccupation] = useState("");

  const [bloodGroup, setBloodGroup] = useState("");
  const [genotype, setGenotype] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");

  const [previousSchool, setPreviousSchool] = useState("");
  const [previousClass, setPreviousClass] = useState("");

  const [medicalOpen, setMedicalOpen] = useState(false);
  const [previousOpen, setPreviousOpen] = useState(false);

  // Fetch classes and next admission number on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/admin/students/data', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          setClasses(data.classes || []);
          setNextAdmissionNo(data.nextAdmissionNo || "---");
        }
      } catch (err) {
        console.error("Failed to load page data:", err);
      } finally {
        setIsLoadingPage(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    async function fetchWhatsAppStatus() {
      try {
        const res = await fetch(`/api/admin/whatsapp/status`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          setWhatsAppConnected(data?.session?.status === 'connected');
          setWhatsAppStatusMessage(data?.session?.statusMessage || data?.session?.status || null);
        } else {
          setWhatsAppConnected(false);
          setWhatsAppStatusMessage('Unable to retrieve WhatsApp status.');
        }
      } catch (err) {
        console.error('Error loading WhatsApp status:', err);
        setWhatsAppConnected(false);
        setWhatsAppStatusMessage('Unable to retrieve WhatsApp status.');
      }
    }

    fetchWhatsAppStatus();
  }, []);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    if (!isCameraOpen) return;

    let cancelled = false;
    const videoElement = cameraVideoRef.current;
    async function startCamera() {
      setCameraError("");
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is unavailable in this browser. Use a secure connection or upload a photo instead.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoElement) {
          videoElement.srcObject = stream;
          await videoElement.play();
        }
      } catch (cameraRequestError) {
        if (cancelled) return;
        if (cameraRequestError instanceof Error && cameraRequestError.name === "NotAllowedError") {
          setCameraError("Camera permission was denied. Allow camera access in your browser settings, or upload a photo instead.");
        } else if (cameraRequestError instanceof Error && cameraRequestError.name === "NotFoundError") {
          setCameraError("No camera was found on this device. You can upload a photo instead.");
        } else if (!window.isSecureContext) {
          setCameraError("Camera access requires HTTPS or localhost. Open SchoolBase securely, or upload a photo instead.");
        } else {
          setCameraError(cameraRequestError instanceof Error ? cameraRequestError.message : "Could not start the camera. You can upload a photo instead.");
        }
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      if (videoElement) videoElement.srcObject = null;
    };
  }, [isCameraOpen]);

  useEffect(() => {
    if (!photoPreview) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const captureStudentPhoto = async () => {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera is not ready yet. Please wait a moment and try again.");
      return;
    }

    setIsCapturingPhoto(true);
    setCameraError("");
    try {
      const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare the captured photo.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("Could not capture the photo. Please try again.")),
          "image/jpeg",
          0.9,
        );
      });
      setPhotoFile(new File([imageBlob], `student-photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
      setPhotoPreview(URL.createObjectURL(imageBlob));
      setIsCameraOpen(false);
    } catch (captureError) {
      setCameraError(captureError instanceof Error ? captureError.message : "Could not capture the photo. Please try again.");
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setError('First name and last name are required');
      setErrorModalOpen(true);
      playOpenTone();
      setIsSubmitting(false);
      return;
    }

    try {
      const shouldUseMultipart = Boolean(photoFile);
      const headers: Record<string, string> = {};
      let body: FormData | string;

      if (shouldUseMultipart) {
        const formData = new FormData();
        formData.append("lastName", trimmedLastName);
        formData.append("firstName", trimmedFirstName);
        formData.append("middleName", middleName.trim());
        formData.append("classId", classId);
        formData.append("status", status);
        formData.append("admissionDate", admissionDate || new Date().toISOString().split("T")[0]);
        formData.append("gender", gender);
        formData.append("dateOfBirth", dateOfBirth);
        formData.append("studentEmail", studentEmail.trim());
        formData.append("studentPhone", studentPhone.trim());
        formData.append("address", address.trim());
        formData.append("bloodGroup", bloodGroup.trim());
        formData.append("genotype", genotype.trim());
        formData.append("medicalNotes", medicalNotes.trim());
        formData.append("previousSchool", previousSchool.trim());
        formData.append("previousClass", previousClass.trim());
        formData.append("guardianFirst", guardianFirst.trim());
        formData.append("guardianLast", guardianLast.trim());
        formData.append("guardianRelationship", guardianRelationship);
        formData.append("guardianEmail", guardianEmail.trim());
        formData.append("guardianPhone", guardianPhone.trim());
        formData.append("guardianAltPhone", guardianAltPhone.trim());
        formData.append("guardianOccupation", guardianOccupation.trim());

        if (photoFile) {
          formData.append("photo", photoFile);
        }

        body = formData;
      } else {
        const payload = {
          lastName: trimmedLastName,
          firstName: trimmedFirstName,
          middleName: middleName.trim() || null,
          classId: classId || null,
          status,
          admissionDate: admissionDate || new Date().toISOString().split("T")[0],
          gender,
          dateOfBirth: dateOfBirth || null,
          studentEmail: studentEmail.trim() || null,
          studentPhone: studentPhone.trim() || null,
          address: address.trim() || null,
          bloodGroup: bloodGroup.trim() || null,
          genotype: genotype.trim() || null,
          medicalNotes: medicalNotes.trim() || null,
          previousSchool: previousSchool.trim() || null,
          previousClass: previousClass.trim() || null,
          guardianFirst: guardianFirst.trim() || null,
          guardianLast: guardianLast.trim() || null,
          guardianRelationship,
          guardianEmail: guardianEmail.trim() || null,
          guardianPhone: guardianPhone.trim() || null,
          guardianAltPhone: guardianAltPhone.trim() || null,
          guardianOccupation: guardianOccupation.trim() || null,
        };

        body = JSON.stringify(payload);
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch('/api/admin/students', {
        method: "POST",
        credentials: 'include',
        headers,
        body,
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create student");
      }

      const result = await response.json();
      const whatsappOutcome = Array.isArray(result.notificationOutcomes)
        ? result.notificationOutcomes.find((outcome: { channel?: string }) => outcome.channel === 'WHATSAPP')
        : null;
      const notificationQuery = whatsappOutcome
        ? `&whatsappStatus=${encodeURIComponent(whatsappOutcome.status)}${whatsappOutcome.error ? `&whatsappError=${encodeURIComponent(whatsappOutcome.error)}` : ''}`
        : '';
      router.push(`/admin/students?saved=1${notificationQuery}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      setErrorModalOpen(true);
      playOpenTone();
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeErrorModal = () => {
    playCloseTone();
    setErrorModalOpen(false);
  };

  const whatsAppPulseStyle = `
    @keyframes whatsapp-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.9; }
    }
    .whatsapp-pulse {
      animation: whatsapp-pulse 2s ease-in-out infinite;
    }
  `;

  return (
    <main className="min-h-screen pb-12">
    <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
      <style>{whatsAppPulseStyle}</style>
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-10 sm:px-8 sm:pb-8 sm:pt-12">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><UserPlus className="h-4 w-4" /> Student records</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Add student</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Register a student and connect the core academic, guardian, and medical records in one place.</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {whatsAppConnected !== null && (
              <div
                className="inline-flex items-center gap-2.5 self-start rounded-full border border-border bg-surface px-2.5 py-1.5 shadow-sm sm:self-auto"
                title={whatsAppConnected ? 'WhatsApp connected — Ready to send school messages' : 'WhatsApp disconnected — Reconnect via settings'}
              >
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${whatsAppConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  <WhatsAppIcon className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-foreground">
                    {whatsAppConnected ? 'Connected' : 'Disconnected'}
                  </span>
                  <span className="hidden text-[10px] text-muted sm:inline">
                    {whatsAppConnected ? 'Ready' : 'Reconnect'}
                  </span>
                </div>
                <span className={`h-2 w-2 rounded-full ${whatsAppConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </div>
            )}
            <Link
              href="/admin/students"
              aria-label="Back to student list"
              title="Back to student list"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-brand bg-white text-brand transition-colors hover:bg-brand-light sm:h-auto sm:w-auto sm:px-5 sm:py-2.5"
            >
              <ArrowLeft className="h-5 w-5 sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">Back to student list</span>
            </Link>
            <Button
              type="submit"
              form="new-student-form"
              disabled={isSubmitting}
              aria-label={isSubmitting ? "Saving student" : "Save student"}
              title={isSubmitting ? "Saving student" : "Save student"}
              className="h-11 w-11 shrink-0 px-0 sm:h-auto sm:w-auto sm:px-5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2
                    className="sm:hidden"
                    style={{ width: 22, height: 22, minWidth: 22, minHeight: 22 }}
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">Save student</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <form id="new-student-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Error Alert */}
        {error && !errorModalOpen && (
          <div className="lg:col-span-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Left: photo card (sticky) */}
        <div className="lg:col-span-1">
          <div className="border border-border bg-surface p-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Profile photo</p>
                <p className="mt-1 text-sm text-muted">Upload a clear student portrait for the profile card.</p>
              </div>
              <div className="rounded-full bg-surface/80 p-2 text-muted">
                <Upload className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 rounded-md border border-dashed border-border/70 bg-background p-3 text-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Selected student photo" className="mx-auto h-40 w-40 rounded-md object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-md bg-surface/80 text-muted">
                  <span className="text-sm">No photo selected</span>
                </div>
              )}
            </div>

            <p className="mt-5 text-sm font-semibold text-foreground">Add a student photo</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <input
                ref={uploadPhotoInputRef}
                name="photo"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handlePhotoChange}
                className="sr-only"
                aria-label="Upload student photo"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => uploadPhotoInputRef.current?.click()}
                aria-label="Upload student photo"
                title="Upload student photo"
                className="h-11 w-full px-0 sm:h-auto sm:px-5 sm:py-2.5"
              >
                <Upload className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Upload photo</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCameraError("");
                  setIsCameraOpen(true);
                }}
                aria-label="Take student photo with camera"
                title="Take student photo with camera"
                className="h-11 w-full px-0 sm:h-auto sm:px-5 sm:py-2.5"
              >
                <Camera className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Take photo</span>
              </Button>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">Use a JPG, PNG or WEBP image under 4MB; a square portrait works best.</p>

            <div className="mt-4 text-sm text-muted">
              <p className="mt-2">Admission number: <span className="font-semibold">{nextAdmissionNo}</span></p>
            </div>
          </div>
        </div>

        {/* Right: main form fields */}
        <div className="lg:col-span-2">
          {/* Top row: Admission details */}
          <div className="border border-border bg-surface p-4 mb-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-semibold text-foreground">
                Admission number
                <input name="admissionNo" defaultValue={nextAdmissionNo} readOnly placeholder="Admission number generated automatically" className="mt-2 w-full rounded-2xl border border-border bg-surface/80 px-4 py-3 text-sm text-muted" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Class *
                <select name="classId" value={classId} onChange={(e) => setClassId(e.target.value)} required className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10">
                  <option value="">Select class</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.arm ? ` ${item.arm}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-foreground">
                Status
                <select name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-foreground">
                Admission date
                <input name="admissionDate" type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} placeholder="Select admission date" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>
            </div>
          </div>

          {/* Section 1: Student Information */}
          <div className="border border-border bg-surface p-4 mb-3">
            <h3 className="text-lg font-semibold text-foreground">Student information</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-semibold text-foreground">
                Surname *
                <input name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="e.g., Adekunle" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                First name *
                <input name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="e.g., Chidi" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Middle name
                <input name="middleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Optional" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Gender *
                <select name="gender" value={gender} onChange={(e) => setGender(e.target.value)} required className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-foreground">
                Date of birth
                <input name="dateOfBirth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} placeholder="Select birth date" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Email
                <input name="studentEmail" type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="student@example.com" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Phone number
                <input name="studentPhone" type="tel" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} placeholder="+234..." className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground xl:col-span-3">
                Address
                <textarea name="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Street address, city, state" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>
            </div>
          </div>

          {/* Section 2: Parent / Guardian Information */}
          <div className="rounded-lg border border-border bg-surface p-3 mb-3">
            <h3 className="text-lg font-semibold text-foreground">Parent / Guardian information</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-semibold text-foreground">
                First name
                <input name="guardianFirst" value={guardianFirst} onChange={(e) => setGuardianFirst(e.target.value)} placeholder="Guardian first name" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Last name
                <input name="guardianLast" value={guardianLast} onChange={(e) => setGuardianLast(e.target.value)} placeholder="Guardian last name" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Relationship *
                <select name="guardianRelationship" value={guardianRelationship} onChange={(e) => setGuardianRelationship(e.target.value)} required className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10">
                  <option value="Parent">Parent</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-foreground">
                Phone number *
                <input name="guardianPhone" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} required placeholder="+234 800 123 4567" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Alternative phone
                <input name="guardianAltPhone" value={guardianAltPhone} onChange={(e) => setGuardianAltPhone(e.target.value)} placeholder="Optional" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Email
                <input name="guardianEmail" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} type="email" placeholder="guardian@example.com" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Occupation
                <input name="guardianOccupation" value={guardianOccupation} onChange={(e) => setGuardianOccupation(e.target.value)} placeholder="Optional" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>
            </div>
          </div>

          {/* Section 3: Medical Information (collapsible) */}
          <div className="border border-border bg-surface p-0 mb-3">
            <button type="button" onClick={() => setMedicalOpen((v) => !v)} className="w-full flex items-center justify-between p-4 text-left hover:bg-surface/80 transition">
              <div className="flex items-center gap-3">
                <ChevronDown className={`h-5 w-5 text-muted transition-transform ${medicalOpen ? 'rotate-180' : ''}`} />
                <div>
                  <h4 className="text-lg font-semibold text-foreground">Medical information</h4>
                  <p className="mt-1 text-sm text-muted">Optional medical details (expand to edit).</p>
                </div>
              </div>
            </button>

            {medicalOpen ? (
              <div className="border-t border-border p-3">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <label className="text-sm font-semibold text-foreground">
                    Blood group
                    <input name="bloodGroup" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="A+, O-, B+" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
                  </label>

                  <label className="text-sm font-semibold text-foreground">
                    Genotype
                    <input name="genotype" value={genotype} onChange={(e) => setGenotype(e.target.value)} placeholder="AA, AS, SS" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
                  </label>

                  <label className="text-sm font-semibold text-foreground xl:col-span-3">
                    Medical notes
                    <textarea name="medicalNotes" value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} rows={3} placeholder="Allergies, conditions, or doctor notes" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          {/* Section 4: Previous School (collapsible) */}
          <div className="border border-border bg-surface p-0 mb-3">
            <button type="button" onClick={() => setPreviousOpen((v) => !v)} className="w-full flex items-center justify-between p-4 text-left hover:bg-surface/80 transition">
              <div className="flex items-center gap-3">
                <ChevronDown className={`h-5 w-5 text-muted transition-transform ${previousOpen ? 'rotate-180' : ''}`} />
                <div>
                  <h4 className="text-lg font-semibold text-foreground">Previous school</h4>
                  <p className="mt-1 text-sm text-muted">Optional previous school information.</p>
                </div>
              </div>
            </button>

            {previousOpen ? (
              <div className="border-t border-border p-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <label className="text-sm font-semibold text-foreground">
                    Previous school
                    <input name="previousSchool" value={previousSchool} onChange={(e) => setPreviousSchool(e.target.value)} placeholder="Previous school name" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
                  </label>

                  <label className="text-sm font-semibold text-foreground">
                    Previous class
                    <input name="previousClass" value={previousClass} onChange={(e) => setPreviousClass(e.target.value)} placeholder="Previous class or grade" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">All fields can be edited later from the student profile.</div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" href="/admin/students">Cancel</Button>
              <Button type="submit" form="new-student-form" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save student"
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {isCameraOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-camera-title"
        >
          <section className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div>
                <h2 id="student-camera-title" className="font-semibold text-foreground">Take student photo</h2>
                <p className="text-xs text-muted">Position the student in the frame, then capture.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCameraOpen(false)}
                aria-label="Close camera"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="space-y-3 p-4 sm:p-5">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                  aria-label="Live camera preview"
                />
                {cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-5 text-center text-white">
                    <CameraOff className="h-8 w-8" aria-hidden="true" />
                    <p role="alert" className="text-sm">{cameraError}</p>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => setIsCameraOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={captureStudentPhoto}
                  disabled={isCapturingPhoto || Boolean(cameraError)}
                  className="w-full sm:w-auto"
                >
                  {isCapturingPhoto ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                  {isCapturingPhoto ? "Capturing..." : "Capture photo"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {errorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="student-registration-error-title">
          <style>{`
            @keyframes student_error_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
          `}</style>
          <div className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]" style={{ animation: "student_error_modal_enter 320ms cubic-bezier(.2,.9,.2,1)" }}>
            <div className="border-b border-border bg-brand/10 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-brand/20 bg-brand/10">
                  <AlertCircle className="h-6 w-6 text-[#0A66C2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="student-registration-error-title" className="text-lg font-semibold text-foreground">Unable to register student</h2>
                  <p className="mt-1 text-sm text-muted">Please review the details below.</p>
                </div>
                <button type="button" onClick={closeErrorModal} className="rounded-md p-1 text-muted transition-colors hover:bg-surface/90 hover:text-foreground" aria-label="Close error modal">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <p className="text-sm leading-6 text-muted">{error}</p>
              {error.toLowerCase().includes("limit") && (
                <div className="mt-4 rounded-md border border-border bg-background p-3">
                  <p className="text-xs leading-5 text-muted">Your school has reached its student capacity. Upgrade your plan to register more students.</p>
                </div>
              )}
            </div>

            <div className="border-t border-border bg-surface/80 px-4 py-4 sm:px-6">
              <button type="button" onClick={closeErrorModal} className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </main>
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
  } catch {
    // Audio is optional and may be unavailable in some browsers.
  }
}

function playCloseTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = "sine";
    osc.frequency.value = 420;
    gainNode.gain.value = 0.0001;
    gainNode.gain.linearRampToValueAtTime(0.045, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio is optional and may be unavailable in some browsers.
  }
}
