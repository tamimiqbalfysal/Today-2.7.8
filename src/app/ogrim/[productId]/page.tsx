
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, addDoc, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { OgrimProduct, OgrimPreOrder } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Users, Send, CheckCircle, Loader2, User as UserIcon, Mail, Phone } from 'lucide-react';
import Image from 'next/image';

function OgrimProductPageSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <Skeleton className="w-full aspect-video rounded-lg" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-80 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OgrimProductPage() {
  const params = useParams();
  const productId = params.productId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<OgrimProduct | null>(null);
  const [preOrderCount, setPreOrderCount] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const checkRegistrationStatus = useCallback(async () => {
    if (!db || !productId) return;

    const storedKey = `ogrim_preorder_${productId}`;
    if (localStorage.getItem(storedKey) === 'true') {
        setIsRegistered(true);
        return;
    }

    let checkEmail = user?.email;
    if (!checkEmail) {
        checkEmail = localStorage.getItem('preOrderEmail');
    }

    if (checkEmail) {
      const q = collection(db, `ogrim-products/${productId}/preorders`);
      const snapshot = await getDocs(q);
      const isAlreadyRegistered = snapshot.docs.some(doc => doc.data().customerEmail === checkEmail);
      if(isAlreadyRegistered) {
        localStorage.setItem(storedKey, 'true');
        setIsRegistered(true);
      }
    }
  }, [user, productId]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    } else {
        const storedEmail = localStorage.getItem('preOrderEmail');
        if (storedEmail) setEmail(storedEmail);
    }
  }, [user]);
  
  useEffect(() => {
    if (!productId || !db || authLoading) return;

    setIsLoading(true);

    const productDocRef = doc(db, 'ogrim-products', productId);
    const unsubscribeProduct = onSnapshot(productDocRef, (doc) => {
      if (doc.exists()) {
        setProduct({ id: doc.id, ...doc.data() } as OgrimProduct);
      }
      setIsLoading(false);
    });
    
    const preordersColRef = collection(db, `ogrim-products/${productId}/preorders`);
    const unsubscribePreorders = onSnapshot(preordersColRef, (snapshot) => {
      setPreOrderCount(snapshot.size);
    });
    
    checkRegistrationStatus();

    return () => {
      unsubscribeProduct();
      unsubscribePreorders();
    };
  }, [productId, authLoading, checkRegistrationStatus]);
  
  const handleRegister = async () => {
    if (!db || !product) return;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please enter your name, email, and phone number.' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (preOrderCount >= product.target) {
        toast({ variant: 'destructive', title: 'Target Reached', description: 'This product has already met its pre-order goal.' });
        setIsSubmitting(false);
        return;
      }
      
      const newPreOrder: Omit<OgrimPreOrder, 'id'> = {
        productId,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        userId: user?.uid || null,
        timestamp: Timestamp.now(),
      };
      
      await addDoc(collection(db, `ogrim-products/${productId}/preorders`), newPreOrder);
      
      toast({ title: 'Pre-order Confirmed!', description: `Your pre-order for ${product.title} has been received.` });
      
      const storedKey = `ogrim_preorder_${productId}`;
      localStorage.setItem(storedKey, 'true');
      if (!user) localStorage.setItem('preOrderEmail', email.trim());
      setIsRegistered(true);

    } catch (error: any) {
      console.error("Error placing pre-order:", error);
      toast({ variant: 'destructive', title: 'Registration Failed', description: "Could not place your pre-order." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || authLoading) {
    return <OgrimProductPageSkeleton />;
  }
  
  if (!product) {
     return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-2xl font-bold">Product Not Found</h1>
            <Button onClick={() => router.push('/ogrim')} className="mt-4">
            Back to Pre-orders
            </Button>
        </div>
    );
  }
  
  const progress = (preOrderCount / product.target) * 100;
  
  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
           <div className="mb-8">
            <Button onClick={() => router.back()} variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
               <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                <Image
                  src={product.imageUrl || 'https://placehold.co/800x450.png'}
                  alt={product.title}
                  fill
                  className="object-cover"
                />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{product.title}</h1>
              <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
            </div>
            
            <div className="sticky top-24">
              <Card className="w-full shadow-2xl rounded-2xl">
                <CardHeader className="text-center p-8">
                    <CardTitle className="text-3xl md:text-4xl font-bold tracking-tighter text-primary">Pre-order Now</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground mt-2">Be the first to get it when it's released.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-8">
                    <div className="space-y-2 pt-4">
                        <Progress value={progress} className="h-3" />
                        <div className="flex justify-between font-medium text-sm">
                            <p className="flex items-center gap-1"><Users className="h-4 w-4" /> Pre-orders</p>
                            <p className="text-muted-foreground">
                                <span className="text-foreground font-bold">{preOrderCount}</span> / {product.target}
                            </p>
                        </div>
                    </div>
                     <p className="text-4xl font-bold text-center text-primary">${product.price.toFixed(2)}</p>
                </CardContent>
                 <CardFooter className="p-8 pt-4 flex-col gap-4">
                    {isRegistered ? (
                        <div className="w-full text-center p-4 rounded-md bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700">
                            <p className="font-semibold flex items-center justify-center gap-2">
                            <CheckCircle className="h-5 w-5" /> You've Pre-ordered!
                            </p>
                        </div>
                    ) : (
                        <div className="w-full space-y-4">
                             <div className="space-y-2 text-left">
                                <Label htmlFor="name">Your Name</Label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} className="pl-9" />
                                </div>
                            </div>
                            <div className="space-y-2 text-left">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                                </div>
                            </div>
                            <div className="space-y-2 text-left">
                                <Label htmlFor="phone">Phone Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="phone" type="tel" placeholder="Enter your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" />
                                </div>
                            </div>
                            <Button 
                                className="w-full h-12 text-lg mt-4" 
                                onClick={handleRegister} 
                                disabled={isSubmitting || preOrderCount >= product.target}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                )}
                                {preOrderCount >= product.target ? 'Target Reached' : 'Confirm Pre-order'}
                            </Button>
                        </div>
                    )}
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
