
'use client';

import { useState } from 'react';
import { collection, doc, setDoc, updateDoc, increment, getDocs, writeBatch } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Gift, BrainCircuit, BookOpenCheck, Coins, Users, Shield, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import type { User as AppUser } from '@/lib/types';


export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lastGiftCode, setLastGiftCode] = useState('');
  const [lastThinkCode, setLastThinkCode] = useState('');
  const [isGeneratingGift, setIsGeneratingGift] = useState(false);
  const [isGeneratingThink, setIsGeneratingThink] = useState(false);
  const [isGeneratingCredits, setIsGeneratingCredits] = useState(false);
  const [adminGiveawayAmount, setAdminGiveawayAmount] = useState('');
  const [isDistributing, setIsDistributing] = useState(false);

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
  
  const handleDistributeCredits = async () => {
    if (!user || !db) return;
    const giveawayAmount = parseInt(adminGiveawayAmount, 10);
    if (isNaN(giveawayAmount) || giveawayAmount <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a positive number.' });
        return;
    }

    setIsDistributing(true);
    try {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const allUsers: AppUser[] = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
        const totalRedeemed = allUsers.reduce((sum, u) => sum + (u.redeemedGiftCodes || 0), 0);

        if (totalRedeemed === 0) {
            toast({
                variant: "destructive",
                title: "Cannot Distribute",
                description: "No gift codes have been redeemed yet, so shares cannot be calculated.",
            });
            setIsDistributing(false);
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
        setAdminGiveawayAmount('');
    } catch (error: any) {
        console.error("Error during giveaway:", error);
        toast({
            variant: "destructive",
            title: "Giveaway Failed",
            description: "An unexpected error occurred while distributing credits.",
        });
    } finally {
        setIsDistributing(false);
    }
  };

  return (
      <div className="flex flex-col h-screen">
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-2xl p-4 flex flex-col items-center justify-center">
            <div className="w-full space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary" /> Distribute Credits
                  </CardTitle>
                  <CardDescription>
                    Distribute credits to all users based on their "Thank u, G!" share.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                    <Label htmlFor="giveaway-amount">Amount to Give Away</Label>
                    <Input
                        id="giveaway-amount"
                        type="number"
                        placeholder="e.g. 10000"
                        value={adminGiveawayAmount}
                        onChange={(e) => setAdminGiveawayAmount(e.target.value)}
                        disabled={isDistributing}
                    />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleDistributeCredits}
                      disabled={isDistributing || !adminGiveawayAmount}
                    >
                      {isDistributing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                      )}
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
                    <Users className="text-primary" />
                    Manage Admins
                  </CardTitle>
                  <CardDescription>
                    Add or remove other administrators for the application.
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

            </div>
          </div>
        </main>
      </div>
  );
}
