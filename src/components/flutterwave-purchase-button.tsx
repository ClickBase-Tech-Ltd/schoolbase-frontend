"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FlutterwavePurchaseButtonProps {
  amountMinor: number;
  currency: string;
  email: string;
  name: string;
  plan: string;
  schoolName: string;
  slug?: string;
  phone: string;
  disabled?: boolean;
  isSubscription?: boolean;
  isPublicSubscription?: boolean;
}

export function FlutterwavePurchaseButton({
  amountMinor,
  currency,
  email,
  name,
  plan,
  schoolName,
  slug,
  phone,
  disabled = false,
  isSubscription = false,
  isPublicSubscription = false,
}: FlutterwavePurchaseButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setError(null);
    setLoading(true);

    try {
      const endpoint = isPublicSubscription
        ? "/api/flutterwave/public-subscription/init"
        : isSubscription
          ? "/api/flutterwave/subscription/init"
          : "/api/flutterwave/init";
      const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isPublicSubscription
              ? { plan, slug, email, name }
              : isSubscription
              ? { plan }
              : { amountMinor, currency, email, name, phone, plan, schoolName, slug, isSubscription },
          ),
        });

      const data = await response.json();

      if (!response.ok || !data?.authorization_url) {
        throw new Error(data?.error || "Unable to start Flutterwave checkout.");
      }

      window.location.assign(data.authorization_url);
    } catch (err) {
      setError((err as Error).message || "Unable to start Flutterwave checkout.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 text-right">
      <Button
        type="button"
        onClick={handlePay}
        disabled={disabled || loading}
        className="w-full bg-[#F5A623] hover:bg-[#D98D00] text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
      >
        {loading ? "Processing…" : "Pay now"}
      </Button>
      {error ? <p className="text-xs text-red-600 font-medium">{error}</p> : null}
    </div>
  );
}
