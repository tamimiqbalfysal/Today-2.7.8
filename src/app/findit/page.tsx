
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Search, Upload, X } from 'lucide-react';
import Image from 'next/image';

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


export default function FinditPage() {
    const [lostItems, setLostItems] = useState<LostItem[]>([
        { id: 1, name: 'iPhone 13 Pro', description: 'Blue iPhone in a clear case. Has a small crack on the top left corner.', lastSeen: 'Central Park, near the fountain', contact: 'jane.doe@email.com', imageUrl: 'https://placehold.co/300x200.png' },
        { id: 2, name: 'Keys with a red fob', description: 'Set of three keys on a silver ring with a red plastic fob.', lastSeen: 'Subway, Line 2', contact: 'contact@findit.com', imageUrl: 'https://placehold.co/300x200.png' },
    ]);
    const [foundItems, setFoundItems] = useState<FoundItem[]>([
        { id: 1, name: 'Black Leather Wallet', description: 'Contains various cards but no cash. ID for John Smith inside.', foundLocation: 'Main Street Library', contact: 'library.found@email.com', imageUrl: 'https://placehold.co/300x200.png' },
        { id: 2, name: 'A single earring', description: 'Small, silver hoop earring. Found on the floor near the checkout.', foundLocation: 'Supermarket on 5th Ave', contact: 'supermarket.manager@email.com', imageUrl: 'https://placehold.co/300x200.png' },
    ]);

    // Form state
    const [itemName, setItemName] = useState('');
    const [itemDescription, setItemDescription] = useState('');
    const [itemLocation, setItemLocation] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Image state
    const [lostItemImage, setLostItemImage] = useState<File | null>(null);
    const [lostItemImagePreview, setLostItemImagePreview] = useState<string | null>(null);
    const [foundItemImage, setFoundItemImage] = useState<File | null>(null);
    const [foundItemImagePreview, setFoundItemImagePreview] = useState<string | null>(null);

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
                setLostItemImage(file);
                setLostItemImagePreview(previewUrl);
            } else {
                setFoundItemImage(file);
                setFoundItemImagePreview(previewUrl);
            }
        }
    };

    const handleRemoveImage = (type: 'lost' | 'found') => {
        if (type === 'lost') {
            setLostItemImage(null);
            setLostItemImagePreview(null);
            if (lostItemImageRef.current) lostItemImageRef.current.value = '';
        } else {
            setFoundItemImage(null);
            setFoundItemImagePreview(null);
            if (foundItemImageRef.current) foundItemImageRef.current.value = '';
        }
    };
    
    const handleReportSubmit = (type: 'lost' | 'found') => (e: React.FormEvent) => {
        e.preventDefault();
        console.log({
            type,
            itemName,
            itemDescription,
            itemLocation,
            contactInfo,
            lostItemImage,
            foundItemImage,
        });
        setItemName('');
        setItemDescription('');
        setItemLocation('');
        setContactInfo('');
        handleRemoveImage('lost');
        handleRemoveImage('found');
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
                
                <Tabs defaultValue="lost-and-found" className="w-full">
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
                                            {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover" />}
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
                                            {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover" />}
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
                                        <form className="space-y-4" onSubmit={handleReportSubmit('lost')}>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-item-name">Item Name</Label>
                                                <Input id="lost-item-name" placeholder="e.g., Black Leather Wallet" onChange={e => setItemName(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-item-desc">Description</Label>
                                                <Textarea id="lost-item-desc" placeholder="Provide details like color, brand, or any identifying marks." onChange={e => setItemDescription(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-item-loc">Last Seen Location</Label>
                                                <Input id="lost-item-loc" placeholder="e.g., Central Park, near the fountain" onChange={e => setItemLocation(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="lost-contact">Contact Info</Label>
                                                <Input id="lost-contact" type="email" placeholder="your.email@example.com" onChange={e => setContactInfo(e.target.value)} />
                                            </div >
                                            <div className="space-y-1">
                                                <Label>Image (optional)</Label>
                                                <Input type="file" ref={lostItemImageRef} onChange={(e) => handleImageChange(e, 'lost')} className="hidden" accept="image/*" />
                                                {lostItemImagePreview ? (
                                                    <div className="relative w-full h-40 rounded-md border">
                                                        <Image src={lostItemImagePreview} alt="Preview" layout="fill" objectFit="contain" />
                                                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 rounded-full" onClick={() => handleRemoveImage('lost')}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button type="button" variant="outline" className="w-full" onClick={() => lostItemImageRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Upload Image</Button>
                                                )}
                                            </div>
                                            <Button type="submit" className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Report Lost Item</Button>
                                        </form>
                                    </TabsContent>
                                    <TabsContent value="report-found" className="p-6">
                                         <form className="space-y-4" onSubmit={handleReportSubmit('found')}>
                                            <div className="space-y-1">
                                                <Label htmlFor="found-item-name">Item Name</Label>
                                                <Input id="found-item-name" placeholder="e.g., Set of keys" onChange={e => setItemName(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="found-item-desc">Description</Label>
                                                <Textarea id="found-item-desc" placeholder="Describe the item you found." onChange={e => setItemDescription(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="found-item-loc">Location Found</Label>
                                                <Input id="found-item-loc" placeholder="e.g., On the bench at 5th Ave & Main St" onChange={e => setItemLocation(e.target.value)} />
                                            </div>
                                             <div className="space-y-1">
                                                <Label htmlFor="found-contact">Your Contact Info</Label>
                                                <Input id="found-contact" type="email" placeholder="your.email@example.com" onChange={e => setContactInfo(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Image (optional)</Label>
                                                <Input type="file" ref={foundItemImageRef} onChange={(e) => handleImageChange(e, 'found')} className="hidden" accept="image/*" />
                                                {foundItemImagePreview ? (
                                                    <div className="relative w-full h-40 rounded-md border">
                                                        <Image src={foundItemImagePreview} alt="Preview" layout="fill" objectFit="contain" />
                                                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 rounded-full" onClick={() => handleRemoveImage('found')}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button type="button" variant="outline" className="w-full" onClick={() => foundItemImageRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Upload Image</Button>
                                                )}
                                            </div>
                                            <Button type="submit" className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Report Found Item</Button>
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
