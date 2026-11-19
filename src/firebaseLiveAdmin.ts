import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const ADMIN_EMAIL = 'mimrandatavault@gmail.com';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

let currentUser: User | null = null;
const authListeners: Array<(u: User | null) => void> = [];
const configListeners: Array<(cfg: Record<string, unknown>) => void> = [];

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  authListeners.forEach((fn) => fn(user));
});

const LIVE_CONFIG_PATH = 'app_config/live';
const liveConfigRef = doc(db, 'app_config', 'live');

onSnapshot(
  liveConfigRef,
  (snap) => {
    if (!snap.exists()) return;
    const raw = snap.data();
    try {
      const parsed: Record<string, unknown> = {
        ads: raw.adsJson ? JSON.parse(raw.adsJson) : undefined,
        slots: raw.slotsJson ? JSON.parse(raw.slotsJson) : undefined,
        liveScore: raw.liveScoreJson ? JSON.parse(raw.liveScoreJson) : undefined,
        gameSettings: raw.gameSettingsJson ? JSON.parse(raw.gameSettingsJson) : undefined,
        updatedAt: raw.updatedAt || '',
      };
      configListeners.forEach((fn) => fn(parsed));
    } catch (err) {
      console.warn('Could not parse live cloud config:', err);
    }
  },
  (error) => {
    console.warn('Live config snapshot warning:', error.message);
  }
);

const provider = new GoogleAuthProvider();

const FirebaseLiveAdmin = {
  isAdmin(): boolean {
    return Boolean(currentUser && currentUser.email === ADMIN_EMAIL && currentUser.emailVerified);
  },
  getUser(): { email: string | null; uid: string; displayName: string | null } | null {
    if (!currentUser) return null;
    return {
      email: currentUser.email,
      uid: currentUser.uid,
      displayName: currentUser.displayName,
    };
  },
  onAuthChange(cb: (u: User | null) => void) {
    authListeners.push(cb);
    cb(currentUser);
  },
  onConfigUpdate(cb: (cfg: Record<string, unknown>) => void) {
    configListeners.push(cb);
  },
  async signIn() {
    const res = await signInWithPopup(auth, provider);
    currentUser = res.user;
    return this.getUser();
  },
  async signOut() {
    await signOut(auth);
    currentUser = null;
  },
  async publishConfig(data: {
    ads?: unknown[];
    slots?: Record<string, unknown>;
    liveScore?: Record<string, unknown>;
    gameSettings?: Record<string, unknown>;
  }) {
    if (!currentUser || !this.isAdmin()) {
      throw new Error('Please sign in with your verified Admin Google account first.');
    }
    const payload = {
      adsJson: JSON.stringify(data.ads || []).slice(0, 120000),
      slotsJson: JSON.stringify(data.slots || {}).slice(0, 4000),
      liveScoreJson: JSON.stringify(data.liveScore || {}).slice(0, 4000),
      gameSettingsJson: JSON.stringify(data.gameSettings || {}).slice(0, 8000),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.uid,
    };
    try {
      await setDoc(liveConfigRef, payload);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, LIVE_CONFIG_PATH);
    }
  },
};

(window as unknown as { FirebaseLiveAdmin?: typeof FirebaseLiveAdmin }).FirebaseLiveAdmin = FirebaseLiveAdmin;
export default FirebaseLiveAdmin;
