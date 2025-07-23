
'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Header } from '@/components/fintrack/header';
import { FloatingCounterButton } from '@/components/fintrack/floating-counter-button';
import { FloatingCartButton } from '@/components/fintrack/floating-cart-button';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Routes that MUST have an authenticated user.
const PROTECTED_ROUTES = [
  '/today',
  '/profile',
  '/add',
  '/admin',
  '/thank-you',
  '/marketplace',
  '/tribe',
];

// Dynamic routes that are protected.
const DYNAMIC_PROTECTED_ROUTES_PREFIX = [
  '/admin/',
];

export function RootGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  
  const handleScroll = (event: React.UIEvent<HTMLElement>) => {
      const currentScrollY = event.currentTarget.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
  };
  
  const isProtectedRoute = PROTECTED_ROUTES.includes(pathname) || 
                           DYNAMIC_PROTECTED_ROUTES_PREFIX.some(p => pathname.startsWith(p));
  
  const showHeader = !['/login', '/signup'].includes(pathname);
  const showCart = user || ['/attom', '/checkout'].some(p => pathname.startsWith(p));

  const Layout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col h-screen">
      {showHeader && <Header isVisible={isHeaderVisible} />}
      <ScrollArea className="flex-1" onScroll={handleScroll}>
        {children}
      </ScrollArea>
      {user && <FloatingCounterButton />}
      {showCart && <FloatingCartButton />}
    </div>
  );

  if (isProtectedRoute) {
    return (
      <AuthGuard>
        <Layout>{children}</Layout>
      </AuthGuard>
    );
  }
  
  return <Layout>{children}</Layout>;
}
