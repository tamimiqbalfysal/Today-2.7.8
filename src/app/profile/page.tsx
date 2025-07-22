
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, runTransaction, arrayUnion, arrayRemove, setDoc, updateDoc, getDoc, deleteDoc, Timestamp, getDocs, increment } from 'firebase/firestore';
import { ref, deleteObject } from "firebase/storage";
import { useAuth } from '@/contexts/auth-context';
import type { User, Post } from '@/lib/types';
import { db, storage } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";

import { ProfileCard } from '@/components/fintrack/overview';
import { Skeleton } from '@/components/ui/skeleton';
import { PostFeed } from '@/components/fintrack/recent-transactions';
import { addDoc } from 'firebase/firestore';

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
              const otherReactionField = reaction === 'like' ? 'laughs' : 'likes';

              const currentReactors: string[] = postData[reactionField] || [];
              const otherReactors: string[] = postData[otherReactionField] || [];

              const isReacting = !currentReactors.includes(reactorId);
              
              const updateData: { [key: string]: any } = {};

              if (isReacting) {
                  updateData[reactionField] = arrayUnion(reactorId);
                  // if reacting to one, remove reaction from other
                  if (otherReactors.includes(reactorId)) {
                      updateData[otherReactionField] = arrayRemove(reactorId);
                  }
              } else {
                  updateData[reactionField] = arrayRemove(reactorId);
              }
              
              transaction.update(postRef, updateData);

              if (authorId !== reactorId) {
                const authorRef = doc(db, 'users', authorId);
                const reactorRef = doc(db, 'users', reactorId);

                if (isReacting) {
                    transaction.update(authorRef, { followers: arrayUnion(reactorId) });
                    transaction.update(reactorRef, { following: arrayUnion(authorId) });

                    const notificationRef = doc(collection(db, `users/${authorId}/notifications`));
                    transaction.set(notificationRef, {
                        type: 'like',
                        senderId: reactorId,
                        senderName: user.name,
                        senderPhotoURL: user.photoURL || '',
                        postId: postId,
                        timestamp: Timestamp.now(),
                        read: false,
                    });
                    
                    transaction.update(authorRef, { unreadNotifications: true });
                }
              }
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
    file: File | null,
    postType: 'original' | 'share',
    sharedPostId: string
  ) => {
    if (!user || !db) return;
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: user.name,
        authorPhotoURL: user.photoURL,
        content,
        timestamp: Timestamp.now(),
        likes: [],
        laughs: [],
        comments: [],
        type: postType,
        sharedPostId,
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

            <div className="mt-8 space-y-6">
                <PostFeed
                    posts={posts}
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
