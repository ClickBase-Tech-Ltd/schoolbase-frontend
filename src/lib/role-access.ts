export type SchoolBaseRole =
  | 'SCHOOL_ADMIN'
  | 'BURSAR'
  | 'TEACHER'
  | 'STAFF'
  | 'PARENT'
  | 'STUDENT'
  | 'PLATFORM_ADMIN';

export type RoleRequirement = readonly SchoolBaseRole[] | null;

const ACCOUNTING_ROLES: readonly SchoolBaseRole[] = ['BURSAR'];
const SHARED_SCHOOL_ASSET_ROLES: readonly SchoolBaseRole[] = [
  'SCHOOL_ADMIN',
  'BURSAR',
  'TEACHER',
  'PARENT',
  'STUDENT',
];

function isWithin(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function roleRequirementForPath(pathname: string, method = 'GET'): RoleRequirement {
  const normalizedMethod = method.toUpperCase();

  if (pathname === '/parent/login' || pathname === '/schoolbase-admin/login') return null;

  if (pathname === '/api/admin/verify'
    || pathname === '/api/admin/login'
    || pathname === '/api/admin/request-password-reset'
    || pathname === '/api/admin/reset-password'
    || (pathname === '/api/admin/impersonate' && normalizedMethod === 'POST')) return null;

  if (pathname === '/api/parent/login' || pathname === '/api/parent/verify') return null;

  if (isWithin(pathname, '/schoolbase-admin') || isWithin(pathname, '/schoolbase-admin/api')) {
    return ['PLATFORM_ADMIN'];
  }
  if (isWithin(pathname, '/accounting') || isWithin(pathname, '/api/bursar')) {
    return ACCOUNTING_ROLES;
  }
  if (pathname === '/employee/profile' || pathname === '/api/staff/me') return ['STAFF', 'TEACHER', 'BURSAR'];
  if (isWithin(pathname, '/teacher') || isWithin(pathname, '/api/teacher')) return ['TEACHER'];
  if (isWithin(pathname, '/api/staff/attendance') || isWithin(pathname, '/staff/attendance')) return ['STAFF', 'TEACHER'];
  if (isWithin(pathname, '/staff') || isWithin(pathname, '/api/staff')) return ['STAFF'];
  if (isWithin(pathname, '/parent') || isWithin(pathname, '/api/parent')) return ['PARENT'];

  if (isWithin(pathname, '/api/admin')) {
    if (/^\/api\/admin\/(school-logo|school-stamp|school-signature)(\/|$)/.test(pathname)) {
      return SHARED_SCHOOL_ASSET_ROLES;
    }
    if (/^\/api\/admin\/(fees|invoices)(\/|$)/.test(pathname)) return ['SCHOOL_ADMIN', 'BURSAR'];
    if (/^\/api\/admin\/school\/[^/]+$/.test(pathname)) return ['SCHOOL_ADMIN', 'BURSAR'];
    return ['SCHOOL_ADMIN'];
  }

  if (isWithin(pathname, '/admin')) return ['SCHOOL_ADMIN'];
  return null;
}

export function roleCanAccess(requirement: RoleRequirement, role?: string | null) {
  if (requirement === null) return true;
  return typeof role === 'string' && requirement.includes(role as SchoolBaseRole);
}

export function portalForRole(role?: string | null): string {
  switch (role) {
    case 'SCHOOL_ADMIN': return '/admin';
    case 'BURSAR': return '/accounting';
    case 'TEACHER': return '/teacher';
    case 'STAFF': return '/staff';
    case 'PARENT': return '/parent';
    case 'PLATFORM_ADMIN': return '/schoolbase-admin';
    default: return '/login';
  }
}

export function loginForPath(pathname: string): string {
  if (isWithin(pathname, '/parent')) return '/parent/login';
  if (isWithin(pathname, '/schoolbase-admin')) return '/schoolbase-admin/login';
  return '/login';
}