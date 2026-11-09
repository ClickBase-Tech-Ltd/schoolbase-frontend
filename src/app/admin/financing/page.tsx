'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, RefreshCw, ShieldCheck } from 'lucide-react';
import AdminSkeleton from '@/components/ui/skeleton';
import { ErrorModal } from '@/components/ui/error-modal';

type FinancingSettings = {
  platformEnabled: boolean;
  participationEnabled: boolean;
  updatedAt: string | null;
  currency: string;
  products: Array<{
    id: string;
    displayName: string;
    currency: string;
    institution: { displayName: string };
    selected: boolean;
  }>;
};

async function fetchFinancingSettings(): Promise<FinancingSettings> {
  const response = await fetch('/api/admin/financing', {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to load tuition financing settings.');
  return data as FinancingSettings;
}

export default function SchoolFinancingPage() {
  const [settings, setSettings] = useState<FinancingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [participationAcknowledged, setParticipationAcknowledged] = useState(false);

  const loadSettings = useCallback(async () => {
    setError(null);
    try {
      setSettings(await fetchFinancingSettings());
    } catch (cause) {
      console.error('Unable to load tuition financing settings:', cause);
      setError(cause instanceof Error ? cause.message : 'Unable to load tuition financing settings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchFinancingSettings()
      .then((data) => {
        if (active) setSettings(data);
      })
      .catch((cause) => {
        if (!active) return;
        console.error('Unable to load tuition financing settings:', cause);
        setError(cause instanceof Error ? cause.message : 'Unable to load tuition financing settings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function updateParticipation(participationEnabled: boolean) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/financing', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participationEnabled,
          participationAcknowledged: participationEnabled && participationAcknowledged,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to update participation.');
      setSettings((current) => current ? { ...current, ...data } : current);
      setParticipationAcknowledged(false);
      setNotice(participationEnabled
        ? 'Your school’s interest in participating has been recorded.'
        : 'Your school’s participation preference has been turned off.');
    } catch (cause) {
      console.error('Unable to update tuition financing participation:', cause);
      setError(cause instanceof Error ? cause.message : 'Unable to update participation.');
    } finally {
      setSaving(false);
    }
  }

  async function saveProducts() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/financing/products', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: settings.products.filter((product) => product.selected).map((product) => product.id),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to save available products.');
      setNotice('Your school’s available financing options have been updated.');
      await loadSettings();
    } catch (cause) {
      console.error('Unable to save school financing products:', cause);
      setError(cause instanceof Error ? cause.message : 'Unable to save available products.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-background"><AdminSkeleton /></div>;

  return (
    <main className="min-h-screen pb-12">
      <ErrorModal
        isOpen={Boolean(error || notice)}
        onClose={() => {
          setError(null);
          setNotice(null);
        }}
        title={error ? 'Tuition financing update failed' : 'Tuition financing updated'}
        message={error || notice || ''}
        type={error ? 'error' : 'success'}
        confirmLabel={error ? 'Okay' : 'Done'}
      />
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
                <Building2 className="h-4 w-4" /> School administration
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Tuition financing</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Record whether your school is interested in participating in future bank-partner tuition-financing services.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setRefreshing(true); void loadSettings(); }}
              disabled={refreshing || saving}
              className="relative inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        {settings && (
          <>
            <section className="grid gap-4 md:grid-cols-2">
              <article className="border border-border bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Platform control</p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">SchoolBase availability</h2>
                  </div>
                  <span className={`border px-2.5 py-1 text-xs font-semibold ${settings.platformEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-background text-muted'}`}>
                    {settings.platformEnabled ? 'Enabled' : 'Off'}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  This platform-wide switch is managed by SchoolBase. School participation cannot override it.
                </p>
              </article>

              <article className="border border-border bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">School preference</p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">Participation interest</h2>
                  </div>
                  <span className={`border px-2.5 py-1 text-xs font-semibold ${settings.participationEnabled ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-border bg-background text-muted'}`}>
                    {settings.participationEnabled ? 'Opted in' : 'Not opted in'}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {settings.updatedAt
                    ? `Last updated ${new Date(settings.updatedAt).toLocaleString()}.`
                    : 'No participation preference has been recorded.'}
                </p>
              </article>
            </section>

            <section className="border border-border bg-surface">
              <div className="border-b border-border px-5 py-4 sm:px-6">
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">School preference</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {settings.participationEnabled ? 'Manage participation' : 'Register interest'}
                </h2>
              </div>
              <div className="space-y-5 px-5 py-5 sm:px-6">
                <p className="max-w-3xl text-sm leading-6 text-muted">
                  Opting in only records your school’s interest. It does not activate a financing product, approve any lender or loan terms, or share parent data with a bank.
                </p>

                {!settings.participationEnabled && (
                  <label className="flex max-w-3xl items-start gap-3 border border-border bg-background p-4 text-sm leading-6 text-foreground">
                    <input
                      type="checkbox"
                      checked={participationAcknowledged}
                      onChange={(event) => setParticipationAcknowledged(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-brand"
                    />
                    <span>
                      I confirm that our school is recording interest only and will review separate lender, product, legal, and operational terms before offering financing to families.
                    </span>
                  </label>
                )}

                <div className="flex flex-col gap-3 border-l-2 border-brand bg-brand-light/40 px-4 py-3 sm:flex-row sm:items-start">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <p className="text-sm leading-6 text-foreground">
                    Banks remain the lenders and own credit decisions, pricing, loan agreements, disbursement, and repayment. Any future service requires separate partner and operational approval.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={saving || (!settings.participationEnabled && !participationAcknowledged)}
                  onClick={() => void updateParticipation(!settings.participationEnabled)}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${settings.participationEnabled ? 'border border-border bg-surface text-foreground hover:bg-background' : 'bg-brand text-white hover:bg-brand-hover'}`}
                >
                  {saving ? 'Saving…' : settings.participationEnabled ? 'Turn off participation' : 'Record school interest'}
                </button>
              </div>
            </section>

            <section className="border border-border bg-surface">
              <div className="border-b border-border px-5 py-4 sm:px-6">
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Approved catalogue</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">Options available to your families</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Select only options your school is prepared to present. Families see only active bank-approved products in {settings.currency}.
                </p>
              </div>
              {settings.products.length === 0 ? (
                <p className="p-5 text-sm text-muted">
                  No active products are currently available for your school’s currency. Your participation preference does not create or imply an offer.
                </p>
              ) : (
                <>
                  <div className="divide-y divide-border">
                    {settings.products.map((product) => (
                      <label key={product.id} className="flex cursor-pointer items-start gap-3 p-5 text-sm">
                        <input
                          type="checkbox"
                          checked={product.selected}
                          onChange={(event) => setSettings((current) => current ? ({
                            ...current,
                            products: current.products.map((item) => item.id === product.id
                              ? { ...item, selected: event.target.checked }
                              : item),
                          }) : current)}
                          className="mt-1 h-4 w-4 accent-brand"
                        />
                        <span>
                          <span className="block font-semibold text-foreground">{product.displayName}</span>
                          <span className="mt-1 block text-muted">{product.institution.displayName} · {product.currency}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="border-t border-border p-5">
                    <button
                      type="button"
                      onClick={() => void saveProducts()}
                      disabled={saving}
                      className="inline-flex min-h-11 items-center justify-center bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save family options'}
                    </button>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
