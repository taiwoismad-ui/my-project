# Family Planner

A cross-platform mobile app for couples to manage their household together.

**Tech Stack:** React Native + Expo (SDK 51) · Firebase (Auth + Firestore + Push) · TypeScript · React Navigation

---

## Features

| Tab | Feature |
|-----|---------|
| **Shopping** | Shared shopping list · Checkbox with strikethrough · Recurring items (weekly/monthly) · Push notification on new item · Clear checked items |
| **Wishlist** | Personal wishlist · Shared couple wishlist · Priority labels (Want Badly / Someday) · Shareable links |
| **Home Wishlist** | Add by URL (Open Graph auto-fetch) or manually · Card grid view · Priority labels |
| **Calendar** | Monthly calendar view · Shared events · Per-user event colors · 1h reminder push notification · Add/edit/delete events |
| **Notes** | Shared notepad · Categories: Recipes, Travel, Passwords, Other · Last edited info |
| **Profile** | Avatar color · Invite code sharing · Family pair status · Dark mode (system) |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Email/Password** authentication
3. Create a **Firestore** database
4. Enable **Cloud Messaging** (for push notifications)
5. Copy your config to `.env`:

```bash
cp .env.example .env
# Fill in your Firebase config values
```

### 3. Deploy Firestore rules

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. Start the app

```bash
# Expo Go (development)
npx expo start

# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android
```

---

## Project Structure

```
src/
├── config/
│   └── firebase.ts          # Firebase initialization
├── contexts/
│   ├── AuthContext.tsx       # Auth state, sign in/up/out, family pairing
│   └── ThemeContext.tsx      # Light/dark theme
├── navigation/
│   ├── AppNavigator.tsx      # Root navigator (auth gate)
│   ├── AuthNavigator.tsx     # Login / Register / PairLink
│   └── TabNavigator.tsx      # Bottom tab bar
├── screens/
│   ├── auth/                 # Login, Register, PairLink
│   ├── shopping/             # ShoppingListScreen
│   ├── wishlist/             # HomeWishlistScreen, WishlistScreen (personal+shared)
│   ├── calendar/             # CalendarScreen
│   ├── notes/                # NotesScreen
│   └── profile/              # ProfileScreen
├── components/
│   └── common/               # Button, Input, EmptyState, AvatarBadge
├── services/
│   ├── notifications.ts      # Expo push notifications + scheduling
│   └── openGraph.ts          # URL metadata fetching
├── types/
│   └── index.ts              # All TypeScript interfaces
└── utils/
    └── theme.ts              # Light/dark themes, palette, spacing
```

---

## Firestore Data Model

```
users/{uid}
  email, displayName, avatarColor, familyId, inviteCode, fcmToken

families/{familyId}
  members: [uid1, uid2]

families/{familyId}/shoppingList/{itemId}
  name, checked, addedBy, recurrence, ...

families/{familyId}/homeWishlist/{itemId}
  title, url, imageUrl, priority, addedBy, ...

families/{familyId}/sharedWishlist/{itemId}
  title, url, priority, addedBy, ...

families/{familyId}/events/{eventId}
  title, date, time, note, createdBy, createdByColor, notificationId, ...

families/{familyId}/notes/{noteId}
  title, content, category, lastEditedBy, updatedAt, ...

users/{uid}/wishlist/{itemId}
  title, url, priority, addedBy, ...  (personal wishlist)
```

---

## Family Pairing Flow

1. User A registers → gets a unique 8-character invite code
2. User A shares the code with User B
3. User B enters the code in the "Pair Link" screen
4. App creates a `families` document with both UIDs
5. Both users' `familyId` fields are updated
6. All shared data (shopping, calendar, notes) is scoped to the family

---

## Push Notifications

- **New shopping item**: sent as local notification when partner adds an item
- **Calendar reminders**: scheduled 1 hour before each event with a time set
- Permissions requested on first launch
- FCM token saved to Firestore for server-side push (future)

---

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build
eas build --platform ios
eas build --platform android
```

Update `app.json` with your real `eas.projectId` and bundle identifiers before building.