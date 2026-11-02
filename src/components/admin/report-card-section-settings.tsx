"use client";

import { useEffect, useState } from "react";
import { getBackendUrl } from "@/lib/backend-url";
import { AlertCircle, ChevronRight, Save } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import { playCloseTone, playOpenTone } from "@/lib/sounds";

type Config = {
  affectiveEnabled: boolean;
  psychomotorEnabled: boolean;
  attendanceEnabled: boolean;
  teacherCommentsEnabled: boolean;
  principalCommentsEnabled: boolean;
  affectiveIndicators: string[];
  psychomotorIndicators: string[];
};

type ConfigFlag = Exclude<keyof Config, "affectiveIndicators" | "psychomotorIndicators">;
type Feedback = { type: "success" | "error"; title: string; message: string };

const options: Array<{ key: ConfigFlag; label: string; description: string }> = [
  { key: "affectiveEnabled", label: "Affective development", description: "Term-based learning behaviours and attitudes." },
  { key: "psychomotorEnabled", label: "Psychomotor skills", description: "Practical, coordination, and physical skills." },
  { key: "attendanceEnabled", label: "Attendance summary", description: "Derived only from recorded attendance; incomplete coverage is labelled." },
  { key: "teacherCommentsEnabled", label: "Class teacher comments", description: "One term-level comment for each pupil." },
  { key: "principalCommentsEnabled", label: "Principal comments", description: "One term-level comment for each pupil." },
];

export function ReportCardSectionSettings({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${getBackendUrl()}/api/report-card-sections/settings`, { credentials: "include" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || "Failed to load report-card settings");
        if (!body?.config) throw new Error("Report-card settings response is incomplete.");
        if (active) setConfig(body.config);
      })
      .catch((error: unknown) => {
        if (active) {
          const errorMessage = error instanceof Error ? error.message : "Failed to load report-card settings";
          setMessage(errorMessage);
          setFeedback({ type: "error", title: "Unable to load report-card settings", message: errorMessage });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateIndicators = (key: "affectiveIndicators" | "psychomotorIndicators", value: string) => {
    setConfig((current) => current
      ? { ...current, [key]: value.split("\n").map((item) => item.trim()).filter(Boolean) }
      : current);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${getBackendUrl()}/api/report-card-sections/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Failed to save report-card settings");
      if (!body?.config) throw new Error("Report-card settings response is incomplete.");
      setConfig(body.config);
      setMessage("School defaults saved. Each term keeps its own configuration snapshot.");
      setFeedback({
        type: "success",
        title: "Report-card settings saved",
        message: "School defaults are saved. Each term keeps its own configuration snapshot.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save report-card settings";
      setMessage(errorMessage);
      setFeedback({ type: "error", title: "Unable to save report-card settings", message: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <section className="border border-border bg-surface p-6 text-sm text-muted">Loading optional report-card sections…</section>;
  if (!config) {
    return (
      <>
        <section role="alert" className="flex items-start gap-3 border border-error/20 bg-error/10 p-4 text-sm text-error">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {message || "Unable to load optional report-card section settings."}
        </section>
        <ErrorModal
          isOpen={feedback?.type === "error"}
          onClose={() => setFeedback(null)}
          title={feedback?.title}
          message={feedback?.message ?? ""}
          type="error"
          confirmLabel="Okay"
        />
      </>
    );
  }

  return (
    <>
      <section className="overflow-hidden border border-border bg-surface">
        <div className="border-b border-border bg-surface px-6 py-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setIsOpen((current) => !current);
              if (isOpen) playCloseTone();
              else playOpenTone();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsOpen((current) => !current);
                if (isOpen) playCloseTone();
                else playOpenTone();
              }
            }}
            aria-expanded={isOpen}
            aria-controls="report-card-section-settings-panel"
            className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3">
              <Save className="h-5 w-5 text-brand" />
              <div>
                <h2 className="font-semibold text-foreground">Optional report-card sections</h2>
                <p className="text-xs text-muted">School defaults for new term setups</p>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${isOpen ? "rotate-90 text-foreground" : "rotate-0"}`} />
          </div>
        </div>
        {isOpen ? (
          <div id="report-card-section-settings-panel" className="space-y-5 p-6">
            <p className="text-sm text-muted">These settings never affect academic scores, grades, or rankings.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {options.map((option) => (
              <label key={option.key} className="flex items-start gap-3 rounded border border-border p-3">
                <input
                  type="checkbox"
                  checked={config[option.key]}
                  onChange={(event) => setConfig((current) => current
                    ? { ...current, [option.key]: event.target.checked }
                    : current)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">{option.label}</span>
                  <span className="block text-xs text-muted">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-foreground">
              Affective indicators <span className="font-normal text-muted">(one per line)</span>
              <textarea
                value={config.affectiveIndicators.join("\n")}
                onChange={(event) => updateIndicators("affectiveIndicators", event.target.value)}
                rows={5}
                maxLength={500}
                className="mt-2 w-full rounded border border-border bg-background p-3 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              Psychomotor indicators <span className="font-normal text-muted">(one per line)</span>
              <textarea
                value={config.psychomotorIndicators.join("\n")}
                onChange={(event) => updateIndicators("psychomotorIndicators", event.target.value)}
                rows={5}
                maxLength={500}
                className="mt-2 w-full rounded border border-border bg-background p-3 text-sm"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save defaults"}
            </button>
            {message ? <p role="status" className="text-sm text-muted">{message}</p> : null}
          </div>
          </div>
        ) : null}
      </section>
      <ErrorModal
        isOpen={feedback !== null}
        onClose={() => setFeedback(null)}
        title={feedback?.title}
        message={feedback?.message ?? ""}
        type={feedback?.type ?? "error"}
        confirmLabel="Okay"
      />
    </>
  );
}
