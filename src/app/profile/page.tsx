

'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, runTransaction, arrayUnion, arrayRemove, setDoc, updateDoc, getDoc, deleteDoc, Timestamp, getDocs, increment } from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from '@/contexts/auth-context';
import type { User, Post } from '@/lib/types';
import { db, storage } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";

import { ProfileCard } from '@/components/fintrack/overview';
import { Skeleton } from '@/components/ui/skeleton';
import { PostFeed } from '@/components/fintrack/recent-transactions';
import { addDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

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
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    if (!user || !db) {
        setIsDataLoading(false);
        return;
    }

    setIsDataLoading(true);
    const postsCol = collection(db, 'posts');
    
    const authoredPostsQuery = query(postsCol, where("authorId", "==", user.uid));
    const likedPostsQuery = query(postsCol, where("likes", "array-contains", user.uid));
    const laughedPostsQuery = query(postsCol, where("laughs", "array-contains", user.uid));

    const unsubAuthored = onSnapshot(authoredPostsQuery, (authoredSnapshot) => {
        const authoredPosts = authoredSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        
        const unsubLiked = onSnapshot(likedPostsQuery, (likedSnapshot) => {
            const likedPosts = likedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            
            const unsubLaughed = onSnapshot(laughedPostsQuery, (laughedSnapshot) => {
                const laughedPosts = laughedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
                
                const allPosts = [...authoredPosts, ...likedPosts, ...laughedPosts];
                const uniquePosts = Array.from(new Map(allPosts.map(p => [p.id, p])).values());
                
                uniquePosts.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
                
                setPosts(uniquePosts);
                setIsDataLoading(false);
            }, (error) => {
                console.error("Error fetching laughed posts:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load reacted posts." });
                setIsDataLoading(false);
            });

            return () => unsubLaughed();
        }, (error) => {
            console.error("Error fetching liked posts:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load liked posts." });
            setIsDataLoading(false);
        });

        return () => unsubLiked();
    }, (error) => {
        console.error("Error fetching user posts:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load your posts." });
        setIsDataLoading(false);
    });


    return () => {
        unsubAuthored();
    };
  }, [user, toast]);
  
  const filteredPosts = useMemo(() => {
    return posts.filter(post => 
      (post.content && post.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.authorName && post.authorName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [posts, searchTerm]);

  if (authLoading || (isDataLoading && user)) {
    return <ProfileSkeleton />;
  }

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
            const currentReactors: string[] = postData[reactionField] || [];
            const isReacting = !currentReactors.includes(reactorId);

            const updateData: { [key: string]: any } = {};

            if (isReacting) {
                updateData[reactionField] = arrayUnion(reactorId);
            } else {
                updateData[reactionField] = arrayRemove(reactorId);
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
        // READ FIRST
        const sharedPostRef = doc(db, 'posts', sharedPostId);
        const sharedPostDoc = await transaction.get(sharedPostRef);
        
        // NOW PREPARE WRITES
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
        
        if (sharedPostDoc.exists()) {
            const originalAuthorId = sharedPostDoc.data().authorId;
            if (originalAuthorId && originalAuthorId !== user.uid) {
                const currentUserRef = doc(db, 'users', user.uid);
                const originalAuthorRef = doc(db, 'users', originalAuthorId);
                transaction.update(currentUserRef, { following: arrayUnion(originalAuthorId) });
                transaction.update(originalAuthorRef, { followers: arrayUnion(user.uid) });
            }
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
             
             <div className="mt-8 mb-4 max-w-lg mx-auto">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search your posts..."
                        className="w-full pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

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
