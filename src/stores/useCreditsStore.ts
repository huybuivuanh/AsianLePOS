import { collection, getDocs, type Timestamp } from "firebase/firestore";
import { createStoreCache } from "@/utils/storeCache";
import { create } from "zustand";
import { db } from "@/lib/firebaseConfig";

const CREDITS_COLLECTION = "credits";
const cache = createStoreCache<Credit[]>("@credits:cache");

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
    if (get().hasFetched && opts?.force !== true) return;

    set({ loading: true, error: null });

    cache.load().then((cached) => {
      if (cached && cached.length > 0) set({ credits: cached, loading: false });
    });

    try {
      const snap = await getDocs(collection(db, CREDITS_COLLECTION));
      const credits = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Credit, "id">),
      })) as Credit[];
      credits.sort(sortCredits);
      set({ credits, loading: false, hasFetched: true });
      void cache.save(credits);
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
    void cache.clear();
    set({ credits: [], loading: false, error: null, hasFetched: false });
  },
}));
