import Link from "next/link";
import { Linkedin, Facebook, Mail, MessageCircle } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { PublicMobileMenu } from "@/components/public-mobile-menu";
import { getStaffSession, getParentSession } from "@/lib/auth";

export default async function Header() {
  const staff = await getStaffSession();
  const parent = await getParentSession();
  const isLoggedIn = Boolean(staff || parent);

  if (isLoggedIn) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        {/* Top bar with social links - hide for logged-in users */}
        {!isLoggedIn && (
          <div className="hidden md:flex justify-between items-center text-xs text-muted mb-2 pb-2 border-b border-border/30">
            <div>
              Built for West African schools by ClickBase Technologies Ltd.
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.linkedin.com/company/106371744/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-brand flex items-center gap-1"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
              <a
                href="https://web.facebook.com/profile.php?id=61577572757498"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-brand flex items-center gap-1"
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </a>
              <a
                href="mailto:support@schoolbase.live"
                className="text-muted hover:text-brand flex items-center gap-1"
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
              <a
                href="https://wa.me/234903 225 0338"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-brand flex items-center gap-1"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Main header - shown only on public pages (no logged-in session) */}
        {!isLoggedIn && (
          <div className="flex items-center justify-between gap-4">
            <AppLogo />

            {/* Navigation */}
            <nav className="hidden items-center gap-5 text-sm font-medium text-muted lg:flex">
              <Link href="/platform" className="hover:text-brand">
                Platform
              </Link>
              <Link href="/solutions" className="hover:text-brand">
                Solutions
              </Link>
              <Link href="/compare" className="hover:text-brand">
                Compare
              </Link>
              <Link href="/for-principals" className="hover:text-brand">
                For Your Role
              </Link>
              <Link href="/how-to-use-schoolbase" className="hover:text-brand">
                How to use
              </Link>
              <Link href="/blog" className="hover:text-brand">
                Blog
              </Link>
              <a
                href="https://clickbasegroup.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand"
              >
                ClickBase
              </a>
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center gap-2">
              <PublicMobileMenu />
              <div className="hidden items-center gap-3 lg:flex">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-muted hover:text-brand"
                >
                  School login
                </Link>
                <Link
                  href="/parent/login"
                  className="text-sm font-semibold text-muted hover:text-brand"
                >
                  Parent login
                </Link>
              </div>
              <Link
                href="/signup"
                className="inline-flex px-4 py-2.5 bg-brand text-white rounded-lg font-semibold hover:bg-brand-hover text-sm sm:px-5"
              >
                Get started
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
