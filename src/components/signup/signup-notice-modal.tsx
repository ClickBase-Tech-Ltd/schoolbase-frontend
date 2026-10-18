"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, ArrowRight, Check, X } from "lucide-react";

type SignupNoticeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: string;
  type?: "error" | "success";
  confirmLabel?: string;
  onConfirm?: () => void;
  secondaryAction?: { label: string; onClick: () => void };
};

export function SignupNoticeModal({
  isOpen,
  onClose,
  title,
  message,
  details,
  type = "error",
  confirmLabel,
  onConfirm,
  secondaryAction,
}: SignupNoticeModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const isSuccess = type === "success";

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onClose();
    onConfirm?.();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/45 px-4 py-8 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <style>{`@keyframes signup-notice-enter { from { opacity: 0; transform: translateY(12px) scale(.985) } to { opacity: 1; transform: translateY(0) scale(1) } }`}</style>
      <div
        ref={panelRef}
        role={isSuccess ? "dialog" : "alertdialog"}
        aria-modal="true"
        aria-labelledby="signup-notice-title"
        aria-describedby="signup-notice-message"
        className="relative my-auto w-full max-w-lg overflow-hidden border border-border bg-surface shadow-[0_24px_72px_rgba(10,102,194,.16)] motion-safe:animate-[signup-notice-enter_180ms_ease-out]"
      >
        <div className="relative overflow-hidden border-b border-border bg-brand/5 px-5 py-5 sm:px-7">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/50 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center border ${isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-brand/20 bg-white text-brand"}`}>
                {isSuccess ? <Check aria-hidden="true" className="h-5 w-5" /> : <AlertTriangle aria-hidden="true" className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">SchoolBase · {isSuccess ? "Success" : "Notice"}</p>
                <h2 id="signup-notice-title" className="mt-1 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notice"
              className="relative -mr-2 -mt-2 flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-surface text-muted transition hover:border-brand hover:bg-white hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

        </div>
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          {isSuccess ? (
            <p id="signup-notice-message" className="text-sm leading-6 text-muted">{message}</p>
          ) : (
            <div className="flex gap-3 border border-red-200 bg-red-50 px-4 py-3.5 text-red-900">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              <div>
                <p id="signup-notice-message" className="text-sm font-semibold leading-5">{message}</p>
                {details ? <p className="mt-1 text-sm leading-5 text-red-900/80">{details}</p> : null}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-background px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            {secondaryAction ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  secondaryAction.onClick();
                }}
                className="inline-flex min-h-10 items-center justify-center border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {secondaryAction.label}
              </button>
            ) : null}
            <button
              ref={confirmRef}
              type="button"
              onClick={handleConfirm}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-brand bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {confirmLabel ?? (isSuccess ? "Continue" : "Close")}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
        </div>
      </div>
    </div>
  );
}