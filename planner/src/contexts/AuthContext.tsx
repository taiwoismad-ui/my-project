import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, Family } from '../types';
import { AVATAR_COLORS } from '../utils/theme';
import { registerForPushNotifications } from '../services/notifications';

interface AuthContextValue {
  user: User | null;
  partner: User | null;
  family: Family | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, avatarColor: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  linkFamily: (inviteCode: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (uid: string) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return null;
    const data = userDoc.data();
    return {
      uid,
      ...data,
      createdAt: data.createdAt?.toDate() ?? new Date(),
    } as User;
  }, []);

  const loadPartnerAndFamily = useCallback(async (currentUser: User) => {
    if (!currentUser.familyId) {
      setPartner(null);
      setFamily(null);
      return;
    }

    // Load family
    const familyDoc = await getDoc(doc(db, 'families', currentUser.familyId));
    if (familyDoc.exists()) {
      const familyData = familyDoc.data();
      setFamily({
        id: familyDoc.id,
        members: familyData.members,
        createdAt: familyData.createdAt?.toDate() ?? new Date(),
      });

      // Load partner
      const partnerUid = familyData.members.find((m: string) => m !== currentUser.uid);
      if (partnerUid) {
        const partnerData = await loadUserData(partnerUid);
        setPartner(partnerData);
      }
    }
  }, [loadUserData]);

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return;
    const userData = await loadUserData(auth.currentUser.uid);
    if (userData) {
      setUser(userData);
      await loadPartnerAndFamily(userData);
    }
  }, [loadUserData, loadPartnerAndFamily]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await loadUserData(firebaseUser.uid);
        if (userData) {
          setUser(userData);
          await loadPartnerAndFamily(userData);
          // Register push notifications
          registerForPushNotifications(firebaseUser.uid).catch(console.warn);
        }
      } else {
        setUser(null);
        setPartner(null);
        setFamily(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [loadUserData, loadPartnerAndFamily]);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string, avatarColor: string) => {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      const inviteCode = generateInviteCode();

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email,
        displayName,
        avatarColor,
        familyId: null,
        inviteCode,
        createdAt: serverTimestamp(),
      });
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const linkFamily = useCallback(async (inviteCode: string) => {
    if (!user) throw new Error('Not authenticated');
    if (user.familyId) throw new Error('Already in a family');

    // Find partner by invite code
    const q = query(collection(db, 'users'), where('inviteCode', '==', inviteCode.toUpperCase()));
    const snap = await getDocs(q);

    if (snap.empty) throw new Error('Invalid invite code');

    const partnerDoc = snap.docs[0];
    if (partnerDoc.id === user.uid) throw new Error('Cannot pair with yourself');

    const partnerData = partnerDoc.data();
    if (partnerData.familyId) throw new Error('This person is already in a family');

    // Create family document
    const familyRef = doc(collection(db, 'families'));
    await setDoc(familyRef, {
      members: [user.uid, partnerDoc.id],
      createdAt: serverTimestamp(),
    });

    // Update both users
    await Promise.all([
      updateDoc(doc(db, 'users', user.uid), { familyId: familyRef.id }),
      updateDoc(doc(db, 'users', partnerDoc.id), { familyId: familyRef.id }),
    ]);

    await refreshUser();
  }, [user, refreshUser]);

  return (
    <AuthContext.Provider
      value={{ user, partner, family, loading, signUp, signIn, signOut, linkFamily, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
