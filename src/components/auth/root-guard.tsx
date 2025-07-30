
'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ClientProviders } from '@/components/client-providers';

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
  '/chat/',
];

export function RootGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isDynamicProtected = DYNAMIC_PROTECTED_ROUTES_PREFIX.some(p => pathname.startsWith(p));
  const isProtectedRoute = PROTECTED_ROUTES.includes(pathname) || isDynamicProtected;
  
  const isAdminRoute = ADMIN_ROUTES.some(p => pathname.startsWith(p));

  const pageContent = <ClientProviders>{children}</ClientProviders>;

  if (isAdminRoute) {
      return <AuthGuard adminOnly={true}>{pageContent}</AuthGuard>;
  }

  if (isProtectedRoute) {
    return <AuthGuard>{pageContent}</AuthGuard>;
  }
  
  return <>{pageContent}</>;
}
