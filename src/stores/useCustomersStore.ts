import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { create } from "zustand";
import { syncFromCart } from "@/services/customerService";
import { extractPhoneDigits } from "../utils/customerPhone";
import { firebase } from "../lib/firebaseConfig";

const CUSTOMERS_COLLECTION = "customers";
const CUSTOMERS_VERSION_COLLECTION = "customersVersion";
const CUSTOMERS_VERSION_DOC = "versionDoc";
const CACHE_KEY = "@customers:cache";
const LAST_FETCHED_KEY = "@customers:lastFetchedAt";
const VERSION_KEY = "@customers:version";

// In-memory version cache to avoid AsyncStorage reads on every Firestore event
let localCustomersVersionCache: number | null = null;

type CustomersState = {
  customers: Customer[];
  loading: boolean;
  subscribeToCustomersVersion: () => () => void;
  /** Returns new doc id, or `undefined` if name/phone missing (no write). */
  addCustomer: (input: { name: string; phone: string }) => Promise<string | undefined>;
  /** No-op if trimmed name is empty (never override with blank name). */
  updateCustomer: (id: string, input: { name: string; phone: string }) => Promise<void>;
  /**
   * Writes to `customers` when name is non-empty and phone has ≥7 digits.
   * Accepts order data as a parameter — no store cross-dependency.
   * Does not throw (logs only) so order submit can proceed.
   */
  syncTakeOutCustomerFromCart: (
    order: Pick<OrderDraft, "customerName" | "phoneNumber">,
  ) => Promise<void>;
  clearData: () => void;
};

function mergeCustomers(existing: Customer[], incoming: Customer[]): Customer[] {
  const map = new Map(existing.map((c) => [c.id!, c]));
  for (const c of incoming) {
    map.set(c.id!, c);
  }
  return Array.from(map.values());
}

// Sets localCustomersVersionCache synchronously before the Firestore write so
// when the snapshot fires for our own write it is already a no-op.
async function bumpVersion(): Promise<void> {
  const version = Date.now();
  localCustomersVersionCache = version;
  await setDoc(
    doc(firebase.db, CUSTOMERS_VERSION_COLLECTION, CUSTOMERS_VERSION_DOC),
    { version },
    { merge: true },
  );
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  loading: true,

  subscribeToCustomersVersion: () => {
    const versionDocRef = doc(firebase.db, CUSTOMERS_VERSION_COLLECTION, CUSTOMERS_VERSION_DOC);

    const unsubscribe = onSnapshot(versionDocRef, async (snapshot) => {
      const remoteVersion = snapshot.data()?.version ?? 0;

      // Read from AsyncStorage only once per session; use memory cache after that
      if (localCustomersVersionCache === null) {
        const stored = await AsyncStorage.getItem(VERSION_KEY);
        localCustomersVersionCache = stored ? parseInt(stored) : -1;
      }

      if (remoteVersion > localCustomersVersionCache) {
        try {
          const lastFetchedStr = await AsyncStorage.getItem(LAST_FETCHED_KEY);
          const lastFetchedAt = lastFetchedStr ? parseInt(lastFetchedStr) : 0;
          const fetchStart = Date.now();

          // First ever load → full fetch; subsequent → incremental by createdAt
          const snap =
            lastFetchedAt === 0
              ? await getDocs(collection(firebase.db, CUSTOMERS_COLLECTION))
              : await getDocs(
                  query(
                    collection(firebase.db, CUSTOMERS_COLLECTION),
                    where("createdAt", ">", Timestamp.fromMillis(lastFetchedAt)),
                  ),
                );

          const incoming = snap.docs.map((d) => ({
            ...(d.data() as Customer),
            id: d.id,
          }));

          const merged =
            lastFetchedAt === 0 ? incoming : mergeCustomers(get().customers, incoming);

          set({ customers: merged, loading: false });
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(merged));
          await AsyncStorage.setItem(LAST_FETCHED_KEY, String(fetchStart));
          await AsyncStorage.setItem(VERSION_KEY, String(remoteVersion));
          localCustomersVersionCache = remoteVersion;
        } catch (e) {
          console.error("❌ Failed to fetch customers:", e);
          set({ loading: false });
        }
      } else {
        // Version unchanged — only hydrate from cache if the store hasn't loaded yet
        if (useCustomersStore.getState().loading) {
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached) {
            set({ customers: JSON.parse(cached), loading: false });
          } else {
            set({ loading: false });
          }
        }
      }
    });

    return unsubscribe;
  },

  addCustomer: async ({ name, phone }) => {
    const n = name.trim().toUpperCase();
    const p = extractPhoneDigits(phone) || phone.trim();
    if (!n || !p) return undefined;

    const now = Timestamp.now();
    const ref = await addDoc(collection(firebase.db, CUSTOMERS_COLLECTION), {
      name: n,
      phone: p,
      createdAt: now,
    });

    const newCustomer: Customer = { id: ref.id, name: n, phone: p, createdAt: now };
    const updated = [...get().customers, newCustomer];
    set({ customers: updated });
    void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    void bumpVersion();

    return ref.id;
  },

  updateCustomer: async (id, { name, phone }) => {
    const n = name.trim().toUpperCase();
    const p = extractPhoneDigits(phone) || phone.trim();
    if (!n || !p) return;

    const now = Timestamp.now();
    await updateDoc(doc(firebase.db, CUSTOMERS_COLLECTION, id), {
      name: n,
      phone: p,
      createdAt: now,
    });

    const updated = get().customers.map((c) =>
      c.id === id ? { ...c, name: n, phone: p } : c,
    );
    set({ customers: updated });
    void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    void bumpVersion();
  },

  syncTakeOutCustomerFromCart: async (order) => {
    const { customers, addCustomer, updateCustomer } = get();
    try {
      await syncFromCart(order, customers, addCustomer, updateCustomer);
    } catch (e) {
      console.error("Customer sync failed:", e);
    }
  },

  clearData: () => {
    localCustomersVersionCache = null;
    void AsyncStorage.multiRemove([CACHE_KEY, LAST_FETCHED_KEY, VERSION_KEY]);
    set({ customers: [], loading: true });
  },
}));

export const loadCachedCustomers = async () => {
  const cached = await AsyncStorage.getItem(CACHE_KEY);
  if (cached) {
    useCustomersStore.setState({ customers: JSON.parse(cached), loading: false });
  } else {
    useCustomersStore.setState({ loading: false });
  }
};
