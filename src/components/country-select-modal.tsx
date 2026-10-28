"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Globe2, X } from "lucide-react";
import countriesJson from "../../config/countries.json";

const COUNTRY_EMOJIS: Record<string, string> = {
  NG: "🇳🇬",
  GH: "🇬🇭",
  SL: "🇸🇱",
  LR: "🇱🇷",
  GM: "🇬🇲",
};

const COUNTRY_ORDER = ["NG", "GH", "SL", "LR", "GM"];

const COUNTRIES = Object.entries(countriesJson.countries)
  .sort(([a], [b]) => COUNTRY_ORDER.indexOf(a) - COUNTRY_ORDER.indexOf(b))
  .map(([code, config]) => ({
    code,
    name: config.name,
    currency: config.currency,
    emoji: COUNTRY_EMOJIS[code] || "🌍",
  }));

export function CountrySelectModal() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/country/config")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.cookiePresent) {
          setOpen(false);
          return;
        }

        const detectedCountry = typeof data?.country === "string" &&
          COUNTRIES.some((country) => country.code === data.country)
          ? data.country
          : COUNTRIES[0].code;
        setSelected(detectedCountry);
        setOpen(true);
      })
      .catch(() => {
        setSelected(COUNTRIES[0].code);
        setOpen(true);
      });
  }, []);

  const confirm = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/country/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: selected }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${res.status}`;
        throw new Error(`Failed to set country: ${errorMessage}`);
      }
      
      setOpen(false);
      window.location.reload();
    } catch (err) {
      console.error("Country selection error:", {
        error: err instanceof Error ? err.message : String(err),
        selected,
        timestamp: new Date().toISOString(),
      });
      setLoading(false);
    }
  }, [selected]);

  if (!open) return null;

  const selectedCountry = COUNTRIES.find((country) => country.code === selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071a31]/70 px-4 py-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="country-modal-title" className="w-full max-w-lg border border-border bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              <Globe2 className="h-4 w-4" /> SchoolBase setup
            </div>
            <h3 id="country-modal-title" className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Select your country.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">
              Confirm your billing country to see the right local currency and pricing. You can change the selection before confirming.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close country selection"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-background text-muted transition hover:border-brand hover:text-brand"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {COUNTRIES.map((country) => {
            const active = selected === country.code;
            return (
              <button
                key={country.code}
                type="button"
                onClick={() => setSelected(country.code)}
                aria-pressed={active}
                className={`flex min-h-16 items-center gap-3 border px-3 py-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/40 ${
                  active
                    ? "border-brand bg-brand-light shadow-sm"
                    : "border-border bg-background hover:border-brand/40 hover:bg-brand-light/40"
                }`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${active ? "bg-white" : "bg-white"}`}>
                  {country.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{country.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{country.code} · {country.currency}</p>
                </div>
                {active ? <Check className="h-5 w-5 shrink-0 text-brand" /> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted">
            {selectedCountry
              ? `Pricing will be shown in ${selectedCountry.currency}.`
              : "Choose a country to see its local pricing."} You can change this later if needed.
          </p>
          <button
            type="button"
            onClick={confirm}
            disabled={loading}
            className="inline-flex min-h-11 w-full justify-center bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {loading ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CountrySelectModal;
