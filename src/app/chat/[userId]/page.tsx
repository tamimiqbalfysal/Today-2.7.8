
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, doc, getDoc, setDoc, limit, Unsubscribe } from 'firebase/firestore';
import type { Message, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ChatPage() {
  const { user: currentUser } = useAuth();
  const params = useParams();
  const otherUserId = params.userId as string;

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
  
  const getChatId = useCallback(() => {
    if (!currentUser || !otherUserId) return null;
    return [currentUser.uid, otherUserId].sort().join('_');
  }, [currentUser, otherUserId]);

  useEffect(() => {
    if (!currentUser || !otherUserId || !db) return;

    const currentChatId = getChatId();
    if (!currentChatId) return;

    setChatId(currentChatId);

    let unsubscribe: Unsubscribe | null = null;
    
    const setupListener = async () => {
        const chatRef = doc(db, 'chats', currentChatId);
        const chatSnap = await getDoc(chatRef);
        
        if (!chatSnap.exists()) {
            try {
                // Preemptively create the chat document so the listener doesn't fail.
                 await setDoc(chatRef, {
                    participants: [currentUser.uid, otherUserId],
                    participantDetails: {
                      [currentUser.uid]: { name: currentUser.name, photoURL: currentUser.photoURL },
                      [otherUserId]: { name: otherUser?.name, photoURL: otherUser?.photoURL },
                    }
                });
            } catch(error) {
                console.error("Failed to create chat document", error);
                return; // Don't setup listener if chat doc creation fails
            }
        }
        
        const messagesRef = collection(db, 'chats', currentChatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
          setMessages(msgs);
        }, (error) => {
            console.error("Error in snapshot listener:", error);
        });
    }

    setupListener();

    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };
  }, [currentUser, otherUserId, otherUser, getChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !currentUser) return;
    
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      chatId: chatId,
      senderId: currentUser.uid,
      text: newMessage,
      timestamp: serverTimestamp(),
    });

    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-screen bg-secondary/30">
      <header className="bg-background border-b p-4 flex items-center gap-4 sticky top-0 z-10">
         <Link href="/office-express">
            <Button variant="ghost" size="icon">
                <ArrowLeft/>
            </Button>
         </Link>
        {otherUser && (
            <>
                <Avatar>
                    <AvatarImage src={otherUser.photoURL || undefined} alt={otherUser.name} />
                    <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold">{otherUser.name}</h2>
            </>
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
                  "max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl",
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
