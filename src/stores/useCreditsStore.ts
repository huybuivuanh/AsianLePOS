import { collection, getDocs, type Timestamp } from "firebase/firestore";
import { create } from "zustand";
import { db } from "@/lib/firebaseConfig";

const CREDITS_COLLECTION = "credits";

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
  /** True after a successful fetch (including empty list). Cleared on logout. */
  hasFetched: boolean;
  /**
   * One-shot load from Firestore (no real-time listener).
   * No-op if already fetched unless `{ force: true }`.
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
    if (get().hasFetched && !force) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const snap = await getDocs(collection(db, CREDITS_COLLECTION));
      const credits = snap.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<Credit, "id">;
        return {
          id: docSnap.id,
          ...data,
        } as Credit;
      });
      credits.sort(sortCredits);
      set({ credits, loading: false, hasFetched: true });
    } catch (e) {
      console.error("❌ fetchCredits failed:", e);
      set({
        credits: [],
        loading: false,
        hasFetched: false,
        error: e instanceof Error ? e.message : "Failed to load credits",
      });
    }
  },

  clearData: () => {
    set({
      credits: [],
      loading: false,
      error: null,
      hasFetched: false,
    });
  },
}));
