
'use client';

import { useState, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Header } from '@/components/fintrack/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationSheet } from '@/components/fintrack/notification-sheet';
import { FloatingCartButton } from '@/components/fintrack/floating-cart-button';
import { RootGuard } from './auth/root-guard';

export function ClientProviders({ children }: { children: ReactNode }) {
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
  
  const showHeader = !['/login', '/signup'].includes(pathname);
  const showCart = user || ['/attom', '/checkout', '/office-express'].some(p => pathname.startsWith(p));

  return (
    <RootGuard>
        <div className="flex flex-col h-screen">
          {showHeader && <Header isVisible={isHeaderVisible} />}
          <ScrollArea className="flex-1" onScroll={handleScroll}>
            <NotificationSheet>
                {children}
            </NotificationSheet>
          </ScrollArea>
          {showCart && <FloatingCartButton />}
        </div>
    </RootGuard>
  );
}
