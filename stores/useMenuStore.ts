import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, onSnapshot } from "firebase/firestore";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";

type MenuState = {
  categories: FoodCategory[];
  menuItems: MenuItem[];
  optionGroups: OptionGroup[];
  options: ItemOption[];
  loading: boolean;
  subscribeToMenu: () => () => void;
};

const STORAGE_KEY = "@menu_cache";

// Deep equality check for arrays of objects
const isEqual = (a: any[], b: any[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
  }
  return true;
};

export const useMenuStore = create<MenuState>((set, get) => ({
  categories: [],
  menuItems: [],
  optionGroups: [],
  options: [],
  loading: true,

  subscribeToMenu: () => {
    const unsubscribers: (() => void)[] = [];

    const updateStoreAndCache = async (key: keyof MenuState, data: any[]) => {
      const current = get()[key];
      if (Array.isArray(current) && !isEqual(current, data)) {
        set({ [key]: data });
        // Read existing AsyncStorage
        const currentStoreRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const currentStore = currentStoreRaw ? JSON.parse(currentStoreRaw) : {};
        currentStore[key] = data;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentStore));
      }
    };

    const collections: [keyof MenuState, string][] = [
      ["categories", "categories"],
      ["menuItems", "menuItems"],
      ["optionGroups", "optionGroups"],
      ["options", "options"],
    ];

    collections.forEach(([stateKey, collectionName]) => {
      unsubscribers.push(
        onSnapshot(collection(db, collectionName), (snapshot) => {
          let data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          // Sort categories by order
          if (stateKey === "categories") {
            (data as (FoodCategory & { order?: number })[]).sort(
              (a, b) => (a.order ?? 0) - (b.order ?? 0)
            );
            set({ loading: false });
          }
          updateStoreAndCache(stateKey, data);
        })
      );
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  },
}));

// Load cached data immediately on app start
export const loadCachedMenu = async () => {
  const cache = await AsyncStorage.getItem(STORAGE_KEY);
  if (cache) {
    const data = JSON.parse(cache);
    useMenuStore.setState({
      categories: data.categories || [],
      menuItems: data.menuItems || [],
      optionGroups: data.optionGroups || [],
      options: data.options || [],
      loading: false,
    });
  }
};
