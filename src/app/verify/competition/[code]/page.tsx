"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";

type CertificateCheck = { valid: boolean; status: string; recipient: string; school: string; achievement: string; tournament: string | null; issuedAt: string };

export default function VerifyCompetitionCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const [certificate, setCertificate] = useState<CertificateCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void params.then(async ({ code }) => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/competition/certificates/verify/${encodeURIComponent(code)}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Certificate verification is unavailable.");
        if (active) setCertificate(data as CertificateCheck);
      } catch (verificationError) {
        if (active) setError(verificationError instanceof Error ? verificationError.message : "Certificate verification is unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; };
  }, [params]);

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:py-20">
      <section className="mx-auto max-w-xl border border-border bg-surface p-6 sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">SchoolBase Competition</p>
        <h1 className="mt-3 text-2xl font-semibold">Certificate verification</h1>
        {loading ? <p className="mt-6 text-sm text-muted">Checking certificate…</p> : null}
        {error ? <div className="mt-6 flex items-start gap-3 border border-rose-200 bg-rose-50 p-4 text-rose-900"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><p className="text-sm">{error === "CERTIFICATE_NOT_FOUND" ? "No certificate matches this verification code." : "Certificate verification is temporarily unavailable."}</p></div> : null}
        {certificate ? <div className={`mt-6 border p-5 ${certificate.valid ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex items-center gap-2">{certificate.valid ? <BadgeCheck className="h-5 w-5 text-emerald-700" /> : <CircleAlert className="h-5 w-5 text-amber-800" />}<h2 className="font-semibold">{certificate.valid ? "Valid certificate" : "Certificate revoked"}</h2></div><dl className="mt-5 grid gap-4 text-sm"><div><dt className="text-xs font-semibold uppercase text-muted">Recipient</dt><dd className="mt-1 font-medium">{certificate.recipient}</dd></div><div><dt className="text-xs font-semibold uppercase text-muted">School</dt><dd className="mt-1">{certificate.school}</dd></div><div><dt className="text-xs font-semibold uppercase text-muted">Achievement</dt><dd className="mt-1">{certificate.achievement}</dd></div>{certificate.tournament ? <div><dt className="text-xs font-semibold uppercase text-muted">Event</dt><dd className="mt-1">{certificate.tournament}</dd></div> : null}<div><dt className="text-xs font-semibold uppercase text-muted">Issued</dt><dd className="mt-1">{new Date(certificate.issuedAt).toLocaleDateString(undefined, { dateStyle: "long" })}</dd></div></dl></div> : null}
        <Link href="/" className="mt-7 inline-flex h-10 items-center border border-border px-4 text-sm font-semibold text-foreground hover:bg-background">SchoolBase home</Link>
      </section>
    </main>
  );
}
