"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Sparkles, X } from "lucide-react";

type ModalType = "error" | "success" | "confirmation";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: string;
  type?: ModalType;
  action?: {
    label: string;
    onClick: () => void;
  };
  onConfirm?: () => Promise<boolean | void> | boolean | void;
  onSuccessAction?: () => void; // For success modal primary button
  confirmDisabled?: boolean;
  confirmLabel?: string;
  children?: React.ReactNode;
}

export function ErrorModal({
  isOpen,
  onClose,
  title,
  message,
  details,
  type = "error",
  action,
  onConfirm,
  onSuccessAction,
  confirmDisabled,
  confirmLabel,
  children,
}: ErrorModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isOpen) {
      playOpenTone();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSuccess = type === "success";
  const isConfirmation = type === "confirmation";
  const defaultTitle = isSuccess ? "All set" : "Something went wrong";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;
  const statusLabel = isSuccess ? "Success" : isConfirmation ? "Confirm" : "Notice";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]">
      <style>{`
        @keyframes sb_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
        @keyframes sb_modal_exit  { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-[0_20px_60px_rgba(10,102,194,0.12)]"
      >
        <div className="border-b border-brand/15 bg-brand-light px-6 py-5 sm:px-7">
          <div className="flex items-start gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${isSuccess ? 'border-emerald-200 bg-emerald-50' : 'border-brand/20 bg-white'}`}>
              {isSuccess ? (
                <Sparkles className="h-6 w-6 text-success" />
              ) : (
                <Icon className="h-5 w-5 text-brand" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand">SchoolBase</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${isSuccess ? 'bg-emerald-100 text-success' : 'bg-brand/10 text-brand'}`}>
                  {statusLabel}
                </span>
              </div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{title || defaultTitle}</h2>
              <p className="mt-1 text-sm text-muted">
                {isSuccess
                  ? "Your update has been processed successfully."
                  : isConfirmation
                    ? "Please review this action before continuing."
                    : "Please review the details below and continue when you are ready."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowDetails(false);
                onClose();
              }}
              aria-label="Close dialog"
              className="rounded-md p-1.5 text-muted transition hover:bg-white hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 sm:px-7">
          {/** If children provided, render that (allows custom modal content). Otherwise fall back to message/details. */}
          {children ? (
            <div>{children}</div>
          ) : (
            <>
              <p className="text-sm leading-6 text-foreground">{message}</p>

              {details && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      {isSuccess ? "Next steps" : "Details"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDetails(!showDetails)}
                      className="text-xs font-medium text-brand"
                    >
                      {showDetails ? "Hide" : "View"}
                    </button>
                  </div>
                  {showDetails && (
                    <div className="rounded-lg border border-border bg-background p-3">
                      <p className="whitespace-pre-line text-sm text-foreground">{details}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-border bg-background px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
          {action && (
            <button
              type="button"
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className="flex-1 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:border-brand hover:text-brand sm:flex-none"
            >
              {action.label}
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              if (onConfirm) {
                const result = await onConfirm();
                if (result === false) {
                  return;
                }
              }
              if (isSuccess && onSuccessAction) {
                onSuccessAction();
              }
              onClose();
            }}
            disabled={confirmDisabled}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-brand transition-colors sm:flex-none sm:min-w-32 ${confirmDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-brand-hover'}`}
          >
            {confirmLabel ?? (isSuccess ? "Understood" : "Try again")}
          </button>
        </div>
      </div>
    </div>
  );
}

type WindowWithWebkitAudio = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

// Play a short open tone using Web Audio API to avoid external assets.
function playOpenTone() {
  try {
    const win = window as WindowWithWebkitAudio;
    const AudioCtor = win.AudioContext ?? win.webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    const now = ctx.currentTime;

    const playTone = (freq: number, duration: number, gain: number, delay = 0) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);
      gainNode.gain.setValueAtTime(0.0001, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + delay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    playTone(880, 0.16, 0.05, 0);
    playTone(1174, 0.16, 0.05, 0.08);

    setTimeout(() => ctx.close(), 700);
  } catch {
    // ignore
  }
}
