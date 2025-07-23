
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Gig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Clock, ArrowLeft, Check, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

function GigPageSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid md:grid-cols-3 gap-12 items-start">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="w-full aspect-video rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function GigDetailPage() {
  const params = useParams();
  const gigId = params.gigId as string;
  const router = useRouter();
  const [gig, setGig] = useState<Gig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!gigId || !db) return;
    const fetchGig = async () => {
      setIsLoading(true);
      const gigRef = doc(db, 'gigs', gigId);
      const gigSnap = await getDoc(gigRef);
      if (gigSnap.exists()) {
        setGig({ id: gigSnap.id, ...gigSnap.data() } as Gig);
      } else {
        // Handle not found
      }
      setIsLoading(false);
    };
    fetchGig();
  }, [gigId]);

  if (isLoading) {
    return <GigPageSkeleton />;
  }

  if (!gig) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold">Gig Not Found</h1>
        <Button onClick={() => router.push('/office-express')} className="mt-4">
          Back to Marketplace
        </Button>
      </div>
    );
  }
  
  const features = [
    "Source file",
    "Commercial use",
    "High resolution",
    "Custom design"
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <Button onClick={() => router.back()} variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to marketplace
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-12 items-start">
            <div className="md:col-span-2 space-y-6">
              <span className="text-sm font-semibold text-primary">{gig.category}</span>
              <h1 className="text-4xl font-bold tracking-tight">{gig.title}</h1>
              <div className="flex items-center gap-4">
                <Image
                    src={gig.sellerPhotoURL || 'https://placehold.co/40x40.png'}
                    alt={gig.sellerName}
                    width={40}
                    height={40}
                    className="rounded-full"
                />
                <span className="font-bold">{gig.sellerName}</span>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="font-bold text-lg text-foreground">{gig.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({gig.reviews} reviews)</span>
                </div>
              </div>
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                <Image
                  src={gig.imageUrl || 'https://placehold.co/800x450.png'}
                  alt={gig.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">About this gig</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">{gig.description}</p>
              </div>
            </div>
            
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-baseline">
                    <span>Basic Package</span>
                    <span className="text-3xl font-bold">${gig.price.toFixed(2)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                        Get a high-quality result for your project with this essential package.
                    </p>
                    <div className="flex items-center gap-2 font-semibold">
                        <Clock className="w-5 h-5" />
                        <span>{gig.deliveryTime} Day Delivery</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                       {features.map(feature => (
                         <li key={feature} className="flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-500" />
                            <span>{feature}</span>
                         </li>
                       ))}
                    </ul>
                    <Button size="lg" className="w-full">
                       <ShoppingBag className="mr-2 h-5 w-5" /> Continue (${gig.price.toFixed(2)})
                    </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
