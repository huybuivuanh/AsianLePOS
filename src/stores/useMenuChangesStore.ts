import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs } from "firebase/firestore";
import { create } from "zustand";
import { db } from "@/lib/firebaseConfig";

const MENU_CHANGES_COLLECTION = "menuChanges";
const MENU_CHANGES_CACHE_KEY = "@menuChanges:cache";

async function saveMenuChangesCache(menuChanges: MenuChange[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MENU_CHANGES_CACHE_KEY, JSON.stringify(menuChanges));
  } catch (e) {
    console.error("❌ Error saving menuChanges cache:", e);
  }
}

async function loadMenuChangesCache(): Promise<MenuChange[] | null> {
  try {
    const raw = await AsyncStorage.getItem(MENU_CHANGES_CACHE_KEY);
    return raw ? (JSON.parse(raw) as MenuChange[]) : null;
  } catch (e) {
    console.error("❌ Error loading menuChanges cache:", e);
    return null;
  }
}

async function clearMenuChangesCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MENU_CHANGES_CACHE_KEY);
  } catch (e) {
    console.error("❌ Error clearing menuChanges cache:", e);
  }
}

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
    const force = opts?.force === true;
    if (get().hasFetched && !force) return;

    set({ loading: true, error: null });

    // Serve cache immediately so UI is not blank on cold start.
    loadMenuChangesCache().then((cached) => {
      if (cached && cached.length > 0) {
        set({ menuChanges: cached, loading: false });
      }
    });

    try {
      const snap = await getDocs(collection(db, MENU_CHANGES_COLLECTION));
      const menuChanges = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<MenuChange, "id">),
      })) as MenuChange[];
      menuChanges.sort(sortMenuChanges);
      set({ menuChanges, loading: false, hasFetched: true });
      void saveMenuChangesCache(menuChanges);
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
    void clearMenuChangesCache();
    set({ menuChanges: [], loading: false, error: null, hasFetched: false });
  },
}));
