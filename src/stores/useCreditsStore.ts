import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, type Timestamp } from "firebase/firestore";
import { create } from "zustand";
import { db } from "@/lib/firebaseConfig";

const CREDITS_COLLECTION = "credits";
const CREDITS_CACHE_KEY = "@credits:cache";

async function saveCreditsCache(credits: Credit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CREDITS_CACHE_KEY, JSON.stringify(credits));
  } catch (e) {
    console.error("❌ Error saving credits cache:", e);
  }
}

async function loadCreditsCache(): Promise<Credit[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CREDITS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Credit[]) : null;
  } catch (e) {
    console.error("❌ Error loading credits cache:", e);
    return null;
  }
}

async function clearCreditsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CREDITS_CACHE_KEY);
  } catch (e) {
    console.error("❌ Error clearing credits cache:", e);
  }
}

function createdAtMs(c: Credit): number {
  const t = c.createdAt as Timestamp | undefined;
  if (t && typeof t.seconds === "number") {
    return t.seconds * 1000;
  }
  return 0;
}

/** Newest first; missing `createdAt` sorts last. */
function sortCredits(a: Credit, b: Credit): number {
  return createdAtMs(b) - createdAtMs(a);
}

type CreditsState = {
  credits: Credit[];
  loading: boolean;
  error: string | null;
  hasFetched: boolean;
  /**
   * Serves cache immediately, then refreshes from Firestore in the background.
   * No-op if already fetched this session unless `{ force: true }`.
   */
  fetchCredits: (opts?: { force?: boolean }) => Promise<void>;
  clearData: () => void;
};

export const useCreditsStore = create<CreditsState>((set, get) => ({
  credits: [],
  loading: false,
  error: null,
  hasFetched: false,

  fetchCredits: async (opts) => {
    const force = opts?.force === true;
    if (get().hasFetched && !force) return;

    set({ loading: true, error: null });

    // Serve cache immediately so UI is not blank on cold start.
    loadCreditsCache().then((cached) => {
      if (cached && cached.length > 0) {
        set({ credits: cached, loading: false });
      }
    });

    try {
      const snap = await getDocs(collection(db, CREDITS_COLLECTION));
      const credits = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Credit, "id">),
      })) as Credit[];
      credits.sort(sortCredits);
      set({ credits, loading: false, hasFetched: true });
      void saveCreditsCache(credits);
    } catch (e) {
      console.error("❌ fetchCredits failed:", e);
      set({
        loading: false,
        hasFetched: false,
        error: e instanceof Error ? e.message : "Failed to load credits",
      });
    }
  },

  clearData: () => {
    void clearCreditsCache();
    set({ credits: [], loading: false, error: null, hasFetched: false });
  },
}));
