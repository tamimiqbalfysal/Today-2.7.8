
'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, doc, Timestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { OgrimProduct, PreOrder } from '@/lib/types';
import Image from 'next/image';
import { Upload, Trash2, X, ShoppingBag, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

function PreOrderDialog({ product, trigger }: { product: OgrimProduct, trigger: React.ReactNode }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
        }
    }, [user, isOpen]);

    const handlePreOrderSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !phone) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all fields.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, `ogrim-products/${product.id}/preorders`), {
                productId: product.id,
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                userId: user?.uid || null,
                timestamp: Timestamp.now(),
            });
            toast({ title: 'Pre-order Placed!', description: "We've received your confirmation. The seller will be in touch." });
            setIsOpen(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not place your pre-order.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pre-order: {product.title}</DialogTitle>
                    <DialogDescription>
                        Confirm your interest by providing your contact details below. No payment is required at this time.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePreOrderSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone number" required />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Confirm Pre-order
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


function ProductCard({ product, onDelete, isOwner }: { product: OgrimProduct, onDelete: (productId: string, imagePath: string) => void, isOwner: boolean }) {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col group">
        <div className="relative">
            <div className="relative aspect-video">
                <Image
                    src={product.imageUrl || 'https://placehold.co/400x225.png'}
                    alt={product.title}
                    fill
                    className="object-cover"
                />
            </div>
            {isOwner && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this pre-order listing.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(product.id, product.imagePath)} className="bg-destructive hover:bg-destructive/90">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
             )}
        </div>
         <CardHeader>
             <CardTitle className="truncate">{product.title}</CardTitle>
             <CardDescription className="line-clamp-2 h-10">{product.description}</CardDescription>
         </CardHeader>
         <CardContent className="flex-grow">
            <p className="text-2xl font-bold text-primary">${product.price.toFixed(2)}</p>
         </CardContent>
         <CardFooter>
            <PreOrderDialog product={product} trigger={
                 <Button className="w-full">
                    <ShoppingBag className="mr-2 h-4 w-4" /> Pre-order Now
                </Button>
            } />
         </CardFooter>
    </Card>
  );
}


export default function OgrimPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<OgrimProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    if (!db) return;
    setIsLoadingProducts(true);

    const productsCollection = collection(db, 'ogrim-products');
    const q = query(productsCollection, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedProducts = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as OgrimProduct));
        setProducts(fetchedProducts);
        setIsLoadingProducts(false);
    }, (error) => {
        console.error("Error fetching products:", error);
        toast({variant: 'destructive', title: "Error", description: "Could not fetch pre-order products."})
        setIsLoadingProducts(false);
    });

    return () => unsubscribe();
  }, [toast]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };


  const handleDeleteProduct = async (productId: string, imagePath: string) => {
    if (!db || !storage || !user) return;
    
    try {
        await deleteDoc(doc(db, 'ogrim-products', productId));
        if (imagePath) {
            const storageRef = ref(storage, imagePath);
            await deleteObject(storageRef).catch(err => {
                if (err.code !== 'storage/object-not-found') throw err;
            });
        }
        toast({ title: 'Success', description: 'Pre-order product deleted successfully.' });
    } catch (error: any) {
        console.error("Error deleting product:", error);
        toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the product.' });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !price || !imageFile || !user) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all fields and select an image.' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (!storage || !db) throw new Error("Firebase not configured");
      
      const imagePath = `ogrim-products/${user.uid}/${Date.now()}_${imageFile.name}`;
      const imageRef = ref(storage, imagePath);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);

      await addDoc(collection(db, `ogrim-products`), {
        sellerId: user.uid,
        sellerName: user.name,
        title,
        description,
        price: parseFloat(price),
        imageUrl,
        imagePath,
        timestamp: Timestamp.now(),
      });
      
      toast({ title: 'Success!', description: 'Your product has been listed for pre-order.' });
      
      setTitle('');
      setDescription('');
      setPrice('');
      handleRemoveImage();

    } catch (error: any) {
      console.error('Error adding product:', error);
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <div className="flex flex-col min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-primary">
              Ogrim Pre-orders
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Exclusive access to upcoming products. Pre-order now to secure yours.
            </p>
          </div>

          {user && (
            <div className="mb-12">
              <Card>
                <CardHeader>
                  <CardTitle>List a New Product for Pre-order</CardTitle>
                  <CardDescription>Fill in the details below to start taking pre-orders.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Product Name</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Limited Edition Cyber-Katana" disabled={isSubmitting} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (USD)</Label>
                            <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g., 299.99" min="0.01" step="0.01" disabled={isSubmitting} />
                        </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product in detail..." disabled={isSubmitting} />
                    </div>
                    <div className="space-y-2">
                      <Label>Product Image</Label>
                        {imagePreview ? (
                            <div className="relative w-full aspect-video rounded-md border">
                                <Image src={imagePreview} alt="Preview" layout="fill" objectFit="cover" />
                                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full" onClick={handleRemoveImage} disabled={isSubmitting}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                             <div
                                className="flex justify-center items-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="text-center">
                                    <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                                    <p className="mt-2 text-sm text-muted-foreground">Click to upload an image</p>
                                </div>
                            </div>
                        )}
                      <Input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={isSubmitting} />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? 'Listing...' : 'List for Pre-order'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
            
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-6">Available for Pre-order</h2>
              {isLoadingProducts ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}><CardContent className="p-4"><div className="animate-pulse space-y-4"><Skeleton className="h-40 bg-muted rounded-md" /><Skeleton className="h-6 w-3/4 bg-muted rounded-md" /><Skeleton className="h-4 w-1/2 bg-muted rounded-md" /><Skeleton className="h-10 w-full bg-muted rounded-md" /></div></CardContent></Card>
                    ))}
                  </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                      <ProductCard key={product.id} product={product} onDelete={handleDeleteProduct} isOwner={user?.uid === product.sellerId} />
                    ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                  <h3 className="text-lg font-semibold">No products available for pre-order yet.</h3>
                  <p>Check back soon, or list your own product if you're a seller!</p>
                </div>
              )}
            </div>
        </main>
      </div>
  );
}
