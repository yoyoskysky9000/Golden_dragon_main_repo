import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, serverTimestamp, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserAccount, DataListing } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error signing in with Google", error);
        throw error;
    }
};

export const signOut = async () => {
    try {
        await fbSignOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
        throw error;
    }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const createDataListing = async (
    sellerId: string, 
    listingData: Partial<DataListing>
) => {
    if (typeof listingData.price !== 'number' || listingData.price <= 0) {
        throw new Error("Price must be a positive number.");
    }
    if (listingData.currency !== 'USD' && listingData.currency !== 'GAS_CO1N') {
        throw new Error("Currency must be either USD or GAS_CO1N.");
    }
    if (listingData.description && listingData.description.length > 500) {
        listingData.description = listingData.description.substring(0, 500);
    }

    const listingRef = doc(collection(db, 'dataMarketplace'));
    try {
        await setDoc(listingRef, {
            ...listingData,
            sellerId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return listingRef.id;
    } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `dataMarketplace/${listingRef.id}`);
    }
};

export const ensureUserAccount = async (uid: string, email?: string | null) => {
    const userRef = doc(db, 'users', uid);
    try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
            await setDoc(userRef, {
                email: email || '',
                planType: 'free',
                stakedAmount: 0,
                gasBalance: 0,
                isSellingData: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
    } catch(e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${uid}`);
    }
};
