'use client';

import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from '@/components/app-providers';
import { NotificationSheet } from '@/components/fintrack/notification-sheet';
import { RootGuard } from '@/components/auth/root-guard';
import { useState, useRef } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const currentScrollY = scrollContainerRef.current.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    }
  };

  return (
    <div ref={scrollContainerRef} onScroll={handleScroll} className="h-screen w-screen overflow-y-auto">
      <AppProviders>
        <NotificationSheet>
          <RootGuard isHeaderVisible={isHeaderVisible}>
            {children}
          </RootGuard>
        </NotificationSheet>
        <Toaster />
      </AppProviders>
    </div>
  );
}
