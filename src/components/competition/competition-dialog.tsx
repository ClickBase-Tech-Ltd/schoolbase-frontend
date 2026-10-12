"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type CompetitionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "medium" | "large";
};

export default function CompetitionDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "medium",
}: CompetitionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] border-0 bg-transparent p-0 text-foreground backdrop:bg-slate-950/50 backdrop:backdrop-blur-[2px] ${size === "large" ? "max-w-3xl" : "max-w-xl"}`}
    >
      <section className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">{title}</h2>
            {description ? <p id={descriptionId} className="mt-1 text-sm leading-5 text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted transition hover:border-brand/40 hover:bg-background hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </section>
    </dialog>
  );
}