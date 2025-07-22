'use client';

import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from '@/components/app-providers';
import { NotificationSheet } from '@/components/fintrack/notification-sheet';
import { RootGuard } from '@/components/auth/root-guard';

export function Providers({ children }: { children: React.ReactNode }) {

  return (
      <AppProviders>
        <NotificationSheet>
          <RootGuard>
            {children}
          </RootGuard>
        </NotificationSheet>
        <Toaster />
      </AppProviders>
  );
}
