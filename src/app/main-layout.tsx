
'use client';

import { useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

import { Header } from '@/components/fintrack/header';
import { NotificationSheet } from '@/components/fintrack/notification-sheet';
import { FloatingCounterButton } from '@/components/fintrack/floating-counter-button';
import { FloatingCartButton } from '@/components/fintrack/floating-cart-button';
import { RootGuard } from '@/components/auth/root-guard';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function MainLayout({ children }: { children: React.ReactNode }) {
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
  const showCart = user || ['/attom', '/checkout'].some(p => pathname.startsWith(p));

  return (
    <div className="flex flex-col h-screen">
      {showHeader && <Header isVisible={isHeaderVisible} />}
      <ScrollArea className="flex-1" onScroll={handleScroll}>
        <NotificationSheet>
          <RootGuard>
            {children}
          </RootGuard>
        </NotificationSheet>
      </ScrollArea>
      {user && <FloatingCounterButton />}
      {showCart && <FloatingCartButton />}
    </div>
  );
}
