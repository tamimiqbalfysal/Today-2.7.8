

'use client';

import Link from 'next/link';
import { doc, getDoc, updateDoc, increment, collection, getDocs, deleteField, writeBatch, setDoc, onSnapshot, query, orderBy, limit, where, addDoc, deleteDoc, runTransaction } from 'firebase/firestore';
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
import { useWindowSize } from '@/hooks/use-window-size';
import { cn } from '@/lib/utils';
import type { User, Giveaway, Post } from '@/lib/types';
import { History, Coins, Shield, DollarSign, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


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
  const { toast } = useToast();
  
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [totalGiftCodes, setTotalGiftCodes] = useState<number | null>(null);
  const [isTotalCodesLoading, setIsTotalCodesLoading] = useState(true);
  
  const [isCelebrating, setIsCelebrating] = useState(false);
  const { width, height } = useWindowSize();
  
  const [giveawayHistory, setGiveawayHistory] = useState<Giveaway[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const [creditSalePosts, setCreditSalePosts] = useState<Post[]>([]);
  const [isCreditPostsLoading, setIsCreditPostsLoading] = useState(true);

  const [sellAmount, setSellAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [isSelling, setIsSelling] = useState(false);

  const adminEmail = 'tamimiqbal.fysal@gmail.com';
  const isAdmin = user?.email === adminEmail;


  useEffect(() => {
    if (!user || !db) {
        setIsHistoryLoading(false);
        setIsCreditPostsLoading(false);
        return;
    }
    
    // Giveaway History listener
    const historyQuery = query(collection(db, `users/${user.uid}/giveawayHistory`), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
        setGiveawayHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Giveaway)));
        setIsHistoryLoading(false);
    }, (error) => {
        console.error("Error fetching giveaway history: ", error);
        setIsHistoryLoading(false);
    });

    // Credit Sale Posts listener
    const creditPostsQuery = query(collection(db, 'posts'), where('authorId', '==', user.uid), where('category', '==', 'Credit Market'));
    const unsubscribeCreditPosts = onSnapshot(creditPostsQuery, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        setCreditSalePosts(posts);
        setIsCreditPostsLoading(false);
    });


    return () => {
        unsubscribeHistory();
        unsubscribeCreditPosts();
    }
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
          toast({ variant: "destructive", title: "Error", description: "Could not load the total number of gift codes." });
      } finally {
          setIsTotalCodesLoading(false);
      }
  };

  useEffect(() => {
    fetchTotalCodes();
  }, []);

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim() || !db || !user) return;

    setIsVerifying(true);
    try {
      const giftCodeRef = doc(db, 'giftCodes', code.trim());
      const docSnap = await getDoc(giftCodeRef);

      if (!docSnap.exists() || docSnap.data()?.isUsed === true) {
        throw new Error('This gift code is invalid or has already been used.');
      }
      
      const batch = writeBatch(db);
      batch.update(giftCodeRef, { isUsed: true });
      batch.update(doc(db, 'users', user.uid), { redeemedGiftCodes: increment(1) });
      await batch.commit();

      toast({ title: 'Congratulations!', description: 'Your Gift Code is submitted.' });

      await fetchTotalCodes();
      
      setIsCelebrating(true);
      setTimeout(() => setIsCelebrating(false), 5000); 

      formRef.current?.reset();
      setCode('');

    } catch (error: any) {
      console.error("Error verifying gift code:", error);
      toast({ variant: 'destructive', title: 'Verification Failed', description: error.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSellCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(sellAmount, 10);
    const price = parseFloat(sellPrice);
    if (!user || !db || isNaN(amount) || amount <= 0 || isNaN(price) || price <= 0) {
        toast({variant: 'destructive', title: 'Invalid Input', description: 'Please enter a valid amount and price.'});
        return;
    }
    if ((user.credits || 0) < amount) {
        toast({variant: 'destructive', title: 'Insufficient Credits', description: 'You do not have enough credits to sell.'});
        return;
    }

    setIsSelling(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const postRef = doc(collection(db, 'posts'));
        
        transaction.update(userRef, { credits: increment(-amount) });
        
        const newPost: Omit<Post, 'id' | 'timestamp'> = {
          authorId: user.uid,
          authorName: user.name,
          authorPhotoURL: user.photoURL || '',
          title: `${amount.toLocaleString()} Credits for Sale`,
          content: `Get ${amount.toLocaleString()} credits for $${price.toFixed(2)}`,
          category: 'Credit Market',
          price: price,
          creditsToSell: amount,
          likes: [],
          laughs: [],
          comments: [],
          type: 'original',
          isPrivate: false,
          currency: 'USD',
        };
        transaction.set(postRef, { ...newPost, timestamp: new Date() });
      });
      
      toast({title: 'Success!', description: 'Your credits are now listed for sale.'});
      setSellAmount('');
      setSellPrice('');

    } catch (error: any) {
      console.error("Error selling credits:", error);
      toast({variant: 'destructive', title: 'Error', description: 'Could not list your credits for sale.'});
    } finally {
      setIsSelling(false);
    }
  };

  const handleDeleteCreditPost = async (post: Post) => {
      if (!user || !db) return;
      
      try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', user.uid);
            const postRef = doc(db, 'posts', post.id);

            transaction.update(userRef, { credits: increment(post.creditsToSell || 0) });
            transaction.delete(postRef);
        });
        toast({title: "Listing Removed", description: "Your credits have been returned to your account."})
      } catch (error) {
        console.error("Error deleting credit post:", error);
        toast({variant: 'destructive', title: "Error", description: "Could not remove your listing."});
      }
  };


  const redeemedCodes = user?.redeemedGiftCodes || 0;
  const percentage = totalGiftCodes && totalGiftCodes > 0 ? (redeemedCodes / totalGiftCodes) * 100 : 0;

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
                    <CardTitle className="flex items-center justify-center gap-2">
                        Sell Your Credits
                    </CardTitle>
                    <CardDescription className="text-center">
                        List your credits for sale on the eMarketplace. Your current balance: {(user.credits || 0).toLocaleString()}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSellCredits} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sell-amount">Credits to Sell</Label>
                                <Input id="sell-amount" type="number" placeholder="e.g., 1000" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} disabled={isSelling} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sell-price">Price (USD)</Label>
                                <Input id="sell-price" type="number" placeholder="e.g., 10.00" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} disabled={isSelling} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Button type="submit" className="w-full" disabled={isSelling || !sellAmount || !sellPrice}>
                                {isSelling ? 'Listing...' : 'Create Listing'}
                            </Button>
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/emarketplace">eMarketplace</Link>
                            </Button>
                        </div>
                    </form>
                </CardContent>
              </Card>

              {creditSalePosts.length > 0 && (
                <Card>
                  <CardHeader>
                      <CardTitle>Your Credit Listings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                      {creditSalePosts.map(post => (
                          <div key={post.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                              <p>{post.title} for ${post.price?.toFixed(2)}</p>
                               <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will remove your listing from the marketplace and refund {post.creditsToSell?.toLocaleString()} credits to your account.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteCreditPost(post)} className="bg-destructive hover:bg-destructive/90">
                                                Delete Listing
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                          </div>
                      ))}
                  </CardContent>
                </Card>
              )}


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

              {isAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Shield className="h-6 w-6 text-primary" /> Admin Panel
                        </CardTitle>
                        <CardDescription>
                            Access administrative features.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/admin">
                                Go to Admin Panel
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
              )}

            </div>
          </div>
        </main>
      </div>
    </>
  );
}
