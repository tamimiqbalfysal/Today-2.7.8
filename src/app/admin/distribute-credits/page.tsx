
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DistributeCreditsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleGiveAway = async () => {
        if (!user || !db) return;
        const giveawayAmount = parseInt(amount, 10);
        if (isNaN(giveawayAmount) || giveawayAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a positive number.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);
            const allUsers: User[] = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
            const totalRedeemed = allUsers.reduce((sum, u) => sum + (u.redeemedGiftCodes || 0), 0);

            if (totalRedeemed === 0) {
                toast({
                    variant: "destructive",
                    title: "Cannot Distribute",
                    description: "No gift codes have been redeemed yet, so shares cannot be calculated.",
                });
                setIsSubmitting(false);
                return;
            }

            const batch = writeBatch(db);

            allUsers.forEach(otherUser => {
                const userShare = (otherUser.redeemedGiftCodes || 0) / totalRedeemed;
                const creditsToGive = giveawayAmount * userShare;
                if (creditsToGive > 0) {
                    const otherUserRef = doc(db, 'users', otherUser.uid);
                    batch.update(otherUserRef, { credits: increment(creditsToGive) });
                }
            });
            
            await batch.commit();

            toast({
                title: "Success!",
                description: `Successfully distributed ${giveawayAmount} credits to all users!`,
            });
            setAmount('');
        } catch (error: any) {
            console.error("Error during giveaway:", error);
            toast({
                variant: "destructive",
                title: "Giveaway Failed",
                description: "An unexpected error occurred while distributing credits.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (user?.email !== 'tamimiqbal.fysal@gmail.com') {
        return (
            <div className="flex items-center justify-center h-screen">
                <Alert variant="destructive" className="max-w-md">
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You do not have permission to view this page.
                        <Button asChild variant="link" className="p-0 h-auto ml-1">
                            <Link href="/">Go back home</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen">
            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto max-w-2xl p-4 flex flex-col items-center justify-center">
                   <Card className="w-full">
                    <CardHeader>
                      <CardTitle>Distribute Credits</CardTitle>
                      <CardDescription>
                        Enter the total amount of credits to give away. They will be distributed to all users based on their "Thank u, G!" contribution share.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                        <Label htmlFor="giveaway-amount">Amount to Give Away</Label>
                        <Input
                            id="giveaway-amount"
                            type="number"
                            placeholder="e.g. 10000"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isSubmitting}
                        />
                        </div>
                        <Button
                        className="w-full"
                        onClick={handleGiveAway}
                        disabled={isSubmitting || !amount}
                        >
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        {isSubmitting ? 'Distributing...' : 'Give Away Credits'}
                        </Button>
                    </CardContent>
                    <CardFooter>
                         <Button asChild variant="outline" className="w-full">
                            <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Admin Panel</Link>
                         </Button>
                    </CardFooter>
                   </Card>
                </div>
            </main>
        </div>
    );
}
