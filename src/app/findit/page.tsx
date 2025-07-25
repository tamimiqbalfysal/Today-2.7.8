

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Search, Upload, X, Trash2, Calendar, Clock, Tag, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface FinditItem {
    id: string;
    name: string;
    description: string;
    location: string;
    contactEmail: string;
    contactPhone?: string;
    imageUrl?: string;
    imagePath?: string;
    type: 'lost' | 'found';
    authorId?: string;
    timestamp: Timestamp;
    eventTimestamp?: Timestamp;
    category?: string;
}

interface ItemFormState {
    name: string;
    description: string;
    location: string;
    contactEmail: string;
    contactPhone: string;
    image: File | null;
    imagePreview: string | null;
    eventDateTime: string;
    category: string;
}

const itemCategories = ['Human', 'Phone', 'Laptop', 'Keys', 'Wallet', 'Bag', 'Clothing', 'Other'];


export default function FinditPage() {
    const { user } = useAuth();
    const [allItems, setAllItems] = useState<FinditItem[]>([]);
    const [userItems, setUserItems] = useState<FinditItem[]>([]);

    const [lostForm, setLostForm] = useState<ItemFormState>({ name: '', description: '', location: '', contactEmail: '', contactPhone: '', image: null, imagePreview: null, eventDateTime: '', category: '' });
    const [foundForm, setFoundForm] = useState<ItemFormState>({ name: '', description: '', location: '', contactEmail: '', contactPhone: '', image: null, imagePreview: null, eventDateTime: '', category: '' });

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('lost-and-found');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const lostItemImageRef = useRef<HTMLInputElement>(null);
    const foundItemImageRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!db) return;
        setIsLoading(true);
        const q = query(collection(db, "finditItems"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinditItem));
            setAllItems(items);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching all items:", error);
            if (error.code === 'permission-denied') {
              toast({ variant: 'destructive', title: 'Permission Error', description: 'Could not load items. Check your Firestore security rules.' });
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [toast]);

    useEffect(() => {
        if (!db || !user) {
            setUserItems([]);
            return;
        };
        const q = query(collection(db, "finditItems"), where("authorId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinditItem));
            items.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
            setUserItems(items);
        }, (error) => {
          console.error("Error fetching user items: ", error);
        });
        return () => unsubscribe();
    }, [user]);

    const filteredLostItems = allItems.filter(item =>
        item.type === 'lost' && (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredFoundItems = allItems.filter(item =>
        item.type === 'found' && (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'lost' | 'found') => {
        const file = e.target.files?.[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            if (type === 'lost') {
                setLostForm(prev => ({ ...prev, image: file, imagePreview: previewUrl }));
            } else {
                setFoundForm(prev => ({ ...prev, image: file, imagePreview: previewUrl }));
            }
        }
    };

    const handleRemoveImage = (type: 'lost' | 'found') => {
        if (type === 'lost') {
            setLostForm(prev => ({...prev, image: null, imagePreview: null}));
            if (lostItemImageRef.current) lostItemImageRef.current.value = '';
        } else {
            setFoundForm(prev => ({...prev, image: null, imagePreview: null}));
            if (foundItemImageRef.current) foundItemImageRef.current.value = '';
        }
    };

    const handleReportSubmit = async (e: React.FormEvent, type: 'lost' | 'found') => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const form = type === 'lost' ? lostForm : foundForm;
        const setForm = type === 'lost' ? setLostForm : setFoundForm;
        const imageInputRef = type === 'lost' ? lostItemImageRef : foundItemImageRef;

        let imageUrl, imagePath;

        if (form.image && storage) {
            try {
                const filePath = `findit/${user?.uid || 'anonymous'}/${Date.now()}_${form.image.name}`;
                const imageRef = ref(storage, filePath);
                const snapshot = await uploadBytes(imageRef, form.image);
                imageUrl = await getDownloadURL(snapshot.ref);
                imagePath = filePath;
            } catch (error: any) {
                let description = "Could not upload your image. Please try again.";
                if (error.code === 'storage/unauthorized') {
                    description = "Permission Denied. Your Firebase Storage security rules are not configured to allow uploads. Please update them in the Firebase Console.";
                }
                toast({ variant: "destructive", title: "Image Upload Failed", description, duration: 10000 });
                setIsSubmitting(false);
                return;
            }
        }

        const newItem: Omit<FinditItem, 'id' | 'timestamp'> = {
            name: form.name,
            description: form.description,
            location: form.location,
            contactEmail: form.contactEmail,
            contactPhone: form.contactPhone,
            type: type,
            category: form.category,
            ...(imageUrl && { imageUrl }),
            ...(imagePath && { imagePath }),
            ...(user && { authorId: user.uid }),
            ...(form.eventDateTime && { eventTimestamp: Timestamp.fromDate(new Date(form.eventDateTime)) }),
        };
        
        try {
            if (!db) throw new Error("Database not connected");
            await addDoc(collection(db, "finditItems"), {
                ...newItem,
                timestamp: Timestamp.now(),
            });

            toast({ title: 'Success', description: `Your ${type} item has been reported.` });
            setForm({ name: '', description: '', location: '', contactEmail: '', contactPhone: '', image: null, imagePreview: null, eventDateTime: '', category: '' });
            if (imageInputRef.current) imageInputRef.current.value = '';
            setActiveTab('lost-and-found');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not report item.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteItem = async (item: FinditItem) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, "finditItems", item.id));
            if (item.imagePath && storage) {
                const imageRef = ref(storage, item.imagePath);
                await deleteObject(imageRef);
            }
            toast({ title: "Deleted", description: "Your report has been removed."});
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "Could not delete the item."});
        }
    };

    const ItemCard = ({ item, onDelete }: { item: FinditItem; onDelete?: (item: FinditItem) => void }) => (
        <Card className="overflow-hidden relative">
            <div className="relative w-full h-40">
                <Image src={item.imageUrl || 'https://placehold.co/300x200.png'} alt={item.name} layout="fill" objectFit="cover" />
                {item.category && <Badge className="absolute top-2 left-2">{item.category}</Badge>}
            </div>
            <CardHeader>
                <CardTitle>{item.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <p className="text-sm mt-2">
                    <strong>{item.type === 'lost' ? 'Last seen:' : 'Found at:'}</strong> {item.location}
                </p>
                {item.eventTimestamp && (
                    <p className="text-sm mt-2 flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" /> {format(item.eventTimestamp.toDate(), 'PPP, p')}
                    </p>
                )}
            </CardContent>
            <CardFooter>
                 <Button asChild className="w-full" disabled={!item.authorId || item.authorId === user?.uid}>
                    <Link href={`/chat/${item.authorId}`}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {item.type === 'found' ? 'Claim Item' : 'Chat Owner'}
                    </Link>
                </Button>
            </CardFooter>
            {onDelete && (
                <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2"
                    onClick={() => onDelete(item)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </Card>
    );

  return (
      <div className="theme-findit flex flex-col h-screen bg-background">
        <main 
          className="flex-1 overflow-y-auto"
        >
            <div className="container mx-auto p-4 md:p-8">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold tracking-tighter text-primary">
                        Findit
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Your community platform for lost and found items. Report what you've lost or found to help reconnect items with their owners.
                    </p>
                </div>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="lost-and-found">Lost & Found Feed</TabsTrigger>
                        <TabsTrigger value="report-item">Report an Item</TabsTrigger>
                    </TabsList>
                    <TabsContent value="lost-and-found">
                        <div className="my-6 max-w-lg mx-auto">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                type="search"
                                placeholder="Search for items..."
                                className="w-full pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        {isLoading ? (
                             <div className="grid md:grid-cols-2 gap-8 mt-6">
                                <div className="space-y-4">
                                    <Skeleton className="h-96 w-full" />
                                    <Skeleton className="h-96 w-full" />
                                </div>
                                <div className="space-y-4">
                                    <Skeleton className="h-96 w-full" />
                                    <Skeleton className="h-96 w-full" />
                                </div>
                             </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-8 mt-6">
                                <div>
                                    <h2 className="text-2xl font-bold mb-4 text-center">Lost Items</h2>
                                    <div className="space-y-4">
                                        {filteredLostItems.map(item => <ItemCard key={item.id} item={item} />)}
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold mb-4 text-center">Found Items</h2>
                                    <div className="space-y-4">
                                        {filteredFoundItems.map(item => <ItemCard key={item.id} item={item} />)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="report-item">
                        <Card className="max-w-2xl mx-auto mt-6">
                            <CardContent className="p-0">
                                <Tabs defaultValue="report-lost" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="report-lost">I Lost Something</TabsTrigger>
                                        <TabsTrigger value="report-found">I Found Something</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="report-lost" className="p-6">
                                        <form className="space-y-4" onSubmit={(e) => handleReportSubmit(e, 'lost')}>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-item-name">Item Name</Label>
                                                <Input id="lost-item-name" placeholder="e.g., Black Leather Wallet" value={lostForm.name} onChange={e => setLostForm(prev => ({ ...prev, name: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                             <div className="space-y-1">
                                                <Label htmlFor="lost-item-category">Category</Label>
                                                <Select onValueChange={(value) => setLostForm(prev => ({...prev, category: value}))} value={lostForm.category}>
                                                    <SelectTrigger id="lost-item-category">
                                                        <SelectValue placeholder="Select a category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {itemCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-item-desc">Description</Label>
                                                <Textarea id="lost-item-desc" placeholder="Provide details like color, brand, or any identifying marks." value={lostForm.description} onChange={e => setLostForm(prev => ({ ...prev, description: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-item-loc">Last Seen Location</Label>
                                                <Input id="lost-item-loc" placeholder="e.g., Central Park, near the fountain" value={lostForm.location} onChange={e => setLostForm(prev => ({ ...prev, location: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                             <div className="space-y-1">
                                                <Label htmlFor="lost-datetime">Date & Time Lost</Label>
                                                <Input id="lost-datetime" type="datetime-local" value={lostForm.eventDateTime} onChange={e => setLostForm(prev => ({ ...prev, eventDateTime: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-contact-email">Contact Email</Label>
                                                <Input id="lost-contact-email" type="email" placeholder="your.email@example.com" value={lostForm.contactEmail} onChange={e => setLostForm(prev => ({ ...prev, contactEmail: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-contact-phone">Contact Phone (Optional)</Label>
                                                <Input id="lost-contact-phone" type="tel" placeholder="Your phone number" value={lostForm.contactPhone} onChange={e => setLostForm(prev => ({ ...prev, contactPhone: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Image (optional)</Label>
                                                <Input type="file" ref={lostItemImageRef} onChange={(e) => handleImageChange(e, 'lost')} className="hidden" accept="image/*" disabled={isSubmitting} />
                                                {lostForm.imagePreview ? (
                                                    <div className="relative w-full h-40 rounded-md border">
                                                        <Image src={lostForm.imagePreview} alt="Preview" layout="fill" objectFit="contain" />
                                                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 rounded-full" onClick={() => handleRemoveImage('lost')} disabled={isSubmitting}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button type="button" variant="outline" className="w-full" onClick={() => lostItemImageRef.current?.click()} disabled={isSubmitting}><Upload className="mr-2 h-4 w-4" /> Upload Image</Button>
                                                )}
                                            </div>
                                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                                {isSubmitting ? "Submitting..." : <><PlusCircle className="mr-2 h-4 w-4" /> Report Lost Item</>}
                                            </Button>
                                        </form>
                                    </TabsContent>
                                    <TabsContent value="report-found" className="p-6">
                                         <form className="space-y-4" onSubmit={(e) => handleReportSubmit(e, 'found')}>
                                            <div className="space-y-1">
                                                <Label htmlFor="found-item-name">Item Name</Label>
                                                <Input id="found-item-name" placeholder="e.g., Set of keys" value={foundForm.name} onChange={e => setFoundForm(prev => ({ ...prev, name: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="found-item-category">Category</Label>
                                                <Select onValueChange={(value) => setFoundForm(prev => ({...prev, category: value}))} value={foundForm.category}>
                                                    <SelectTrigger id="found-item-category">
                                                        <SelectValue placeholder="Select a category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {itemCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="found-item-desc">Description</Label>
                                                <Textarea id="found-item-desc" placeholder="Describe the item you found." value={foundForm.description} onChange={e => setFoundForm(prev => ({ ...prev, description: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="found-item-loc">Location Found</Label>
                                                <Input id="found-item-loc" placeholder="e.g., On the bench at 5th Ave & Main St" value={foundForm.location} onChange={e => setFoundForm(prev => ({ ...prev, location: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="found-datetime">Date & Time Found</Label>
                                                <Input id="found-datetime" type="datetime-local" value={foundForm.eventDateTime} onChange={e => setFoundForm(prev => ({ ...prev, eventDateTime: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                             <div className="space-y-1">
                                                <Label htmlFor="found-contact-email">Your Contact Email</Label>
                                                <Input id="found-contact-email" type="email" placeholder="your.email@example.com" value={foundForm.contactEmail} onChange={e => setFoundForm(prev => ({ ...prev, contactEmail: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="found-contact-phone">Your Contact Phone (Optional)</Label>
                                                <Input id="found-contact-phone" type="tel" placeholder="Your phone number" value={foundForm.contactPhone} onChange={e => setFoundForm(prev => ({ ...prev, contactPhone: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Image (optional)</Label>
                                                <Input type="file" ref={foundItemImageRef} onChange={(e) => handleImageChange(e, 'found')} className="hidden" accept="image/*" disabled={isSubmitting} />
                                                {foundForm.imagePreview ? (
                                                    <div className="relative w-full h-40 rounded-md border">
                                                        <Image src={foundForm.imagePreview} alt="Preview" layout="fill" objectFit="contain" />
                                                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 rounded-full" onClick={() => handleRemoveImage('found')} disabled={isSubmitting}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button type="button" variant="outline" className="w-full" onClick={() => foundItemImageRef.current?.click()} disabled={isSubmitting}><Upload className="mr-2 h-4 w-4" /> Upload Image</Button>
                                                )}
                                            </div>
                                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                                {isSubmitting ? "Submitting..." : <><PlusCircle className="mr-2 h-4 w-4" /> Report Found Item</>}
                                            </Button>
                                        </form>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                        {user && (
                            <Card className="max-w-2xl mx-auto mt-6">
                                <CardHeader>
                                    <CardTitle>Your Reported Items</CardTitle>
                                    <CardDescription>Items you have reported as lost or found.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {userItems.length > 0 ? (
                                        <div className="space-y-4">
                                            {userItems.map(item => <ItemCard key={item.id} item={item} onDelete={handleDeleteItem} />)}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center">You have not reported any items.</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </main>
      </div>
  );
}

    