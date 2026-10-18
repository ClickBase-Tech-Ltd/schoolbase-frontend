'use client';

import { useEffect, useState } from 'react';
import SharedLayout from '@/components/shared-layout';
import PendingSchoolModal from '@/components/pending-school-modal';
import SubscriptionModal from '@/components/subscription-modal';
import AdminSkeleton from '@/components/ui/skeleton';
import AdmissionNotificationCenter from '@/components/admission-notification-center';

const baseNav = [
  { href: "/admin/getting-started", label: "Setup your workspace", icon: "Sparkles" },
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/fees", label: "Fees", icon: "CreditCard" },
  { href: "/admin/id-cards", label: "ID Cards", icon: "WalletCards", badge: "New" },
  { href: "/admin/students", label: "Students", icon: "Users" },
  { href: "/admin/classes", label: "Classes", icon: "Layers" },
  { href: "/admin/staff", label: "Staff", icon: "Users" },
  { href: "/admin/subjects", label: "Subjects", icon: "BookOpen" },
  { href: "/admin/results", label: "Results", icon: "GraduationCap" },
  {
    href: "/admin/competition",
    label: "Competition",
    icon: "Award",
    badge: "New",
  },
  { href: "/admin/admissions", label: "Admissions", icon: "GraduationCap" },
  { href: "/admin/promotions", label: "Promotions", icon: "TrendingUp" },
  { href: "/admin/analytics", label: "Analytics", icon: "BarChart3" },
  {
    href: "/admin/attendance",
    label: "Attendance Hub",
    icon: "ClipboardList",
    badge: "New",
    children: [
      { href: "/admin/attendance/students", label: "Student attendance", icon: "Users" },
      { href: "/admin/staff-attendance", label: "Staff attendance", icon: "Users" },
      { href: "/admin/staff-attendance/stations", label: "Attendance stations", icon: "QrCode" },
    ],
  },
  { href: "/admin/activities", label: "Activities", icon: "Sparkles" },
  { href: "/admin/timetable", label: "Timetable", icon: "CalendarDays" },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: "WhatsApp" },
  { href: "/admin/support", label: "Support", icon: "HelpCircle" },
  { href: "/admin/website", label: "Announcements", icon: "Globe" },
  { href: "/admin/subscription", label: "Subscription", icon: "CreditCard" },
  { href: "/admin/settings", label: "Settings", icon: "Settings" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState<{ reason: string } | null>(null);
  const [session, setSession] = useState<{ id?: string; email?: string; name?: string; role?: string } | null>(null);
  const [school, setSchool] = useState<{ name?: string; status?: string; [key: string]: unknown } | null>(null);
  const [showGettingStarted, setShowGettingStarted] = useState(true);
  const [setupProgress, setSetupProgress] = useState<number | null>(null);

  async function exchangeImpersonationToken(impersonationToken: string) {
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: impersonationToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Impersonation exchange failed:', {
          status: response.status,
          responseData: data,
          impersonationToken,
        });
        throw new Error(data?.error || data?.message || 'Impersonation exchange failed');
      }
      if (!data?.success) {
        console.error('Impersonation exchange returned no success flag:', {
          responseData: data,
          impersonationToken,
        });
        throw new Error(data?.error || data?.message || 'Impersonation exchange failed');
      }
      console.log('[AdminLayout] Impersonation exchange succeeded:', {
        schoolId: data.schoolId,
        redirectUrl: data.redirectUrl,
      });
      return data;
    } catch (err) {
      console.error('Impersonation exchange error:', err, { impersonationToken });
      throw err;
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          const impersonationToken = url.searchParams.get('impersonate');
          if (impersonationToken) {
            await exchangeImpersonationToken(impersonationToken);
            url.searchParams.delete('impersonate');
            window.history.replaceState({}, '', url.toString());
          }
        }

        // Fetch session
        const sessionRes = await fetch('/api/admin/verify', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        const sessionData = await sessionRes.json();
        
        if (!sessionData.authenticated) {
          // Use window.location.href for full page reload with proper cookie handling
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return;
        }

        setSession({
          id: sessionData.session.userId,
          email: sessionData.session.email,
          name: sessionData.session.name,
          role: sessionData.session.role,
        });

        const sessionRole = sessionData.session?.role;
        if (sessionRole === 'PLATFORM_ADMIN') {
          console.log('[AdminLayout] Platform admin session detected; redirecting to platform admin portal.');
          if (typeof window !== 'undefined') {
            window.location.href = '/schoolbase-admin';
          }
          return;
        }

        const schoolId = sessionData.session?.schoolId;
        if (!schoolId) {
          console.error('[AdminLayout] Verified session missing schoolId:', sessionData.session);
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return;
        }

        console.log('[AdminLayout] Loading school data for schoolId:', schoolId);

        // Fetch school
        const schoolRes = await fetch(`/api/admin/school/${encodeURIComponent(schoolId)}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!schoolRes.ok) {
          const errorBody = await schoolRes.json().catch(() => null);
          
          // Check if subscription is blocked
          if (schoolRes.status === 403 && errorBody?.code === 'SUBSCRIPTION_INACTIVE') {
            setSubscriptionBlocked({ reason: errorBody.reason || 'Your school subscription is not active' });
          } else {
            setError(errorBody?.error || 'School not found');
          }
          setLoading(false);
          return;
        }

        const schoolData = await schoolRes.json();
        setSchool(schoolData);

        try {
          const setupStatusRes = await fetch(`/api/admin/school/${encodeURIComponent(schoolId)}/setup-status`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });
          if (setupStatusRes.ok) {
            const setupStatusData = await setupStatusRes.json().catch(() => null);
            setShowGettingStarted(setupStatusData?.isComplete !== true);
            setSetupProgress(typeof setupStatusData?.completionPercentage === 'number' ? setupStatusData.completionPercentage : null);
          } else {
            setShowGettingStarted(true);
            setSetupProgress(null);
          }
        } catch (setupErr) {
          console.error('Error loading setup status for sidebar:', setupErr);
          setShowGettingStarted(true);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading layout data:', err);
        setError('Failed to load data');
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSkeleton />
      </div>
    );
  }

  if (subscriptionBlocked) {
    return <SubscriptionModal reason={subscriptionBlocked.reason} />;
  }

  if (error || !session || !school) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load admin area'}</p>
          <button 
            onClick={() => { 
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
            }}
            className="px-4 py-2 bg-brand text-white rounded hover:bg-brand/90"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const navItems = baseNav;

  return (
    <>
      <SharedLayout
        navItems={navItems}
        school={school}
        session={session}
        setupProgress={setupProgress}
        logoHref="/admin"
        logoutRedirectUrl="/login"
      >
        <PendingSchoolModal schoolStatus={school.status} schoolName={school.name} />
        {showGettingStarted && <PendingSchoolModal schoolStatus={school.status} schoolName={school.name} />}
        {session.role === 'SCHOOL_ADMIN' ? <AdmissionNotificationCenter /> : null}
        {children}
      </SharedLayout>
    </>
  );
}
