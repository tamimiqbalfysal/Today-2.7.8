
'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';

// Routes that MUST have an authenticated user.
const PROTECTED_ROUTES = [
  '/today',
  '/profile',
  '/add',
  '/thank-you',
  '/tribe',
  '/office-express/create',
  '/roktim',
  '/chat',
];

// Routes that require admin privileges
const ADMIN_ROUTES = [
    '/admin',
];

// Dynamic routes that are protected.
const DYNAMIC_PROTECTED_ROUTES_PREFIX = [
  '/chat/'
];

const DYNAMIC_ADMIN_ROUTES_PREFIX = [
    '/admin/',
];

export function RootGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isDynamicProtected = DYNAMIC_PROTECTED_ROUTES_PREFIX.some(p => pathname.startsWith(p));
  const isProtectedRoute = PROTECTED_ROUTES.includes(pathname) || isDynamicProtected;
  
  const isDynamicAdmin = DYNAMIC_ADMIN_ROUTES_PREFIX.some(p => pathname.startsWith(p));
  const isAdminRoute = ADMIN_ROUTES.includes(pathname) || isDynamicAdmin;

  if (isAdminRoute) {
      return <AuthGuard adminOnly={true}>{children}</AuthGuard>;
  }

  if (isProtectedRoute) {
    return <AuthGuard>{children}</AuthGuard>;
  }
  
  return <>{children}</>;
}
