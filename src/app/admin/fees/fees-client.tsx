"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { UserGuide, type PageHelpGuide } from "@/components/ui/user-guide";
import { getBackendUrl } from "@/lib/backend-url";
import type { PaymentMethod } from "@prisma/client";
import {
  formatMoney,
  invoiceStatusClass,
  invoiceStatusLabel,
  pupilName,
} from "@/lib/format";
import {
  groupInvoicesByHierarchy,
  getPhaseLabel,
  getPhaseColor,
  getPhaseFilterOptions,
  type Invoice,
  type TermItem,
  type Stats,
  type InvoiceStatus,
} from "@/lib/fees-grouping";
import {
  ArrowUpRight,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  CalendarDays,
  ReceiptText,
  SendHorizonal,
  ScrollText,
  CreditCard,
  Eye,
  Bell,
  Info,
  X,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/icons";
import { playCloseTone, playOpenTone } from "@/lib/sounds";

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-800" },
  SENT: { label: "Sent", color: "bg-brand/10 text-brand" },
  PART_PAID: { label: "Part Paid", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Paid", color: "bg-green-100 text-green-800" },
  OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-800" },
  ALL: { label: "All Statuses", color: "bg-gray-100 text-gray-800" },
};

const STATUS_ORDER = ["ALL", "OVERDUE", "PART_PAID", "SENT", "DRAFT", "PAID"];
const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"] as const;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 500] as const;
const DEFAULT_ITEMS_PER_PAGE = 20;

const HELP_GUIDE: PageHelpGuide = {
  title: "Managing Fees & Invoices",
  overview: "Track and manage student fee invoices organized by academic year, school phase, term, and class. Record payments, send reminders, and filter by status.",
  steps: [
    "Issue invoices for a term to bill all eligible students.",
    "View invoices grouped by Early Years, Primary, Secondary phases.",
    "Each phase shows summary statistics and collapsible term details.",
    "Click 'Record payment' to log cash, bank transfer, or online payments.",
    "Send batch reminders to families with overdue or part-paid invoices.",
  ],
  commonTasks: [
    {
      title: "Issue Invoices for a Term",
      description: "Create invoices for all students in a specific term.",
      tips: [
        "Select the term from the dropdown at the top",
        "Click 'Issue term bills' to generate invoices",
        "Invoices appear automatically grouped by phase and term",
      ],
    },
    {
      title: "Record a Payment",
      description: "Log a payment against an invoice.",
      tips: [
        "Find the invoice row in any class group",
        "Click 'Record payment' to open the payment modal",
        "Enter amount, method (cash, bank, card, etc.), and reference",
        "Invoice status updates and groups recalculate automatically",
      ],
    },
    {
      title: "Send Reminders",
      description: "Send batch reminders for outstanding fees.",
      tips: [
        "Click 'Send reminders' at the top to queue reminders for overdue and part-paid invoices",
        "Reminders are sent via WhatsApp or email per school policy",
      ],
    },
  ],
  faqs: [
    {
      question: "What does 'Part Paid' mean?",
      answer: "A Part Paid invoice means the student has paid some, but not all, of the amount due.",
    },
    {
      question: "Why are invoices grouped by phase?",
      answer: "Phases (Early Years, Primary, Secondary) help you manage fees separately for each school section.",
    },
    {
      question: "How do I manage fee schedules?",
      answer: "Click 'Manage fee schedules' to set up or edit fee amounts for different student groups and terms.",
    },
  ],
};

export default function FeesPageClient({
  invoices = [],
  outstanding = 0,
  currency = "NGN",
  terms = [],
  basePath = "/admin/fees",
  onIssueBills = async () => {},
  onSendReminders = async () => {},
  whatsAppConnected = null,
  whatsAppStatusMessage = null,
}: {
  invoices?: any[];
  outstanding?: number;
  currency?: string;
  terms?: TermItem[];
  basePath?: string;
  onIssueBills?: (termId: string, bulkApproval?: boolean) => Promise<void>;
  onSendReminders?: (invoiceId?: string) => Promise<void>;
  whatsAppConnected?: boolean | null;
  whatsAppStatusMessage?: string | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activePhase, setActivePhase] = useState("ALL");
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [localInvoices, setLocalInvoices] = useState(invoices);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAllocations, setPaymentAllocations] = useState<Record<string, string>>({});
  const [selectedPaymentItems, setSelectedPaymentItems] = useState<Record<string, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [sendingReminderInvoiceId, setSendingReminderInvoiceId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalSubtitle, setModalSubtitle] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalDetails, setModalDetails] = useState<string | undefined>(undefined);

  // Issue bills and send reminders state
  const [issuingBills, setIssuingBills] = useState(false);
  const [bulkApproval, setBulkApproval] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("");
  
  // Search panel state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    setLocalInvoices(invoices);
  }, [invoices]);

  useEffect(() => {
    if (!searchParams) return;

    const success = searchParams.get("success") === "1";
    const created = Number(searchParams.get("created") ?? 0);
    const reminders = searchParams.get("reminders") === "1";
    const remindersSent = Number(searchParams.get("sent") ?? 0);
    const whatsappSent = Number(searchParams.get("whatsappSent") ?? 0);
    const whatsappFailed = Number(searchParams.get("whatsappFailed") ?? 0);
    const queued = Number(searchParams.get("queued") ?? 0);
    const paymentRecorded = searchParams.get("paymentRecorded") === "1";
    const error = searchParams.get("error") === "1";
    const errorMessage = searchParams.get("errorMessage") ?? undefined;

    if (!success && !reminders && !paymentRecorded && !error) {
      return;
    }

    if (success) {
      setModalType('success');
      setModalTitle('Invoices issued');
      setModalSubtitle(
        whatsappFailed > 0
          ? 'Invoices were created, but some WhatsApp notifications failed to send.'
          : 'Your request was completed successfully.'
      );
      const outcome = [`${created ?? 0} invoice${(created ?? 0) !== 1 ? 's' : ''} were created`];
      if (whatsappSent > 0) outcome.push(`${whatsappSent} WhatsApp sent`);
      if (whatsappFailed > 0) outcome.push(`${whatsappFailed} WhatsApp failed`);
      if (queued > 0) outcome.push(`${queued} still queued`);
      setModalMessage(`${outcome.join('. ')}.`);
    } else if (reminders) {
      setModalType('success');
      setModalTitle('Reminders sent');
      setModalSubtitle(
        whatsappFailed > 0
          ? 'Reminder delivery was processed, but some WhatsApp notifications failed.'
          : 'Your request was completed successfully.'
      );
      const outcome = [`${remindersSent ?? 0} reminder deliveries completed`];
      if (whatsappSent > 0) outcome.push(`${whatsappSent} WhatsApp sent`);
      if (whatsappFailed > 0) outcome.push(`${whatsappFailed} WhatsApp failed`);
      if (queued > 0) outcome.push(`${queued} still queued`);
      setModalMessage(`${outcome.join('. ')}.`);
    } else if (paymentRecorded) {
      setModalType('success');
      setModalTitle('Payment recorded');
      setModalSubtitle('Your request was completed successfully.');
      setModalMessage('The invoice has been updated and the dashboard is refreshed.');
    } else if (error) {
      setModalType('error');
      setModalTitle('Could not complete action');
      setModalMessage(errorMessage || 'An error occurred while processing your request.');
    }

    const details = searchParams.get('details');
    setModalDetails(details ? decodeURIComponent(details) : undefined);
    setModalOpen(true);
    playOpenTone();
  }, [searchParams]);

  // Fetch academic years and set defaults (select current by default)
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const res = await fetch("/api/admin/academic-years", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const years = (data.academicYears || []).sort((a: any, b: any) => {
          if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
          return b.name.localeCompare(a.name);
        });
        setAcademicYears(years);

        const defaultYear = years.find((y: any) => y.isCurrent) || years[0];
        if (defaultYear) {
          setSelectedAcademicYearId(defaultYear.id);
          const defaultTerm = defaultYear.terms?.[0];
          if (defaultTerm) setSelectedTermId(defaultTerm.id);
        }
      } catch (err) {
        console.error("Failed to load academic years:", err);
      }
    };

    fetchAcademicYears();
  }, []);

  const handleIssueBillsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTermId) return;
    
    setIssuingBills(true);
    try {
      await onIssueBills(selectedTermId, bulkApproval);
    } finally {
      setIssuingBills(false);
    }
  };

  const handleSendRemindersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingReminders(true);
    try {
      await onSendReminders();
    } finally {
      setSendingReminders(false);
    }
  };

  const phaseOptions = getPhaseFilterOptions();

  // Memoized filtered terms based on selected academic year
  const filteredTerms = useMemo(() => {
    if (!selectedAcademicYearId) return [] as any[];
    const year = academicYears.find((y) => y.id === selectedAcademicYearId);
    return (year?.terms || []).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [academicYears, selectedAcademicYearId]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let filtered = localInvoices;

    // Filter by academic year if selected
    if (selectedAcademicYearId) {
      filtered = filtered.filter((inv) => (inv.academicYear?.id || inv.feeSchedule?.term?.academicYear?.id) === selectedAcademicYearId);
    }

    // Filter by term if selected
    if (selectedTermId) {
      filtered = filtered.filter((inv) => (inv.feeSchedule?.term?.id || inv.termId || "") === selectedTermId);
    }
    // Filter by phase
    if (activePhase !== "ALL") {
      filtered = filtered.filter((inv) => {
        const phase = inv.pupil.class?.phase || "UNASSIGNED";
        return phase === activePhase;
      });
    }

    // Filter by status
    if (activeStatus !== "ALL") {
      filtered = filtered.filter((inv) => inv.status === activeStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((inv) => {
        const fullName = `${inv.pupil.firstName} ${inv.pupil.lastName}`.toLowerCase();
        const invoiceNo = (inv.invoiceNo || "").toLowerCase();
        const className = inv.pupil.class
          ? `${inv.pupil.class.name}${inv.pupil.class.arm ? ` ${inv.pupil.class.arm}` : ""}`.toLowerCase()
          : "";
        return fullName.includes(query) || invoiceNo.includes(query) || className.includes(query);
      });
    }

    return filtered;
  }, [localInvoices, activePhase, activeStatus, searchQuery, selectedAcademicYearId, selectedTermId]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handlePhaseChange = (phase: string) => {
    setActivePhase(phase);
    handleFilterChange();
  };

  const handleStatusChange = (status: string) => {
    setActiveStatus(status);
    handleFilterChange();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    handleFilterChange();
  };

  const selectInvoiceForPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    playOpenTone();
    const outstanding = Math.max(0, invoice.amountDue - invoice.amountPaid);
    const hasItems = (invoice.items?.length || 0) > 0;
    const existingAllocations = (invoice.items || []).reduce<Record<string, string>>((acc, item) => {
      const paid = getItemPaidAmount(item);
      acc[item.id] = paid > 0 ? (paid / 100).toFixed(2) : "0.00";
      return acc;
    }, {});
    const existingTotal = Object.values(existingAllocations).reduce((sum, value) => sum + Number(value || 0), 0);

    setPaymentAmount(hasItems ? existingTotal.toFixed(2) : (outstanding / 100).toFixed(2));
    setPaymentAllocations(hasItems ? existingAllocations : distributePaymentAcrossItems(invoice.items || [], outstanding));
    setSelectedPaymentItems(
      (invoice.items || []).reduce<Record<string, boolean>>((acc, item) => {
        acc[item.id] = getItemPaidAmount(item) > 0;
        return acc;
      }, {}),
    );
    setPaymentMethod("CASH");
    setPaymentReference("");
  };

  const getItemPaidAmount = (item: NonNullable<Invoice["items"]>[number]) => {
    return (item.allocations || []).reduce((sum, allocation) => sum + allocation.amount, 0);
  };

  const getItemRemaining = (item: NonNullable<Invoice["items"]>[number]) => {
    const alreadyPaid = getItemPaidAmount(item);
    return Math.max(0, item.amount * item.quantity - alreadyPaid);
  };

  const togglePaymentItem = (item: NonNullable<Invoice["items"]>[number], checked: boolean) => {
    setSelectedPaymentItems((current) => ({ ...current, [item.id]: checked }));
    setPaymentAllocations((current) => {
      const next = { ...current };
      next[item.id] = checked ? (getItemRemaining(item) / 100).toFixed(2) : "0.00";
      const total = Object.values(next).reduce((sum, value) => sum + Math.round(Number(value || 0) * 100), 0);
      setPaymentAmount((total / 100).toFixed(2));
      return next;
    });
  };

  const distributePaymentAcrossItems = (items: NonNullable<Invoice["items"]>, amountInCents: number) => {
    let remaining = Math.max(0, Math.round(amountInCents));
    const next: Record<string, string> = {};

    for (const item of items) {
      const alreadyPaid = (item.allocations || []).reduce((sum, allocation) => sum + allocation.amount, 0);
      const itemBalance = Math.max(0, item.amount * item.quantity - alreadyPaid);
      const allocation = Math.min(remaining, itemBalance);
      next[item.id] = (allocation / 100).toFixed(2);
      remaining -= allocation;
    }

    return next;
  };

  const handleSendReminderForInvoice = async (invoice: Invoice) => {
    if (!invoice.id) return;

    setSendingReminderInvoiceId(invoice.id);
    try {
      await onSendReminders?.(invoice.id);
    } finally {
      setSendingReminderInvoiceId(null);
    }
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats: Stats = {
      count: filteredInvoices.length,
      totalDue: 0,
      totalPaid: 0,
      outstanding: 0,
      byStatus: {
        DRAFT: 0,
        SENT: 0,
        PART_PAID: 0,
        PAID: 0,
        OVERDUE: 0,
      },
    } as Stats;

    filteredInvoices.forEach((inv) => {
      stats.totalDue += inv.amountDue;
      stats.totalPaid += inv.amountPaid;
      stats.outstanding += Math.max(0, inv.amountDue - inv.amountPaid);
      if (inv.status in stats.byStatus) {
        stats.byStatus[inv.status as InvoiceStatus]++;
      }
    });

    return stats;
  }, [filteredInvoices]);

  const formatStatMoney = (amount: number) => formatMoney(amount, currency);
  const feeSchedulesHref = `${basePath}/schedules`;

  return (
    <>
      {/* Payment Modal */}
      {selectedInvoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();

              // Prevent double submission
              if (isSubmittingPayment) return;

              // Validate form
              if (!paymentAmount || Number(paymentAmount) <= 0 || !paymentMethod) {
                alert("Please fill in all required fields");
                return;
              }

              setIsSubmittingPayment(true);

              try {
                const backendUrl = getBackendUrl();
                const amountInCents = Math.round(Number(paymentAmount) * 100);
                const allocations = Object.entries(paymentAllocations)
                  .filter(([, allocationAmount]) => Number(allocationAmount) > 0)
                  .map(([invoiceItemId, allocationAmount]) => ({ invoiceItemId, amount: Number(allocationAmount) }));

                if ((selectedInvoice.items?.length || 0) > 0) {
                  const allocatedTotal = allocations.reduce((sum, allocation) => sum + Math.round(allocation.amount * 100), 0);
                  if (allocatedTotal !== amountInCents) {
                    alert("Allocate the full payment across the fee items before recording it.");
                    setIsSubmittingPayment(false);
                    return;
                  }
                }

                const response = await fetch(`${backendUrl}/api/admin/fees/payments/record`, {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    invoiceId: selectedInvoice.id,
                    amount: paymentAmount,
                    method: paymentMethod,
                    reference: paymentReference || null,
                    allocations,
                    currency,
                  }),
                });

                const result = await response.json();
                if (!response.ok) {
                  throw new Error(result?.error || "Failed to record payment");
                }

                const nextInvoice = result?.invoice;
                const nextAmountPaid = Number(nextInvoice?.amountPaid ?? (selectedInvoice.amountPaid + Math.round(Number(paymentAmount) * 100))) * 100;
                const nextAmountDue = Number(nextInvoice?.amountDue ?? selectedInvoice.amountDue) * 100;
                const nextStatus = nextInvoice?.status ?? (nextAmountPaid >= selectedInvoice.amountDue ? "PAID" : "PART_PAID");

                setLocalInvoices((current) => current.map((invoice) => invoice.id === selectedInvoice.id ? {
                  ...invoice,
                  amountPaid: nextAmountPaid,
                  amountDue: nextAmountDue,
                  status: nextStatus,
                  items: nextInvoice?.items || invoice.items,
                } : invoice));

                playCloseTone();
                setSelectedInvoice(null);
                setPaymentAmount("");
                setPaymentAllocations({});
                setSelectedPaymentItems({});
                setPaymentMethod("CASH");
                setPaymentReference("");

                setModalType('success');
                setModalTitle('Payment recorded');
                setModalMessage('The invoice has been updated and the dashboard reflects the new balance immediately.');
                setModalDetails(`New balance: ${formatMoney(Math.max(0, nextAmountDue - nextAmountPaid), currency)}`);
                setModalOpen(true);
                playOpenTone();
              } catch (error) {
                setIsSubmittingPayment(false);
                const message = error instanceof Error ? error.message : "Failed to record payment";
                console.error("Error recording payment:", message);
                alert(message);
              }
            }}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-brand/10 px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-brand">
                  <CreditCard className="h-4 w-4" /> Fee collection
                </div>
                <h2 className="mt-2 text-2xl font-bold text-foreground">Record payment</h2>
                <p className="mt-1 text-sm text-muted">Apply this payment to the invoice and its fee items.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playCloseTone();
                  setSelectedInvoice(null);
                }}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-6">
              <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Student</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{pupilName(selectedInvoice.pupil.firstName, selectedInvoice.pupil.lastName)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Invoice</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{selectedInvoice.invoiceNo}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Outstanding</p>
                <p className="mt-2 text-sm font-semibold text-red-600">{formatStatMoney(selectedInvoice.amountDue - selectedInvoice.amountPaid)}</p>
              </div>
            </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="invoiceId" value={selectedInvoice.id} />

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Amount Paid ({currency})
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={paymentAmount}
                    min="0.01"
                    max={((selectedInvoice.amountDue - selectedInvoice.amountPaid) / 100).toFixed(2)}
                    step="0.01"
                    onChange={(e) => {
                      const value = e.target.value;
                      setPaymentAmount(value);
                      if (selectedInvoice.items?.length) {
                        setPaymentAllocations(distributePaymentAcrossItems(selectedInvoice.items, Math.round(Number(value || 0) * 100)));
                      }
                    }}
                    required
                    disabled={isSubmittingPayment}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="mt-1 text-xs text-muted">Enter the amount received; fee-item allocations adjust automatically.</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Payment Method
                  </label>
                  <select
                    name="method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    disabled={isSubmittingPayment}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(selectedInvoice.items?.length || 0) > 0 && (
                <div>
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-foreground">Allocate payment by fee item</p>
                    <p className="text-xs text-muted">The item allocations must equal the payment amount.</p>
                  </div>
                  <div className="space-y-2">
                    {selectedInvoice.items!.map((item) => {
                      const itemBalance = getItemRemaining(item);
                      const paidAmount = getItemPaidAmount(item);
                      const hasExistingPayment = paidAmount > 0;
                      const rowValue = hasExistingPayment
                        ? (paidAmount / 100).toFixed(2)
                        : (paymentAllocations[item.id] || "0.00");
                      const statusLabel = hasExistingPayment
                        ? "Paid"
                        : `${formatStatMoney(itemBalance)} Remaining`;

                      return (
                        <div
                          key={item.id}
                          className={`grid grid-cols-[minmax(0,1fr)_90px] items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${hasExistingPayment ? "border-brand/20 bg-brand/5" : "border-border bg-surface"}`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedPaymentItems[item.id] === true || hasExistingPayment}
                              onChange={(event) => togglePaymentItem(item, event.target.checked)}
                              disabled={isSubmittingPayment || itemBalance <= 0}
                              className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                              aria-label={`Mark ${item.name} as paid`}
                            />
                            <div className="flex min-w-0 items-center gap-1.5 text-xs sm:text-sm">
                              <span className="truncate font-medium text-foreground">{item.name}</span>
                              <span className="text-muted">|</span>
                              <span className={hasExistingPayment ? "font-semibold text-brand" : "text-muted"}>{statusLabel}</span>
                            </div>
                          </div>
                          <div
                            className={`flex min-w-[90px] items-center justify-end rounded-full px-2.5 py-1 text-right text-xs font-semibold text-white ${hasExistingPayment ? "bg-brand" : "bg-brand/80"}`}
                          >
                            {rowValue}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-muted">
                  Reference (optional)
                </label>
                <input
                  type="text"
                  name="reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Receipt number, bank reference, etc."
                  disabled={isSubmittingPayment}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex justify-between gap-3 border-t border-border pt-4">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      playCloseTone();
                      setSelectedInvoice(null);
                    }}
                    className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
                  >
                    Cancel
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmittingPayment ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <style>{`
            @keyframes sb_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
            @keyframes sb_modal_exit  { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }
          `}</style>

          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
            style={{
              animation: `sb_modal_enter 320ms cubic-bezier(.2,.9,.2,1)`,
            }}
          >
            <div
              className="border-b border-slate-100 px-6 py-5"
              style={{ background: "linear-gradient(90deg, rgba(10,102,194,0.12), rgba(10,102,194,0.04))" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/70 shadow-sm"
                  style={{ background: modalType === 'success' ? "rgba(16,185,129,0.12)" : "rgba(10,102,194,0.12)" }}
                >
                  {modalType === 'success' ? (
                    <Sparkles className="h-6 w-6" style={{ color: "#0A66C2" }} />
                  ) : (
                    <AlertCircle className="h-6 w-6" style={{ color: "#0A66C2" }} />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {modalTitle || (modalType === 'success' ? 'All set' : 'Something went wrong')}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {modalType === 'success'
                      ? (modalSubtitle || 'Your request was completed successfully.')
                      : 'Please review the details below.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-slate-700">{modalMessage}</p>
              {modalDetails && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-700">{modalDetails}</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                onClick={() => {
                  setModalOpen(false);
                  playCloseTone();
                }}
                className="w-full rounded-lg px-4 py-2.5 font-medium text-sm transition-colors text-white"
                style={{ background: "#0A66C2" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#084B8A")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#0A66C2")}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Page */}
      <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        {/* Header */}
        <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-10 sm:px-8 sm:pb-8 sm:pt-12">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
                <CreditCard className="h-4 w-4" /> Fee management
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Fees & invoices
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Manage student invoices and track fee payments by phase, term, and class.
              </p>
            </div>

          <div className="ml-auto flex items-center gap-2">
            {whatsAppConnected !== null && (
              <div className="inline-flex items-center gap-2.5 self-start rounded-full border border-border bg-surface px-2.5 py-1.5 shadow-sm sm:self-auto" title={whatsAppConnected ? 'WhatsApp connected — Ready to send reminders' : 'WhatsApp disconnected — Reconnect via settings'}>
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${whatsAppConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  <WhatsAppIcon className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-foreground">
                    {whatsAppConnected ? 'Connected' : 'Disconnected'}
                  </span>
                  <span className="hidden text-[10px] text-muted sm:inline">
                    {whatsAppConnected ? 'Ready' : 'Reconnect'}
                  </span>
                </div>
                <span className={`h-2 w-2 rounded-full ${whatsAppConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </div>
            )}
          </div>
          </div>
        </header>

        {/* Summary Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-border bg-surface p-5 transition-colors hover:border-brand/40 hover:bg-brand-light/20">
            <div className="mb-4 flex items-center gap-2 text-brand">
              <TrendingUp className="h-4 w-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                Total Due
              </span>
            </div>
            <div className="text-3xl font-semibold text-foreground">{formatStatMoney(summaryStats.totalDue)}</div>
            <div className="mt-1 text-xs text-muted">{summaryStats.count} invoice{summaryStats.count !== 1 ? "s" : ""}</div>
          </div>

          <div className="border border-border bg-surface p-5 transition-colors hover:border-brand/40 hover:bg-brand-light/20">
            <div className="mb-4 flex items-center gap-2 text-brand">
              <CheckCircle className="h-4 w-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                Paid
              </span>
            </div>
            <div className="text-3xl font-semibold text-foreground">{formatStatMoney(summaryStats.totalPaid)}</div>
            <div className="mt-1 text-xs text-muted">{summaryStats.byStatus.PAID} fully paid</div>
          </div>

          <div className="border border-border bg-surface p-5 transition-colors hover:border-brand/40 hover:bg-brand-light/20">
            <div className="mb-4 flex items-center gap-2 text-brand">
              <AlertCircle className="h-4 w-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                Outstanding
              </span>
            </div>
            <div className="text-3xl font-semibold text-foreground">{formatStatMoney(summaryStats.outstanding)}</div>
            <div className="mt-1 text-xs text-muted">{summaryStats.byStatus.OVERDUE} overdue</div>
          </div>

          <div className="border border-border bg-surface p-5 transition-colors hover:border-brand/40 hover:bg-brand-light/20">
            <div className="mb-4 flex items-center gap-2 text-brand">
              <Clock className="h-4 w-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                Part Paid
              </span>
            </div>
            <div className="text-3xl font-semibold text-foreground">{summaryStats.byStatus.PART_PAID}</div>
            <div className="mt-1 text-xs text-muted">Partial payments recorded</div>
          </div>
        </section>

        {/* Mobile Summary Cards hidden, using single grid layout above */}

        {/* Actions & Search Bar */}
        <section className="border border-border bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Buttons - Right */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Animated Search Panel - slides out on same line */}
            <div className={`overflow-hidden transition-all duration-300 ease-out flex-shrink-0 ${isSearchOpen ? "w-72 opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-full"}`}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by student name, invoice number, or class..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-md border border-brand bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsSearchOpen((open) => !open)}
              aria-label={isSearchOpen ? "Close search" : "Search invoices"}
              title={isSearchOpen ? "Close search" : "Search invoices"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand p-0 text-sm font-semibold text-white transition hover:bg-brand-hover sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{isSearchOpen ? "Close" : "Search"}</span>
            </Button>
            <form onSubmit={handleIssueBillsSubmit} className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-none">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground sm:flex-none">
                <CalendarDays className="h-4 w-4 text-[#0A66C2]" />
                <div className="flex min-w-0 items-center gap-1.5">
                  <select
                    value={selectedAcademicYearId}
                    onChange={(e) => {
                      const nextAcademicYearId = e.target.value;
                      const nextYear = academicYears.find((year) => year.id === nextAcademicYearId);
                      setSelectedAcademicYearId(nextAcademicYearId);
                      setSelectedTermId(nextYear?.terms?.[0]?.id || "");
                    }}
                    className="min-w-0 max-w-[8.5rem] bg-transparent text-xs text-foreground outline-none sm:text-sm"
                  >
                    <option value="">Session</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}{y.isCurrent ? ' (Current)' : ''}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedTermId}
                    onChange={(e) => setSelectedTermId(e.target.value)}
                    required
                    className="min-w-0 max-w-[6.5rem] bg-transparent text-xs text-foreground outline-none sm:text-sm"
                  >
                    <option value="">Select term</option>
                    {filteredTerms.map((term: any) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                type="submit"
                disabled={issuingBills}
                variant="primary"
                className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                <ReceiptText className="h-4 w-4" />
                <span className="sm:hidden">{issuingBills ? "..." : "Issue"}</span>
                <span className="hidden sm:inline">{issuingBills ? "Issuing..." : "Issue Bills"}</span>
              </Button>
              <label
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-muted transition hover:border-brand hover:text-brand sm:h-auto sm:py-2"
                title="Approve WhatsApp delivery to eligible guardians for this invoice run"
              >
                <input
                  type="checkbox"
                  checked={bulkApproval}
                  onChange={(e) => setBulkApproval(e.target.checked)}
                  aria-label="Approve WhatsApp delivery to eligible guardians"
                />
                <span>WhatsApp</span>
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              </label>
            </form>

            <form onSubmit={handleSendRemindersSubmit}>
              <Button
                type="submit"
                disabled={sendingReminders}
                variant="primary"
                className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                <SendHorizonal className="h-4 w-4" />
                <span className="sm:hidden">{sendingReminders ? "..." : "Remind"}</span>
                <span className="hidden sm:inline">{sendingReminders ? "Sending..." : "Send Reminders"}</span>
              </Button>
            </form>

            <Button
              href={feeSchedulesHref}
              variant="primary"
              aria-label="Manage fee schedules"
              title="Manage fee schedules"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand p-0 text-sm font-semibold text-white transition hover:bg-brand-hover sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
            >
              <ScrollText className="h-4 w-4" />
              <span className="hidden sm:inline">Fee Schedules</span>
            </Button>
          </div>
        </div>
        </section>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <label className="text-sm font-medium text-muted">School Phase:</label>
            {phaseOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePhaseChange(option.value)}
                className={`rounded-md border px-3 py-1 text-xs font-semibold transition ${
                  activePhase === option.value
                    ? "border-brand bg-brand text-white"
                    : "border-border bg-background text-muted hover:border-brand/40 hover:bg-surface"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="text-sm font-medium text-muted">Status:</label>
            {STATUS_ORDER.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`rounded-md border px-3 py-1 text-xs font-semibold transition ${
                  activeStatus === status
                    ? "border-brand bg-brand text-white"
                    : "border-border bg-background text-muted hover:border-brand/40 hover:bg-surface"
                }`}
              >
                {STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Showing {paginatedInvoices.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–
            {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          <label className="text-sm text-muted whitespace-nowrap">
            Rows per page
            <select
              value={itemsPerPage}
              onChange={handlePageSizeChange}
              className="ml-2 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Table */}
        {paginatedInvoices.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto border border-border bg-surface mb-6">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Student</th>
                    <th className="px-4 py-2 font-medium">Phase / Class</th>
                    <th className="px-4 py-2 font-medium">Term</th>
                    <th className="px-4 py-2 font-medium">Invoice No.</th>
                    <th className="px-4 py-2 font-medium text-right">Amount Due</th>
                    <th className="px-4 py-2 font-medium text-right">Paid</th>
                    <th className="px-4 py-2 font-medium text-right">Balance</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((inv, idx) => {
                    const balance = inv.amountDue - inv.amountPaid;
                    const classLabel = inv.pupil?.class
                      ? `${inv.pupil.class.name}${inv.pupil.class.arm ? ` ${inv.pupil.class.arm}` : ""}`
                      : "—";
                    const phase = inv.pupil?.class?.phase || "UNASSIGNED";
                    const pupilFullName = inv.pupil ? pupilName(inv.pupil.firstName, inv.pupil.lastName) : "Unknown";

                    return (
                      <tr key={inv.id || `invoice-${idx}`} className="border-t border-border hover:bg-background/50 transition-colors">
                        <td className="px-4 py-2 font-medium text-foreground">{pupilFullName}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block rounded-md border px-2 py-1 text-xs font-medium ${getPhaseColor(phase)}`}>
                              {getPhaseLabel(phase)}
                            </span>
                            <span className="text-muted text-xs">{classLabel}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-muted">{inv.feeSchedule?.term?.name ?? "—"}</td>
                        <td className="px-4 py-2 text-muted"><code className="text-xs">{inv.invoiceNo ?? "—"}</code></td>
                        <td className="px-4 py-2 text-right font-semibold">{formatStatMoney(inv.amountDue)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-green-600">{formatStatMoney(inv.amountPaid)}</td>
                        <td className={`px-4 py-2 text-right font-semibold ${invoiceStatusClass(inv.status)}`}>{formatStatMoney(balance)}</td>
                        <td className="px-4 py-2"><Badge variant={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "error" : inv.status === "PART_PAID" ? "warning" : "secondary"}>{invoiceStatusLabel(inv.status)}</Badge></td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                          <Link href={`${basePath}/${inv.id}`} aria-label={`View invoice for ${pupilFullName}`} title="View invoice" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand bg-brand text-white transition hover:bg-brand-hover">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          {balance > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSendReminderForInvoice(inv)}
                                disabled={sendingReminderInvoiceId === inv.id}
                                aria-label={`Send reminder for ${pupilFullName}`}
                                title="Send reminder"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand bg-white text-brand transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Bell className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => selectInvoiceForPayment(inv)}
                                aria-label={`Record payment for ${pupilFullName}`}
                                title="Record payment"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand bg-white text-brand transition hover:bg-brand/5"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="sm:hidden space-y-2 mb-6">
              {paginatedInvoices.map((inv, idx) => {
                const balance = inv.amountDue - inv.amountPaid;
                const classLabel = inv.pupil?.class
                  ? `${inv.pupil.class.name}${inv.pupil.class.arm ? ` ${inv.pupil.class.arm}` : ""}`
                  : "Unassigned";
                const phase = inv.pupil?.class?.phase || "UNASSIGNED";
                const pupilFullName = inv.pupil ? pupilName(inv.pupil.firstName, inv.pupil.lastName) : "Unknown";

                return (
                  <div
                    key={inv.id || `invoice-${idx}`}
                    className="border border-border bg-surface px-3 py-2 hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {pupilFullName}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          <span className={`inline-block rounded-md border px-1 py-0.5 text-xs font-medium ${getPhaseColor(phase)}`}>
                            {getPhaseLabel(phase)}
                          </span>
                          <span className="ml-1">{classLabel}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "error" : inv.status === "PART_PAID" ? "warning" : "secondary"} className="text-xs whitespace-nowrap">
                          {invoiceStatusLabel(inv.status)}
                        </Badge>
                        <p className="text-xs font-semibold text-foreground">{formatStatMoney(balance)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`${basePath}/${inv.id}`} aria-label={`View invoice for ${pupilFullName}`} title="View invoice" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand bg-brand text-white transition hover:bg-brand-hover">
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      {balance > 0 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSendReminderForInvoice(inv)}
                            disabled={sendingReminderInvoiceId === inv.id}
                            aria-label={`Send reminder for ${pupilFullName}`}
                            title="Send reminder"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand bg-white text-brand transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => selectInvoiceForPayment(inv)}
                            aria-label={`Record payment for ${pupilFullName}`}
                            title="Record payment"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand bg-white text-brand transition hover:bg-brand/5"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        ) : (
          <div className="border border-border bg-surface px-4 py-8 text-center sm:px-6 sm:py-12">
            <p className="text-sm text-muted">
              {searchQuery ? `No invoices found matching "${searchQuery}"` : "No invoices to display"}
            </p>
          </div>
        )}
      </div>
      </main>

      <UserGuide guide={HELP_GUIDE} />
    </>
  );
}

