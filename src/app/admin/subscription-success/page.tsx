import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, CreditCard } from "lucide-react";

interface SubscriptionVerificationResponse {
  success?: boolean;
  subscriptionApplied?: boolean;
  message?: string;
  error?: string;
  reference?: string;
  receiptPaymentId?: string;
  receiptEmailStatus?: "SENT" | "FAILED";
  school?: {
    name?: string;
    plan?: string;
    status?: string;
  };
}

function VerificationError({ message }: { message: string }) {
  return (
    <div className="border border-red-200 bg-red-50 p-8">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-red-700" />
        <div>
          <h2 className="text-xl font-semibold text-red-900">Verification failed</h2>
          <p className="mt-3 text-sm text-red-800">{message}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button href="/admin" className="w-full">
          Go to Dashboard
        </Button>
        <Button href="/admin/subscribe" variant="secondary" className="w-full">
          Try Again
        </Button>
      </div>
    </div>
  );
}

async function ActivateSchoolServer({ reference, transactionId }: { reference: string; transactionId?: string }) {
  let verificationData: SubscriptionVerificationResponse | null = null;
  let verificationError: string | null = null;

  try {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3006";
    const response = await fetch(
      `${backendUrl}/api/${transactionId ? "flutterwave/subscription/verify" : "paystack/verify-subscription"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionId ? { reference, transactionId } : { reference }),
        cache: "no-store",
      },
    );

    const responseData: unknown = await response.json();
    if (!responseData || typeof responseData !== "object") {
      verificationError = "Could not read the payment verification response.";
    } else {
      verificationData = responseData as SubscriptionVerificationResponse;
      if (!response.ok || !verificationData.success) {
        verificationError = verificationData.error || "Could not verify payment.";
      }
    }
  } catch (err) {
    verificationError = err instanceof Error ? err.message : "An error occurred while verifying your payment.";
  }

  if (verificationError) return <VerificationError message={verificationError} />;
  if (!verificationData?.success) return <VerificationError message="Could not verify payment." />;

  return (
    <div className="border border-border bg-surface p-6 sm:p-8">
      <div className={`border p-6 ${verificationData.subscriptionApplied === false ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center ${verificationData.subscriptionApplied === false ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
            {verificationData.subscriptionApplied === false ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${verificationData.subscriptionApplied === false ? "text-amber-900" : "text-emerald-900"}`}>
              {verificationData.subscriptionApplied === false ? "Payment received — review required" : "Subscription activated"}
            </h2>
            <p className={`mt-2 text-sm ${verificationData.subscriptionApplied === false ? "text-amber-800" : "text-emerald-800"}`}>
              {verificationData.subscriptionApplied === false
                ? verificationData.message || "Your payment is confirmed, but the school subscription needs support review before access can be updated."
                : "Your payment has been confirmed and your school can now access SchoolBase."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="border border-border bg-background p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">School</p>
          <p className="mt-2 font-medium text-foreground">{verificationData.school?.name || "—"}</p>
        </div>
        <div className="border border-border bg-background p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Plan</p>
          <p className="mt-2 font-medium text-foreground">{verificationData.school?.plan || "—"}</p>
        </div>
        <div className="border border-border bg-background p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Status</p>
          <p className="mt-2 font-medium text-foreground">{verificationData.school?.status || "—"}</p>
        </div>
        <div className="border border-border bg-background p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Reference</p>
          <p className="mt-2 font-medium text-foreground break-all">{verificationData.reference || reference}</p>
        </div>
      </div>

      {verificationData.receiptEmailStatus === "FAILED" ? (
        <p role="status" className="mt-5 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your payment is confirmed, but we could not email the receipt. Download it below or contact SchoolBase support.
        </p>
      ) : verificationData.receiptEmailStatus === "SENT" ? (
        <p className="mt-5 text-sm text-emerald-800">The official payment receipt has been emailed to your school.</p>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button href="/admin" className="w-full">
          Go to Dashboard
        </Button>
        <Button href="/admin/subscription" variant="secondary" className="w-full">
          Manage Subscription
        </Button>
      </div>
      {verificationData.receiptPaymentId ? (
        <a
          href={`/api/admin/subscription/receipts/${encodeURIComponent(verificationData.receiptPaymentId)}`}
          className="mt-5 inline-flex w-full items-center justify-center border border-brand px-4 py-3 text-sm font-semibold text-brand transition hover:bg-brand-light"
        >
          Download official payment receipt (PDF)
        </a>
      ) : null}
    </div>
  );
}

export default function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: {
    reference?: string;
    tx_ref?: string;
    flw_ref?: string;
    transaction_id?: string;
    status?: string;
  };
}) {
  const transactionId = searchParams.transaction_id;
  const reference = transactionId
    ? searchParams.tx_ref || ""
    : searchParams.reference || searchParams.tx_ref || searchParams.flw_ref || "";

  return (
    <main className="min-h-screen pb-12">
    <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
        <div className="relative flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-brand" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Billing and plans</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Payment confirmation</h1>
          </div>
        </div>
      </header>
      <div className="border border-border bg-surface p-6 sm:p-8">
        {reference ? (
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-border border-t-brand"></div>
                  <p className="mt-4 text-sm text-muted">Verifying your payment...</p>
                </div>
              </div>
            }
          >
            <ActivateSchoolServer reference={reference} transactionId={transactionId} />
          </Suspense>
        ) : (
            <div className="border border-yellow-200 bg-yellow-50 p-8">
            <h2 className="text-xl font-semibold text-yellow-900">Missing payment reference</h2>
            <p className="mt-3 text-sm text-yellow-800">
              We could not detect a valid payment reference in the URL. Please return to the subscription page and try again, or contact support if this persists.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button href="/admin/subscribe" className="w-full">
                Return to Subscription
              </Button>
              <Button href="/admin" variant="secondary" className="w-full">
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </main>
  );
}
