
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, doc, getDoc, setDoc, limit, Unsubscribe, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';
import type { Message, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function ChatPage() {
  const { user: currentUser } = useAuth();
  const params = useParams();
  const otherUserId = params.userId as string;
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOtherUser = async () => {
      if (!db || !otherUserId) return;
      const userRef = doc(db, 'users', otherUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setOtherUser(userSnap.data() as User);
      }
    };
    fetchOtherUser();
  }, [otherUserId]);
  
  const getChatId = useCallback((uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  }, []);

  useEffect(() => {
    if (!currentUser || !otherUserId || !db) return;

    const currentChatId = getChatId(currentUser.uid, otherUserId);
    setChatId(currentChatId);

    const messagesRef = collection(db, 'chats', currentChatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, (error) => {
        console.error("Error in snapshot listener:", error);
        if (error.code === 'permission-denied') {
            toast({
                variant: 'destructive',
                title: 'Permission Denied',
                description: "You don't have permission to read chat messages. Check your Firestore security rules for the 'chats' collection.",
                duration: 9000
            });
        }
    });

    return () => {
        unsubscribe();
    };
  }, [currentUser, otherUserId, db, getChatId, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !currentUser || !otherUser || !db) return;
    
    const messageText = newMessage;
    setNewMessage('');
    
    try {
        const batch = writeBatch(db);

        const chatRef = doc(db, 'chats', chatId);
        const newMessageRef = doc(collection(chatRef, 'messages'));

        // Operation 1: Set/merge the chat document with participants and details
        batch.set(chatRef, {
            participants: [currentUser.uid, otherUserId],
            participantDetails: {
              [currentUser.uid]: { name: currentUser.name, photoURL: currentUser.photoURL },
              [otherUser.uid]: { name: otherUser.name, photoURL: otherUser.photoURL },
            },
            lastMessage: {
                text: messageText,
                senderId: currentUser.uid,
                timestamp: Timestamp.now()
            }
        }, { merge: true });
        
        // Operation 2: Add the new message document
        batch.set(newMessageRef, {
          chatId: chatId,
          senderId: currentUser.uid,
          text: messageText,
          timestamp: serverTimestamp(),
        });

        await batch.commit();

    } catch(error: any) {
        console.error("Error sending message:", error);
        setNewMessage(messageText); // Restore message on failure
        if (error.code === 'permission-denied') {
            toast({
                variant: 'destructive',
                title: 'Permission Denied',
                description: "You don't have permission to send messages. Check your Firestore security rules for writing to the 'chats' collection and its 'messages' subcollection.",
                duration: 9000
            });
        }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-secondary/30">
      <header className="bg-background border-b p-4 flex items-center gap-4 sticky top-0 z-10">
         <Link href="/chat">
            <Button variant="ghost" size="icon">
                <ArrowLeft/>
            </Button>
         </Link>
        {otherUser ? (
            <>
                <Avatar>
                    <AvatarImage src={otherUser.photoURL || undefined} alt={otherUser.name} />
                    <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold">{otherUser.name}</h2>
            </>
        ) : (
             <div className="flex items-center gap-4">
                <Avatar className="bg-gray-200 animate-pulse" />
                <div className="h-6 w-32 bg-gray-200 rounded-md animate-pulse" />
            </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, index) => {
          const isCurrentUser = msg.senderId === currentUser?.uid;
          const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;

          return (
            <div key={msg.id} className={cn("flex items-end gap-2", isCurrentUser ? "justify-end" : "justify-start")}>
              {!isCurrentUser && (
                <Avatar className={cn("h-8 w-8", !showAvatar && "invisible")}>
                  <AvatarImage src={otherUser?.photoURL || undefined} />
                  <AvatarFallback>{otherUser?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl shadow-md",
                  isCurrentUser
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-background text-foreground rounded-bl-none"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <p className="text-xs opacity-70 mt-1 text-right">
                  {msg.timestamp ? format(msg.timestamp.toDate(), 'p') : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 bg-background border-t sticky bottom-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            autoComplete="off"
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
