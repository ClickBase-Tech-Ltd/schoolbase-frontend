"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Landmark, RefreshCw, ShieldCheck } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";

type Institution = {
  id: string;
  code: string;
  displayName: string;
  integrationMode: "HOSTED" | "API" | "MANUAL";
  isDemo: boolean;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
  _count: { applications: number; providerEvents: number };
};

type Product = {
  id: string;
  institutionId: string;
  code: string;
  displayName: string;
  summary: string;
  eligibilitySummary: string;
  termsSummary: string;
  termsUrl: string | null;
  termsVersion: string;
  currency: string;
  applicationMode: "HOSTED" | "SCHOOL_CONTACT" | "API";
  applicationUrl: string | null;
  approvalEvidenceReference: string | null;
  effectiveAt: string;
  expiresAt: string | null;
  status: "DRAFT" | "APPROVED" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  approvedAt: string | null;
  approvedBy: string | null;
  institution: { displayName: string; status: string; integrationMode: string; isDemo: boolean };
  _count: { applications: number; schools: number };
};

type EventException = {
  id: string;
  externalEventId: string;
  eventType: string;
  applicationReference: string;
  status: "REVIEW_REQUIRED" | "FAILED";
  attempts: number;
  lastErrorCode: string | null;
  receivedAt: string;
  institution: { displayName: string; code: string };
};

type FinancingOperationsData = {
  enabled: boolean;
  institutions: Institution[];
  products: Product[];
  eventCounts: Record<string, number>;
  exceptionEvents: EventException[];
};

type ProductForm = Omit<typeof initialProductForm, "applicationMode"> & {
  applicationMode: Product["applicationMode"];
};

const initialForm = { code: "", displayName: "", integrationMode: "MANUAL" as const };
const initialProductForm = {
  institutionId: "",
  code: "",
  displayName: "",
  summary: "",
  eligibilitySummary: "",
  termsSummary: "",
  termsUrl: "",
  termsVersion: "",
  currency: "NGN",
  applicationMode: "HOSTED" as Product["applicationMode"],
  applicationUrl: "",
  effectiveAt: new Date().toISOString().slice(0, 10),
  expiresAt: "",
};

async function fetchFinancingOperations(): Promise<FinancingOperationsData> {
  const response = await fetch("/schoolbase-admin/api/financing", {
    credentials: "include",
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Unable to load financing operations.");
  return result;
}

export default function FinancingOperationsClient() {
  const [data, setData] = useState<FinancingOperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [productForm, setProductForm] = useState<ProductForm>(initialProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [approvalReferences, setApprovalReferences] = useState<Record<string, string>>({});
  const [approvalConfirmed, setApprovalConfirmed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "confirmation">("success");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchFinancingOperations());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load financing operations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const result = await fetchFinancingOperations();
        if (active) setData(result);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load financing operations.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void initialize();
    return () => {
      active = false;
    };
  }, []);

  const createInstitution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    setNoticeType("success");
    try {
      const response = await fetch("/schoolbase-admin/api/financing/institutions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to add institution.");
      setForm(initialForm);
      setNotice(`${result.institution.displayName} added in suspended mode.`);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to add institution.");
    } finally {
      setSaving(false);
    }
  };

  const updateInstitutionStatus = async (institution: Institution) => {
    const status = institution.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setUpdatingId(institution.id);
    setError("");
    setNotice("");
    setNoticeType("success");
    try {
      const response = await fetch(
        `/schoolbase-admin/api/financing/institutions/${encodeURIComponent(institution.id)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to update institution.");
      setNotice(`${institution.displayName} is now ${status.toLowerCase()}.`);
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update institution.");
    } finally {
      setUpdatingId(null);
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    setNoticeType("success");
    try {
      const response = await fetch(
        editingProductId
          ? `/schoolbase-admin/api/financing/products/${encodeURIComponent(editingProductId)}`
          : "/schoolbase-admin/api/financing/products",
        {
          method: editingProductId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...productForm,
            effectiveAt: new Date(`${productForm.effectiveAt}T00:00:00.000Z`).toISOString(),
            expiresAt: productForm.expiresAt
              ? new Date(`${productForm.expiresAt}T23:59:59.999Z`).toISOString()
              : null,
            termsUrl: productForm.termsUrl || null,
            applicationUrl: productForm.applicationUrl || null,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save product.");
      setProductForm(initialProductForm);
      setEditingProductId(null);
      setNotice(`${result.product.displayName} saved as a draft. It is not visible to schools or parents.`);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };

  const editProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      institutionId: product.institutionId,
      code: product.code,
      displayName: product.displayName,
      summary: product.summary,
      eligibilitySummary: product.eligibilitySummary,
      termsSummary: product.termsSummary,
      termsUrl: product.termsUrl ?? "",
      termsVersion: product.termsVersion,
      currency: product.currency,
      applicationMode: product.applicationMode,
      applicationUrl: product.applicationUrl ?? "",
      effectiveAt: new Date(product.effectiveAt).toISOString().slice(0, 10),
      expiresAt: product.expiresAt ? new Date(product.expiresAt).toISOString().slice(0, 10) : "",
    });
    setError("");
    setNoticeType("confirmation");
    setNotice("Editing resets approval. The product must be approved again before it can be activated.");
  };

  const approveProduct = async (product: Product) => {
    const approvalEvidenceReference = approvalReferences[product.id]?.trim();
    if (!approvalEvidenceReference || !approvalConfirmed[product.id]) {
      setError("Enter the bank approval reference and confirm that approval was verified.");
      return;
    }
    setUpdatingId(product.id);
    setError("");
    setNotice("");
    setNoticeType("success");
    try {
      const response = await fetch(
        `/schoolbase-admin/api/financing/products/${encodeURIComponent(product.id)}/approve`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvalConfirmed: true, approvalEvidenceReference }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to approve product.");
      setNotice(`${product.displayName} is approved but remains unavailable until activated.`);
      setApprovalConfirmed((current) => ({ ...current, [product.id]: false }));
      await loadData();
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "Unable to approve product.");
    } finally {
      setUpdatingId(null);
    }
  };

  const updateProductStatus = async (product: Product) => {
    const status = product.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setUpdatingId(product.id);
    setError("");
    setNotice("");
    setNoticeType("success");
    try {
      const response = await fetch(
        `/schoolbase-admin/api/financing/products/${encodeURIComponent(product.id)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to update product.");
      setNotice(`${product.displayName} is now ${status.toLowerCase()}.`);
      await loadData();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update product.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-2 py-6 text-foreground sm:px-8 sm:py-8 lg:px-12">
      <ErrorModal
        isOpen={Boolean(error || notice)}
        onClose={() => {
          setError("");
          setNotice("");
        }}
        title={error
          ? "Tuition financing update failed"
          : noticeType === "confirmation"
            ? "Approval will be reset"
            : "Tuition financing updated"}
        message={error || notice}
        type={error ? "error" : noticeType}
        confirmLabel={error ? "Okay" : noticeType === "confirmation" ? "Understood" : "Done"}
      />
      <header className="flex flex-col justify-between gap-4 border border-border bg-surface p-6 sm:flex-row sm:items-end sm:p-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
            <Landmark className="h-4 w-4" />
            Platform operations
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Tuition Financing</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Manage lender institutions and inspect provider-event exceptions. Banks remain responsible for lending and credit decisions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 border border-border bg-white px-4 text-sm font-semibold hover:border-brand disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <section className="flex flex-col justify-between gap-4 border border-amber-300 bg-amber-50 p-5 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h2 className="font-semibold text-amber-950">
              Global financing access is {data?.enabled ? "ON" : "OFF"}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-amber-900">
              {data?.enabled
                ? "Parents can see only approved products that are active, current, and enabled by their school. API application, decision updates, and settlement remain unavailable until each partner integration is verified."
                : "The catalogue and parent selection flow are prepared, but no family can access them while this switch is off. Keep it off until partner, legal, security, and release gates are approved."}
            </p>
          </div>
        </div>
        <Link
          href="/schoolbase-admin/settings"
          className="inline-flex shrink-0 items-center gap-2 border border-amber-400 bg-white px-3 py-2 text-sm font-semibold text-amber-950 hover:border-amber-600"
        >
          Review master switch <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ["Institutions", data?.institutions.length ?? "—"],
          ["Active lenders", data?.institutions.filter((item) => item.status === "ACTIVE").length ?? "—"],
          ["Products", data?.products.length ?? "—"],
          ["Active products", data?.products.filter((item) => item.status === "ACTIVE").length ?? "—"],
          ["Parent requests", data?.institutions.reduce((total, item) => total + item._count.applications, 0) ?? "—"],
          ["Events awaiting review", data?.eventCounts.REVIEW_REQUIRED ?? 0],
          ["Events failed", data?.eventCounts.FAILED ?? 0],
        ].map(([label, value]) => (
          <article key={label} className="border border-border bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-[.13em] text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
        <div className="border border-border bg-surface">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold">Lender institution registry</h2>
            <p className="mt-1 text-sm text-muted">New institutions start suspended. Activating a registry entry does not enable a product or connect a bank.</p>
          </div>
          {loading && !data ? (
            <p className="p-5 text-sm text-muted">Loading lender registry…</p>
          ) : !data?.institutions.length ? (
            <p className="p-5 text-sm text-muted">No institutions registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Institution</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Applications / events</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Control</th>
                  </tr>
                </thead>
                <tbody>
                  {data.institutions.map((institution) => (
                    <tr key={institution.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{institution.displayName}</p>
                        {institution.isDemo && (
                          <span className="mt-1 inline-flex border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800">
                            Test fixture only
                          </span>
                        )}
                        <p className="text-xs text-muted">{institution.code}</p>
                      </td>
                      <td className="px-4 py-3">{institution.integrationMode}</td>
                      <td className="px-4 py-3">{institution._count.applications} / {institution._count.providerEvents}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${institution.status === "ACTIVE" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-slate-50 text-slate-700"}`}>
                          {institution.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void updateInstitutionStatus(institution)}
                          disabled={updatingId === institution.id}
                          className="border border-border px-3 py-1.5 text-xs font-semibold hover:border-brand disabled:opacity-50"
                        >
                          {updatingId === institution.id ? "Saving…" : institution.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form onSubmit={createInstitution} className="space-y-4 border border-border bg-surface p-5">
          <div>
            <h2 className="text-lg font-semibold">Add institution</h2>
            <p className="mt-1 text-sm text-muted">No credentials or lender API details are stored here.</p>
          </div>
          <label className="block text-sm font-medium">
            Institution name
            <input
              required
              maxLength={191}
              value={form.displayName}
              onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
              className="mt-1 block w-full border border-border bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Institution code
            <input
              required
              minLength={2}
              maxLength={64}
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              className="mt-1 block w-full border border-border bg-white px-3 py-2 uppercase"
              placeholder="BANK_CODE"
            />
          </label>
          <label className="block text-sm font-medium">
            Integration mode
            <select
              value={form.integrationMode}
              onChange={(event) => setForm((current) => ({ ...current, integrationMode: event.target.value as typeof current.integrationMode }))}
              className="mt-1 block w-full border border-border bg-white px-3 py-2"
            >
              <option value="MANUAL">Approved manual channel</option>
              <option value="HOSTED">Lender-hosted journey</option>
              <option value="API">Lender API</option>
            </select>
          </label>
          <div className="flex gap-2 border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Entry is created suspended. No application or settlement workflow is activated.
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add suspended institution"}
          </button>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,.8fr)]">
        <div className="border border-border bg-surface">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold">Bank-approved product catalogue</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Only complete, documented, approved and active products can be offered to participating schools. API products stay blocked until a verified partner adapter is installed.
            </p>
          </div>
          {!data?.products.length ? (
            <p className="p-5 text-sm text-muted">No products configured. Draft products are never visible to parents.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.products.map((product) => (
                <article key={product.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{product.displayName}</h3>
                      <p className="text-sm text-muted">{product.institution.displayName} · {product.code} · {product.currency} · {product.applicationMode}</p>
                    </div>
                    <span className="border border-border bg-background px-2.5 py-1 text-xs font-semibold">{product.status}</span>
                  </div>
                  <p className="text-sm leading-5 text-muted">{product.summary}</p>
                  <p className="text-xs text-muted">
                    {product._count.schools} school(s) enabled · {product._count.applications} parent request(s)
                    {product.approvalEvidenceReference ? ` · Approval reference ${product.approvalEvidenceReference}` : ""}
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    {["DRAFT", "SUSPENDED"].includes(product.status) && (
                      <>
                        <button
                          type="button"
                          onClick={() => editProduct(product)}
                          disabled={updatingId === product.id}
                          className="border border-border px-3 py-2 text-xs font-semibold hover:border-brand disabled:opacity-50"
                        >
                          Edit details
                        </button>
                        <label className="text-xs font-medium">
                          Bank approval reference
                          <input
                            required
                            maxLength={191}
                            value={approvalReferences[product.id] ?? product.approvalEvidenceReference ?? ""}
                            onChange={(event) => setApprovalReferences((current) => ({
                              ...current,
                              [product.id]: event.target.value,
                            }))}
                            className="mt-1 block min-w-56 border border-border bg-white px-2.5 py-2 text-sm"
                          />
                        </label>
                        <label className="flex items-center gap-2 pb-2 text-xs">
                          <input
                            type="checkbox"
                            checked={approvalConfirmed[product.id] ?? false}
                            onChange={(event) => setApprovalConfirmed((current) => ({
                              ...current,
                              [product.id]: event.target.checked,
                            }))}
                            className="h-4 w-4 accent-brand"
                          />
                          I verified bank approval
                        </label>
                        <button
                          type="button"
                          onClick={() => void approveProduct(product)}
                          disabled={updatingId === product.id || !approvalConfirmed[product.id]}
                          className="border border-border px-3 py-2 text-xs font-semibold hover:border-brand disabled:opacity-50"
                        >
                          {updatingId === product.id ? "Saving…" : "Record approval"}
                        </button>
                        {!product.termsUrl && (
                          <p className="basis-full text-xs leading-5 text-amber-800">
                            Before approval, use Edit details to add the bank-approved full terms URL. Drafts can be saved without it, but approval is blocked until it is present.
                          </p>
                        )}
                      </>
                    )}
                    {["APPROVED", "ACTIVE"].includes(product.status) && (
                      <button
                        type="button"
                        onClick={() => void updateProductStatus(product)}
                        disabled={updatingId === product.id}
                        className="border border-border px-3 py-2 text-xs font-semibold hover:border-brand disabled:opacity-50"
                      >
                        {updatingId === product.id ? "Saving…" : product.status === "ACTIVE" ? "Suspend product" : "Activate product"}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={saveProduct} className="space-y-4 border border-border bg-surface p-5">
          <div>
            <h2 className="text-lg font-semibold">{editingProductId ? "Edit financing product" : "Add product draft"}</h2>
            <p className="mt-1 text-sm leading-5 text-muted">
              Enter approved partner content exactly. Do not invent rates, eligibility, fees, repayment terms or legal notices.
            </p>
          </div>
          <label className="block text-sm font-medium">
            Institution
            <select
              required
              value={productForm.institutionId}
              onChange={(event) => setProductForm((current) => ({ ...current, institutionId: event.target.value }))}
              className="mt-1 block w-full border border-border bg-white px-3 py-2"
            >
              <option value="">Select an institution</option>
              {data?.institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.displayName} ({institution.integrationMode}, {institution.status.toLowerCase()})
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Product code
              <input required maxLength={64} value={productForm.code} onChange={(event) => setProductForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} className="mt-1 block w-full border border-border bg-white px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">
              Product name
              <input required maxLength={191} value={productForm.displayName} onChange={(event) => setProductForm((current) => ({ ...current, displayName: event.target.value }))} className="mt-1 block w-full border border-border bg-white px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Parent-facing summary
            <input required maxLength={500} value={productForm.summary} onChange={(event) => setProductForm((current) => ({ ...current, summary: event.target.value }))} className="mt-1 block w-full border border-border bg-white px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Eligibility information supplied by bank
            <textarea required maxLength={5000} rows={3} value={productForm.eligibilitySummary} onChange={(event) => setProductForm((current) => ({ ...current, eligibilitySummary: event.target.value }))} className="mt-1 block w-full border border-border bg-white px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Approved terms summary
            <textarea required maxLength={10000} rows={4} value={productForm.termsSummary} onChange={(event) => setProductForm((current) => ({ ...current, termsSummary: event.target.value }))} className="mt-1 block w-full border border-border bg-white px-3 py-2" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Terms version
              <input required maxLength={80} value={productForm.termsVersion} onChange={(event) => setProductForm((current) => ({ ...current, termsVersion: event.target.value }))} className="mt-1 block w-full border border-border bg-white px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">
              Currency
              <input required minLength={3} maxLength={3} value={productForm.currency} onChange={(event) => setProductForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} className="mt-1 block w-full border border-border bg-white px-3 py-2 uppercase" />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Full terms URL (HTTPS; required for approval)
            <input type="url" pattern="https://.*" value={productForm.termsUrl} onChange={(event) => setProductForm((current) => ({ ...current, termsUrl: event.target.value }))} className="mt-1 block w-full border border-border bg-white px-3 py-2" />
            <span className="mt-1 block text-xs font-normal text-muted">
              For the local demo fixture only, use the reserved https://demo.invalid/terms address. Never use a placeholder for a real partner.
            </span>
          </label>
          <label className="block text-sm font-medium">
            Parent application route
            <select
              value={productForm.applicationMode}
              onChange={(event) => setProductForm((current) => ({ ...current, applicationMode: event.target.value as typeof current.applicationMode }))}
              className="mt-1 block w-full border border-border bg-white px-3 py-2"
            >
              <option value="HOSTED">Lender-hosted secure site</option>
              <option value="SCHOOL_CONTACT">School follow-up only</option>
              <option value="API">Bank API (cannot activate before adapter)</option>
            </select>
          </label>
          {productForm.applicationMode === "HOSTED" && (
            <label className="block text-sm font-medium">
              Lender application URL (HTTPS)
              <input required type="url" pattern="https://.*" value={productForm.applicationUrl} onChange={(event) => setProductForm((current) => ({ ...current, applicationUrl: event.target.value }))} className="mt-1 block w-full border border-border bg-white px-3 py-2" />
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Effective date
              <input required type="date" value={productForm.effectiveAt} onChange={(event) => setProductForm((current) => ({ ...current, effectiveAt: event.target.value }))} className="mt-1 block w-full border border-border bg-white px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">
              Expiry date (optional)
              <input type="date" value={productForm.expiresAt} onChange={(event) => setProductForm((current) => ({ ...current, expiresAt: event.target.value }))} className="mt-1 block w-full border border-border bg-white px-3 py-2" />
            </label>
          </div>
          <div className="border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
            Drafts are hidden from schools and parents. Activation requires an active institution, recorded bank approval, complete terms, and a supported application route.
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
              {saving ? "Saving…" : editingProductId ? "Save draft changes" : "Save product draft"}
            </button>
            {editingProductId && (
              <button type="button" onClick={() => { setEditingProductId(null); setProductForm(initialProductForm); }} className="border border-border px-4 py-2.5 text-sm font-semibold">
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="border border-border bg-surface">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Provider-event exceptions</h2>
          <p className="mt-1 text-sm text-muted">Read-only triage view. Normalized payloads and private borrower data are not displayed.</p>
        </div>
        {loading && !data ? (
          <p className="p-5 text-sm text-muted">Loading event exceptions…</p>
        ) : !data?.exceptionEvents.length ? (
          <p className="p-5 text-sm text-muted">No failed or review-required events.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3">Institution</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Application reference</th>
                  <th className="px-4 py-3">Status / reason</th>
                  <th className="px-4 py-3">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {data.exceptionEvents.map((event) => (
                  <tr key={event.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-3">{new Date(event.receivedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{event.institution.displayName}</td>
                    <td className="px-4 py-3">{event.eventType}</td>
                    <td className="px-4 py-3">{event.applicationReference}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{event.status}</p>
                      <p className="text-xs text-muted">{event.lastErrorCode || "No reason recorded"}</p>
                    </td>
                    <td className="px-4 py-3">{event.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
