
'use client';

import { useState } from 'react';
import { collection, doc, setDoc, updateDoc, increment, writeBatch, getDocs, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Gift, BrainCircuit, BookOpenCheck, Coins, Sparkles, UserCog } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [lastGiftCode, setLastGiftCode] = useState('');
  const [lastThinkCode, setLastThinkCode] = useState('');
  const [isGeneratingGift, setIsGeneratingGift] = useState(false);
  const [isGeneratingThink, setIsGeneratingThink] = useState(false);
  const [isGeneratingCredits, setIsGeneratingCredits] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [giveawayAmount, setGiveawayAmount] = useState('');


  const generateCode = async (type: 'gift' | 'think') => {
    if (!db) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firebase not configured.' });
      return;
    }

    const newCode = uuidv4();
    const collectionName = type === 'gift' ? 'giftCodes' : 'thinkCodes';
    const setIsGenerating = type === 'gift' ? setIsGeneratingGift : setIsGeneratingThink;
    const setLastCode = type === 'gift' ? setLastGiftCode : setLastThinkCode;

    setIsGenerating(true);
    try {
      const codeRef = doc(collection(db, collectionName), newCode);
      await setDoc(codeRef, { isUsed: false });
      setLastCode(newCode);
      toast({
        title: 'Code Generated!',
        description: `New ${type} code created successfully.`,
      });
    } catch (error: any) {
      console.error(`Error generating ${type} code:`, error);
      let description = `An unexpected error occurred while generating the ${type} code.`;
      if (error.code === 'permission-denied') {
        description = `Permission Denied. Please check your Firestore security rules to allow writes to the "${collectionName}" collection.`;
      }
      toast({ variant: 'destructive', title: 'Generation Failed', description });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Code copied to clipboard.' });
  };

  const handleGenerateCredits = async () => {
    if (!db || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }

    setIsGeneratingCredits(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        credits: increment(1000)
      });
      toast({
        title: 'Credits Generated!',
        description: '1000 credits have been added to your account.',
      });
    } catch (error: any) {
      console.error(`Error generating credits:`, error);
      let description = `An unexpected error occurred while generating credits.`;
      if (error.code === 'permission-denied') {
        description = `Permission Denied. Please check your Firestore security rules.`;
      }
      toast({ variant: 'destructive', title: 'Generation Failed', description });
    } finally {
      setIsGeneratingCredits(false);
    }
  };
  
  const handleGiveAway = async () => {
    if (!db || !user) return;
    const amount = parseInt(giveawayAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a positive number." });
      return;
    }

    setIsDistributing(true);
    try {
      const usersRef = collection(db, 'users');
      const giftCodesRef = collection(db, 'giftCodes');

      const [usersSnapshot, giftCodesSnapshot] = await Promise.all([
        getDocs(usersRef),
        getDocs(giftCodesRef)
      ]);

      let totalShares = 0;
      const userShares: { [uid: string]: number } = {};
      
      usersSnapshot.forEach(doc => {
          const userData = doc.data();
          const shares = userData.redeemedGiftCodes || 0;
          userShares[doc.id] = shares;
          totalShares += shares;
      });

      if (totalShares === 0) {
        toast({ variant: "destructive", title: "No Shares", description: "No users have submitted gift codes yet." });
        return;
      }
      
      const batch = writeBatch(db);
      
      usersSnapshot.forEach(userDoc => {
        const userId = userDoc.id;
        const shares = userShares[userId];
        if (shares > 0) {
          const userRef = doc(db, 'users', userId);
          const creditsToAdd = (shares / totalShares) * amount;
          batch.update(userRef, { credits: increment(creditsToAdd) });

          const giveawayHistoryRef = doc(collection(db, `users/${userId}/giveawayHistory`));
          batch.set(giveawayHistoryRef, {
            giverId: user.uid,
            giverName: user.name,
            giverPhotoURL: user.photoURL,
            amountReceived: creditsToAdd,
            timestamp: Timestamp.now()
          });
        }
      });
      
      await batch.commit();

      toast({ title: 'Success!', description: `${amount} credits have been distributed to users.` });
      setGiveawayAmount('');

    } catch (error: any) {
        console.error("Error distributing credits:", error);
        toast({ variant: "destructive", title: "Distribution Failed", description: error.message || "An unexpected error occurred." });
    } finally {
        setIsDistributing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col h-screen">
        <main className="flex-1 flex flex-col items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to view this page.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href="/">Go to Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        </main>
      </div>
    )
  }

  return (
      <div className="flex flex-col h-screen">
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-2xl p-4 flex flex-col items-center justify-center">
            <div className="w-full space-y-8">
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        Distribute Credits
                    </CardTitle>
                    <CardDescription>
                        Give away credits to all users based on their "Thank u, G!" contribution.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="giveaway-amount">Amount to Distribute</Label>
                        <Input 
                            id="giveaway-amount"
                            type="number"
                            placeholder="e.g., 10000"
                            value={giveawayAmount}
                            onChange={(e) => setGiveawayAmount(e.target.value)}
                            disabled={isDistributing}
                        />
                    </div>
                    <Button onClick={handleGiveAway} disabled={isDistributing || !giveawayAmount} className="w-full">
                        {isDistributing ? 'Distributing...' : 'Give Away Credits'}
                    </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="text-primary" />
                    Generate Gift Code
                  </CardTitle>
                  <CardDescription>
                    Create a new unique code for the "Thank u, G!" page.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={() => generateCode('gift')}
                    disabled={isGeneratingGift}
                    className="w-full"
                  >
                    {isGeneratingGift ? 'Generating...' : 'Generate New Gift Code'}
                  </Button>
                  {lastGiftCode && (
                    <div className="space-y-2">
                      <Label>Last Generated Gift Code:</Label>
                      <div className="flex items-center space-x-2">
                        <Input value={lastGiftCode} readOnly />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(lastGiftCode)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="text-primary" />
                    Generate Think Code
                  </CardTitle>
                  <CardDescription>
                    Create a new unique code for the "Think Code" popup.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={() => generateCode('think')}
                    disabled={isGeneratingThink}
                    className="w-full"
                  >
                    {isGeneratingThink ? 'Generating...' : 'Generate New Think Code'}
                  </Button>
                  {lastThinkCode && (
                    <div className="space-y-2">
                      <Label>Last Generated Think Code:</Label>
                      <div className="flex items-center space-x-2">
                        <Input value={lastThinkCode} readOnly />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(lastThinkCode)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpenCheck className="text-primary" />
                    "Think" Course Settings
                  </CardTitle>
                  <CardDescription>
                    Manage the date and meeting link for the "Think" online course.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/admin/think-settings">
                            Go to Course Settings
                        </Link>
                    </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="text-primary" />
                    Generate Credits
                  </CardTitle>
                  <CardDescription>
                    Automatically add 1000 credits to your own account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button 
                      className="w-full"
                      onClick={handleGenerateCredits}
                      disabled={isGeneratingCredits}
                    >
                      {isGeneratingCredits ? 'Generating...' : 'Generate 1000 Credits'}
                    </Button>
                </CardContent>
              </Card>
              
               <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="text-primary" />
                    Manage Admins
                  </CardTitle>
                  <CardDescription>
                    Add or remove other administrators.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/admin/manage-admins">
                            Go to Admin Management
                        </Link>
                    </Button>
                </CardContent>
              </Card>

            </div>
          </div>
        </main>
      </div>
  );
}
