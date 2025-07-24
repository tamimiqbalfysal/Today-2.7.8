
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { Chat } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function ChatListItem({ chat, currentUserId }: { chat: Chat, currentUserId: string }) {
    const otherParticipantId = chat.participants.find(p => p !== currentUserId);
    if (!otherParticipantId) return null;

    const otherParticipant = chat.participantDetails[otherParticipantId];
    if(!otherParticipant) return null;
    
    return (
        <Link href={`/chat/${otherParticipantId}`} className="block">
            <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-accent transition-colors">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={otherParticipant.photoURL} alt={otherParticipant.name} />
                    <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                    <p className="font-semibold truncate">{otherParticipant.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage?.senderId === currentUserId && "You: "}
                        {chat.lastMessage?.text}
                    </p>
                </div>
                {chat.lastMessage?.timestamp && (
                     <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(chat.lastMessage.timestamp.toDate(), { addSuffix: true })}
                    </p>
                )}
            </div>
        </Link>
    );
}


export default function ChatListPage() {
  const { user, loading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (loading || !user || !db) {
        if(!loading) setIsLoading(false);
        return;
    }
    
    setIsLoading(true);
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      // Sort on the client side to avoid needing a composite index for timestamp
      fetchedChats.sort((a, b) => (b.lastMessage?.timestamp?.toMillis() || 0) - (a.lastMessage?.timestamp?.toMillis() || 0));
      setChats(fetchedChats);
      setIsLoading(false);
    }, (error) => {
        console.error("Firestore error:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, loading]);
  
  if(loading || isLoading) {
    return (
        <div className="container mx-auto max-w-2xl py-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6" /> Your Conversations
              </CardTitle>
              <CardDescription>
                A list of all your active chats from across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
                {chats.length > 0 ? (
                    <div className="divide-y">
                        {chats.map(chat => (
                            <ChatListItem key={chat.id} chat={chat} currentUserId={user!.uid} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-16">
                        <p>You have no active conversations.</p>
                        <p className="text-sm">Start a conversation from a seller's profile or gig page.</p>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
