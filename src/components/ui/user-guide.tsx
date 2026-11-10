"use client";

import { AlertCircle, HelpCircle, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

type HelpLevel = "basic" | "detailed";

export interface HelpGuideItem {
  title: string;
  description: string;
  example?: string;
  tips?: string[];
}

export interface PageHelpGuide {
  title: string;
  overview: string;
  steps?: string[];
  commonTasks?: HelpGuideItem[];
  faqs?: { question: string; answer: string }[];
  videoUrl?: string;
}

type RegisteredPageHelpGuide = {
  id: number;
  guide: PageHelpGuide;
};

const pageHelpGuideListeners = new Set<() => void>();
let registeredPageHelpGuide: RegisteredPageHelpGuide | null = null;
let nextPageHelpGuideId = 0;

function subscribeToPageHelpGuide(onChange: () => void) {
  pageHelpGuideListeners.add(onChange);
  return () => {
    pageHelpGuideListeners.delete(onChange);
  };
}

function getRegisteredPageHelpGuide() {
  return registeredPageHelpGuide?.guide ?? null;
}

function getServerPageHelpGuide() {
  return null;
}

export function useActivePageHelpGuide() {
  return useSyncExternalStore(subscribeToPageHelpGuide, getRegisteredPageHelpGuide, getServerPageHelpGuide);
}

function registerPageHelpGuide(guide: PageHelpGuide) {
  const registration = { id: ++nextPageHelpGuideId, guide };
  registeredPageHelpGuide = registration;
  pageHelpGuideListeners.forEach((onChange) => onChange());
  return () => {
    if (registeredPageHelpGuide?.id !== registration.id) return;
    registeredPageHelpGuide = null;
    pageHelpGuideListeners.forEach((onChange) => onChange());
  };
}

export function UserGuide({ guide }: { guide: PageHelpGuide }) {
  const [isOpen, setIsOpen] = useState(false);
  const [helpLevel, setHelpLevel] = useState<HelpLevel>("basic");

  useEffect(() => registerPageHelpGuide(guide), [guide]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#0A66C2] text-white shadow-lg transition-colors hover:bg-[#0858a8] print:hidden"
        title="Open User Guide"
        aria-label="User guide"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {isOpen && (
        <aside
          className="fixed right-0 top-0 z-50 h-screen w-full max-w-md overflow-y-auto border-l border-border bg-surface shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-guide-title"
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
            <h2 id="user-guide-title" className="text-lg font-semibold text-foreground">
              Help &amp; Guide
            </h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 transition-colors hover:bg-background"
              aria-label="Close user guide"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 p-6">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHelpLevel("basic")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  helpLevel === "basic"
                    ? "bg-primary text-white"
                    : "bg-background text-muted hover:bg-border"
                }`}
              >
                Basic
              </button>
              <button
                type="button"
                onClick={() => setHelpLevel("detailed")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  helpLevel === "detailed"
                    ? "bg-primary text-white"
                    : "bg-background text-muted hover:bg-border"
                }`}
              >
                Detailed
              </button>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{guide.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{guide.overview}</p>
            </div>

            {guide.steps && helpLevel === "detailed" && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Quick Steps
                </h4>
                <ol className="space-y-2">
                  {guide.steps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <p className="pt-0.5 text-sm leading-relaxed text-muted">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {guide.commonTasks && helpLevel === "detailed" && (
              <div>
                <h4 className="mb-3 font-semibold text-foreground">Common Tasks</h4>
                <div className="space-y-3">
                  {guide.commonTasks.map((task, index) => (
                    <div key={index} className="rounded-lg border border-border bg-background p-3">
                      <h5 className="text-sm font-semibold text-foreground">{task.title}</h5>
                      <p className="mt-1 text-xs text-muted">{task.description}</p>
                      {task.tips && (
                        <ul className="mt-2 space-y-1">
                          {task.tips.map((tip, tipIndex) => (
                            <li key={tipIndex} className="flex gap-1 text-xs text-muted">
                              <span>•</span><span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {task.example && (
                        <p className="mt-2 rounded bg-foreground/5 px-2 py-1 font-mono text-xs text-muted">{task.example}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {guide.faqs && (
              <div>
                <h4 className="mb-3 font-semibold text-foreground">FAQs</h4>
                <div className="space-y-3">
                  {guide.faqs.map((faq, index) => (
                    <details key={index} className="group rounded-lg border border-border p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-foreground transition-colors hover:text-primary">
                        {faq.question}
                      </summary>
                      <p className="mt-2 text-xs leading-relaxed text-muted">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {guide.videoUrl && (
              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs text-muted">Watch tutorial:</p>
                <a href={guide.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm text-primary hover:underline">
                  View Tutorial →
                </a>
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="mb-2 text-xs text-muted">Browse all tutorials:</p>
              <a href="/video-tutorials" target="_blank" rel="noopener noreferrer" className="inline-flex text-sm text-primary hover:underline">
                Video Library →
              </a>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted">
                <strong>Pro Tip:</strong> Use Help &amp; Guide on any page for section-specific instructions.
              </p>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
