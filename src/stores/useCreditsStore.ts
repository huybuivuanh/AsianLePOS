import { collection, getDocs, type Timestamp } from "firebase/firestore";
import { createStoreCache } from "@/utils/storeCache";
import { create } from "zustand";
import { firebase } from "@/lib/firebaseConfig";

const CREDITS_COLLECTION = "credits";
const cache = createStoreCache<Credit[]>("@credits:cache");
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

function createdAtMs(c: Credit): number {
  const t = c.createdAt as Timestamp | undefined;
  return t && typeof t.seconds === "number" ? t.seconds * 1000 : 0;
}

function sortCredits(a: Credit, b: Credit): number {
  return createdAtMs(b) - createdAtMs(a);
}

type CreditsState = {
  credits: Credit[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  /**
   * Serves cache immediately, then refreshes from Firestore in the background.
   * No-op if fetched within the last 24 h unless `{ force: true }`.
   */
  fetchCredits: (opts?: { force?: boolean }) => Promise<void>;
  clearData: () => void;
};

export const useCreditsStore = create<CreditsState>((set, get) => ({
  credits: [],
  loading: false,
  error: null,
  lastFetchedAt: null,

  fetchCredits: async (opts) => {
    const { lastFetchedAt } = get();
    if (lastFetchedAt !== null && Date.now() - lastFetchedAt < STALE_AFTER_MS && opts?.force !== true) return;

    set({ loading: true, error: null });

    cache.load().then((cached) => {
      if (cached && cached.length > 0) set({ credits: cached, loading: false });
    });

    try {
      const snap = await getDocs(collection(firebase.db, CREDITS_COLLECTION));
      const credits = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Credit, "id">),
      })) as Credit[];
      credits.sort(sortCredits);
      set({ credits, loading: false, lastFetchedAt: Date.now() });
      void cache.save(credits);
    } catch (e) {
      console.error("❌ fetchCredits failed:", e);
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load credits",
      });
    }
  },

  clearData: () => {
    void cache.clear();
    set({ credits: [], loading: false, error: null, lastFetchedAt: null });
  },
}));
