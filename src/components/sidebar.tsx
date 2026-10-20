"use client";

import Image from "next/image";
import { createElement, type ComponentType, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { LogoutButton } from "@/components/logout-button";
import { resolveSchoolAssetUrl } from "@/lib/asset-urls";
import {
  Home,
  LayoutDashboard,
  BookOpen,
  BookMarked,
  FileText,
  ClipboardList,
  Users,
  Bell,
  Mail,
  UserCircle,
  CreditCard,
  GraduationCap,
  BarChart3,
  Settings,
  Globe,
  Layers,
  HelpCircle,
  CheckCircle2,
  MessageSquare,
  PenTool,
  Building2,
  Baby,
  Eye,
  ClipboardCheck,
  TrendingUp,
  Award,
  Megaphone,
  Send,
  Sparkles,
  CalendarDays,
  CheckSquare,
  MoonStar,
  SunMedium,
  Calculator,
  Clock,
  Music,
  Activity,
  WalletCards,
  QrCode,
  Star,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/icons";

type NavItem = {
  href: string;
  label: string;
  icon: string | ComponentType<{ className?: string }>;
  section?: string;
  badge?: string;
  children?: NavItem[];
};

type WorkspaceTool = "notes" | "calculator" | "reminders" | "timer";

const icons: Record<string, ComponentType<{ className?: string }>> = {
  Home,
  LayoutDashboard,
  BookOpen,
  BookMarked,
  FileText,
  ClipboardList,
  Users,
  Bell,
  Mail,
  UserCircle,
  CreditCard,
  GraduationCap,
  WhatsApp: WhatsAppIcon,
  BarChart3,
  Settings,
  Globe,
  Layers,
  HelpCircle,
  MessageSquare,
  PenTool,
  Building2,
  Baby,
  Eye,
  ClipboardCheck,
  TrendingUp,
  Award,
  Megaphone,
  Send,
  Sparkles,
  CalendarDays,
  CheckSquare,
  Activity,
  WalletCards,
  QrCode,
  Star,
};

export default function Sidebar({
  navItems,
  school,
  session,
  logoHref = "/",
  logoutRedirectUrl = "/login",
  setupProgress,
  actualTheme = "light",
  onThemeToggle,
  toolsOpen = false,
  onToolsToggle,
  onToolSelect,
  onAudioOpen,
  isMobile = false,
  onClose,
}: {
  navItems: NavItem[];
  school?: { name?: string | null; city?: string | null; country?: string | null; logoUrl?: string | null } | null;
  session?: { name?: string } | null;
  logoHref?: string;
  logoutRedirectUrl?: string;
  setupProgress?: number | null;
  actualTheme?: "light" | "dark";
  onThemeToggle?: () => void;
  toolsOpen?: boolean;
  onToolsToggle?: () => void;
  onToolSelect?: (tool: WorkspaceTool) => void;
  onAudioOpen?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [failedSchoolLogo, setFailedSchoolLogo] = useState<string | null>(null);
  const resolvedSchoolLogo = school?.logoUrl ? resolveSchoolAssetUrl(school.logoUrl) : null;
  const schoolLogo = resolvedSchoolLogo && resolvedSchoolLogo !== failedSchoolLogo ? resolvedSchoolLogo : null;
  const schoolName = school?.name || "SchoolBase";
  const portalName = logoHref.startsWith("/parent")
    ? "Parent portal"
    : logoHref.startsWith("/accounting")
      ? "Finance workspace"
      : logoHref.startsWith("/teacher")
        ? "Teacher workspace"
        : logoHref.startsWith("/schoolbase-admin")
          ? "Platform admin"
          : "School admin";
  const schoolContext = [session?.name ?? "Staff", school?.city ?? school?.country].filter(Boolean).join(" · ");
  const normalizedProgress = typeof setupProgress === "number" ? Math.max(0, Math.min(100, setupProgress)) : 0;
  const isSetupComplete = normalizedProgress >= 100;
  const progressCircumference = 2 * Math.PI * 10;
  const navItemsWithSectionVisibility = navItems.map((item, index) => ({
    ...item,
    sectionLabel: item.section,
    showSection: Boolean(item.section && (index === 0 || navItems[index - 1].section !== item.section)),
  }));

  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <aside className={`relative flex h-[100dvh] min-h-0 w-64 flex-col border-r border-border bg-surface overflow-hidden print:hidden ${
      isMobile ? "" : "hidden md:flex"
    }`}>
      {onThemeToggle ? (
        <button
          type="button"
          onClick={onThemeToggle}
          title={actualTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={actualTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="absolute right-0 top-1/2 z-20 flex h-14 w-6 -translate-y-1/2 cursor-pointer items-center justify-center border border-r-0 border-brand bg-brand text-white shadow-sm transition hover:bg-brand-hover"
        >
          {actualTheme === "dark" ? <SunMedium className="h-3.5 w-3.5" /> : <MoonStar className="h-3.5 w-3.5" />}
        </button>
      ) : null}
      <div className="border-b border-border px-4 py-4 flex-shrink-0">
        <Link href={logoHref} className="group flex items-center gap-3 px-1 py-1 transition-colors">
          {schoolLogo ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white shadow-sm">
              <Image src={schoolLogo} alt={schoolName} width={40} height={40} className="h-full w-full object-contain p-1" unoptimized onError={() => setFailedSchoolLogo(schoolLogo)} />
            </div>
          ) : (
            <AppLogo size="md" showText={false} href={null} />
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-brand">{portalName}</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground group-hover:text-brand">{schoolName}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted">{schoolContext || "Workspace"}</p>
          </div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItemsWithSectionVisibility.map(({ href, label, icon, sectionLabel, showSection, badge, children }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const childActive = Array.isArray(children) && children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
          const isParentActive = isActive || childActive;
          const IconComponent = typeof icon === "string" ? icons[icon] : icon;
          const progressRingColor = isSetupComplete ? "text-emerald-500" : isParentActive ? "text-brand" : "text-muted/70";

          return (
            <div key={href}>
              {showSection ? (
                <div className="px-2 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[.18em] text-muted first:pt-0">
                  {sectionLabel}
                </div>
              ) : null}
              <div>
                <Link
                  href={href}
                  onClick={handleNavClick}
                  aria-current={isParentActive ? "page" : undefined}
                  className={`group relative flex cursor-pointer items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    isParentActive
                      ? "border-brand bg-brand-light font-semibold text-brand"
                      : "border-transparent text-muted hover:border-brand/30 hover:bg-brand-light hover:text-brand"
                  }`}
                >
                  {href === "/admin/getting-started" ? (
                    <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                      <svg viewBox="0 0 24 24" className={`h-5 w-5 -rotate-90 ${progressRingColor}`}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.22" />
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={progressCircumference}
                          strokeDashoffset={progressCircumference - (progressCircumference * normalizedProgress) / 100}
                        />
                      </svg>
                      {isSetupComplete ? (
                        <CheckCircle2 className="absolute h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Sparkles className="absolute h-3 w-3 text-brand" />
                      )}
                    </div>
                  ) : IconComponent ? createElement(IconComponent, { className: "h-4 w-4" }) : null}
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {badge ? <span className="shrink-0 border border-brand/25 bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-brand">{badge}</span> : null}
                </Link>

                {Array.isArray(children) && children.length > 0 && (isParentActive || pathname.startsWith(`${href}/`)) ? (
                  <div className="ml-5 space-y-1 border-l border-border pl-3 pt-1 pb-1">
                    {children.map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={handleNavClick}
                          aria-current={childActive ? "page" : undefined}
                          className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            childActive
                              ? "bg-brand-light text-brand"
                              : "text-muted hover:bg-background hover:text-foreground"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="relative border-t border-border bg-background px-3 py-3 flex-shrink-0">
        {onToolsToggle ? (
          <div className="relative mb-2">
            {toolsOpen ? (
              <div className="absolute bottom-full left-0 right-0 mb-2 grid grid-cols-5 gap-1 rounded-lg border border-border bg-surface p-2 shadow-lg">
                {[
                  ["notes", FileText, "Notes"],
                  ["calculator", Calculator, "Calculator"],
                  ["reminders", Bell, "Reminders"],
                  ["timer", Clock, "Timer"],
                  ["audio", Music, "Audio player"],
                ].map(([tool, Icon, label]) => (
                  <button
                    key={tool as string}
                    type="button"
                    onClick={() => tool === "audio" ? onAudioOpen?.() : onToolSelect?.(tool as WorkspaceTool)}
                    title={label as string}
                    aria-label={label as string}
                    className="flex h-9 cursor-pointer items-center justify-center rounded-md bg-brand-light text-brand transition hover:bg-brand/15"
                  >
                    {createElement(Icon as ComponentType<{ className?: string }>, { className: "h-4 w-4" })}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={onToolsToggle}
              aria-expanded={toolsOpen}
              className="flex w-full cursor-pointer items-center gap-3 border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-light hover:text-brand"
            >
              <Sparkles className="h-4 w-4" />
              <span>Tools</span>
            </button>
          </div>
        ) : null}
        <LogoutButton redirectUrl={logoutRedirectUrl} />
      </div>
    </aside>
  );
}
