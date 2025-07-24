
'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from '@/components/app-providers';
import { RootGuard } from '@/components/auth/root-guard';
import { Header } from '@/components/fintrack/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationSheet } from '@/components/fintrack/notification-sheet';
import { FloatingCartButton } from '@/components/fintrack/floating-cart-button';
import { useAuth } from '@/contexts/auth-context';
import { usePathname } from 'next/navigation';
import { useState, useRef } from 'react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AppProviders>
          <PageContent>
            {children}
          </PageContent>
        </AppProviders>
        <Toaster />
      </body>
    </html>
  );
}

function PageContent({ children }: { children: React.ReactNode }) {
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
    <div className="flex flex-col h-screen">
       {showHeader && <Header isVisible={isHeaderVisible} />}
       <ScrollArea className="flex-1" onScroll={handleScroll}>
        <RootGuard>
          <NotificationSheet>
            {children}
          </NotificationSheet>
        </RootGuard>
       </ScrollArea>
       {showCart && <FloatingCartButton />}
    </div>
  )
}
