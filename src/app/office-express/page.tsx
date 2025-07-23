
'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Search, Filter, Briefcase, PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Gig } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const categories = [
    "Graphics & Design",
    "Digital Marketing",
    "Writing & Translation",
    "Video & Animation",
    "Music & Audio",
    "Programming & Tech",
    "Business",
    "Lifestyle"
];

function GigCard({ gig }: { gig: Gig }) {
  return (
    <Link href={`/office-express/${gig.id}`} className="block">
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full flex flex-col">
            <div className="relative aspect-video">
                <Image
                    src={gig.imageUrl || 'https://placehold.co/400x225.png'}
                    alt={gig.title}
                    fill
                    className="object-cover"
                />
            </div>
             <CardContent className="p-4 flex flex-col flex-grow">
                <div className="flex items-center gap-2 mb-2">
                    <Image
                        src={gig.sellerPhotoURL || 'https://placehold.co/40x40.png'}
                        alt={gig.sellerName}
                        width={24}
                        height={24}
                        className="rounded-full"
                    />
                    <p className="text-sm font-semibold truncate">{gig.sellerName}</p>
                </div>
                <h3 className="font-semibold text-lg leading-snug hover:underline flex-grow">{gig.title}</h3>
                <div className="flex items-center gap-1 mt-2 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold text-sm text-foreground">
                        {gig.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">({gig.reviews} reviews)</span>
                </div>
                <div className="mt-4 pt-4 border-t">
                    <p className="text-lg font-bold text-right">
                        Starting at ${gig.price.toFixed(2)}
                    </p>
                </div>
             </CardContent>
        </Card>
    </Link>
  );
}

export default function OfficeExpressPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    const gigsQuery = query(collection(db, 'gigs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(gigsQuery, (snapshot) => {
      const fetchedGigs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gig));
      setGigs(fetchedGigs);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching gigs:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredGigs = useMemo(() => {
    let gigsToShow = gigs;
    if (activeFilters.length > 0) {
      gigsToShow = gigsToShow.filter(gig => activeFilters.includes(gig.category));
    }
    if (searchTerm) {
      gigsToShow = gigsToShow.filter(gig =>
        gig.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gig.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gig.sellerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return gigsToShow;
  }, [gigs, searchTerm, activeFilters]);

  const handleFilterChange = (category: string) => {
    setActiveFilters(prev =>
      prev.includes(category)
        ? prev.filter(f => f !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <Briefcase className="mx-auto h-12 w-12 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-primary mt-4">
              Office Express
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Find the perfect freelance services for your business needs.
            </p>
          </div>

          <div className="mb-8 flex justify-center">
            <Button asChild>
                <Link href="/office-express/create">
                    <PlusCircle className="mr-2 h-4 w-4" /> Become a Seller
                </Link>
            </Button>
          </div>
          
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for any service..."
                className="w-full pl-12 pr-16 h-14 text-lg rounded-full shadow-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full">
                    <Filter className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {categories.map(category => (
                    <DropdownMenuCheckboxItem
                      key={category}
                      checked={activeFilters.includes(category)}
                      onCheckedChange={() => handleFilterChange(category)}
                    >
                      {category}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-40 w-full" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-8 w-1/2 ml-auto mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredGigs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredGigs.map((gig) => (
                <GigCard key={gig.id} gig={gig} />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-semibold">No services found</h3>
              <p>Try adjusting your search or filters to find what you're looking for.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
