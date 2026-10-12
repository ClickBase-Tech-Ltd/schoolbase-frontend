/**
 * Teacher Portal Utilities
 * Handles school type detection and teacher-specific data fetching
 */

import { getBackendUrl } from './backend-url';

export type SchoolPhase = 'EARLY_YEARS' | 'PRIMARY' | 'SECONDARY';

export const TEACHER_TIMETABLE_NAV_ITEM = {
  href: '/teacher/timetable',
  label: 'Timetable',
  icon: 'CalendarDays',
};

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  school: {
    name: string;
    slug: string;
  };
  createdAt: string;
}

export interface TeacherDashboardMetrics {
  pendingResultAssessments: number;
  pendingAttendanceRegisters: number;
  publishedAnnouncements: number;
}

export interface TeacherDashboardData {
  teacher: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  school: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    country: string;
  };
  classes: Array<{
    id: string;
    name: string;
    phase: string;
    arm?: string;
    studentCount: number;
  }>;
  subjects: Array<{
    id: string;
    name: string;
  }>;
  totalStudents: number;
  classCount: number;
  metrics?: TeacherDashboardMetrics;
}

/**
 * Get teacher dashboard data from backend
 */
import { SubscriptionBlockedError, checkSubscriptionError } from './subscription-utils';

export async function getTeacherDashboard(): Promise<TeacherDashboardData> {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/api/teacher/dashboard`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // Check if subscription is blocked
    const subscriptionError = await checkSubscriptionError(response);
    if (subscriptionError) {
      throw new SubscriptionBlockedError(subscriptionError.reason);
    }
    throw new Error('Failed to fetch teacher dashboard');
  }

  return response.json();
}

export async function getTeacherDashboardMetrics(classes: Array<{ id: string }>): Promise<TeacherDashboardMetrics> {
  const backendUrl = getBackendUrl();
  const today = new Date().toISOString().split('T')[0];

  type AssessmentRecord = {
    studentCount?: number | string;
    entryCount?: number | string;
    isLocked?: boolean;
    canEdit?: boolean;
  };

  const [assessmentsResult, announcementsResult] = await Promise.allSettled([
    fetch(`${backendUrl}/api/teacher/assessments`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    fetch(`${backendUrl}/api/teacher/announcements`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  ]);

  let pendingResultAssessments = 0;
  if (assessmentsResult.status === 'fulfilled' && assessmentsResult.value.ok) {
    const payload = await assessmentsResult.value.json();
    const assessments = Array.isArray(payload?.assessments) ? (payload.assessments as AssessmentRecord[]) : [];

    pendingResultAssessments = assessments.filter((assessment: AssessmentRecord) => {
      const studentCount = Number(assessment.studentCount ?? 0);
      const entryCount = Number(assessment.entryCount ?? 0);
      const isLocked = Boolean(assessment.isLocked);
      const canEdit = Boolean(assessment.canEdit);

      return !isLocked && canEdit && entryCount < Math.max(studentCount, 1);
    }).length;
  }

  let publishedAnnouncements = 0;
  if (announcementsResult.status === 'fulfilled' && announcementsResult.value.ok) {
    const payload = await announcementsResult.value.json();
    publishedAnnouncements = Number(payload?.total ?? payload?.announcements?.length ?? 0);
  }

  let pendingAttendanceRegisters = 0;
  if (classes.length > 0) {
    const attendancePromises = classes.map((cls) =>
      fetch(`${backendUrl}/api/teacher/attendance/check?classId=${encodeURIComponent(cls.id)}&date=${encodeURIComponent(today)}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    const attendanceResults = await Promise.allSettled(attendancePromises);
    const attendanceFlags = await Promise.all(
      attendanceResults.map(async (result) => {
        if (result.status !== 'fulfilled' || !result.value.ok) {
          return false;
        }

        try {
          const payload = await result.value.json();
          return !Boolean(payload?.exists);
        } catch {
          return false;
        }
      })
    );

    pendingAttendanceRegisters = attendanceFlags.filter(Boolean).length;
  }

  return {
    pendingResultAssessments,
    pendingAttendanceRegisters,
    publishedAnnouncements,
  };
}

/**
 * Get teacher profile data from backend
 */
export async function getTeacherProfile(): Promise<TeacherProfile> {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/api/teacher/profile`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // Check if subscription is blocked
    const subscriptionError = await checkSubscriptionError(response);
    if (subscriptionError) {
      throw new SubscriptionBlockedError(subscriptionError.reason);
    }
    throw new Error('Failed to fetch teacher profile');
  }

  return response.json();
}

/**
 * Detect school phase based on school data
 * For now, returns PRIMARY as default (backend can enhance this)
 */
export function detectSchoolPhase(schoolData?: unknown): SchoolPhase {
  void schoolData;
  // TODO: Enhance backend to return school phase
  // For now, default to PRIMARY
  // In future: check school.phases or school.schoolPhases
  return 'PRIMARY';
}

/**
 * Get navigation items based on school phase
 */
export function getTeacherNavigation(phase: SchoolPhase) {
  const baseNav = [
    { href: '/teacher', label: 'Dashboard', icon: 'LayoutDashboard' },
    { href: '/teacher/students', label: 'Students', icon: 'Users' },
    { href: '/teacher/subjects', label: 'Subjects', icon: 'BookOpen' },
    { href: '/teacher/attendance', label: 'Attendance', icon: 'ClipboardList' },
    { href: '/teacher/competition', label: 'Competition', icon: 'Award', badge: 'New' },
    { href: '/teacher/timetable', label: 'Timetable', icon: 'CalendarDays' },
    { href: '/teacher/announcements', label: 'Announcements', icon: 'Megaphone' },
    { href: '/teacher/profile', label: 'Profile', icon: 'UserCircle' },
    { href: '/teacher/settings', label: 'Settings', icon: 'Settings' },
    { href: '/teacher/school', label: 'School', icon: 'Building2' },
  ];

  const phaseSpecific = {
    EARLY_YEARS: [
      { href: '/teacher/children', label: 'Children', icon: 'Baby' },
      { href: '/teacher/observations', label: 'Observations', icon: 'Eye' },
      { href: '/teacher/daily-reports', label: 'Daily Reports', icon: 'FileText' },
      { href: '/teacher/results', label: 'Results', icon: 'BarChart3' },
    ],
    PRIMARY: [
      { href: '/teacher/class', label: 'My Class', icon: 'BookOpen' },
      { href: '/teacher/results', label: 'Results', icon: 'FileText' },
      { href: '/teacher/comments', label: 'Comments', icon: 'PenTool' },
    ],
    SECONDARY: [
      { href: '/teacher/results', label: 'Results', icon: 'FileText' },
      { href: '/teacher/exams', label: 'Exams', icon: 'ClipboardCheck' },
    ],
  };

  return {
    base: baseNav,
    phase: phaseSpecific[phase] || [],
    all: [...baseNav.slice(0, 1), ...phaseSpecific[phase] || [], ...baseNav.slice(1)],
  };
}

/**
 * Mobile navigation for teacher portal
 */
export function getTeacherMobileNav(phase: SchoolPhase) {
  const mobileNav = {
    EARLY_YEARS: [
      { href: '/teacher', label: '🏠 Home' },
      { href: '/teacher/students', label: '👥 Students' },
      { href: '/teacher/subjects', label: '📚 Subjects' },
      { href: '/teacher/children', label: '👶 Children' },
      { href: '/teacher/attendance', label: '✅ Attendance' },
      { href: '/teacher/timetable', label: '🗓️ Timetable' },
      { href: '/teacher/results', label: '📊 Results' },
      { href: '/teacher/announcements', label: '📢 Announcements' },
      { href: '/teacher/profile', label: '👤 Profile' },
      { href: '/teacher/settings', label: '⚙️ Settings' },
      { href: '/teacher/school', label: '🏫 School' },
    ],
    PRIMARY: [
      { href: '/teacher', label: '🏠 Home' },
      { href: '/teacher/students', label: '👥 Students' },
      { href: '/teacher/subjects', label: '📚 Subjects' },
      { href: '/teacher/class', label: '🏫 Class' },
      { href: '/teacher/attendance', label: '✅ Attendance' },
      { href: '/teacher/timetable', label: '🗓️ Timetable' },
      { href: '/teacher/results', label: '📊 Results' },
      { href: '/teacher/profile', label: '👤 Profile' },
      { href: '/teacher/settings', label: '⚙️ Settings' },
      { href: '/teacher/school', label: '🏢 School' },
    ],
    SECONDARY: [
      { href: '/teacher', label: '🏠 Home' },
      { href: '/teacher/students', label: '👥 Students' },
      { href: '/teacher/subjects', label: '📚 Subjects' },
      { href: '/teacher/results', label: '📝 Results' },
      { href: '/teacher/attendance', label: '✅ Attendance' },
      { href: '/teacher/timetable', label: '🗓️ Timetable' },
      { href: '/teacher/profile', label: '👤 Profile' },
      { href: '/teacher/settings', label: '⚙️ Settings' },
      { href: '/teacher/school', label: '🏢 School' },
    ],
  };

  return mobileNav[phase] || mobileNav.PRIMARY;
}
