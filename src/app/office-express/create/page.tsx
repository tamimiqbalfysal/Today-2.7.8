
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Loader2, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const gigSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters long.'),
  category: z.string({ required_error: 'Please select a category.' }),
  description: z.string().min(50, 'Description must be at least 50 characters long.'),
  price: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(5, 'Price must be at least $5.')),
  deliveryTime: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(1, 'Delivery time must be at least 1 day.')),
});

type GigFormValues = z.infer<typeof gigSchema>;

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

export default function CreateGigPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<GigFormValues>({
    resolver: zodResolver(gigSchema),
    defaultValues: {
        title: '',
        description: '',
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  }

  const onSubmit = async (data: GigFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'You must be logged in to create a gig.' });
      return;
    }
    if (!imageFile) {
        toast({ variant: 'destructive', title: 'Please upload an image for your gig.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const imageRef = ref(storage, `gigs/${user.uid}/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        const imageUrl = await getDownloadURL(imageRef);

        await addDoc(collection(db, 'gigs'), {
            ...data,
            sellerId: user.uid,
            sellerName: user.name,
            sellerPhotoURL: user.photoURL,
            imageUrl,
            rating: 0,
            reviews: 0,
            timestamp: Timestamp.now(),
            currency: 'USD',
        });

        toast({ title: 'Success!', description: 'Your gig has been created.' });
        router.push('/office-express');

    } catch (error: any) {
      console.error('Error creating gig:', error);
      let description = "An unexpected error occurred.";
      if(error.code === 'storage/unauthorized') {
        description = "You do not have permission to upload files. Please check your Firebase Storage rules."
      } else if (error.code === 'permission-denied') {
        description = "You do not have permission to create gigs. Please check your Firestore security rules."
      }
      toast({ variant: 'destructive', title: 'Submission Failed', description });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-secondary/50">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
            <Button asChild variant="ghost">
                <Link href="/office-express">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Marketplace
                </Link>
            </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create a New Gig</CardTitle>
            <CardDescription>Fill out the form below to list your service on Office Express.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Gig Title</Label>
                <Input id="title" placeholder="I will..." {...form.register('title')} />
                {form.formState.errors.title && <p className="text-destructive text-sm">{form.formState.errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                  <Label>Gig Image</Label>
                  {imagePreview ? (
                      <div className="relative w-full aspect-video rounded-md border">
                          <Image src={imagePreview} alt="Preview" layout="fill" objectFit="cover" />
                          <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full" onClick={removeImage} disabled={isSubmitting}>
                              <X className="h-4 w-4" />
                          </Button>
                      </div>
                  ) : (
                      <div
                          className="flex justify-center items-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted"
                          onClick={() => fileInputRef.current?.click()}
                      >
                          <div className="text-center">
                              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                              <p className="mt-2 text-sm text-muted-foreground">Click to upload an image</p>
                          </div>
                      </div>
                  )}
                  <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" disabled={isSubmitting} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Controller
                  name="category"
                  control={form.control}
                  render={({ field }) => (
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                 {form.formState.errors.category && <p className="text-destructive text-sm">{form.formState.errors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe your service in detail..." {...form.register('description')} rows={6} />
                 {form.formState.errors.description && <p className="text-destructive text-sm">{form.formState.errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input id="price" type="number" placeholder="e.g., 25" {...form.register('price')} />
                    {form.formState.errors.price && <p className="text-destructive text-sm">{form.formState.errors.price.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="deliveryTime">Delivery Time (in days)</Label>
                    <Input id="deliveryTime" type="number" placeholder="e.g., 3" {...form.register('deliveryTime')} />
                    {form.formState.errors.deliveryTime && <p className="text-destructive text-sm">{form.formState.errors.deliveryTime.message}</p>}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Creating Gig...' : 'Create Gig'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
