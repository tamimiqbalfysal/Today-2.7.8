
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth-context';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState, type SVGProps } from 'react';
import type { Notification } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { Heart, EyeOff, Trash2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';

function BellShapeButton(props: SVGProps<SVGSVGElement> & { children?: React.ReactNode }) {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" />
      <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21H13.73Z" />
    </svg>
  );
}

const formatCredits = (num: number): string => {
  if (num >= 1_000_000_000_000_000) {
    return (num / 1_000_000_000_000_000).toFixed(num % 1_000_000_000_000_000 === 0 ? 0 : 1) + 'Q';
  }
  if (num >= 1_000_000_000_000) {
    return (num / 1_000_000_000_000).toFixed(num % 1_000_000_000_000 === 0 ? 0 : 1) + 'T';
  }
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(num % 1_000_000_000 === 0 ? 0 : 1) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + 'K';
  }
  return num.toString();
};

function FloatingCounterButton() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;

  const credits = user?.credits ?? 0;
  const unreadCount = user?.notifications?.filter(n => !n.read).length ?? 0;
  const formattedCredits = formatCredits(credits);

  return (
    <SheetTrigger asChild>
      <div className="fixed bottom-4 right-4 z-50">
        <div
          className="relative flex items-center justify-center cursor-pointer"
          aria-label={`You have ${credits} credits and notifications`}
        >
          <BellShapeButton className="h-20 w-20 text-white drop-shadow-lg" />
          <div className="absolute bottom-6 flex flex-col items-center justify-center">
            <span className="text-sm font-bold leading-none text-black">{formattedCredits}</span>
          </div>
          {unreadCount > 0 && (
            <div className="absolute top-4 right-5 flex items-center justify-center bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 border-2 border-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
      </div>
    </SheetTrigger>
  );
}


export function NotificationSheet({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && user && user.notifications?.some(n => !n.read)) {
      const markNotificationsAsRead = async () => {
        if (!db || !user?.uid) return;
        
        const batch = writeBatch(db);
        const unreadNotifications = user.notifications?.filter(n => !n.read) || [];
        
        unreadNotifications.forEach(notification => {
          const notificationRef = doc(db, `users/${user.uid}/notifications`, notification.id);
          batch.update(notificationRef, { read: true });
        });
        
        const userRef = doc(db, 'users', user.uid);
        batch.update(userRef, { unreadNotifications: false });
        
        try {
          await batch.commit();
        } catch (error) {
          console.error("Error marking notifications as read:", error);
        }
      };

      markNotificationsAsRead();
    }
  }, [isOpen, user]);

  const handleNotificationClick = () => {
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {children}
      {user && <FloatingCounterButton />}
      <SheetContent className="flex flex-col" showCloseButton={false}>
        <SheetHeader>
          <div className="flex justify-between items-center">
            <SheetTitle>Notifications</SheetTitle>
            <Button asChild variant="ghost" size="icon">
              <Link href="/chat" onClick={handleNotificationClick}>
                <MessageSquare />
                <span className="sr-only">Go to Chats</span>
              </Link>
            </Button>
          </div>
          <SheetDescription>
            Recent activity from your friends.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6">
            <div className="px-6">
                {user?.notifications && user.notifications.length > 0 ? (
                <div className="space-y-4">
                    {user.notifications.map((notification) => (
                    <NotificationItem 
                        key={notification.id} 
                        notification={notification} 
                        onNotificationClick={handleNotificationClick}
                    />
                    ))}
                </div>
                ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <p className="text-lg font-semibold">No notifications yet</p>
                    <p>When someone interacts with you, it will show up here.</p>
                </div>
                )}
            </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function NotificationItem({ notification, onNotificationClick }: { notification: Notification; onNotificationClick: () => void; }) {
    const timestamp = notification.timestamp?.toDate ? notification.timestamp.toDate() : new Date();
    
    let icon;
    let text;

    switch (notification.type) {
        case 'like':
            icon = <Heart className="h-4 w-4 text-red-500" />;
            text = <><span className="font-semibold">{notification.senderName}</span> liked your post.</>;
            break;
        case 'postMadePrivate':
            icon = <EyeOff className="h-4 w-4 text-orange-500" />;
            text = <><span className="font-semibold">{notification.senderName}</span> made your post private.</>;
            break;
        case 'postDeleted':
             icon = <Trash2 className="h-4 w-4 text-destructive" />;
             text = <><span className="font-semibold">{notification.senderName}</span> deleted your post.</>;
             break;
        default:
            return null;
    }

    return (
        <Link href={`/#${notification.postId}`} onClick={onNotificationClick} className="block">
            <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-accent">
                <div className="relative">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={notification.senderPhotoURL} />
                        <AvatarFallback>{notification.senderName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                        {icon}
                    </div>
                </div>
                <div className="flex-1">
                    <p className="text-sm">
                        {text}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(timestamp, { addSuffix: true })}
                    </p>
                </div>
            </div>
        </Link>
    );
}
