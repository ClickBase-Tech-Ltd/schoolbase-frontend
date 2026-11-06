/**
 * Get the backend URL based on environment
 * - Explicit env var: use NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BACKEND_URL
 * - Client-side: detect from window.location.hostname
 * - Server-side: use sensible defaults
 */
function normalizeBackendUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').replace(/\/api$/, '');
}

export function getBackendUrl(): string {
  // Protected routes must stay on the same origin so the browser keeps the
  // authenticated session cookie attached while the Next.js proxy forwards
  // requests to the backend. This avoids direct backend calls from admin,
  // accounting, teacher, parent, and platform-admin pages.
  if (typeof window !== 'undefined') {
    const protectedPrefixes = ['/admin', '/accounting', '/teacher', '/parent', '/schoolbase-admin', '/country-admin'];
    const pathname = window.location.pathname || '/';

    const isParentLoginPage = pathname === '/parent/login';
    if (!isParentLoginPage && protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return window.location.origin;
    }
  }

  // Do not let production values from the shared .env file redirect local
  // server-side requests to the live API.
  if (process.env.NODE_ENV !== 'production') {
    return process.env.BACKEND_URL || 'http://localhost:3006';
  }

  // First, check if explicitly set in environment
  if (process.env.NEXT_PUBLIC_API_URL) {
    return normalizeBackendUrl(process.env.NEXT_PUBLIC_API_URL);
  }

  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return normalizeBackendUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
  }

  // Allow server-side BACKEND_URL fallback if only backend env is defined.
  if (process.env.BACKEND_URL) {
    return normalizeBackendUrl(process.env.BACKEND_URL);
  }

  if (process.env.API_URL) {
    return normalizeBackendUrl(process.env.API_URL);
  }

  if (process.env.BACKEND_API_URL) {
    return normalizeBackendUrl(process.env.BACKEND_API_URL);
  }

  // Client-side: detect from window.location
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;

    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return 'http://localhost:3006';
    }

    if (host.includes('schoolbase.live')) {
      return 'https://api.schoolbase.live';
    }

  }

  // Server-side or fallback: use NODE_ENV-based default
  if (process.env.NODE_ENV === 'production') {
    return 'https://api.schoolbase.live';
  }

  return 'http://localhost:3006';
}
