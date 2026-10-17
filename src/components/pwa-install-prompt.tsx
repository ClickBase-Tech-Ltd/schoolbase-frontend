"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    MSStream?: unknown;
  }
}

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function getInstallInstructions() {
  const userAgent = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) {
    return "In Safari, tap Share, then Add to Home Screen. Open SchoolBase from its new Home Screen icon to use it as an app.";
  }
  if (/Android/i.test(userAgent)) {
    return "Open the browser menu and tap Install app or Add to Home screen. If it is missing, update Chrome and open this page directly in Chrome.";
  }
  if (/Chrome|Edg/i.test(userAgent)) {
    return "Use the install icon in the address bar, or open the browser menu and choose Install SchoolBase.";
  }
  if (/Safari/i.test(userAgent)) {
    return "Use Safari's Share menu and choose Add to Dock. For the full install prompt, open SchoolBase in Chrome or Edge.";
  }
  return "Open this page in Chrome or Edge, then use the browser menu to install SchoolBase as an app.";
}

export default function PwaInstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isInstalled()) {
      setInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isInstalled()) {
        setInstalled(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowInstallHelp((visible) => !visible);
      return;
    }

    const prompt = installPrompt;
    setInstallPrompt(null);
    setShowInstallHelp(false);

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "dismissed") {
        setShowInstallHelp(true);
      }
    } catch {
      setShowInstallHelp(true);
    }
  };

  if (!mounted || installed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] print:hidden">
      {showInstallHelp && (
        <section
          id="schoolbase-install-help"
          aria-label="Install SchoolBase"
          role="status"
          className="absolute bottom-full right-0 mb-3 w-[min(21rem,calc(100vw-2rem))] rounded-xl border border-border bg-white p-4 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Install SchoolBase</h2>
              <p className="mt-1 text-sm leading-5 text-muted">{getInstallInstructions()}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowInstallHelp(false)}
              aria-label="Close installation instructions"
              className="rounded-md p-1 text-muted transition hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}
      <button
        type="button"
        onClick={handleInstall}
        aria-label="Install SchoolBase"
        aria-expanded={showInstallHelp}
        aria-controls={showInstallHelp ? "schoolbase-install-help" : undefined}
        title="Install SchoolBase"
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand bg-brand text-white shadow-md transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <Download className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}