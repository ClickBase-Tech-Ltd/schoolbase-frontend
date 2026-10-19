"use client";

import { getBackendUrl } from "@/lib/backend-url";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FeesPageClient from "@/app/admin/fees/fees-client";
import AdminSkeleton from "@/components/ui/skeleton";
import SubscriptionModal from "@/components/subscription-modal";
import StudentInvoiceRecovery from "./student-invoice-recovery";

export default function AccountingFeesPage() {
  const router = useRouter();
  const [data, setData] = useState<{ invoices: any[]; outstanding: number; terms: any[]; currency: string } | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState<{ reason: string; schoolName?: string } | null>(null);
  const [schoolName, setSchoolName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [whatsAppConnected, setWhatsAppConnected] = useState<boolean | null>(null);
  const [whatsAppStatusMessage, setWhatsAppStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const backendUrl = getBackendUrl();
        const [response, verifyResponse] = await Promise.all([
          fetch(`${backendUrl}/api/admin/fees/data`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
          fetch(`${backendUrl}/api/admin/verify`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
        ]);

        let schoolNameToUse = '';
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json().catch(() => null);
          if (verifyData?.authenticated && verifyData.session?.schoolId) {
            try {
              const schoolRes = await fetch(`${backendUrl}/api/admin/school/${verifyData.session.schoolId}`, {
                credentials: "include",
                headers: { "Content-Type": "application/json" },
              });
              if (schoolRes.ok) {
                const schoolData = await schoolRes.json().catch(() => null);
                schoolNameToUse = schoolData?.name || '';
              }
            } catch (err) {
              console.error("Error fetching school name:", err);
            }
          }
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);

          if (response.status === 403 && errorBody?.code === 'SUBSCRIPTION_INACTIVE') {
            setSubscriptionBlocked({
              reason: errorBody.reason || 'Your school subscription is not active',
              schoolName: schoolNameToUse || undefined,
            });
            setSchoolName(schoolNameToUse);
          }
          return;
        }

        const feesData = await response.json();

        let countryConfig: any = null;
        try {
          const countryRes = await fetch("/api/country/config");
          if (countryRes.ok) {
            countryConfig = await countryRes.json();
          }
        } catch (err) {
          console.error("[Fees] Country config fetch error:", err);
        }

        const feesCurrency = countryConfig?.data?.currency || feesData.currency || "NGN";

        setSchoolName(schoolNameToUse);
        setData({
          invoices: feesData.invoices || [],
          outstanding: feesData.outstanding || 0,
          terms: feesData.terms || [],
          currency: feesCurrency,
        });

        try {
          const whatsappRes = await fetch(`/api/admin/whatsapp/status`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });
          if (whatsappRes.ok) {
            const whatsappData = await whatsappRes.json();
            setWhatsAppConnected(whatsappData?.session?.status === 'connected');
            setWhatsAppStatusMessage(whatsappData?.session?.statusMessage || whatsappData?.session?.status || null);
          } else {
            setWhatsAppConnected(false);
            setWhatsAppStatusMessage('Unable to retrieve WhatsApp status.');
          }
        } catch (err) {
          console.error("Error loading WhatsApp status:", err);
          setWhatsAppConnected(false);
          setWhatsAppStatusMessage('Unable to retrieve WhatsApp status.');
        }
      } catch (err) {
        console.error("Error loading fees:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleIssueBills = async (termId: string, bulkApproval = false) => {
    try {
      const response = await fetch('/api/admin/fees/invoices/issue-bills', {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-school-id": localStorage.getItem('schoolId') || '' },
        body: JSON.stringify({ termId, bulkApproval, currency: data?.currency || 'NGN' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to issue bills");
      }

      const result = await response.json();
      router.push(`/accounting/fees?success=1&created=${result.created}&whatsappSent=${result.whatsappSent ?? 0}&whatsappFailed=${result.whatsappFailed ?? 0}&queued=${result.queued ?? 0}`);
    } catch (err) {
      console.error("Error issuing bills:", err);
      router.push(`/accounting/fees?error=1&errorMessage=${encodeURIComponent(err instanceof Error ? err.message : 'Failed to issue bills')}`);
    }
  };

  const handleSendReminders = async (invoiceId?: string) => {
    try {
      const response = await fetch('/api/admin/fees/invoices/send-reminders', {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-school-id": localStorage.getItem('schoolId') || '' },
        body: JSON.stringify(invoiceId ? { invoiceId, currency: data?.currency || 'NGN' } : { currency: data?.currency || 'NGN' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send reminders");
      }

      const result = await response.json();
      const reminderDetails: string[] = [];
      if (Array.isArray(result.errors) && result.errors.length) {
        reminderDetails.push(...result.errors);
      }
      if (Array.isArray(result.invoiceResults)) {
        result.invoiceResults.forEach((invoice: any) => {
          if (Array.isArray(invoice.errors) && invoice.errors.length) {
            reminderDetails.push(`${invoice.invoiceNo}: ${invoice.errors.join(', ')}`);
          }
          if (invoice.noRecipientGuardians > 0) {
            reminderDetails.push(`${invoice.invoiceNo}: ${invoice.noRecipientGuardians} guardian(s) had no recipients`);
          }
        });
      }

      const detailsQuery = reminderDetails.length ? `&details=${encodeURIComponent(reminderDetails.join(' | '))}` : '';
      router.push(`/accounting/fees?reminders=1&sent=${result.sent}&whatsappSent=${result.whatsappSent ?? 0}&whatsappFailed=${result.whatsappFailed ?? 0}&queued=${result.queued ?? 0}${detailsQuery}`);
    } catch (err) {
      console.error("Error sending reminders:", err);
      router.push(`/accounting/fees?error=1&errorMessage=${encodeURIComponent(err instanceof Error ? err.message : 'Failed to send reminders')}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSkeleton />
      </div>
    );
  }

  if (subscriptionBlocked) {
    return <SubscriptionModal reason={subscriptionBlocked.reason} schoolName={subscriptionBlocked.schoolName || schoolName || 'Your School'} />;
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-muted">No data available</div>
      </div>
    );
  }

  return (
    <FeesPageClient
      invoices={data.invoices}
      outstanding={data.outstanding}
      currency={data.currency}
      terms={data.terms}
      basePath="/accounting/fees"
      onIssueBills={handleIssueBills}
      onSendReminders={handleSendReminders}
      whatsAppConnected={whatsAppConnected}
      whatsAppStatusMessage={whatsAppStatusMessage}
      studentInvoiceRecovery={<StudentInvoiceRecovery currency={data.currency} />}
    />
  );
}
