import { collection, getDocs } from "firebase/firestore";
import { createStoreCache } from "@/utils/storeCache";
import { create } from "zustand";
import { db } from "@/lib/firebaseConfig";

const MENU_CHANGES_COLLECTION = "menuChanges";
const cache = createStoreCache<MenuChange[]>("@menuChanges:cache");

function sortMenuChanges(a: MenuChange, b: MenuChange): number {
  const from = a.from.localeCompare(b.from, undefined, { sensitivity: "base" });
  if (from !== 0) return from;
  return a.to.localeCompare(b.to, undefined, { sensitivity: "base" });
}

type MenuChangesState = {
  menuChanges: MenuChange[];
  loading: boolean;
  error: string | null;
  hasFetched: boolean;
  /**
   * Serves cache immediately, then refreshes from Firestore in the background.
   * No-op if already fetched this session unless `{ force: true }`.
   */
  fetchMenuChanges: (opts?: { force?: boolean }) => Promise<void>;
  clearData: () => void;
};

export const useMenuChangesStore = create<MenuChangesState>((set, get) => ({
  menuChanges: [],
  loading: false,
  error: null,
  hasFetched: false,

  fetchMenuChanges: async (opts) => {
    if (get().hasFetched && opts?.force !== true) return;

    set({ loading: true, error: null });

    cache.load().then((cached) => {
      if (cached && cached.length > 0) set({ menuChanges: cached, loading: false });
    });

    try {
      const snap = await getDocs(collection(db, MENU_CHANGES_COLLECTION));
      const menuChanges = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<MenuChange, "id">),
      })) as MenuChange[];
      menuChanges.sort(sortMenuChanges);
      set({ menuChanges, loading: false, hasFetched: true });
      void cache.save(menuChanges);
    } catch (e) {
      console.error("❌ fetchMenuChanges failed:", e);
      set({
        loading: false,
        hasFetched: false,
        error: e instanceof Error ? e.message : "Failed to load menu changes",
      });
    }
  },

  clearData: () => {
    void cache.clear();
    set({ menuChanges: [], loading: false, error: null, hasFetched: false });
  },
}));
