"use client";

import { getBackendUrl } from "@/lib/backend-url";




import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, CameraOff, Check, CheckCircle2, ChevronDown, Loader2, Upload, UserRound, X } from "lucide-react";
import { pupilName } from "@/lib/format";
import { resolveFileUrl } from "@/lib/api-client";

export default function StudentEditClient({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const uploadPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

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

  const [classes, setClasses] = useState<any[]>([]);
  const [medicalOpen, setMedicalOpen] = useState(false);
  const [previousOpen, setPreviousOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load student data
        const studentResponse = await fetch(`/api/admin/students/${studentId}`);
        if (!studentResponse.ok) {
          throw new Error("Failed to load student");
        }
        const studentData = await studentResponse.json();
        setStudent(studentData);

        // Populate form fields
        setFirstName(studentData.firstName || "");
        setMiddleName(studentData.middleName || "");
        setLastName(studentData.lastName || "");
        setStudentEmail(studentData.studentEmail || "");
        setStudentPhone(studentData.studentPhone || "");
        setGender(studentData.gender || "Male");
        setDateOfBirth(studentData.dateOfBirth ? studentData.dateOfBirth.split("T")[0] : "");
        setAdmissionDate(studentData.admissionDate ? studentData.admissionDate.split("T")[0] : "");
        setClassId(studentData.classId || "");
        setStatus(studentData.status || "ACTIVE");
        setAddress(studentData.address || "");
        setBloodGroup(studentData.bloodGroup || "");
        setGenotype(studentData.genotype || "");
        setMedicalNotes(studentData.medicalNotes || "");
        setPreviousSchool(studentData.previousSchool || "");
        setPreviousClass(studentData.previousClass || "");

        // Load guardian data if exists
        if (studentData.guardians && studentData.guardians.length > 0) {
          const g = studentData.guardians[0];
          setGuardianFirst(g.guardian?.firstName || "");
          setGuardianLast(g.guardian?.lastName || "");
          setGuardianRelationship(g.relation || "Parent");
          setGuardianEmail(g.guardian?.email || "");
          setGuardianPhone(g.guardian?.phone || g.guardian?.whatsapp || "");
          setGuardianAltPhone(g.guardian?.altPhone || "");
          setGuardianOccupation(g.guardian?.occupation || "");
        }

        // Set photo preview if exists
        if (studentData.photoUrl) {
          const resolvedUrl = resolveFileUrl(studentData.photoUrl, studentData.id);
          if (resolvedUrl) {
            setPhotoPreview(resolvedUrl);
          }
        }

        // Load classes
        const backendUrl = getBackendUrl();
        const classesResponse = await fetch(`${backendUrl}/api/admin/students/data`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (classesResponse.ok) {
          const classesData = await classesResponse.json();
          setClasses(classesData.classes || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load student");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [studentId]);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    if (!photoPreview.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

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

    try {
      const formData = new FormData();
      formData.append("lastName", lastName);
      formData.append("firstName", firstName);
      formData.append("middleName", middleName);
      formData.append("classId", classId);
      formData.append("status", status);
      formData.append("admissionDate", admissionDate || new Date().toISOString().split("T")[0]);
      formData.append("gender", gender);
      formData.append("dateOfBirth", dateOfBirth);
      formData.append("studentEmail", studentEmail);
      formData.append("studentPhone", studentPhone);
      formData.append("address", address);
      formData.append("bloodGroup", bloodGroup);
      formData.append("genotype", genotype);
      formData.append("medicalNotes", medicalNotes);
      formData.append("previousSchool", previousSchool);
      formData.append("previousClass", previousClass);
      formData.append("guardianFirst", guardianFirst);
      formData.append("guardianLast", guardianLast);
      formData.append("guardianRelationship", guardianRelationship);
      formData.append("guardianEmail", guardianEmail);
      formData.append("guardianPhone", guardianPhone);
      formData.append("guardianAltPhone", guardianAltPhone);
      formData.append("guardianOccupation", guardianOccupation);

      if (photoFile) {
        formData.append("photo", photoFile);
      }

      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update student");
      }

      router.push(`/admin/students/${studentId}?updated=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background p-6 text-muted">Loading student information...</div>;
  }

  if (error && !student) {
    return <div className="min-h-screen bg-background p-6 text-red-600">{error}</div>;
  }

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-10 sm:px-8 sm:pb-8 sm:pt-12">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><UserRound className="h-4 w-4" /> Student records</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Edit student</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Update {student?.firstName} {student?.lastName}'s academic, guardian, and profile information.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/students/${studentId}`}
                aria-label="Back to student profile"
                title="Back to student profile"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-brand bg-white text-brand transition-colors hover:bg-brand-light sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-2.5"
              >
                <ArrowLeft className="h-5 w-5 sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">Back to profile</span>
              </Link>
              <Button
                type="submit"
                form="edit-student-form"
                disabled={isSubmitting}
                aria-label={isSubmitting ? "Saving student changes" : "Save student changes"}
                title={isSubmitting ? "Saving student changes" : "Save student changes"}
                className="h-11 w-11 shrink-0 rounded-md px-0 sm:h-auto sm:w-auto sm:px-5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="sm:hidden" style={{ width: 22, height: 22, minWidth: 22, minHeight: 22 }} aria-hidden="true" />
                    <span className="hidden sm:inline">Save changes</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

      <form id="edit-student-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Error Alert */}
        {error && (
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

            <p className="mt-5 text-sm font-semibold text-foreground">Change student photo</p>
            <input
              ref={uploadPhotoInputRef}
              name="photo"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handlePhotoChange}
              className="sr-only"
              aria-label="Upload student photo"
            />
            <div className="mt-2 grid grid-cols-2 gap-3">
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

            <div className="mt-6 space-y-2 text-sm text-muted border-t border-border pt-6">
              <div>
                <p className="text-xs text-muted uppercase">Admission Number</p>
                <p className="font-semibold text-foreground">{student?.admissionNo}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: main form fields */}
        <div className="lg:col-span-2 space-y-2">
          {/* Admission Details */}
          <div className="border border-border bg-surface p-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                <span className="mt-1 block text-xs font-normal leading-5 text-muted">Inactive removes the student from the active roster but keeps their record and history. Restore them from Students → Inactive.</span>
              </label>

              <label className="text-sm font-semibold text-foreground">
                Admission date
                <input name="admissionDate" type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>
            </div>
          </div>

          {/* Student Information */}
          <div className="border border-border bg-surface p-4 mb-3">
            <h3 className="text-lg font-semibold text-foreground mb-4">Student information</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-semibold text-foreground">
                Surname *
                <input name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                First name *
                <input name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Middle name
                <input name="middleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
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
                <input name="dateOfBirth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Email
                <input name="studentEmail" type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="student@example.com" className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Phone number
                <input name="studentPhone" type="tel" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} placeholder="+234..." className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground lg:col-span-3">
                Address
                <textarea name="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>
            </div>
          </div>

          {/* Parent / Guardian Information */}
          <div className="border border-border bg-surface p-4 mb-3">
            <h3 className="text-lg font-semibold text-foreground mb-4">Parent / Guardian information</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-semibold text-foreground">
                First name
                <input name="guardianFirst" value={guardianFirst} onChange={(e) => setGuardianFirst(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
              </label>

              <label className="text-sm font-semibold text-foreground">
                Last name
                <input name="guardianLast" value={guardianLast} onChange={(e) => setGuardianLast(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
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
                <input name="guardianPhone" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} required placeholder="+234..." className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
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

          {/* Medical Information (collapsible) */}
          <div className="border border-border bg-surface p-0 mb-3">
            <button type="button" onClick={() => setMedicalOpen((v) => !v)} className="w-full flex items-center justify-between p-4 text-left hover:bg-surface/90 transition">
              <div className="flex items-center gap-3">
                <ChevronDown className={`h-5 w-5 text-muted transition-transform ${medicalOpen ? "rotate-180" : ""}`} />
                <div>
                  <h4 className="text-lg font-semibold text-foreground">Medical information</h4>
                  <p className="mt-1 text-sm text-muted">Optional medical details (expand to edit).</p>
                </div>
              </div>
            </button>

            {medicalOpen && (
              <div className="border-t border-border p-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <label className="text-sm font-semibold text-foreground">
                    Blood group
                    <input name="bloodGroup" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
                  </label>

                  <label className="text-sm font-semibold text-foreground">
                    Genotype
                    <input name="genotype" value={genotype} onChange={(e) => setGenotype(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
                  </label>

                  <label className="text-sm font-semibold text-foreground lg:col-span-3">
                    Medical notes
                    <textarea name="medicalNotes" value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} rows={3} className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Previous School (collapsible) */}
          <div className="border border-border bg-surface p-0 mb-3">
            <button type="button" onClick={() => setPreviousOpen((v) => !v)} className="w-full flex items-center justify-between p-4 text-left hover:bg-surface/90 transition">
              <div className="flex items-center gap-3">
                <ChevronDown className={`h-5 w-5 text-muted transition-transform ${previousOpen ? "rotate-180" : ""}`} />
                <div>
                  <h4 className="text-lg font-semibold text-foreground">Previous school</h4>
                  <p className="mt-1 text-sm text-muted">Optional previous school information.</p>
                </div>
              </div>
            </button>

            {previousOpen && (
              <div className="border-t border-border p-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <label className="text-sm font-semibold text-foreground">
                    Previous school
                    <input name="previousSchool" value={previousSchool} onChange={(e) => setPreviousSchool(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
                  </label>

                  <label className="text-sm font-semibold text-foreground">
                    Previous class
                    <input name="previousClass" value={previousClass} onChange={(e) => setPreviousClass(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" />
                  </label>
                </div>
              </div>
            )}
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
                <video ref={cameraVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" aria-label="Live camera preview" />
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
    </div>
    </main>
  );
}
