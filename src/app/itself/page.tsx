
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ItselfPage() {
  return (
      <div className="flex flex-col h-screen bg-background">
        <main 
          className="flex-1 flex flex-col items-center justify-center text-center p-4 overflow-y-auto"
        >
            <h1 className="text-5xl font-bold tracking-tighter text-primary">
              Welcome to Itself
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              This is the dedicated page for the Itself section.
            </p>
            <Button asChild className="mt-8" variant="outline">
              <Link href="/add">Go Back to Add Page</Link>
            </Button>
        </main>
      </div>
  );
}
