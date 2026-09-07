import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { apiClient, DecoupledUser } from './apiClient';

const firebaseConfig = {
  apiKey: "AIzaSyDKH_FKeXFAGCGq5Zzk5ZiPaAQZVvOpISc",
  authDomain: "decisive-aleph-j7k72.firebaseapp.com",
  projectId: "decisive-aleph-j7k72",
  storageBucket: "decisive-aleph-j7k72.firebasestorage.app",
  messagingSenderId: "131715485727",
  appId: "1:131715485727:web:c3127a1b8d17b6591f852a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-ace49a47-40ec-4c50-9cf0-e0bbd7ea490e");
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { apiClient };
export type { DecoupledUser };

/**
 * Decoupled Google Sign-in: authenticates with Google and synchronizes with cPanel / MySQL backend
 */
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const gUser = result.user;
    
    // Sync session with decoupled backend API
    try {
      await apiClient.loginGoogle({
        email: gUser.email || '',
        displayName: gUser.displayName || '',
        photoUrl: gUser.photoURL || '',
        uid: gUser.uid,
      });
    } catch (apiErr) {
      console.warn('[Decoupled API] Backend sync notice:', apiErr);
    }

    return gUser;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

/**
 * Direct Email and Password Sign-In for Standalone cPanel / MySQL
 */
export const loginWithEmailPassword = async (email: string, password?: string, tenantCode?: string) => {
  return await apiClient.login(email, password, tenantCode);
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn("Sign out notice", error);
  }
  await apiClient.logout();
};
