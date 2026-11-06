"use client";

import { useCallback, useEffect, useState } from "react";
import { MailPlus, RefreshCw, ShieldCheck } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";

type Representative = {
  id: string;
  name: string;
  email: string;
  countryCode: string | null;
  isActive: boolean;
  createdAt: string;
};

const countries = [
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "SL", name: "Sierra Leone" },
  { code: "LR", name: "Liberia" },
  { code: "GM", name: "The Gambia" },
];

export default function CountryRepresentativesPage() {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("GH");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRepresentatives = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/schoolbase-admin/api/country-representatives", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load country representatives.");
      setRepresentatives(body.representatives);
      setError(null);
    } catch (reason) {
      console.error("Country representatives load failed:", reason);
      setError(reason instanceof Error ? reason.message : "Could not load country representatives.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRepresentatives(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRepresentatives]);

  async function createRepresentative(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/schoolbase-admin/api/country-representatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, countryCode }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (body.accountCreated) {
          setName("");
          setEmail("");
          await loadRepresentatives();
        }
        throw new Error(body.error || "Could not create country representative.");
      }
      setName("");
      setEmail("");
      setMessage(`Invitation sent to ${body.representative.email}. They can set their password from the email link.`);
      await loadRepresentatives();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create country representative.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRepresentative(id: string, updates: Partial<Pick<Representative, "countryCode" | "isActive">>) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/schoolbase-admin/api/country-representatives/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not update representative.");
      setRepresentatives((current) => current.map((item) => item.id === id ? body.representative : item));
      setMessage("Representative access updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update representative.");
    }
  }

  async function resendInvite(representative: Representative) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/schoolbase-admin/api/country-representatives/${encodeURIComponent(representative.id)}/invite`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not resend invitation.");
      setMessage(`Password setup link sent to ${representative.email}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not resend invitation.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8">
      <header className="border border-border bg-surface p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Access management</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Country administrators</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Invite trusted local administrators to support schools in a specific country. They can view school contact and onboarding details and respond to support requests in their assigned country, but cannot access platform administration, academic records, staff or pupil data, or billing.</p>
      </header>

      {error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <section className="border border-border bg-surface p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><MailPlus className="h-5 w-5 text-brand" /> Invite a country administrator</h2>
        <p className="mt-1 text-sm text-muted">They’ll receive a secure, time-limited password setup link and use the standard School Login page.</p>
        <form onSubmit={createRepresentative} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
          <label className="text-sm font-medium text-foreground">Full name
            <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm font-medium text-foreground">Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm font-medium text-foreground">Country
            <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm">
              {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
            </select>
          </label>
          <button type="submit" disabled={saving} className="h-10 bg-brand px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Sending invitation..." : "Create account & invite"}</button>
        </form>
      </section>

      <section className="border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div><h2 className="font-semibold text-foreground">Country administrators</h2><p className="mt-1 text-sm text-muted">Use the country assignment to control which schools they can see. Deactivation revokes future access.</p></div>
          <button type="button" onClick={() => void loadRepresentatives()} disabled={loading} aria-label="Refresh representatives" className="border border-border p-2 text-muted hover:text-foreground disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
        {loading ? <p className="p-6 text-sm text-muted">Loading representatives...</p> : (
          <div className="divide-y divide-border">
            {representatives.map((representative) => (
              <article key={representative.id} className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_180px_auto_auto] md:items-center">
                <div><p className="font-semibold text-foreground">{representative.name}</p><p className="text-sm text-muted">{representative.email}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${representative.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{representative.isActive ? "Active" : "Deactivated"}</span></div>
                <p className="text-sm text-muted">Added {new Date(representative.createdAt).toLocaleDateString()}</p>
                <label className="text-xs font-medium text-muted">Assigned country
                  <select value={representative.countryCode || "GH"} onChange={(event) => void updateRepresentative(representative.id, { countryCode: event.target.value })} className="mt-1 h-9 w-full border border-border bg-background px-2 text-sm text-foreground">
                    {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => void resendInvite(representative)} disabled={!representative.isActive} className="inline-flex h-9 items-center justify-center gap-2 border border-border px-3 text-sm text-foreground disabled:opacity-40"><MailPlus className="h-4 w-4" /> Resend setup link</button>
                <button type="button" onClick={() => void updateRepresentative(representative.id, { isActive: !representative.isActive })} className={`inline-flex h-9 items-center justify-center gap-2 border px-3 text-sm font-medium ${representative.isActive ? "border-amber-300 text-amber-800" : "border-emerald-300 text-emerald-800"}`}>
                  <ShieldCheck className="h-4 w-4" />{representative.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </article>
            ))}
            {!representatives.length && <p className="p-8 text-center text-sm text-muted">No country representatives yet.</p>}
          </div>
        )}
      </section>

      <ErrorModal
        isOpen={Boolean(message)}
        onClose={() => setMessage(null)}
        type="success"
        title="Country administrator updated"
        message={message || ""}
        confirmLabel="Done"
      />
    </main>
  );
}
