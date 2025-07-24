
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
];

// Dynamic routes that are protected.
const DYNAMIC_PROTECTED_ROUTES_PREFIX = [
  '/admin/',
  '/chat/'
];

export function RootGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isProtectedRoute = PROTECTED_ROUTES.includes(pathname) || 
                           DYNAMIC_PROTECTED_ROUTES_PREFIX.some(p => pathname.startsWith(p));

  if (isProtectedRoute) {
    return <AuthGuard>{children}</AuthGuard>;
  }
  
  return <>{children}</>;
}
