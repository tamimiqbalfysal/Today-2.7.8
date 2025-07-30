

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
  donorBloodGroup?: string;
  donorLocation?: string;
  donorNearestHospitals?: string;
  donorRating?: number;
  donorRatingCount?: number;
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
  availableCountry?: string; // Single country code
  currency?: string; // Currency code
  title?: string;
  description?: string;
  price?: number;
  target?: number;
  preOrderCount?: number;
  imagePath?: string;
  sellerId?: string;
  sellerName?: string;
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

export interface Gig {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  sellerId: string;
  sellerName: string;
  sellerPhotoURL: string;
  imageUrl: string;
  category: string;
  deliveryTime: number; // in days
  rating: number; // average
  reviews: number; // count
  timestamp: Timestamp;
}

export interface Chat {
  id: string;
  participants: string[]; // array of user UIDs
  participantDetails: { [key: string]: { name: string, photoURL?: string } };
  lastMessage?: {
    text: string;
    timestamp: Timestamp;
    senderId: string;
  };
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
}

export interface OgrimProduct {
    id: string;
    sellerId: string;
    sellerName: string;
    title: string;
    description: string;
    price: number;
    target: number;
    preOrderCount?: number;
    imageUrl: string;
    imagePath: string;
    timestamp: Timestamp;
}

export interface OgrimPreOrder {
    id: string;
    productId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    userId: string | null; // if they were logged in
    timestamp: Timestamp;
}

export interface BloodRequest {
  id: string;
  authorId: string;
  authorName: string;
  bloodGroup: string;
  hospitalName: string;
  contact: string;
  notes?: string;
  timestamp: Timestamp;
}

export interface ThinkCourse {
  date: Timestamp;
  meetLink: string;
}
