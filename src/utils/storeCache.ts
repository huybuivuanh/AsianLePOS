import AsyncStorage from "@react-native-async-storage/async-storage";

export type StoreCache<T> = {
  save: (data: T) => Promise<void>;
  load: () => Promise<T | null>;
  clear: () => Promise<void>;
};

export function createStoreCache<T>(key: string): StoreCache<T> {
  return {
    save: async (data) => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.error(`❌ storeCache.save [${key}]:`, e);
      }
    },
    load: async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch (e) {
        console.error(`❌ storeCache.load [${key}]:`, e);
        return null;
      }
    },
    clear: async () => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.error(`❌ storeCache.clear [${key}]:`, e);
      }
    },
  };
}
