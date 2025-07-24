

'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, Search, Filter, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, query, where, collectionGroup, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post as Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/contexts/cart-context';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/auth-context';
import { countries } from '@/lib/countries';

function ProductCard({ product }: { product: Product }) {
  const { toast } = useToast();
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(product, 1);
    toast({
      title: 'Added to Cart',
      description: `${product.authorName} has been added to your cart.`,
    });
  };
  
  const price = useMemo(() => {
    if (!product.content || typeof product.content !== 'string') return '0.00';
    const priceMatch = product.content.match(/(\d+(\.\d+)?)$/);
    return priceMatch ? parseFloat(priceMatch[1]).toFixed(2) : '0.00';
  }, [product.content]);

  const displayMedia = (product.media && product.media[0]) || { url: product.mediaURL, type: 'image' };
  
  const averageRating = product.averageRating || 0;
  const reviewCount = product.reviewCount || 0;

  const currencySymbol = useMemo(() => {
    if (!product.currency) return '$';
    try {
      return (0).toLocaleString('en-US', { style: 'currency', currency: product.currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\d/g, '').trim();
    } catch {
      return '$';
    }
  }, [product.currency]);

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardContent className="p-0">
        <div className="relative aspect-square bg-black">
          {displayMedia.url && (
            displayMedia.type === 'image' ? (
                <Image
                src={displayMedia.url}
                alt={product.authorName}
                fill
                className="object-cover"
                />
            ) : (
                <video
                    src={displayMedia.url}
                    className="w-full h-full object-cover"
                    loop
                    muted
                    autoPlay
                    playsInline
                />
            )
          )}
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm text-muted-foreground">{product.category}</p>
          <h3 className="text-lg font-semibold">{product.authorName}</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn("h-5 w-5", i < averageRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">({reviewCount} Review{reviewCount !== 1 ? 's' : ''})</span>
          </div>
          <p className="text-2xl font-bold">{currencySymbol}{price}</p>
        </div>
      </CardContent>
      <div className="p-4 pt-0">
        <div className="flex flex-col gap-2">
            <Button asChild variant="outline" className="w-full">
              <Link href={`/attom/${product.id}`}>
                <Info className="mr-2 h-4 w-4" /> Details
              </Link>
            </Button>
            <Button className="w-full" onClick={handleAddToCart}>
              <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
            </Button>
        </div>
      </div>
    </Card>
  );
}

export default function AttomPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>(['Tribe', 'Gift Garden', 'Video Bazaar']);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    if (!db) return;
    setIsLoadingProducts(true);

    const productsQuery = query(collection(db, 'posts'));

    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const fetchedProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product))
      .filter(p => ['Tribe', 'Gift Garden', 'Video Bazaar'].includes(p.category || ''))
      .sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
      
      setProducts(fetchedProducts);
      setIsLoadingProducts(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load products. If the issue persists, you may need to add a Firestore index.",
      });
      setIsLoadingProducts(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const filteredProducts = useMemo(() => {
    let productsToShow = products;
    
    // Filter by category
    if (activeFilters.length > 0) {
        productsToShow = productsToShow.filter(p => activeFilters.includes(p.category || ''));
    } else {
        productsToShow = [];
    }
    
    // Filter by country if a user is logged in and has a country
    if (user?.country) {
      const userCountryCode = countries.find(c => c.name === user.country)?.code;
      productsToShow = productsToShow.filter(p => {
        if(p.category !== 'Tribe') return true;
        // If a product has no country restrictions, it's available to everyone
        if (!p.availableCountry) {
          return true;
        }
        // Otherwise, check if the user's country is in the list of available countries
        return p.availableCountry === userCountryCode;
      });
    }

    // Filter by search term
    if (searchTerm) {
      productsToShow = productsToShow.filter(p =>
        p.authorName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return productsToShow;
  }, [products, searchTerm, activeFilters, user?.country]);
  
  const handleFilterChange = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  return (
      <div className="flex flex-col h-screen bg-background">
        <main
          className="flex-1 overflow-y-auto"
        >
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-primary">
                The Attom Store
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover our curated collection of quantum-inspired gear and accessories.
              </p>
            </div>

            <div className="mb-8 flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline">
                <Link href="/gift-garden">Gift Garden</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/ogrim">Ogrim</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/secondsell">Second Sell</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/video-bazaar">Video Bazaar</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/printit">Printit</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/machinehood">Machinehood</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/tribe">Tribe</Link>
              </Button>
            </div>
            
            <div className="mb-8 max-w-lg mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-12 h-12 text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10"
                        >
                            <Filter className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={activeFilters.includes('Tribe')}
                            onCheckedChange={() => handleFilterChange('Tribe')}
                        >
                            Tribe
                        </DropdownMenuCheckboxItem>
                         <DropdownMenuCheckboxItem
                            checked={activeFilters.includes('Gift Garden')}
                            onCheckedChange={() => handleFilterChange('Gift Garden')}
                        >
                            Gift Garden
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={activeFilters.includes('Video Bazaar')}
                            onCheckedChange={() => handleFilterChange('Video Bazaar')}
                        >
                            Video Bazaar
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {isLoadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-4">
                        <Skeleton className="h-48 bg-muted rounded-md"></Skeleton>
                        <Skeleton className="h-6 w-3/4 bg-muted rounded-md"></Skeleton>
                        <Skeleton className="h-4 w-1/2 bg-muted rounded-md"></Skeleton>
                        <Skeleton className="h-8 w-full bg-muted rounded-md"></Skeleton>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
                <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-semibold">No products found</h3>
                    <p>Try clearing your filters or search to see all available items.</p>
                </div>
            )}
          </div>
        </main>
      </div>
  );
}
