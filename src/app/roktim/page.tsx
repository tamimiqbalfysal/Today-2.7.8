

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
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, deleteDoc, doc, where, updateDoc } from 'firebase/firestore';
import type { BloodRequest, User } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { HeartPulse, Droplets, Hospital, Phone, Loader2, Trash2, MapPin, User as UserIcon, Star, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

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

function DonorCard({ donor }: { donor: User }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={donor.photoURL || undefined} alt={donor.name} />
            <AvatarFallback>{donor.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{donor.name}</p>
            <p className="text-sm text-muted-foreground">{donor.donorLocation}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="font-bold text-lg text-destructive">{donor.donorBloodGroup}</p>
            <p className="text-xs text-muted-foreground">Blood Group</p>
          </div>
          <Button asChild size="sm">
            <Link href={`/u/${donor.uid}`}>View Profile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


export default function RoktimPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [allRequests, setAllRequests] = useState<BloodRequest[]>([]);
    const [donors, setDonors] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDonorsLoading, setIsDonorsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Donor search states
    const [donorSearchTerm, setDonorSearchTerm] = useState('');
    const [donorBloodGroupFilter, setDonorBloodGroupFilter] = useState('');

    // Form states
    const [bloodGroup, setBloodGroup] = useState('');
    const [hospitalName, setHospitalName] = useState('');
    const [contact, setContact] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            setIsDonorsLoading(false);
            return;
        }
        
        const q = query(collection(db, 'bloodRequests'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BloodRequest));
            setAllRequests(fetchedRequests);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching all blood requests:", error);
            if(error.code === 'permission-denied') {
                toast({ variant: 'destructive', title: 'Permission Denied', description: 'Your security rules may be preventing you from reading requests.'});
            }
            setIsLoading(false);
        });

        const donorsQuery = query(collection(db, 'users'), where('donorBloodGroup', '!=', null));
        const unsubscribeDonors = onSnapshot(donorsQuery, (snapshot) => {
            const fetchedDonors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setDonors(fetchedDonors);
            setIsDonorsLoading(false);
        }, (error) => {
            console.error("Error fetching donors:", error);
            setIsDonorsLoading(false);
        });


        return () => {
          unsubscribe();
          unsubscribeDonors();
        }
    }, [toast]);
    
    const filteredDonors = useMemo(() => {
      return donors.filter(donor => {
        const matchesBloodGroup = donorBloodGroupFilter ? donor.donorBloodGroup === donorBloodGroupFilter : true;
        const matchesSearchTerm = donorSearchTerm ? 
          (donor.name.toLowerCase().includes(donorSearchTerm.toLowerCase()) || 
           donor.donorLocation?.toLowerCase().includes(donorSearchTerm.toLowerCase()))
          : true;
        return matchesBloodGroup && matchesSearchTerm;
      });
    }, [donors, donorSearchTerm, donorBloodGroupFilter]);
    
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
            // Reset form
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

    return (
        <div className="flex flex-col h-screen bg-red-50/50">
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

                     <Tabs defaultValue="feed" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="feed">Urgent Requests</TabsTrigger>
                            <TabsTrigger value="find-donors">Find Donors</TabsTrigger>
                        </TabsList>
                        <TabsContent value="feed" className="mt-6">
                            <div className="grid lg:grid-cols-2 gap-8 items-start">
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
                                <div className="space-y-6">
                                    {isLoading ? (
                                        <>
                                            <Skeleton className="h-48 w-full" />
                                            <Skeleton className="h-48 w-full" />
                                        </>
                                    ) : allRequests.length > 0 ? (
                                        allRequests.map(req => (
                                            <RequestCard 
                                                key={req.id} 
                                                request={req}
                                                isOwner={user?.uid === req.authorId}
                                                onDelete={handleDelete}
                                            />
                                        ))
                                    ) : (
                                        <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg lg:h-full flex items-center justify-center">
                                            <p>No active blood requests at the moment.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                         <TabsContent value="find-donors" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Find a Blood Donor</CardTitle>
                                    <CardDescription>Search for registered donors by location or blood group.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <Input 
                                            placeholder="Search by name or location..." 
                                            value={donorSearchTerm}
                                            onChange={(e) => setDonorSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                        <Select 
                                            value={donorBloodGroupFilter} 
                                            onValueChange={(value) => setDonorBloodGroupFilter(value === 'all' ? '' : value)}
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
                                    <div className="space-y-4 pt-4">
                                        {isDonorsLoading ? (
                                            <>
                                                <Skeleton className="h-20 w-full" />
                                                <Skeleton className="h-20 w-full" />
                                                <Skeleton className="h-20 w-full" />
                                            </>
                                        ) : filteredDonors.length > 0 ? (
                                            filteredDonors.map(donor => (
                                                <DonorCard key={donor.uid} donor={donor} />
                                            ))
                                        ) : (
                                            <p className="text-center text-muted-foreground py-8">No donors found matching your criteria.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                         </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
}
