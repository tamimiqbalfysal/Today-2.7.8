
import type { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  id?: string; // Add id for profile page fetching
  name: string;
  username?: string;
  email: string;
  photoURL?: string | null;
  redeemedGiftCodes?: number;
  redeemedThinkCodes?: number;
  paymentCategory?: string;
  paymentAccountName?: string;
  paymentAccountNumber?: string;
  paymentNotes?: string;
  country?: string;
  credits?: number;
  notifications?: Notification[];
  unreadNotifications?: boolean;
  followers?: string[]; // Array of user UIDs
  following?: string[]; // Array of user UIDs
  defaultLocalColor?: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  content: string;
  contentBangla?: string;
  timestamp: Timestamp;
  likes: string[]; // Array of user UIDs
  laughs: string[]; // Array of user UIDs
  comments: Comment[];
  media?: { url: string; type: 'image' | 'video' }[]; // For multiple images and videos
  mediaURL?: string; // Legacy single image
  mediaURLs?: string[]; // Legacy multiple images
  mediaType?: 'image' | 'video'; // Legacy single media type
  mediaURLBangla?: string;
  mediaTypeBangla?: 'image' | 'video';
  type: 'original' | 'share';
  sharedPostId?: string;
  sharedPost?: Post; // For client-side rendering
  category?: string;
  reviewCount?: number;
  averageRating?: number;
  defenceCredit?: number;
  isPrivate?: boolean;
  offenceCredit?: number;
  localColor?: string;
  availableCountries?: string[];
}

export interface Review {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  rating: number;
  comment: string;
  timestamp: Timestamp;
  media?: { url: string; type: 'image' }[];
}


export interface Comment {
    id: string;
    authorId: string;
    authorName:string;
    authorPhotoURL: string;
    content: string;
    timestamp: Timestamp;
}

export interface Notification {
  id: string;
  type: 'like' | 'postDeleted' | 'postMadePrivate' | 'postMadePublic';
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
  postId: string;
  timestamp: Timestamp;
  read: boolean;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  sellerId: string;
  sellerName: string;
  createdAt: Timestamp;
  rating?: number;
}

export interface ThinkCourse {
  date: Timestamp;
  meetLink: string;
}
