
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Search, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

interface FoundItem {
    id: number;
    name: string;
    description: string;
    foundLocation: string;
    contact: string;
    imageUrl?: string;
}

interface LostItem {
    id: number;
    name: string;
    description: string;
    lastSeen: string;
    contact: string;
    imageUrl?: string;
}

interface LostItemFormState {
    name: string;
    description: string;
    lastSeen: string;
    contact: string;
    image: File | null;
    imagePreview: string | null;
}

interface FoundItemFormState {
    name: string;
    description: string;
    foundLocation: string;
    contact: string;
    image: File | null;
    imagePreview: string | null;
}


export default function FinditPage() {
    const [lostItems, setLostItems] = useState<LostItem[]>([
        { id: 1, name: 'iPhone 13 Pro', description: 'Blue iPhone in a clear case. Has a small crack on the top left corner.', lastSeen: 'Central Park, near the fountain', contact: 'jane.doe@email.com', imageUrl: 'https://placehold.co/300x200.png' },
        { id: 2, name: 'Keys with a red fob', description: 'Set of three keys on a silver ring with a red plastic fob.', lastSeen: 'Subway, Line 2', contact: 'contact@findit.com', imageUrl: 'https://placehold.co/300x200.png' },
    ]);
    const [foundItems, setFoundItems] = useState<FoundItem[]>([
        { id: 1, name: 'Black Leather Wallet', description: 'Contains various cards but no cash. ID for John Smith inside.', foundLocation: 'Main Street Library', contact: 'library.found@email.com', imageUrl: 'https://placehold.co/300x200.png' },
        { id: 2, name: 'A single earring', description: 'Small, silver hoop earring. Found on the floor near the checkout.', foundLocation: 'Supermarket on 5th Ave', contact: 'supermarket.manager@email.com', imageUrl: 'https://placehold.co/300x200.png' },
    ]);

    const [lostForm, setLostForm] = useState<LostItemFormState>({ name: '', description: '', lastSeen: '', contact: '', image: null, imagePreview: null });
    const [foundForm, setFoundForm] = useState<FoundItemFormState>({ name: '', description: '', foundLocation: '', contact: '', image: null, imagePreview: null });

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('lost-and-found');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const lostItemImageRef = useRef<HTMLInputElement>(null);
    const foundItemImageRef = useRef<HTMLInputElement>(null);

    const filteredLostItems = lostItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredFoundItems = foundItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
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
    
    const handleLostReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        let imageUrl = 'https://placehold.co/300x200.png';

        if (lostForm.image && storage) {
            try {
                const imageRef = ref(storage, `findit/lost/${Date.now()}_${lostForm.image.name}`);
                const snapshot = await uploadBytes(imageRef, lostForm.image);
                imageUrl = await getDownloadURL(snapshot.ref);
            } catch (error) {
                console.error("Error uploading image: ", error);
                toast({
                    variant: "destructive",
                    title: "Image Upload Failed",
                    description: "Could not upload your image. Please try again.",
                });
                setIsSubmitting(false);
                return;
            }
        }

        const newLostItem: LostItem = {
            id: Date.now(),
            name: lostForm.name,
            description: lostForm.description,
            lastSeen: lostForm.lastSeen,
            contact: lostForm.contact,
            imageUrl: imageUrl
        };
        setLostItems(prev => [newLostItem, ...prev]);
        setLostForm({ name: '', description: '', lastSeen: '', contact: '', image: null, imagePreview: null });
        if (lostItemImageRef.current) lostItemImageRef.current.value = '';
        setActiveTab('lost-and-found');
        setIsSubmitting(false);
    }
    
    const handleFoundReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        let imageUrl = 'https://placehold.co/300x200.png';

        if (foundForm.image && storage) {
             try {
                const imageRef = ref(storage, `findit/found/${Date.now()}_${foundForm.image.name}`);
                const snapshot = await uploadBytes(imageRef, foundForm.image);
                imageUrl = await getDownloadURL(snapshot.ref);
            } catch (error) {
                console.error("Error uploading image: ", error);
                 toast({
                    variant: "destructive",
                    title: "Image Upload Failed",
                    description: "Could not upload your image. Please try again.",
                });
                setIsSubmitting(false);
                return;
            }
        }

        const newFoundItem: FoundItem = {
            id: Date.now(),
            name: foundForm.name,
            description: foundForm.description,
            foundLocation: foundForm.foundLocation,
            contact: foundForm.contact,
            imageUrl: imageUrl
        };
        setFoundItems(prev => [newFoundItem, ...prev]);
        setFoundForm({ name: '', description: '', foundLocation: '', contact: '', image: null, imagePreview: null });
        if (foundItemImageRef.current) foundItemImageRef.current.value = '';
        setActiveTab('lost-and-found');
        setIsSubmitting(false);
    }

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
                        <div className="grid md:grid-cols-2 gap-8 mt-6">
                            <div>
                                <h2 className="text-2xl font-bold mb-4 text-center">Lost Items</h2>
                                <div className="space-y-4">
                                    {filteredLostItems.map(item => (
                                        <Card key={item.id} className="overflow-hidden">
                                            <div className="relative w-full h-40">
                                                <Image src={item.imageUrl || 'https://placehold.co/300x200.png'} alt={item.name} layout="fill" objectFit="cover" />
                                            </div>
                                            <CardHeader>
                                                <CardTitle>{item.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground">{item.description}</p>
                                                <p className="text-sm mt-2"><strong>Last seen:</strong> {item.lastSeen}</p>
                                            </CardContent>
                                            <CardFooter>
                                                <Button className="w-full">Contact Owner</Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-4 text-center">Found Items</h2>
                                <div className="space-y-4">
                                     {filteredFoundItems.map(item => (
                                        <Card key={item.id} className="overflow-hidden">
                                            <div className="relative w-full h-40">
                                                <Image src={item.imageUrl || 'https://placehold.co/300x200.png'} alt={item.name} layout="fill" objectFit="cover" />
                                            </div>
                                            <CardHeader>
                                                <CardTitle>{item.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground">{item.description}</p>
                                                <p className="text-sm mt-2"><strong>Found at:</strong> {item.foundLocation}</p>
                                            </CardContent>
                                            <CardFooter>
                                                <Button className="w-full">Claim Item</Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
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
                                        <form className="space-y-4" onSubmit={handleLostReportSubmit}>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-item-name">Item Name</Label>
                                                <Input id="lost-item-name" placeholder="e.g., Black Leather Wallet" value={lostForm.name} onChange={e => setLostForm(prev => ({ ...prev, name: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-item-desc">Description</Label>
                                                <Textarea id="lost-item-desc" placeholder="Provide details like color, brand, or any identifying marks." value={lostForm.description} onChange={e => setLostForm(prev => ({ ...prev, description: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-item-loc">Last Seen Location</Label>
                                                <Input id="lost-item-loc" placeholder="e.g., Central Park, near the fountain" value={lostForm.lastSeen} onChange={e => setLostForm(prev => ({ ...prev, lastSeen: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-contact">Contact Info</Label>
                                                <Input id="lost-contact" type="email" placeholder="your.email@example.com" value={lostForm.contact} onChange={e => setLostForm(prev => ({ ...prev, contact: e.target.value }))} disabled={isSubmitting} />
                                            </div >
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
                                         <form className="space-y-4" onSubmit={handleFoundReportSubmit}>
                                            <div className="space-y-1">
                                                <Label htmlFor="found-item-name">Item Name</Label>
                                                <Input id="found-item-name" placeholder="e.g., Set of keys" value={foundForm.name} onChange={e => setFoundForm(prev => ({ ...prev, name: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="found-item-desc">Description</Label>
                                                <Textarea id="found-item-desc" placeholder="Describe the item you found." value={foundForm.description} onChange={e => setFoundForm(prev => ({ ...prev, description: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="found-item-loc">Location Found</Label>
                                                <Input id="found-item-loc" placeholder="e.g., On the bench at 5th Ave & Main St" value={foundForm.foundLocation} onChange={e => setFoundForm(prev => ({ ...prev, foundLocation: e.target.value }))} disabled={isSubmitting} />
                                            </div>
                                             <div className="space-y-1">
                                                <Label htmlFor="found-contact">Your Contact Info</Label>
                                                <Input id="found-contact" type="email" placeholder="your.email@example.com" value={foundForm.contact} onChange={e => setFoundForm(prev => ({ ...prev, contact: e.target.value }))} disabled={isSubmitting} />
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
                    </TabsContent>
                </Tabs>
            </div>
        </main>
      </div>
  );
}
