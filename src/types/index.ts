export interface User {
  uid: string;
  email: string;
  displayName: string;
  avatarColor: string;
  familyId: string | null;
  inviteCode: string;
  fcmToken?: string;
  createdAt: Date;
}

export interface Family {
  id: string;
  members: string[]; // [uid1, uid2]
  createdAt: Date;
}

// ─── Shopping List ───────────────────────────────────────────────────────────

export type RecurrenceType = 'none' | 'weekly' | 'monthly';

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  addedBy: string; // uid
  addedByName: string;
  recurrence: RecurrenceType;
  lastRecurred?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Home Wishlist ────────────────────────────────────────────────────────────

export type Priority = 'want_badly' | 'someday';

export interface HomeWishlistItem {
  id: string;
  title: string;
  url?: string;
  imageUrl?: string;
  priority: Priority;
  addedBy: string;
  addedByName: string;
  createdAt: Date;
}

// ─── Personal / Shared Wishlists ─────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  title: string;
  url?: string;
  imageUrl?: string;
  priority: Priority;
  addedBy: string;
  addedByName: string;
  createdAt: Date;
}

export interface Wishlist {
  id: string;
  type: 'personal' | 'shared';
  ownerId?: string; // for personal
  familyId?: string; // for shared
  items: WishlistItem[];
  shareToken: string;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  note?: string;
  createdBy: string; // uid
  createdByName: string;
  createdByColor: string;
  notificationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export type NoteCategory = 'recipes' | 'travel' | 'passwords' | 'other';

export interface Note {
  id: string;
  category: NoteCategory;
  title: string;
  content: string;
  lastEditedBy: string;
  lastEditedByName: string;
  updatedAt: Date;
  createdAt: Date;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  PairLink: undefined;
};

export type MainTabParamList = {
  Shopping: undefined;
  Wishlist: undefined;
  Calendar: undefined;
  Notes: undefined;
  Profile: undefined;
};

export type WishlistStackParamList = {
  WishlistTabs: undefined;
  HomeWishlist: undefined;
  PersonalWishlist: undefined;
  SharedWishlist: undefined;
  WishlistWebView: { shareToken: string; type: 'personal' | 'shared' };
};
