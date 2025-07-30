
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

export function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }
    
    if (adminOnly && !isAdmin) {
      router.push('/');
    }
  }, [user, isAdmin, loading, router, adminOnly]);

  if (loading || !user || (adminOnly && !isAdmin)) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Skeleton className="h-12 w-12 rounded-full" />
        </div>
    );
  }

  return <>{children}</>;
}
