// app/stores/useMenuStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";

type MenuState = {
  categories: FoodCategory[];
  menuItems: MenuItem[];
  optionGroups: OptionGroup[];
  options: ItemOption[];
  loading: boolean;
  subscribeToMenuVersion: () => () => void;
};

const STORAGE_KEY = "@menu_cache";
const VERSION_KEY = "@menu_version";

// Keys corresponding only to menu arrays
type MenuArrayKeys = "categories" | "menuItems" | "optionGroups" | "options";

export const useMenuStore = create<MenuState>((set) => ({
  categories: [],
  menuItems: [],
  optionGroups: [],
  options: [],
  loading: true,

  subscribeToMenuVersion: () => {
    const versionDocRef = doc(db, "menuVersion", "versionDoc");

    const unsubscribe = onSnapshot(versionDocRef, async (snapshot) => {
      const remoteVersion = snapshot.data()?.version ?? 0;
      const localVersionStr = await AsyncStorage.getItem(VERSION_KEY);
      const localVersion = localVersionStr ? parseInt(localVersionStr) : -1;

      if (remoteVersion > localVersion) {
        try {
          // Fetch all menu collections fresh
          const newMenu = await fetchMenuCollections();

          // Update AsyncStorage cache
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMenu));
          await AsyncStorage.setItem(VERSION_KEY, String(remoteVersion));

          // Update Zustand store
          set({ ...newMenu, loading: false });
        } catch (error) {
          console.error("❌ Failed to fetch menu from Firestore:", error);
        }
      } else {
        // Load cached menu if exists
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) {
          set({ ...JSON.parse(cached), loading: false });
        } else {
          set({ loading: false });
        }
      }
    });

    return unsubscribe;
  },
}));

// Fetch all menu-related collections once
const fetchMenuCollections = async () => {
  const collections: [MenuArrayKeys, string][] = [
    ["categories", "categories"],
    ["menuItems", "menuItems"],
    ["optionGroups", "optionGroups"],
    ["options", "options"],
  ];

  const result: Partial<Pick<MenuState, MenuArrayKeys>> = {};

  for (const [key, name] of collections) {
    const snap = await getDocs(collection(db, name));
    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (key === "categories") {
      (data as (FoodCategory & { order?: number })[]).sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
    }

    result[key] = data as any; // safe, since we know key corresponds to an array
  }

  return result as Pick<MenuState, MenuArrayKeys>;
};

// Load cached menu on app startup
export const loadCachedMenu = async () => {
  const cache = await AsyncStorage.getItem(STORAGE_KEY);
  if (cache) {
    const data = JSON.parse(cache);
    useMenuStore.setState({ ...data, loading: false });
  }
};
