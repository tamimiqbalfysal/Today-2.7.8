
'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';

// Routes that MUST have an authenticated user.
const PROTECTED_ROUTES = [
  '/today',
  '/profile',
  '/add',
  '/admin',
  '/thank-you',
  '/marketplace',
  '/tribe',
  '/office-express/create',
  '/roktim',
  '/chat',
];

// Dynamic routes that are protected.
const DYNAMIC_PROTECTED_ROUTES_PREFIX = [
  '/admin/',
  '/chat/'
];

export function RootGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // A route is protected if it's in PROTECTED_ROUTES or starts with a prefix from DYNAMIC_PROTECTED_ROUTES_PREFIX,
  // but we must ensure we don't double-protect a base route that is also a prefix.
  // For example, '/chat' is in PROTECTED_ROUTES, and we don't want to double-check '/chat/'.
  const isDynamicProtected = DYNAMIC_PROTECTED_ROUTES_PREFIX.some(p => pathname.startsWith(p) && pathname !== p);

  const isProtectedRoute = PROTECTED_ROUTES.includes(pathname) || isDynamicProtected;

  if (isProtectedRoute) {
    return <AuthGuard>{children}</AuthGuard>;
  }
  
  return <>{children}</>;
}
