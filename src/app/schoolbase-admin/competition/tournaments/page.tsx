"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionFeatureNotice from "@/components/competition/competition-feature-notice";
import CompetitionDialog from "@/components/competition/competition-dialog";

type Category = { id: string; name: string };
type Match = {
  id: string;
  status: string;
  scheduledAt: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeParticipant: { displayNameSnapshot: string } | null;
  awayParticipant: { displayNameSnapshot: string } | null;
};
type Round = {
  id: string;
  name: string;
  roundNumber: number;
  status: string;
  matches: Match[];
};
type Tournament = {
  id: string;
  title: string;
  status: string;
  scope: string;
  countryCode: string | null;
  startsAt: string | null;
  category: { name: string };
  _count: { schools: number; participants: number };
  schools: Array<{ id: string; status: string; school: { name: string } }>;
  participants: Array<{
    id: string;
    status: string;
    displayNameSnapshot: string;
    visibilityApproved: boolean;
    guardianConsentStatus: "ACCEPTED" | "DECLINED" | null;
    school: { name: string };
    class: { name: string } | null;
  }>;
  rounds: Round[];
};
type TournamentDialog =
  "create" | "round" | "match" | "result" | "decision" | null;

export default function CompetitionTournamentsPage() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [scope, setScope] = useState<"SCHOOL" | "CLASS" | "COUNTRY">("SCHOOL");
  const [countryCode, setCountryCode] = useState("NG");
  const [nationalEnabled, setNationalEnabled] = useState(false);
  const [registrationOpens, setRegistrationOpens] = useState("");
  const [registrationCloses, setRegistrationCloses] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [roundName, setRoundName] = useState("");
  const [roundNumber, setRoundNumber] = useState(1);
  const [homeParticipantId, setHomeParticipantId] = useState("");
  const [awayParticipantId, setAwayParticipantId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [reason, setReason] = useState("");
  const [dialog, setDialog] = useState<TournamentDialog>(null);
  const [activeRoundId, setActiveRoundId] = useState("");
  const [visibilityApproved, setVisibilityApproved] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<{
    path: string;
    status: string;
    visibilityApproved?: boolean;
    title: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tournamentsActive, setTournamentsActive] = useState<boolean | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function request(path: string, init?: RequestInit) {
    const response = await fetch(`/schoolbase-admin/api/competition${path}`, {
      credentials: "include",
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(data.error || "Tournament request failed.");
    return data;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const tournamentData = await request("/admin/tournaments");
      setItems(tournamentData.tournaments || []);
      setCategories(tournamentData.categories || []);
      setNationalEnabled(tournamentData.capabilities?.nationalEnabled === true);
      setCategoryId(
        (current) => current || tournamentData.categories?.[0]?.id || "",
      );
      setSelectedTournamentId(
        (current) => current || tournamentData.tournaments?.[0]?.id || "",
      );
      setTournamentsActive(true);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load tournaments.";
      if (message === "FEATURE_DISABLED") {
        setTournamentsActive(false);
        setItems([]);
      } else {
        setTournamentsActive(null);
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTournament =
    items.find((item) => item.id === selectedTournamentId) || null;
  const approvedParticipants =
    selectedTournament?.participants.filter(
      (participant) => participant.status === "APPROVED",
    ) || [];

  async function createTournament(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await request("/admin/tournaments", {
        method: "POST",
        body: JSON.stringify({
          title,
          slug,
          categoryId,
          scope,
          countryCode:
            scope === "COUNTRY" ? countryCode.toUpperCase() : undefined,
          registrationOpensAt: registrationOpens
            ? new Date(registrationOpens).toISOString()
            : null,
          registrationClosesAt: registrationCloses
            ? new Date(registrationCloses).toISOString()
            : null,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          scoringPolicy: {
            basePoints: 100,
            difficultyMultipliers: {
              EASY: 1,
              MEDIUM: 1.25,
              HARD: 1.5,
              EXPERT: 2,
            },
          },
        }),
      });
      setTitle("");
      setSlug("");
      setDialog(null);
      await load();
      setSelectedTournamentId(data.tournament.id);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to create tournament.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function transition(status: string) {
    if (!selectedTournament) return;
    setBusy(true);
    setError(null);
    try {
      await request(`/admin/tournaments/${selectedTournament.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (stateError) {
      setError(
        stateError instanceof Error
          ? stateError.message
          : "Unable to update tournament status.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function decideRegistration(
    path: string,
    status: string,
    visibilityApproved?: boolean,
  ) {
    setBusy(true);
    setError(null);
    try {
      await request(path, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          visibilityApproved,
          reason: reason.trim(),
        }),
      });
      setReason("");
      setDialog(null);
      setPendingDecision(null);
      await load();
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "Unable to save registration decision.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createRound(event: FormEvent) {
    event.preventDefault();
    if (!selectedTournament) return;
    setBusy(true);
    setError(null);
    try {
      await request(`/admin/tournaments/${selectedTournament.id}/rounds`, {
        method: "POST",
        body: JSON.stringify({ name: roundName, roundNumber }),
      });
      setRoundName("");
      setDialog(null);
      await load();
    } catch (roundError) {
      setError(
        roundError instanceof Error
          ? roundError.message
          : "Unable to create round.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createMatch(targetRoundId: string, event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await request(`/admin/tournaments/rounds/${targetRoundId}/matches`, {
        method: "POST",
        body: JSON.stringify({ homeParticipantId, awayParticipantId }),
      });
      setHomeParticipantId("");
      setAwayParticipantId("");
      setDialog(null);
      await load();
    } catch (matchError) {
      setError(
        matchError instanceof Error
          ? matchError.message
          : "Unable to schedule match.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function recordResult(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await request(`/admin/tournaments/matches/${selectedMatchId}/result`, {
        method: "PATCH",
        body: JSON.stringify({ homeScore, awayScore, reason: reason.trim() }),
      });
      setReason("");
      setSelectedMatchId("");
      setDialog(null);
      await load();
    } catch (resultError) {
      setError(
        resultError instanceof Error
          ? resultError.message
          : "Unable to record match result.",
      );
    } finally {
      setBusy(false);
    }
  }

  function openDecision(
    path: string,
    status: string,
    title: string,
    needsVisibilityConsent = false,
  ) {
    setReason("");
    setVisibilityApproved(false);
    setPendingDecision({
      path,
      status,
      title,
      visibilityApproved: needsVisibilityConsent ? false : undefined,
    });
    setDialog("decision");
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-2 py-6 sm:px-8 sm:py-8 lg:px-12">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            Competition / Events
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Tournaments
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Manage school events, registrations, rounds, and audited match
            results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || busy}
            aria-label="Refresh tournaments"
            title="Refresh"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-muted hover:border-brand/40 hover:text-brand disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDialog("create")}
            disabled={tournamentsActive === false || !categories.length || busy}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Create tournament
          </button>
        </div>
      </header>
      {tournamentsActive === false ? (
        <CompetitionFeatureNotice
          title="Tournaments aren’t active yet"
          description="Enable school tournaments only after event rules, consent, privacy review, and operator support are approved. Regional and public events are not available."
        />
      ) : null}
      {tournamentsActive !== false ? (
        <>
          <section
            aria-label="Tournament overview"
            className="grid grid-cols-2 border-y border-border bg-surface sm:grid-cols-4"
          >
            <div className="border-b border-r border-border px-4 py-3 sm:border-b-0">
              <p className="text-xs text-muted">Events</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {items.length}
              </p>
            </div>
            <div className="border-b border-border px-4 py-3 sm:border-b-0 sm:border-r">
              <p className="text-xs text-muted">Registration open</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {
                  items.filter((item) => item.status === "REGISTRATION_OPEN")
                    .length
                }
              </p>
            </div>
            <div className="border-r border-border px-4 py-3">
              <p className="text-xs text-muted">Live</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">
                {items.filter((item) => item.status === "LIVE").length}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-muted">Participants</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {items.reduce(
                  (total, item) => total + item._count.participants,
                  0,
                )}
              </p>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
            <div className="divide-y divide-border border border-border bg-surface">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedTournamentId(item.id)}
                  className={`block w-full px-4 py-4 text-left ${selectedTournamentId === item.id ? "bg-brand-light" : "hover:bg-background"}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-muted">
                      {item.status}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {item.category.name} · {item.scope}
                    {item.countryCode ? ` · ${item.countryCode}` : ""} ·{" "}
                    {item._count.schools} schools · {item._count.participants}{" "}
                    participants
                  </span>
                </button>
              ))}
            </div>
            {selectedTournament ? (
              <div className="space-y-5 border border-border bg-surface p-5">
                <header>
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedTournament.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {selectedTournament.status} · {selectedTournament.scope}
                  </p>
                </header>
                <div className="flex flex-wrap gap-2">
                  {(
                    {
                      DRAFT: ["UPCOMING", "CANCELLED"],
                      UPCOMING: ["REGISTRATION_OPEN", "CANCELLED"],
                      REGISTRATION_OPEN: ["REGISTRATION_CLOSED", "CANCELLED"],
                      REGISTRATION_CLOSED: ["LIVE", "CANCELLED"],
                      LIVE: ["COMPLETED", "CANCELLED"],
                    } as Record<string, string[]>
                  )[selectedTournament.status]?.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy}
                      onClick={() => void transition(status)}
                      className="h-9 border border-brand px-3 text-xs font-semibold text-brand hover:bg-brand-light disabled:opacity-50"
                    >
                      {status.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>

                <section>
                  <h3 className="text-sm font-semibold text-foreground">
                    School registrations
                  </h3>
                  <div className="mt-2 divide-y divide-border border-y border-border">
                    {selectedTournament.schools.map((registration) => (
                      <div
                        key={registration.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                      >
                        <span>
                          {registration.school.name} · {registration.status}
                        </span>
                        {registration.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                openDecision(
                                  `/admin/tournaments/${selectedTournament.id}/schools/${registration.id}`,
                                  "APPROVED",
                                  registration.school.name,
                                )
                              }
                              className="border border-brand px-2 py-1 text-xs font-semibold text-brand disabled:opacity-40"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                openDecision(
                                  `/admin/tournaments/${selectedTournament.id}/schools/${registration.id}`,
                                  "WITHDRAWN",
                                  registration.school.name,
                                )
                              }
                              className="border border-border px-2 py-1 text-xs font-semibold disabled:opacity-40"
                            >
                              Decline
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-semibold text-foreground">
                    Learner registrations
                  </h3>
                  <div className="mt-2 divide-y divide-border border-y border-border">
                    {selectedTournament.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {participant.displayNameSnapshot}
                          </p>
                          <p className="text-xs text-muted">
                            {participant.school.name} ·{" "}
                            {participant.class?.name || "Unassigned"} ·{" "}
                            {participant.status} · guardian opt-in{" "}
                            {participant.guardianConsentStatus?.toLowerCase() || "awaiting"} · public name visibility{" "}
                            {participant.visibilityApproved
                              ? "approved"
                              : "not approved"}
                          </p>
                        </div>
                        {participant.status === "PENDING" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busy || participant.guardianConsentStatus !== "ACCEPTED"}
                              title={participant.guardianConsentStatus !== "ACCEPTED" ? "Guardian acceptance is required before participation approval." : undefined}
                              onClick={() =>
                                openDecision(
                                  `/admin/tournaments/${selectedTournament.id}/participants/${participant.id}`,
                                  "APPROVED",
                                  participant.displayNameSnapshot,
                                  true,
                                )
                              }
                              className="border border-brand px-2 py-1 text-xs font-semibold text-brand disabled:opacity-40"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                openDecision(
                                  `/admin/tournaments/${selectedTournament.id}/participants/${participant.id}`,
                                  "WITHDRAWN",
                                  participant.displayNameSnapshot,
                                )
                              }
                              className="border border-border px-2 py-1 text-xs font-semibold disabled:opacity-40"
                            >
                              Decline
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>

                {selectedTournament.status === "REGISTRATION_CLOSED" ||
                selectedTournament.status === "LIVE" ? (
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Rounds</h3>
                      <p className="mt-1 text-xs text-muted">{selectedTournament.rounds.length} rounds configured</p>
                    </div>
                    <button type="button" onClick={() => setDialog("round")} disabled={busy} className="h-9 rounded-md border border-brand px-3 text-xs font-semibold text-brand">Add round</button>
                  </div>
                ) : null}
                {selectedTournament.rounds.map((round) => (
                  <section
                    key={round.id}
                    className="border-t border-border pt-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">
                        Round {round.roundNumber}: {round.name}
                      </h3>
                      <span className="text-xs text-muted">{round.status}</span>
                    </div>
                    {round.status !== "CANCELLED" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRoundId(round.id);
                          setHomeParticipantId("");
                          setAwayParticipantId("");
                          setDialog("match");
                        }}
                        disabled={busy || approvedParticipants.length < 2}
                        className="mt-3 h-9 rounded-md border border-border px-3 text-xs font-semibold text-foreground disabled:opacity-50"
                      >
                        Schedule match
                      </button>
                    ) : null}
                    <div className="mt-2 divide-y divide-border">
                      {round.matches.map((match) => (
                        <div
                          key={match.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                        >
                          <span>
                            {match.homeParticipant?.displayNameSnapshot ||
                              "TBD"}{" "}
                            vs{" "}
                            {match.awayParticipant?.displayNameSnapshot ||
                              "TBD"}{" "}
                            · {match.status}
                            {match.homeScore !== null
                              ? ` · ${match.homeScore}-${match.awayScore}`
                              : ""}
                          </span>
                          {match.status !== "COMPLETED" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMatchId(match.id);
                                setHomeScore(match.homeScore ?? 0);
                                setAwayScore(match.awayScore ?? 0);
                                setReason("");
                                setDialog("result");
                              }}
                              className="h-8 rounded-md border border-border px-2.5 font-semibold"
                            >
                              Record result
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="border border-border bg-surface p-8 text-center text-sm text-muted">
                Select a tournament to review its registrations and event
                operations.
              </div>
            )}
          </section>
        </>
      ) : null}
      <CompetitionDialog
        isOpen={dialog === "create"}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        title="Create tournament"
        description="School and class scopes use school-approved registration. Country scope requires National competitions to be enabled."
        size="large"
      >
        <form
          onSubmit={(event) => void createTournament(event)}
          className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
        >
          <label className="block text-sm font-medium text-foreground">
            Tournament title
            <input
              required
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            URL slug
            <input
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={160}
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Category
            <select
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-foreground">
            Scope
            <select
              value={scope}
              onChange={(event) =>
                setScope(event.target.value as "SCHOOL" | "CLASS" | "COUNTRY")
              }
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="SCHOOL">School</option>
              <option value="CLASS">Class</option>
              {nationalEnabled ? (
                <option value="COUNTRY">Country</option>
              ) : null}
            </select>
          </label>
          {scope === "COUNTRY" ? (
            <label className="block text-sm font-medium text-foreground">
              Country code
              <input
                required
                pattern="[A-Za-z]{2}"
                maxLength={2}
                value={countryCode}
                onChange={(event) =>
                  setCountryCode(event.target.value.toUpperCase())
                }
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </label>
          ) : null}
          <label className="block text-sm font-medium text-foreground">
            Registration opens
            <input
              type="datetime-local"
              value={registrationOpens}
              onChange={(event) => setRegistrationOpens(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Registration closes
            <input
              type="datetime-local"
              value={registrationCloses}
              onChange={(event) => setRegistrationCloses(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Event starts
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Event ends
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:col-span-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDialog(null)}
              disabled={busy}
              className="h-10 rounded-md border border-border px-4 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !categoryId}
              className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Create draft
            </button>
          </div>
        </form>
      </CompetitionDialog>
      <CompetitionDialog
        isOpen={dialog === "round"}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        title="Add tournament round"
        description={selectedTournament?.title}
      >
        <form onSubmit={(event) => void createRound(event)} className="space-y-4 p-5 sm:p-6">
          <label className="block text-sm font-medium text-foreground">
            Round name
            <input required value={roundName} onChange={(event) => setRoundName(event.target.value)} placeholder="Semi-final" className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Round number
            <input required type="number" min={1} value={roundNumber} onChange={(event) => setRoundNumber(Number(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </label>
          <div className="flex justify-end"><button disabled={busy} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white">Create round</button></div>
        </form>
      </CompetitionDialog>
      <CompetitionDialog
        isOpen={dialog === "match"}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        title="Schedule match"
        description={selectedTournament?.title}
      >
        <form onSubmit={(event) => void createMatch(activeRoundId, event)} className="space-y-4 p-5 sm:p-6">
          <label className="block text-sm font-medium text-foreground">
            Home participant
            <select required value={homeParticipantId} onChange={(event) => setHomeParticipantId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
              <option value="">Choose participant</option>
              {approvedParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.displayNameSnapshot}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-foreground">
            Away participant
            <select required value={awayParticipantId} onChange={(event) => setAwayParticipantId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
              <option value="">Choose participant</option>
              {approvedParticipants.filter((participant) => participant.id !== homeParticipantId).map((participant) => <option key={participant.id} value={participant.id}>{participant.displayNameSnapshot}</option>)}
            </select>
          </label>
          <div className="flex justify-end"><button disabled={busy || !activeRoundId || !homeParticipantId || !awayParticipantId} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">Schedule match</button></div>
        </form>
      </CompetitionDialog>
      <CompetitionDialog
        isOpen={dialog === "result"}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        title="Record match result"
        description="Enter the final score and an audit reason. Tied scores are recorded as draws."
      >
        <form onSubmit={(event) => void recordResult(event)} className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-foreground">Home score<input type="number" min={0} value={homeScore} onChange={(event) => setHomeScore(Number(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label>
            <label className="block text-sm font-medium text-foreground">Away score<input type="number" min={0} value={awayScore} onChange={(event) => setAwayScore(Number(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label>
          </div>
          <label className="block text-sm font-medium text-foreground">Audit reason<input required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label>
          <div className="flex justify-end"><button disabled={busy || !reason.trim()} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">Save result</button></div>
        </form>
      </CompetitionDialog>
      <CompetitionDialog
        isOpen={dialog === "decision"}
        onClose={() => {
          if (!busy) {
            setDialog(null);
            setPendingDecision(null);
          }
        }}
        title={pendingDecision?.status === "APPROVED" ? "Approve registration" : "Decline registration"}
        description={`${pendingDecision?.title || "Registration"} · an audit reason is required.`}
      >
        <div className="space-y-4 p-5 sm:p-6">
          {pendingDecision?.visibilityApproved !== undefined ? (
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input type="checkbox" checked={visibilityApproved} onChange={(event) => setVisibilityApproved(event.target.checked)} className="mt-1" />
                            Public name visibility is approved separately from participation
            </label>
          ) : null}
          <label className="block text-sm font-medium text-foreground">Decision reason<textarea required maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></label>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => { setDialog(null); setPendingDecision(null); }} disabled={busy} className="h-10 rounded-md border border-border px-4 text-sm font-semibold">Cancel</button>
            <button type="button" disabled={busy || !reason.trim() || !pendingDecision} onClick={() => pendingDecision && void decideRegistration(pendingDecision.path, pendingDecision.status, pendingDecision.visibilityApproved !== undefined ? visibilityApproved : undefined)} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">Confirm decision</button>
          </div>
        </div>
      </CompetitionDialog>
      <ErrorModal
        isOpen={Boolean(error)}
        onClose={() => setError(null)}
        title="Tournament operation failed"
        message={error || "Unable to complete tournament operation."}
        type="error"
        confirmLabel="Okay"
      />
    </main>
  );
}
