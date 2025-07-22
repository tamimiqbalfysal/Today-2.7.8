

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, query, orderBy, onSnapshot, writeBatch, Timestamp, increment, runTransaction, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '@/lib/firebase';
import type { Post as Product, Review } from '@/lib/types';
import { useCart } from '@/contexts/cart-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Zap, ArrowLeft, Edit, Upload, Save, Trash2, PlayCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ReviewForm } from '@/components/fintrack/review-form';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

function ProductPageSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-24 mb-8" />
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <Skeleton className="w-full aspect-square rounded-lg" />
            <div className="space-y-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-12 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full mt-4" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.productId as string;
  const router = useRouter();
  const { addToCart, setLastViewedProductId, purchasedProductIds } = useCart();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit mode state
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [newMediaFiles, setNewMediaFiles] = useState<{file: File, type: 'image' | 'video'}[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLastViewedProductId(productId);
    return () => setLastViewedProductId(null);
  }, [productId, setLastViewedProductId]);

  useEffect(() => {
    if (!productId || !db) return;

    let unsubscribeProduct: () => void = () => {};
    let unsubscribeReviews: () => void = () => {};

    const fetchProductAndReviews = async () => {
      setIsLoading(true);
      try {
        const productRef = doc(db, 'posts', productId);
        unsubscribeProduct = onSnapshot(productRef, (productSnap) => {
            if (productSnap.exists()) {
              const productData = { id: productSnap.id, ...productSnap.data() } as Product;
              setProduct(productData);

              const priceMatch = productData.content.match(/(\d+(\.\d+)?)$/);
              const price = priceMatch ? parseFloat(priceMatch[1]).toFixed(0) : '0';
              const description = priceMatch ? productData.content.substring(0, priceMatch.index).trim() : productData.content;
              
              setEditedName(productData.authorName);
              setEditedDescription(description);
              setEditedPrice(price);
              
              const existingMedia = productData.media || 
                (productData.mediaURLs || (productData.mediaURL ? [productData.mediaURL] : []))
                .map(url => ({ url, type: 'image' as const }));

              setMediaPreviews(existingMedia);
              
              const reviewsRef = collection(db, 'posts', productId, 'reviews');
              const q = query(reviewsRef, orderBy('timestamp', 'desc'));
              unsubscribeReviews = onSnapshot(q, (snapshot) => {
                  const fetchedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
                  setReviews(fetchedReviews);
              }, (error) => {
                  console.error("Error fetching reviews:", error);
              });
              
            } else {
              toast({ variant: 'destructive', title: 'Product not found.' });
              setProduct(null);
            }
        });
      } catch (error) {
        console.error("Error fetching product:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load product details.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductAndReviews();
    
    return () => {
        unsubscribeProduct();
        unsubscribeReviews();
    };
  }, [productId, toast]);
  
  const price = useMemo(() => {
    if (isEditing) return editedPrice;
    if (!product?.content || typeof product.content !== 'string') return '0';
    const priceMatch = product.content.match(/(\d+(\.\d+)?)$/);
    return priceMatch ? parseFloat(priceMatch[1]).toFixed(0) : '0';
  }, [product?.content, isEditing, editedPrice]);
  
  const description = useMemo(() => {
    if (isEditing) return editedDescription;
    if (!product?.content || typeof product.content !== 'string') return '';
    const priceMatch = product.content.match(/(\d+(\.\d+)?)$/);
    return priceMatch ? product.content.substring(0, priceMatch.index).trim() : product.content;
  }, [product?.content, isEditing, editedDescription]);
  
  const name = useMemo(() => {
    return isEditing ? editedName : product?.authorName || '';
  }, [isEditing, editedName, product?.authorName]);


  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product, 1);
    toast({
      title: 'Added to Cart',
      description: `Redirecting you to checkout...`,
    });
    router.push('/checkout');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const newFilesWithType = files.map(file => ({ file, type: file.type.startsWith('video') ? 'video' : 'image' as 'image' | 'video' }));
      setNewMediaFiles(prev => [...prev, ...newFilesWithType]);
      
      const newPreviews = files.map(file => ({ url: URL.createObjectURL(file), type: file.type.startsWith('video') ? 'video' : 'image' as 'image' | 'video' }));
      setMediaPreviews(prev => [...prev, ...newPreviews]);
    }
  };
  
  const handleRemoveNewMedia = (index: number) => {
    setNewMediaFiles(prev => prev.filter((_, i) => i !== index));
    const originalCount = product?.media?.length || 0;
    setMediaPreviews(prev => prev.filter((_, i) => i !== originalCount + index));
  };
  
  const handleRemoveExistingMedia = async (mediaItem: { url: string; type: 'image' | 'video' }) => {
      if (!product || !currentUser || !db || !storage) return;
      setIsSaving(true);
      try {
        const productRef = doc(db, 'posts', product.id);
        
        await updateDoc(productRef, {
          media: arrayRemove(mediaItem)
        });

        const mediaRef = ref(storage, mediaItem.url);
        await deleteObject(mediaRef);

        toast({ title: "Media Removed", description: "The file has been deleted." });
      } catch (error) {
        console.error("Error removing media:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not remove media." });
      } finally {
        setIsSaving(false);
      }
  };


  const handleSaveChanges = async () => {
    if (!product || !currentUser || !db || !storage) return;
    setIsSaving(true);
    try {
        const uploadedMedia = await Promise.all(
          newMediaFiles.map(async ({ file, type }) => {
            const newMediaRef = ref(storage, `products/${currentUser.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(newMediaRef, file);
            const url = await getDownloadURL(newMediaRef);
            return { url, type };
          })
        );
        
        const productRef = doc(db, 'posts', product.id);
        const updatedContent = `${editedDescription}\n${parseInt(editedPrice) || 0}`;

        await updateDoc(productRef, {
            authorName: editedName,
            content: updatedContent,
            media: arrayUnion(...uploadedMedia),
        });

        toast({ title: "Success", description: "Product updated successfully." });
        
        setIsEditing(false);
        setNewMediaFiles([]);
    } catch (error) {
        console.error("Error saving changes:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save changes." });
    } finally {
        setIsSaving(false);
    }
  };
  
  const isOwner = currentUser?.uid === product?.authorId;
  const hasPurchased = purchasedProductIds.includes(productId);

  if (isLoading) {
    return <ProductPageSkeleton />;
  }

  if (!product) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <h1 className="text-2xl font-bold">Product Not Found</h1>
          <p className="text-muted-foreground">The product you are looking for does not exist.</p>
          <Button onClick={() => router.back()} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </main>
      </div>
    );
  }
  
  const averageRating = product.averageRating || 0;
  const reviewCount = product.reviewCount || 0;
  
  const mediaToDisplay = isEditing ? mediaPreviews : (product.media || 
      (product.mediaURLs || (product.mediaURL ? [product.mediaURL] : []))
      .map(url => ({ url, type: 'image' as const })));

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <Button onClick={() => isEditing ? setIsEditing(false) : router.back()} variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" /> {isEditing ? 'Cancel' : 'Back to store'}
            </Button>
            {isOwner && !isEditing && (
                <Button onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Product
                </Button>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <Carousel className="w-full">
                      <CarouselContent>
                          {mediaToDisplay.map((media, index) => (
                              <CarouselItem key={index}>
                                  <div className="relative aspect-square bg-black">
                                      {media.type === 'image' ? (
                                        <Image
                                            src={media.url}
                                            alt={`${name} - Media ${index + 1}`}
                                            fill
                                            className="object-contain"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                      ) : (
                                        <>
                                        <video
                                            src={media.url}
                                            controls
                                            className="w-full h-full object-contain"
                                        />
                                         <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                            <PlayCircle className="w-16 h-16 text-white/70" />
                                        </div>
                                        </>
                                      )}
                                      {isEditing && (
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 h-8 w-8 z-10"
                                            onClick={() => {
                                                const originalCount = product?.media?.length || 0;
                                                if (index < originalCount) {
                                                    handleRemoveExistingMedia(media);
                                                } else {
                                                    handleRemoveNewMedia(index - originalCount);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                  </div>
                              </CarouselItem>
                          ))}
                          {isEditing && (
                            <CarouselItem>
                                <div className="flex items-center justify-center aspect-square border-2 border-dashed rounded-lg">
                                    <Input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" multiple />
                                    <Button type="button" variant="outline" size="lg" className="flex-col h-auto p-8" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="h-8 w-8 mb-2" />
                                    Add Media
                                    </Button>
                                </div>
                            </CarouselItem>
                          )}
                      </CarouselContent>
                      {mediaToDisplay.length > 1 && (
                        <>
                            <CarouselPrevious className="left-4" />
                            <CarouselNext className="right-4" />
                        </>
                      )}
                  </Carousel>
                </CardContent>
            </Card>
            <div className="space-y-6">
                <div>
                    <p className="text-sm font-medium text-primary">{product.category}</p>
                    {isEditing ? (
                        <div className="space-y-2">
                            <Label htmlFor="product-name">Product Name</Label>
                            <Input id="product-name" value={name} onChange={(e) => setEditedName(e.target.value)} className="text-3xl md:text-4xl font-bold tracking-tight h-auto p-0 border-0 focus-visible:ring-0" />
                        </div>
                    ) : (
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{name}</h1>
                    )}
                </div>
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
              
                {isEditing ? (
                    <div className="space-y-2">
                        <Label htmlFor="product-price">Price</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-4xl font-bold text-primary/50">$</span>
                            <Input id="product-price" type="number" value={price} onChange={(e) => setEditedPrice(e.target.value)} className="text-4xl font-bold text-primary pl-10 h-auto p-0 border-0 focus-visible:ring-0" />
                        </div>
                    </div>
                ) : (
                    <p className="text-4xl font-bold text-primary">${price}</p>
                )}
                
                {description && (
                  <div>
                    <Label htmlFor="product-description" className={cn(isEditing ? 'mb-2 block' : 'text-lg font-semibold mb-2')}>Description</Label>
                    {isEditing ? (
                         <Textarea id="product-description" value={description} onChange={(e) => setEditedDescription(e.target.value)} className="text-muted-foreground whitespace-pre-wrap min-h-[100px]" />
                    ) : (
                        <p className="text-muted-foreground whitespace-pre-wrap">{description}</p>
                    )}
                  </div>
                )}
                
                {isEditing ? (
                    <Button size="lg" className="w-full text-lg" onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? 'Saving...' : <><Save className="mr-2 h-5 w-5" /> Save Changes</>}
                    </Button>
                ) : (
                    <Button size="lg" className="w-full text-lg" onClick={handleBuyNow}>
                        <Zap className="mr-2 h-5 w-5" /> Buy Now
                    </Button>
                )}
            </div>
          </div>
          
          <div className="mt-16 space-y-12">
            <Card>
                <CardHeader>
                    <CardTitle>Customer Reviews ({reviewCount})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {reviews.length > 0 ? (
                        reviews.map(review => {
                           const profileLink = currentUser?.uid === review.authorId ? '/profile' : `/u/${review.authorId}`;
                           return (
                                <div key={review.id} className="flex gap-4">
                                    <Avatar>
                                        <AvatarImage src={review.authorPhotoURL} alt={review.authorName} />
                                        <AvatarFallback>{review.authorName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <Link href={profileLink} className="font-semibold hover:underline">{review.authorName}</Link>
                                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(review.timestamp.toDate(), { addSuffix: true })}</p>
                                        </div>
                                        <div className="flex items-center gap-1 my-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={cn("h-4 w-4", i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                                            ))}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                                    </div>
                                </div>
                           )
                        })
                    ) : (
                        <p className="text-center text-muted-foreground">No reviews yet. Be the first to share your thoughts!</p>
                    )}
                </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
