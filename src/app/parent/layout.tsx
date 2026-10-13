'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import SharedLayout from '@/components/shared-layout';
import ParentSkeleton from '@/components/parent-skeleton';
import { getBackendUrl } from '@/lib/backend-url';
import { ParentSchoolProvider } from './parent-school-context';

const nav = [
  { href: "/parent", label: "Dashboard", icon: "Home" },
  { href: "/parent/children", label: "My Children", icon: "Users" },
  { href: "/parent/timetable", label: "Timetable", icon: "CalendarDays" },
  { href: "/parent/results", label: "Results", icon: "BarChart3" },
  { href: "/parent/invoices", label: "Invoices", icon: "FileText" },
  { href: "/parent/payments", label: "Payments", icon: "CreditCard" },
  { href: "/parent/publications", label: "Publications", icon: "BookOpen" },
  {
    href: "/parent/competition",
    label: "Competition",
    icon: "Award",
    badge: "New",
    children: [
      { href: "/parent/competition", label: "Achievements", icon: "Sparkles" },
      { href: "/competition", label: "Practice & WAEC", icon: "BookOpen" },
    ],
  },
  { href: "/parent/school", label: "School Info", icon: "Globe" },
];

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  type ParentSessionState = { id?: string; name?: string; phone?: string };
  type ParentSchoolState = { name?: string; [key: string]: unknown } | null;
  const [session, setSession] = useState<ParentSessionState | null>(null);
  const [school, setSchool] = useState<ParentSchoolState>(null);

  useEffect(() => {
    // Skip verification for login page
    if (pathname === '/parent/login') {
      return;
    }

    let disposed = false;
    let controller: AbortController | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function loadData() {
      try {
        setLoading(true);
        const backendUrl = getBackendUrl();
        
        // Verify parent session with timeout
        controller = new AbortController();
        timeoutId = setTimeout(() => controller?.abort(), 5000);

        try {
          const verifyRes = await fetch(`${backendUrl}/api/parent/verify`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
          });

          const verifyData = await verifyRes.json();
          
          if (!verifyData.authenticated) {
            if (disposed) return;
            router.push('/parent/login');
            return;
          }

          if (disposed) return;
          setSession({
            id: verifyData.guardianId,
            name: verifyData.name,
            phone: verifyData.phone,
          });

          // Fetch school (non-critical)
          const schoolRes = await fetch(`${backendUrl}/api/parent/school`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
          });
          
          if (!disposed && schoolRes.ok) {
            const schoolData = await schoolRes.json();
            setSchool(schoolData);
          }
        } catch (fetchErr) {
          if (disposed || (fetchErr instanceof DOMException && fetchErr.name === 'AbortError')) {
            return;
          }
          console.error('Verify error:', fetchErr);
          router.push('/parent/login');
          return;
        }
      } catch (err) {
        if (disposed) return;
        console.error('Layout error:', err);
        router.push('/parent/login');
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      disposed = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      controller?.abort();
    };
  }, [router, pathname]);

  // For login page, just show children without layout
  if (pathname === '/parent/login') {
    return <>{children}</>;
  }

  if (loading) {
    return <ParentSkeleton />;
  }

  return (
    <ParentSchoolProvider school={school}>
      <SharedLayout
        navItems={nav}
        school={school}
        session={session}
        logoHref="/parent"
        logoutRedirectUrl="/parent/login"
      >
        {children}
      </SharedLayout>
    </ParentSchoolProvider>
  );
}
