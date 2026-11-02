"use client";

import { useEffect, useMemo, useState } from "react";
import { getBackendUrl } from "@/lib/backend-url";
import { ErrorModal } from "@/components/ui/error-modal";

type Config = {
  affectiveEnabled: boolean;
  psychomotorEnabled: boolean;
  attendanceEnabled: boolean;
  teacherCommentsEnabled: boolean;
  principalCommentsEnabled: boolean;
  affectiveIndicators: string[];
  psychomotorIndicators: string[];
};

type PupilEntry = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string | null;
  affective: Record<string, string | null>;
  psychomotor: Record<string, string | null>;
  teacherRemark: string;
  principalRemark: string;
};
type Feedback = {
  type: "success" | "error" | "confirmation";
  title: string;
  message: string;
  action?: "publish" | "reopen";
};

const ratings = [
  ["EXCELLENT", "Excellent"],
  ["VERY_GOOD", "Very good"],
  ["GOOD", "Good"],
  ["SATISFACTORY", "Satisfactory"],
  ["NEEDS_IMPROVEMENT", "Needs improvement"],
] as const;

interface Props {
  termId: string;
  classId: string;
  canEditConfig: boolean;
  canEditPrincipal: boolean;
}

export function TermReportCardSectionsManager({
  termId,
  classId,
  canEditConfig,
  canEditPrincipal,
}: Props) {
  const [config, setConfig] = useState<Config | null>(null);
  const [pupils, setPupils] = useState<PupilEntry[]>([]);
  const [termLabel, setTermLabel] = useState("");
  const [classLabel, setClassLabel] = useState("");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [configDirty, setConfigDirty] = useState(false);
  const [entriesDirty, setEntriesDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const baseUrl = useMemo(() => `${getBackendUrl()}/api/report-card-sections`, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [termResponse, entriesResponse] = await Promise.all([
          fetch(`${baseUrl}/terms/${encodeURIComponent(termId)}`, { credentials: "include" }),
          fetch(`${baseUrl}/terms/${encodeURIComponent(termId)}/classes/${encodeURIComponent(classId)}/entries`, { credentials: "include" }),
        ]);
        const termBody = await termResponse.json();
        const entriesBody = await entriesResponse.json();
        if (!termResponse.ok) throw new Error(termBody.error || "Failed to load term settings");
        if (!entriesResponse.ok) throw new Error(entriesBody.error || "Failed to load class entries");
        if (!active) return;
        setConfig(entriesBody.config);
        setPupils(entriesBody.pupils);
        setTermLabel(`${termBody.term.name} · ${termBody.term.academicYear}`);
        setClassLabel(entriesBody.class.name);
        setPublishedAt(entriesBody.publishedAt);
      } catch (error) {
        if (active) {
          const errorMessage = error instanceof Error ? error.message : "Failed to load report-card sections";
          setMessage(errorMessage);
          setFeedback({ type: "error", title: "Unable to load report-card sections", message: errorMessage });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [baseUrl, classId, termId]);

  const updatePupil = (pupilId: string, update: Partial<PupilEntry>) => {
    setPupils((current) => current.map((pupil) => pupil.id === pupilId ? { ...pupil, ...update } : pupil));
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${baseUrl}/terms/${encodeURIComponent(termId)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to save term settings");
      setConfig(body.config);
      setPublishedAt(body.publishedAt);
      setConfigDirty(false);
      setMessage("Term configuration saved.");
      setFeedback({
        type: "success",
        title: "Term settings saved",
        message: "The report-card section configuration for this term has been saved.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save term settings";
      setMessage(errorMessage);
      setFeedback({ type: "error", title: "Unable to save term settings", message: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const saveEntries = async () => {
    setSaving(true);
    setMessage("");
    try {
      const entries = pupils.map((pupil) => ({
        pupilId: pupil.id,
        affective: Object.fromEntries(Object.entries(pupil.affective).map(([key, value]) => [key, value || null])),
        psychomotor: Object.fromEntries(Object.entries(pupil.psychomotor).map(([key, value]) => [key, value || null])),
        teacherRemark: pupil.teacherRemark,
        ...(canEditPrincipal ? { principalRemark: pupil.principalRemark } : {}),
      }));
      const response = await fetch(`${baseUrl}/terms/${encodeURIComponent(termId)}/classes/${encodeURIComponent(classId)}/entries`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to save pupil entries");
      setEntriesDirty(false);
      setMessage(`Saved entries for ${body.saved} pupils.`);
      setFeedback({
        type: "success",
        title: "Pupil entries saved",
        message: `Report-card entries were saved for ${body.saved} pupils.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save pupil entries";
      setMessage(errorMessage);
      setFeedback({ type: "error", title: "Unable to save pupil entries", message: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const publish = () => {
    setFeedback({
      type: "confirmation",
      title: "Publish term sections?",
      message: "Enabled optional sections will become visible on reports, and further edits will be locked until an administrator reopens them.",
      action: "publish",
    });
  };

  const reopen = () => {
    setFeedback({
      type: "confirmation",
      title: "Reopen term sections?",
      message: "Reopen this term's report-card sections for corrections? They will be hidden from reports until published again.",
      action: "reopen",
    });
  };

  const confirmAction = async () => {
    const action = feedback?.action;
    if (!action) return false;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${baseUrl}/terms/${encodeURIComponent(termId)}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || `Failed to ${action} term sections`);
      const isPublishing = action === "publish";
      setPublishedAt(isPublishing ? body?.publishedAt ?? null : null);
      setMessage(isPublishing
        ? "Term report-card sections published and locked."
        : "Term sections reopened. Changes will be hidden from reports until published again.");
      setFeedback({
        type: "success",
        title: isPublishing ? "Term sections published" : "Term sections reopened",
        message: isPublishing
          ? "Enabled optional sections are now visible on reports, and edits are locked."
          : "The sections are open for corrections and hidden from reports until they are published again.",
      });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${action} term sections`;
      setMessage(errorMessage);
      setFeedback({
        type: "error",
        title: `Unable to ${action} term sections`,
        message: errorMessage,
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6 text-sm text-muted">Loading term report-card sections…</p>;
  if (!config) {
    return (
      <>
        <p role="alert" className="p-6 text-sm text-red-700">{message || "Unable to load term settings."}</p>
        <ErrorModal
          isOpen={feedback !== null}
          onClose={() => setFeedback(null)}
          title={feedback?.title}
          message={feedback?.message ?? ""}
          type={feedback?.type ?? "error"}
          onConfirm={feedback?.type === "confirmation" ? confirmAction : undefined}
          action={feedback?.type === "confirmation" ? { label: "Cancel", onClick: () => setFeedback(null) } : undefined}
          confirmDisabled={saving}
          confirmLabel={
            feedback?.type === "confirmation"
              ? feedback.action === "publish" ? "Publish sections" : "Reopen sections"
              : "Okay"
          }
        />
      </>
    );
  }

  const isLocked = Boolean(publishedAt);
  const setRating = (pupil: PupilEntry, section: "affective" | "psychomotor", indicator: string, value: string) => {
    setEntriesDirty(true);
    updatePupil(pupil.id, { [section]: { ...pupil[section], [indicator]: value || null } });
  };
  const updatePupilEntry = (pupilId: string, update: Partial<PupilEntry>) => {
    setEntriesDirty(true);
    updatePupil(pupilId, update);
  };

  return (
    <div className="space-y-6">
      <header className="rounded border border-border bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">Term-level sections</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{termLabel}</h1>
        <p className="mt-1 text-sm text-muted">Class: {classLabel}. These settings and ratings apply to this term, not to one subject or assessment. They do not change academic marks or rankings.</p>
        {isLocked ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-green-700">Published {new Date(publishedAt!).toLocaleString()}. Editing is locked.</p>
            {canEditConfig ? <button type="button" disabled={saving} onClick={reopen} className="rounded border border-amber-300 px-3 py-1.5 text-sm font-semibold text-amber-800 disabled:opacity-50">Reopen for corrections</button> : null}
          </div>
        ) : null}
      </header>

      {canEditConfig ? (
        <section className="space-y-4 rounded border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold">Term configuration</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["affectiveEnabled", "Affective development"],
              ["psychomotorEnabled", "Psychomotor skills"],
              ["attendanceEnabled", "Attendance summary"],
              ["teacherCommentsEnabled", "Class teacher comments"],
              ["principalCommentsEnabled", "Principal comments"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={config[key]} disabled={isLocked || !canEditConfig} onChange={(event) => {
                  setConfig((current) => current ? { ...current, [key]: event.target.checked } : current);
                  setConfigDirty(true);
                }} />
                {label}
              </label>
            ))}
          </div>
          {entriesDirty ? <p className="text-sm text-amber-800">Save pupil entries before publishing.</p> : null}
          {(["affectiveIndicators", "psychomotorIndicators"] as const).map((key) => (
            <label key={key} className="block text-sm font-medium">
              {key === "affectiveIndicators" ? "Affective indicators" : "Psychomotor indicators"} <span className="font-normal text-muted">(one per line)</span>
              <textarea
                rows={4}
                value={config[key].join("\n")}
                disabled={isLocked}
                onChange={(event) => {
                  setConfig((current) => current ? { ...current, [key]: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) } : current);
                  setConfigDirty(true);
                }}
                className="mt-1 w-full rounded border border-border bg-background p-3"
              />
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving || isLocked || !configDirty} onClick={saveConfig} className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Save term settings"}
            </button>
            <button type="button" disabled={saving || isLocked || configDirty || entriesDirty} onClick={publish} className="rounded border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
              Publish term sections
            </button>
          </div>
          {configDirty ? <p className="text-xs text-amber-800">Save term settings before entering ratings.</p> : null}
        </section>
      ) : null}

      {config.affectiveEnabled || config.psychomotorEnabled || config.attendanceEnabled || config.teacherCommentsEnabled || config.principalCommentsEnabled ? (
        <section className="space-y-4 rounded border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Pupil entries</h2>
              <p className="text-xs text-muted">Blank ratings mean “not assessed”; they are not treated as the lowest rating.</p>
            </div>
            <button type="button" disabled={saving || isLocked || configDirty} onClick={saveEntries} className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Save pupil entries"}
            </button>
          </div>
          {configDirty ? <p className="text-sm text-amber-800">Save the term configuration before editing pupil entries.</p> : null}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="border p-2">Pupil</th>
                  {config.affectiveEnabled ? config.affectiveIndicators.map((indicator) => <th key={`a-${indicator}`} className="min-w-40 border p-2">Affective: {indicator}</th>) : null}
                  {config.psychomotorEnabled ? config.psychomotorIndicators.map((indicator) => <th key={`p-${indicator}`} className="min-w-40 border p-2">Skill: {indicator}</th>) : null}
                  {config.teacherCommentsEnabled ? <th className="min-w-56 border p-2">Class teacher comment</th> : null}
                  {config.principalCommentsEnabled ? <th className="min-w-56 border p-2">Principal comment</th> : null}
                </tr>
              </thead>
              <tbody>
                {pupils.map((pupil) => (
                  <tr key={pupil.id}>
                    <td className="whitespace-nowrap border p-2 font-medium">{pupil.lastName} {pupil.firstName}{pupil.admissionNo ? ` · ${pupil.admissionNo}` : ""}</td>
                    {config.affectiveEnabled ? config.affectiveIndicators.map((indicator) => (
                      <td key={`a-${indicator}`} className="border p-2">
                        <select aria-label={`${pupil.firstName} ${pupil.lastName}: ${indicator}`} disabled={isLocked} value={pupil.affective[indicator] ?? ""} onChange={(event) => setRating(pupil, "affective", indicator, event.target.value)} className="w-full rounded border bg-background p-2">
                          <option value="">Not assessed</option>{ratings.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </td>
                    )) : null}
                    {config.psychomotorEnabled ? config.psychomotorIndicators.map((indicator) => (
                      <td key={`p-${indicator}`} className="border p-2">
                        <select aria-label={`${pupil.firstName} ${pupil.lastName}: ${indicator}`} disabled={isLocked} value={pupil.psychomotor[indicator] ?? ""} onChange={(event) => setRating(pupil, "psychomotor", indicator, event.target.value)} className="w-full rounded border bg-background p-2">
                          <option value="">Not assessed</option>{ratings.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </td>
                    )) : null}
                    {config.teacherCommentsEnabled ? <td className="border p-2"><textarea rows={2} maxLength={2000} disabled={isLocked} value={pupil.teacherRemark} onChange={(event) => updatePupilEntry(pupil.id, { teacherRemark: event.target.value })} className="w-full rounded border bg-background p-2" /></td> : null}
                    {config.principalCommentsEnabled ? <td className="border p-2"><textarea rows={2} maxLength={2000} disabled={isLocked || !canEditPrincipal} value={pupil.principalRemark} onChange={(event) => updatePupilEntry(pupil.id, { principalRemark: event.target.value })} className="w-full rounded border bg-background p-2" /></td> : null}
                  </tr>
                ))}
                {pupils.length === 0 ? <tr><td colSpan={1} className="border p-4 text-center text-muted">No active pupils are in this class.</td></tr> : null}
              </tbody>
            </table>
          </div>
          {config.attendanceEnabled ? <p className="text-xs text-muted">Attendance is derived from the attendance register for the term. A percentage is shown only when the pupil has a record for each recorded class attendance day.</p> : null}
        </section>
      ) : (
        <p className="rounded border border-border bg-surface p-5 text-sm text-muted">No optional sections are enabled for this term.</p>
      )}
      {message ? <p role="status" className="text-sm text-muted">{message}</p> : null}
      <ErrorModal
        isOpen={feedback !== null}
        onClose={() => setFeedback(null)}
        title={feedback?.title}
        message={feedback?.message ?? ""}
        type={feedback?.type ?? "error"}
        onConfirm={feedback?.type === "confirmation" ? confirmAction : undefined}
        action={feedback?.type === "confirmation" ? { label: "Cancel", onClick: () => setFeedback(null) } : undefined}
        confirmDisabled={saving}
        confirmLabel={
          feedback?.type === "confirmation"
            ? feedback.action === "publish" ? "Publish sections" : "Reopen sections"
            : "Okay"
        }
      />
    </div>
  );
}
