
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, deleteDoc, doc, where, updateDoc, getDocs } from 'firebase/firestore';
import type { BloodRequest, User } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { HeartPulse, Droplets, Hospital, Phone, Loader2, Trash2, MapPin, User as UserIcon, Star, Search, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function DonorCard({ donor }: { donor: User }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-accent transition-colors">
        <Avatar className="h-12 w-12">
            <AvatarImage src={donor.photoURL || undefined} alt={donor.name} />
            <AvatarFallback>{donor.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
            <p className="font-semibold truncate">{donor.name}</p>
            <p className="text-sm text-muted-foreground truncate">{donor.donorLocation}</p>
        </div>
        <div className="flex items-center gap-2 text-destructive font-bold">
            <Droplets className="h-4 w-4" />
            <span>{donor.donorBloodGroup}</span>
        </div>
        <Button asChild variant="outline" size="sm">
            <Link href={`/chat/${donor.uid}`}>
                Chat
            </Link>
        </Button>
    </div>
  )
}

function RequestCard({ request, isOwner, onDelete }: { request: BloodRequest, isOwner: boolean, onDelete: (id: string) => void }) {
    return (
        <Card className="w-full relative">
            <CardHeader className="flex-row items-start gap-4 space-y-0">
                <div className="bg-destructive/10 p-3 rounded-full">
                    <Droplets className="h-8 w-8 text-destructive" />
                </div>
                <div>
                    <CardTitle className="text-2xl font-bold text-destructive">{request.bloodGroup}</CardTitle>
                    <CardDescription>{request.authorName}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                    <Hospital className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{request.hospitalName}</span>
                </div>
                <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <a href={`tel:${request.contact}`} className="font-medium hover:underline">{request.contact}</a>
                </div>
                {request.notes && <p className="text-sm text-muted-foreground pt-2 border-t mt-3">{request.notes}</p>}
            </CardContent>
            <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Posted {formatDistanceToNow(request.timestamp.toDate(), { addSuffix: true })}</span>
                {isOwner && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete your blood request. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(request.id)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </CardFooter>
        </Card>
    );
}

export default function RoktimPage() {
    const { user, updateUserPreferences } = useAuth();
    const { toast } = useToast();

    const [allRequests, setAllRequests] = useState<BloodRequest[]>([]);
    const [allDonors, setAllDonors] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Filters
    const [requestBloodGroupFilter, setRequestBloodGroupFilter] = useState('');
    const [donorSearchTerm, setDonorSearchTerm] = useState('');

    // Forms
    const [bloodGroup, setBloodGroup] = useState('');
    const [hospitalName, setHospitalName] = useState('');
    const [contact, setContact] = useState('');
    const [notes, setNotes] = useState('');

    // Donor profile states
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [donorBloodGroup, setDonorBloodGroup] = useState(user?.donorBloodGroup || '');
    const [donorLocation, setDonorLocation] = useState(user?.donorLocation || '');
    const [donorHospitals, setDonorHospitals] = useState(user?.donorNearestHospitals || '');
    
    useEffect(() => {
        if (user) {
            setDonorBloodGroup(user.donorBloodGroup || '');
            setDonorLocation(user.donorLocation || '');
            setDonorHospitals(user.donorNearestHospitals || '');
        }
    }, [user]);

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }
        
        const unsubRequests = onSnapshot(query(collection(db, 'bloodRequests'), orderBy('timestamp', 'desc')), (snapshot) => {
            const fetchedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BloodRequest));
            setAllRequests(fetchedRequests);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching blood requests:", error);
            if(error.code === 'permission-denied') {
                toast({ variant: 'destructive', title: 'Permission Denied', description: 'Your security rules may be preventing you from reading requests.'});
            }
            setIsLoading(false);
        });

        const donorsQuery = query(collection(db, 'users'), where('donorBloodGroup', '!=', ''));
        const unsubDonors = onSnapshot(donorsQuery, (snapshot) => {
            const fetchedDonors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllDonors(fetchedDonors);
        }, (error) => {
            console.error("Error fetching donors:", error);
        });


        return () => {
          unsubRequests();
          unsubDonors();
        }
    }, [toast]);

    const filteredRequests = useMemo(() => {
      if (!requestBloodGroupFilter) {
        return allRequests;
      }
      return allRequests.filter(req => req.bloodGroup === requestBloodGroupFilter);
    }, [allRequests, requestBloodGroupFilter]);

    const filteredDonors = useMemo(() => {
        if (!donorSearchTerm.trim()) {
            return [];
        }
        const lowercasedTerm = donorSearchTerm.toLowerCase();
        return allDonors.filter(donor =>
            donor.id !== user?.uid && (
            donor.name.toLowerCase().includes(lowercasedTerm) ||
            donor.donorLocation?.toLowerCase().includes(lowercasedTerm) ||
            donor.donorBloodGroup?.toLowerCase() === lowercasedTerm)
        );
    }, [allDonors, donorSearchTerm, user?.uid]);
    
    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to make a request.' });
            return;
        }
        if (!bloodGroup || !hospitalName || !contact) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all required fields.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'bloodRequests'), {
                authorId: user.uid,
                authorName: user.name,
                bloodGroup,
                hospitalName,
                contact,
                notes,
                timestamp: Timestamp.now(),
            });
            toast({ title: 'Request Posted', description: 'Your request for blood has been posted successfully.' });
            setBloodGroup('');
            setHospitalName('');
            setContact('');
            setNotes('');
        } catch (error: any) {
            console.error("Error posting request:", error);
            let description = "Could not post your request.";
            if (error.code === 'permission-denied') {
                description = "Permission denied. Check Firestore security rules for the 'bloodRequests' collection.";
            }
            toast({ variant: 'destructive', title: 'Error', description });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if(!db) return;
        try {
            await deleteDoc(doc(db, 'bloodRequests', id));
            toast({ title: 'Request Deleted', description: 'Your blood request has been removed.' });
        } catch (error) {
            console.error("Error deleting request:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the request.' });
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        await updateUserPreferences({
            donorBloodGroup,
            donorLocation,
            donorNearestHospitals: donorHospitals,
        });
        setIsSavingProfile(false);
    };
    
    const loggedInUserDonorCard = user?.donorBloodGroup ? allDonors.find(d => d.id === user.uid) : null;

    return (
        <div className="flex flex-col min-h-screen bg-red-50/50">
            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-4 md:p-8">
                    <div className="text-center mb-12">
                         <HeartPulse className="mx-auto h-16 w-16 text-destructive" />
                        <h1 className="text-5xl font-bold tracking-tighter text-destructive mt-4">
                            Roktim
                        </h1>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            Connect with donors. Save a life. Post an urgent request for blood.
                        </p>
                    </div>
                    
                    <div className="mb-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Find a Blood Donor</CardTitle>
                                <CardDescription>Search for registered donors by name, location or blood group.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search by name, location or blood group (e.g. A+)"
                                        className="w-full pl-10"
                                        value={donorSearchTerm}
                                        onChange={(e) => setDonorSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="mt-4 space-y-2 divide-y">
                                    {donorSearchTerm ? (
                                        filteredDonors.length > 0 ? (
                                            filteredDonors.map(donor => <DonorCard key={donor.id} donor={donor} />)
                                        ) : (
                                            <p className="text-center text-muted-foreground py-4">No donors found.</p>
                                        )
                                    ) : loggedInUserDonorCard ? (
                                        <DonorCard donor={loggedInUserDonorCard} />
                                    ) : null}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 mb-8 items-start">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                <HeartPulse className="text-destructive"/> My Donor Profile
                                </CardTitle>
                                <CardDescription>Keep your information updated to help others find you.</CardDescription>
                            </CardHeader>
                            <CardContent>
                            {user ? (
                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="donor-blood-group">Your Blood Group</Label>
                                        <Select value={donorBloodGroup} onValueChange={setDonorBloodGroup} disabled={isSavingProfile}>
                                            <SelectTrigger id="donor-blood-group">
                                                <SelectValue placeholder="Select Blood Group" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {bloodGroups.map(group => (
                                                    <SelectItem key={group} value={group}>{group}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="donor-location">Your Location</Label>
                                        <Input id="donor-location" value={donorLocation} onChange={e => setDonorLocation(e.target.value)} placeholder="e.g., Dhaka, Bangladesh" disabled={isSavingProfile} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="donor-hospitals">Nearest Hospitals</Label>
                                        <Textarea id="donor-hospitals" value={donorHospitals} onChange={e => setDonorHospitals(e.target.value)} placeholder="List hospitals you can easily reach" disabled={isSavingProfile} />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isSavingProfile}>
                                        {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Donor Profile
                                    </Button>
                                </form>
                                ) : (
                                     <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                                        <p className="mb-4">Please log in to manage your donor profile.</p>
                                        <Button asChild>
                                            <Link href="/login">Log In</Link>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Request Blood</CardTitle>
                                <CardDescription>Fill the form to post an urgent request.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {user ? (
                                    <form onSubmit={handleSubmitRequest} className="space-y-4">
                                        <div className="space-y-1">
                                            <Label htmlFor="blood-group">Blood Group</Label>
                                            <Select value={bloodGroup} onValueChange={setBloodGroup} disabled={isSubmitting}>
                                                <SelectTrigger id="blood-group">
                                                    <SelectValue placeholder="Select Blood Group" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {bloodGroups.map(group => (
                                                        <SelectItem key={group} value={group}>{group}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="hospital">Hospital Name & Location</Label>
                                            <Input id="hospital" value={hospitalName} onChange={e => setHospitalName(e.target.value)} placeholder="e.g., City General Hospital" disabled={isSubmitting}/>
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="contact">Contact Number</Label>
                                            <Input id="contact" type="tel" value={contact} onChange={e => setContact(e.target.value)} placeholder="Your phone number" disabled={isSubmitting} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="notes">Additional Notes (Optional)</Label>
                                            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Patient is in ICU, need by tomorrow." disabled={isSubmitting} />
                                        </div>
                                        <Button type="submit" className="w-full bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {isSubmitting ? 'Posting...' : 'Post Request'}
                                        </Button>
                                    </form>
                                ) : (
                                    <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                                        <p className="mb-4">Please log in to post a blood request.</p>
                                        <Button asChild>
                                            <Link href="/login">Log In</Link>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                         <h2 className="text-2xl font-bold mb-4 text-center">Urgent Blood Requests</h2>
                        <div className="mb-6 max-w-sm mx-auto">
                            <Select 
                                value={requestBloodGroupFilter} 
                                onValueChange={(value) => setRequestBloodGroupFilter(value === 'all' ? '' : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Blood Group" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Blood Groups</SelectItem>
                                    {bloodGroups.map(group => (
                                        <SelectItem key={group} value={group}>{group}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {isLoading ? (
                            <div className="space-y-6">
                                <Skeleton className="h-48 w-full" />
                                <Skeleton className="h-48 w-full" />
                            </div>
                        ) : filteredRequests.length > 0 ? (
                           <div className="grid md:grid-cols-2 gap-6">
                             {filteredRequests.map(req => (
                                <RequestCard 
                                    key={req.id} 
                                    request={req}
                                    isOwner={user?.uid === req.authorId}
                                    onDelete={handleDelete}
                                />
                            ))}
                           </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg lg:h-full flex items-center justify-center">
                                <p>No active blood requests for the selected group.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

    