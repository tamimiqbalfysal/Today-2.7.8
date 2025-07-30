
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, runTransaction, arrayUnion, arrayRemove, setDoc, updateDoc, getDoc, deleteDoc, Timestamp, getDocs, increment } from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from '@/contexts/auth-context';
import type { User, Post, BloodRequest } from '@/lib/types';
import { db, storage } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";

import { ProfileCard } from '@/components/fintrack/overview';
import { Skeleton } from '@/components/ui/skeleton';
import { PostFeed } from '@/components/fintrack/recent-transactions';
import { addDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Search, HeartPulse, Droplets, Hospital, Phone, Trash2, Loader2, Star, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link';


const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function RequestCard({ request, onDelete }: { request: BloodRequest, onDelete: (id: string) => void }) {
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
            </CardFooter>
        </Card>
    );
}

function ProfileSkeleton() {
    return (
        <div className="flex flex-col min-h-screen">
            <main className="container mx-auto max-w-2xl p-4 flex-1">
                <div className="w-full max-w-sm mx-auto">
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="mt-8 space-y-6">
                    <Skeleton className="h-[450px] w-full" />
                    <Skeleton className="h-[450px] w-full" />
                </div>
            </main>
        </div>
    );
}

export default function ProfilePage() {
  const { user, updateUserPreferences, loading: authLoading, isAdmin } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [myRequests, setMyRequests] = useState<BloodRequest[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
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
    if (!user || !db) {
        setIsDataLoading(false);
        return;
    }

    setIsDataLoading(true);
    
    // Fetch Posts
    const postsCol = collection(db, 'posts');
    const authoredPostsQuery = query(postsCol, where("authorId", "==", user.uid));
    
    const unsubscribePosts = onSnapshot(authoredPostsQuery, (snapshot) => {
        const authoredPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        authoredPosts.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
        setPosts(authoredPosts);
        setIsDataLoading(false);
    }, (error) => {
        console.error("Error fetching user posts:", error);
        setIsDataLoading(false);
    });

    // Fetch Blood Requests
    const myQ = query(collection(db, 'bloodRequests'), where('authorId', '==', user.uid));
    const unsubscribeMy = onSnapshot(myQ, (snapshot) => {
        const fetchedMyRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BloodRequest));
        fetchedMyRequests.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
        setMyRequests(fetchedMyRequests);
    }, (error) => { console.error("Error fetching your blood requests:", error); });

    return () => {
        unsubscribePosts();
        unsubscribeMy();
    };
  }, [user, toast]);
  
  const filteredPosts = useMemo(() => {
    if (!searchTerm) return posts;
    return posts.filter(post => 
      (post.content && post.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.authorName && post.authorName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [posts, searchTerm]);
  
  const filteredRequests = useMemo(() => {
      if (!searchTerm) return myRequests;
      return myRequests.filter(req =>
        req.bloodGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.notes && req.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [myRequests, searchTerm]);

  if (authLoading || (isDataLoading && user)) {
    return <ProfileSkeleton />;
  }

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

  const handleDeleteRequest = async (id: string) => {
    if(!db) return;
    try {
        await deleteDoc(doc(db, 'bloodRequests', id));
        toast({ title: 'Request Deleted', description: 'Your blood request has been removed.' });
    } catch (error) {
        console.error("Error deleting request:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the request.' });
    }
  };


  const handleReaction = async (postId: string, authorId: string, reaction: 'like' | 'laugh') => {
    if (!user || !db) return;
    const postRef = doc(db, 'posts', postId);
    const reactorId = user.uid;

    try {
        await runTransaction(db, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) {
                throw "Post does not exist!";
            }

            const postData = postDoc.data();
            const reactionField = reaction === 'like' ? 'likes' : 'laughs';
            const oppositeReactionField = reaction === 'like' ? 'laughs' : 'likes';
            const currentReactors: string[] = postData[reactionField] || [];
            const oppositeReactors: string[] = postData[oppositeReactionField] || [];

            const updateData: { [key: string]: any } = {};

            if (oppositeReactors.includes(reactorId)) {
                updateData[oppositeReactionField] = arrayRemove(reactorId);
            }

            if (currentReactors.includes(reactorId)) {
                updateData[reactionField] = arrayRemove(reactorId);
            } else {
                updateData[reactionField] = arrayUnion(reactorId);
            }
            transaction.update(postRef, updateData);
        });
    } catch (error) {
        console.error("Error reacting to post:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not update reaction." });
    }
  };
  
  const handleCommentPost = async (postId: string, commentText: string) => {
      if (!user || !db || !commentText.trim()) return;

      const postRef = doc(db, 'posts', postId);
      const newComment = {
          id: doc(collection(db, 'dummy')).id,
          authorId: user.uid,
          authorName: user.name,
          authorPhotoURL: user.photoURL || '',
          content: commentText,
          timestamp: Timestamp.now(),
      };

      try {
          await updateDoc(postRef, { comments: arrayUnion(newComment) });
          toast({ title: "Comment posted!", description: "Your comment has been added successfully." });
      } catch (error) {
          console.error("Error posting comment:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not post your comment." });
          throw error;
      }
  };

  const handleSharePost = async (
    content: string,
    contentBangla: string,
    file: File | null,
    fileBangla: File | null,
    defenceCredit: number,
    localColor: string,
    postType: 'original' | 'share',
    sharedPostId: string
  ) => {
    if (!user || !db) return;
    try {
      await runTransaction(db, async (transaction) => {
        const sharedPostRef = doc(db, 'posts', sharedPostId);
        const sharedPostDoc = await transaction.get(sharedPostRef);
        
        let originalAuthorId: string | undefined;
        if (sharedPostDoc.exists()) {
            originalAuthorId = sharedPostDoc.data().authorId;
        }

        const newPostData = {
          authorId: user.uid,
          authorName: user.name,
          authorPhotoURL: user.photoURL,
          content,
          contentBangla,
          timestamp: Timestamp.now(),
          likes: [],
          laughs: [],
          comments: [],
          type: postType,
          sharedPostId,
          localColor,
        };
        
        const postCollectionRef = collection(db, 'posts');
        transaction.set(doc(postCollectionRef), newPostData);
        
        if (originalAuthorId && originalAuthorId !== user.uid) {
            const currentUserRef = doc(db, 'users', user.uid);
            const originalAuthorRef = doc(db, 'users', originalAuthorId);
            transaction.update(currentUserRef, { following: arrayUnion(originalAuthorId) });
            transaction.update(originalAuthorRef, { followers: arrayUnion(user.uid) });
        }
      });

      toast({ title: 'Shared!', description: 'Post shared successfully.' });
    } catch (error) {
      console.error('Error sharing post:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not share post.' });
    }
  };
  
  const handleDeletePost = async (postId: string, mediaUrl?: string) => {
    if (!db || !storage) return;
    try {
        await deleteDoc(doc(db, 'posts', postId));
        if (mediaUrl) {
            const storageRef = ref(storage, mediaUrl);
            await deleteObject(storageRef).catch(err => {
                if (err.code !== 'storage/object-not-found') throw err;
            });
        }
        toast({ title: 'Success', description: 'Post deleted successfully.' });
    } catch (error) {
        console.error("Error deleting post:", error);
        toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete post.' });
    }
  };

  return (
        <div className="flex flex-col h-screen">
          <main className="container mx-auto max-w-2xl p-4 flex-1 overflow-y-auto">
             <div className="w-full max-w-sm mx-auto">
                <ProfileCard user={user!} isOwnProfile={true} />
             </div>
             
             {isAdmin && (
                <Card className="w-full max-w-sm mx-auto mt-8">
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

             <div className="mt-8 mb-6 max-w-lg mx-auto">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search your profile..."
                        className="w-full pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
             
            {filteredRequests.length > 0 && (
              <div className="space-y-8 mt-8">
                  <Card>
                      <CardHeader>
                          <CardTitle>Your Request History</CardTitle>
                          <CardDescription>A record of the blood requests you've made.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          {filteredRequests.map(req => (
                              <RequestCard 
                                  key={req.id} 
                                  request={req}
                                  onDelete={handleDeleteRequest}
                              />
                          ))}
                      </CardContent>
                  </Card>
              </div>
            )}

            <div className="mt-8 space-y-6">
                <PostFeed
                    posts={filteredPosts}
                    currentUser={user}
                    onReact={handleReaction}
                    onCommentPost={handleCommentPost}
                    onDeletePost={handleDeletePost}
                    onSharePost={handleSharePost}
                />
            </div>
          </main>
        </div>
  );
}
