
'use client';

import Link from 'next/link';
import { doc, getDoc, updateDoc, increment, collection, getDocs, deleteField, writeBatch, setDoc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { useState, useRef, useEffect } from 'react';

import { db } from '@/lib/firebase';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { GiveawayCard } from '@/components/fintrack/giveaway-card';
import { useWindowSize } from '@/hooks/use-window-size';
import { cn } from '@/lib/utils';
import type { User, Giveaway } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Wand2, Loader2, History, Coins } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


function ThankYouSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="container mx-auto max-w-2xl p-4 flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <Card>
            <CardHeader className="text-center space-y-2">
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <div className="flex w-full items-center space-x-2">
                <Skeleton className="h-10 flex-grow" />
                <Skeleton className="h-10 w-24" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-52" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Skeleton className="h-10 w-full" />
        </div>
      </main>
    </div>
  )
}


export default function ThankYouPage() {
  const { user, loading: authLoading } = useAuth();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [totalGiftCodes, setTotalGiftCodes] = useState<number | null>(null);
  const [isTotalCodesLoading, setIsTotalCodesLoading] = useState(true);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const { width, height } = useWindowSize();
  const [selfGeneratedCode, setSelfGeneratedCode] = useState('');
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [giveawayHistory, setGiveawayHistory] = useState<Giveaway[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const [createdCodes, setCreatedCodes] = useState(0);
  const [submittedCodes, setSubmittedCodes] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchGiftCodeStats = async () => {
    if (!db) {
      setIsLoadingStats(false);
      return;
    }
    setIsLoadingStats(true);
    try {
      const giftCodesCollection = collection(db, 'giftCodes');
      const q = query(giftCodesCollection, where('creatorId', '==', user?.uid));
      const giftCodesSnapshot = await getDocs(q);
      
      let created = 0;
      let submitted = 0;

      giftCodesSnapshot.forEach(doc => {
        created++;
        if (doc.data().isUsed) {
          submitted++;
        }
      });

      setCreatedCodes(created);
      setSubmittedCodes(submitted);

    } catch (error) {
      console.error("Error fetching gift code stats:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load gift code statistics."
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if(user) {
      fetchGiftCodeStats();
    }
  }, [user]);

  useEffect(() => {
    if (!user || !db) {
        setIsHistoryLoading(false);
        return;
    }

    const historyQuery = query(collection(db, `users/${user.uid}/giveawayHistory`), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Giveaway));
        setGiveawayHistory(history);
        setIsHistoryLoading(false);
    }, (error) => {
        console.error("Error fetching giveaway history: ", error);
        setIsHistoryLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const fetchTotalCodes = async () => {
      if (!db) {
          setIsTotalCodesLoading(false);
          return;
      }
      setIsTotalCodesLoading(true);
      try {
          const giftCodesCollection = collection(db, 'giftCodes');
          const giftCodesSnapshot = await getDocs(giftCodesCollection);
          setTotalGiftCodes(giftCodesSnapshot.size);
      } catch (error) {
          console.error("Error fetching total gift codes count:", error);
          toast({
              variant: "destructive",
              title: "Error",
              description: "Could not load the total number of gift codes."
          });
      } finally {
          setIsTotalCodesLoading(false);
      }
  };

  useEffect(() => {
    fetchTotalCodes();
  }, []);

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'Please enter a Gift Code.',
      });
      return;
    }

    if (!db || !user) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to redeem a code.',
      });
      return;
    }

    setIsVerifying(true);

    try {
      const giftCodeRef = doc(db, 'giftCodes', code.trim());
      const docSnap = await getDoc(giftCodeRef);

      if (!docSnap.exists() || docSnap.data()?.isUsed === true) {
        toast({
          variant: 'destructive',
          title: 'Verification Failed',
          description: 'This gift code is invalid or has already been used.',
        });
        setIsVerifying(false);
        return;
      }
      
      await updateDoc(giftCodeRef, { isUsed: true });
      
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { redeemedGiftCodes: increment(1) });

      toast({
        title: 'Congratulations!',
        description: 'Your Gift Code is submitted.',
      });

      // Refetch total codes to include the one just submitted if it was new
      await fetchTotalCodes();
      await fetchGiftCodeStats();
      
      setIsCelebrating(true);
      setTimeout(() => setIsCelebrating(false), 5000); 

      formRef.current?.reset();
      setCode('');

    } catch (error: any) {
      console.error("Error verifying gift code:", error);
      let description = "An unexpected error occurred.";
      if (error.code === 'permission-denied') {
        description = "Permission Denied. Please check your Firestore security rules to ensure authenticated users can read and update the 'giftCodes' and 'users' collections.";
      }
       toast({
        variant: 'destructive',
        title: 'Error',
        description: description,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGiveAway = async (amount: number) => {
    if (!user || !db || amount <= 0) return;
    
    if ((user.credits || 0) < amount) {
        toast({
            variant: "destructive",
            title: "Insufficient Credits",
            description: "You don't have enough credits to give away this amount.",
        });
        return;
    }

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
            return;
        }

        const batch = writeBatch(db);

        // Deduct from current user
        const currentUserRef = doc(db, 'users', user.uid);
        batch.update(currentUserRef, { credits: increment(-amount) });

        // Distribute to other users and record history
        allUsers.forEach(otherUser => {
            if (otherUser.uid === user.uid) return;
            const userShare = (otherUser.redeemedGiftCodes || 0) / totalRedeemed;
            const creditsToGive = amount * userShare;
            if (creditsToGive > 0) {
                const otherUserRef = doc(db, 'users', otherUser.uid);
                batch.update(otherUserRef, { credits: increment(creditsToGive) });
                
                const historyRef = doc(collection(db, `users/${otherUser.uid}/giveawayHistory`));
                batch.set(historyRef, {
                    giverId: user.uid,
                    giverName: user.name,
                    giverPhotoURL: user.photoURL,
                    amountReceived: creditsToGive,
                    timestamp: new Date(),
                } as Omit<Giveaway, 'id'>);
            }
        });
        
        await batch.commit();

        toast({
            title: "Success!",
            description: `You have successfully given away ${amount} credits!`,
        });

    } catch (error: any) {
        console.error("Error during giveaway:", error);
        toast({
            variant: "destructive",
            title: "Giveaway Failed",
            description: "An unexpected error occurred while distributing credits.",
        });
    }
  };
  
  const handleCreateSelfGeneratedCode = async () => {
    if (!selfGeneratedCode.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter a code to generate.' });
        return;
    }
     if (!db || !user) return;

    setIsCreatingCode(true);
    try {
        const newCodeRef = doc(db, 'giftCodes', selfGeneratedCode.trim());
        const codeSnap = await getDoc(newCodeRef);

        if(codeSnap.exists()) {
            toast({ variant: 'destructive', title: 'Error', description: 'This gift code already exists. Please choose another.' });
            setIsCreatingCode(false);
            return;
        }

        await setDoc(newCodeRef, {
            creatorId: user.uid,
            creatorName: user.name,
            isUsed: false,
            createdAt: new Date(),
        });
        
        toast({ title: 'Success!', description: `Gift code "${selfGeneratedCode.trim()}" created successfully.` });
        setSelfGeneratedCode('');
        await fetchGiftCodeStats();

    } catch(error: any) {
         console.error("Error creating self-generated gift code:", error);
         let description = "An unexpected error occurred.";
        if (error.code === 'permission-denied') {
            description = "Permission Denied. Your security rules must allow writes to the 'giftCodes' collection.";
        }
        toast({ variant: 'destructive', title: 'Error', description: description });
    } finally {
        setIsCreatingCode(false);
    }
  }


  const redeemedCodes = user?.redeemedGiftCodes || 0;
  const percentage = totalGiftCodes && totalGiftCodes > 0 ? (redeemedCodes / totalGiftCodes) * 100 : 0;
  const codesLeft = createdCodes - submittedCodes;

  if (authLoading || !user) {
    return <ThankYouSkeleton />;
  }

  return (
    <>
      {isCelebrating && width > 0 && height > 0 && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={300}
        />
      )}
      <div className="theme-navy flex flex-col h-screen">
        <main 
          className="flex-1 overflow-y-auto"
        >
          <div className="container mx-auto max-w-2xl p-4 flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-6">
              <Card className="w-full text-center">
                <CardHeader>
                  <motion.div
                    whileHover={{ rotate: [0, -1, 1, -1, 0], scale: 1.05 }}
                    transition={{ duration: 0.4 }}
                    className="cursor-pointer"
                  >
                    <CardTitle className="text-3xl font-bold bg-primary-gradient bg-clip-text text-transparent">Thank u, G!</CardTitle>
                  </motion.div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isTotalCodesLoading ? (
                    <Skeleton className="h-12 w-full rounded-md" />
                  ) : totalGiftCodes !== null ? (
                    <div className="p-3 rounded-md bg-[hsl(var(--chart-1))]">
                        <p className="font-semibold text-primary-foreground">
                            Total Gift Codes: {totalGiftCodes}
                        </p>
                    </div>
                  ) : null}
                  {user && (
                    <div className="p-3 rounded-md bg-[hsl(var(--chart-2))]">
                      <p className="font-semibold text-primary-foreground">
                        Gift Codes You Have Submitted: {redeemedCodes}
                      </p>
                    </div>
                  )}
                  {totalGiftCodes !== null && totalGiftCodes > 0 && user?.redeemedGiftCodes !== undefined && (
                    <div className="p-3 rounded-md bg-[hsl(var(--chart-3))]">
                      <p className="font-semibold text-primary-foreground">
                        Your Share: {percentage.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  <form ref={formRef} onSubmit={handleVerifyCode} className="flex w-full items-center space-x-2">
                    <Input
                      type="text"
                      name="code"
                      placeholder="Enter your Gift Code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={isVerifying || isCelebrating}
                      aria-label="Gift Code"
                    />
                    <motion.button
                      className={cn(buttonVariants())}
                      type="submit"
                      disabled={isVerifying || isCelebrating}
                      animate={isCelebrating ? "celebrate" : "initial"}
                      variants={{
                        initial: { scale: 1, rotate: 0 },
                        celebrate: {
                          scale: [1, 1.1, 1, 1.1, 1],
                          rotate: [0, -3, 3, -3, 0],
                          transition: { duration: 0.5, ease: "easeInOut" },
                        },
                      }}
                    >
                      {isVerifying ? 'Verifying...' : isCelebrating ? 'Success!' : 'Submit'}
                    </motion.button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          <Wand2 className="h-6 w-6 text-primary" /> Create Your Own Gift Code
                      </CardTitle>
                      <CardDescription>
                          Generate a unique code to give to your customers or friends.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center mb-6 border-b pb-6">
                        <div>
                          <p className="text-2xl font-bold">{createdCodes}</p>
                          <p className="text-xs text-muted-foreground">Created</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{submittedCodes}</p>
                          <p className="text-xs text-muted-foreground">Submitted</p>
                        </div>
                         <div>
                          <p className="text-2xl font-bold">{codesLeft}</p>
                          <p className="text-xs text-muted-foreground">Left</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="self-generated-code">Your Unique Code</Label>
                          <Input 
                              id="self-generated-code" 
                              placeholder="e.g., SUMMER-SALE-2024"
                              value={selfGeneratedCode}
                              onChange={(e) => setSelfGeneratedCode(e.target.value)}
                              disabled={isCreatingCode}
                          />
                      </div>
                      <Button onClick={handleCreateSelfGeneratedCode} className="w-full mt-4" disabled={isCreatingCode || !selfGeneratedCode.trim()}>
                        {isCreatingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        {isCreatingCode ? 'Creating...' : 'Create Code'}
                      </Button>
                  </CardContent>
              </Card>

              <GiveawayCard
                currentUser={user}
                onGiveAway={handleGiveAway}
              />

              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          <History className="h-6 w-6 text-primary" /> Giveaway History
                      </CardTitle>
                      <CardDescription>
                          Credits you have received from other users.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      {isHistoryLoading ? (
                          <div className="space-y-4">
                              <Skeleton className="h-12 w-full" />
                              <Skeleton className="h-12 w-full" />
                          </div>
                      ) : giveawayHistory.length > 0 ? (
                          <div className="space-y-3">
                              {giveawayHistory.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between p-3 rounded-md bg-secondary">
                                      <div className="flex items-center gap-3">
                                          <Avatar className="h-9 w-9">
                                              <AvatarImage src={item.giverPhotoURL} />
                                              <AvatarFallback>{item.giverName.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <div>
                                              <p className="text-sm font-semibold">From {item.giverName}</p>
                                              <p className="text-xs text-muted-foreground">{formatDistanceToNow(item.timestamp.toDate(), { addSuffix: true })}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-1 font-bold text-green-500">
                                        <Coins className="h-4 w-4" />
                                        <span>+{item.amountReceived.toFixed(2)}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <p className="text-center text-muted-foreground py-4">You have not received any credits from giveaways yet.</p>
                      )}
                  </CardContent>
              </Card>
              
              <Card>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                  <a href="https://www.facebook.com/Tamim.Iqbal.Fysal" target="_blank" rel="noopener noreferrer" className="block hover:bg-accent/50 rounded-lg transition-colors">
                    <div className="flex flex-col items-center justify-center p-4 h-full border rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-black">
                        <g transform="scale(1.1) translate(-1.2, -1.2)">
                          <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.196h3.312z"></path>
                        </g>
                      </svg>
                      <p className="mt-2 font-semibold text-sm text-black">Facebook</p>
                    </div>
                  </a>
                  <a href="https://x.com/TamimIqbalFysal" target="_blank" rel="noopener noreferrer" className="block hover:bg-accent/50 rounded-lg transition-colors">
                    <div className="flex flex-col items-center justify-center p-4 h-full border rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-black">
                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153Zm-1.61 19.69h2.54l-14.48-16.6H3.34l13.95 16.6Z"></path>
                      </svg>
                      <p className="mt-2 font-semibold text-sm text-black">X</p>
                    </div>
                  </a>
                  <a href="https://www.youtube.com/@Tamim-Iqbal-Fysal" target="_blank" rel="noopener noreferrer" className="block hover:bg-accent/50 rounded-lg transition-colors">
                    <div className="flex flex-col items-center justify-center p-4 h-full border rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-black">
                        <g transform="scale(1.1) translate(-1.2, -1.2)">
                            <path d="M21.582 7.188a2.766 2.766 0 0 0-1.944-1.953C17.926 4.75 12 4.75 12 4.75s-5.926 0-7.638.485a2.766 2.766 0 0 0-1.944 1.953C2 8.905 2 12 2 12s0 3.095.418 4.812a2.766 2.766 0 0 0 1.944 1.953C6.074 19.25 12 19.25 12 19.25s5.926 0 7.638-.485a2.766 2.766 0 0 0 1.944-1.953C22 15.095 22 12 22 12s0-3.095-.418-4.812zM9.75 15.25V8.75L15.25 12 9.75 15.25z"></path>
                        </g>
                      </svg>
                      <p className="mt-2 font-semibold text-sm text-black">YouTube</p>
                    </div>
                  </a>
                </CardContent>
              </Card>

            </div>
          </div>
        </main>
      </div>
    </>
  );
}

