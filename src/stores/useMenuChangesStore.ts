import { collection, getDocs } from "firebase/firestore";
import { create } from "zustand";
import { db } from "@/lib/firebaseConfig";

const MENU_CHANGES_COLLECTION = "menuChanges";

type MenuChangesState = {
  menuChanges: MenuChange[];
  loading: boolean;
  error: string | null;
  /** True after a successful fetch (including empty list). Cleared on logout. */
  hasFetched: boolean;
  /**
   * One-shot load from Firestore (no real-time listener).
   * No-op if already fetched unless `{ force: true }` (e.g. pull-to-refresh later).
   */
  fetchMenuChanges: (opts?: { force?: boolean }) => Promise<void>;
  clearData: () => void;
};

function sortMenuChanges(a: MenuChange, b: MenuChange): number {
  const from = a.from.localeCompare(b.from, undefined, { sensitivity: "base" });
  if (from !== 0) return from;
  return a.to.localeCompare(b.to, undefined, { sensitivity: "base" });
}

export const useMenuChangesStore = create<MenuChangesState>((set, get) => ({
  menuChanges: [],
  loading: false,
  error: null,
  hasFetched: false,

  fetchMenuChanges: async (opts) => {
    const force = opts?.force === true;
    if (get().hasFetched && !force) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const snap = await getDocs(collection(db, MENU_CHANGES_COLLECTION));
      const menuChanges = snap.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<MenuChange, "id">;
        return {
          id: docSnap.id,
          ...data,
        } as MenuChange;
      });
      menuChanges.sort(sortMenuChanges);
      set({ menuChanges, loading: false, hasFetched: true });
    } catch (e) {
      console.error("❌ fetchMenuChanges failed:", e);
      set({
        menuChanges: [],
        loading: false,
        hasFetched: false,
        error: e instanceof Error ? e.message : "Failed to load menu changes",
      });
    }
  },

  clearData: () => {
    set({
      menuChanges: [],
      loading: false,
      error: null,
      hasFetched: false,
    });
  },
}));
