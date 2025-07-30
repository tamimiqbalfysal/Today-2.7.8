
'use client';

import { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Trash2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { User as AppUser } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


export default function ManageAdminsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [admins, setAdmins] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!db) return;
    const adminsRef = collection(db, 'admins');
    const unsubscribe = onSnapshot(adminsRef, async (snapshot) => {
        const adminIds = snapshot.docs.map(doc => doc.id);
        if (adminIds.length === 0) {
            setAdmins([]);
            setIsLoading(false);
            return;
        }

        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', 'in', adminIds));
            const userDocs = await getDocs(q);
            const adminUsers = userDocs.docs.map(doc => doc.data() as AppUser);
            setAdmins(adminUsers);
        } catch (error) {
            console.error("Error fetching admin user data:", error)
        } finally {
            setIsLoading(false);
        }
    }, (error) => {
        console.error("Error listening to admins collection:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load admin list. Check permissions.' });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !db) return;

    setIsSubmitting(true);
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email.trim()));
        const userSnapshot = await getDocs(q);
        
        if (userSnapshot.empty) {
            toast({ variant: 'destructive', title: 'User Not Found', description: 'No user exists with that email address.' });
            setIsSubmitting(false);
            return;
        }

        const userToAdd = userSnapshot.docs[0].data() as AppUser;
        const adminRef = doc(db, 'admins', userToAdd.uid);
        await setDoc(adminRef, { email: userToAdd.email, addedAt: new Date(), addedBy: currentUser?.uid });

        toast({ title: 'Admin Added', description: `${userToAdd.name} is now an administrator.` });
        setEmail('');
    } catch (error) {
        console.error("Error adding admin: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add admin. Check Firestore rules.' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleRemoveAdmin = async (adminToRemove: AppUser) => {
      if (!db || !adminToRemove) return;
      if (adminToRemove.email === 'tamimiqbal.fysal@gmail.com') {
          toast({ variant: 'destructive', title: 'Cannot Remove', description: 'The primary admin cannot be removed.'});
          return;
      }
      try {
          await deleteDoc(doc(db, 'admins', adminToRemove.uid));
          toast({ title: 'Admin Removed', description: `${adminToRemove.name} is no longer an administrator.`});
      } catch (error) {
          console.error("Error removing admin:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not remove admin.'});
      }
  }

  return (
      <div className="flex flex-col h-screen">
        <main>
          <div className="container mx-auto max-w-2xl p-4 flex flex-col items-center justify-center">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Manage Administrators</CardTitle>
                <CardDescription>
                  Add or remove users who have administrative privileges. Admins have broad access, so grant this power carefully.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleAddAdmin} className="flex items-end gap-2">
                    <div className="flex-grow space-y-1">
                        <Label htmlFor="admin-email">New Admin Email</Label>
                        <Input
                            id="admin-email"
                            type="email"
                            placeholder="user@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <Button type="submit" disabled={isSubmitting || !email.trim()}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Add
                    </Button>
                </form>
                
                <div className="space-y-4">
                    <h3 className="font-semibold">Current Admins</h3>
                    {isLoading ? <Loader2 className="animate-spin" /> : (
                        admins.length > 0 ? (
                            admins.map(admin => (
                                <div key={admin.uid} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={admin.photoURL || undefined} />
                                            <AvatarFallback>{admin.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{admin.name}</p>
                                            <p className="text-sm text-muted-foreground">{admin.email}</p>
                                        </div>
                                    </div>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                           <Button variant="ghost" size="icon" disabled={admin.email === 'tamimiqbal.fysal@gmail.com'}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will revoke all administrative privileges for {admin.name}. This action can be undone by adding them again.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleRemoveAdmin(admin)} className="bg-destructive hover:bg-destructive/90">
                                                    Remove Admin
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))
                        ) : (
                           <p className="text-sm text-muted-foreground">No other admins found.</p>
                        )
                    )}
                </div>
                 <div className="flex justify-end gap-2 pt-4">
                    <Button asChild variant="outline">
                        <Link href="/admin">Back to Admin</Link>
                    </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
  );
}
