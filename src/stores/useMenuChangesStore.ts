import { collection, getDocs } from "firebase/firestore";
import { createStoreCache } from "@/utils/storeCache";
import { create } from "zustand";
import { firebase } from "@/lib/firebaseConfig";

const MENU_CHANGES_COLLECTION = "menuChanges";
const cache = createStoreCache<MenuChange[]>("@menuChanges:cache");
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

function sortMenuChanges(a: MenuChange, b: MenuChange): number {
  const from = a.from.localeCompare(b.from, undefined, { sensitivity: "base" });
  if (from !== 0) return from;
  return a.to.localeCompare(b.to, undefined, { sensitivity: "base" });
}

type MenuChangesState = {
  menuChanges: MenuChange[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  /**
   * Serves cache immediately, then refreshes from Firestore in the background.
   * No-op if fetched within the last 24 h unless `{ force: true }`.
   */
  fetchMenuChanges: (opts?: { force?: boolean }) => Promise<void>;
  clearData: () => void;
};

export const useMenuChangesStore = create<MenuChangesState>((set, get) => ({
  menuChanges: [],
  loading: false,
  error: null,
  lastFetchedAt: null,

  fetchMenuChanges: async (opts) => {
    const { lastFetchedAt } = get();
    if (lastFetchedAt !== null && Date.now() - lastFetchedAt < STALE_AFTER_MS && opts?.force !== true) return;

    set({ loading: true, error: null });

    cache.load().then((cached) => {
      if (cached && cached.length > 0) set({ menuChanges: cached, loading: false });
    });

    try {
      const snap = await getDocs(collection(firebase.db, MENU_CHANGES_COLLECTION));
      const menuChanges = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<MenuChange, "id">),
      })) as MenuChange[];
      menuChanges.sort(sortMenuChanges);
      set({ menuChanges, loading: false, lastFetchedAt: Date.now() });
      void cache.save(menuChanges);
    } catch (e) {
      console.error("❌ fetchMenuChanges failed:", e);
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load menu changes",
      });
    }
  },

  clearData: () => {
    void cache.clear();
    set({ menuChanges: [], loading: false, error: null, lastFetchedAt: null });
  },
}));
