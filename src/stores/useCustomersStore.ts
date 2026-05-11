import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { extractPhoneDigits } from "../utils/customerPhone";
import { syncFromCart } from "@/services/customerService";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";

const CUSTOMERS_COLLECTION = "customers";
const CUSTOMERS_CACHE_KEY = "@customers:cache";

async function saveCustomersCache(customers: Customer[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(customers));
  } catch (e) {
    console.error("❌ Error saving customers cache:", e);
  }
}

async function loadCustomersCache(): Promise<Customer[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOMERS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Customer[]) : null;
  } catch (e) {
    console.error("❌ Error loading customers cache:", e);
    return null;
  }
}

async function clearCustomersCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CUSTOMERS_CACHE_KEY);
  } catch (e) {
    console.error("❌ Error clearing customers cache:", e);
  }
}

type CustomersState = {
  customers: Customer[];
  loading: boolean;
  subscribeToCustomers: () => () => void;
  /** Returns new doc id, or `undefined` if name/phone missing (no write). */
  addCustomer: (input: {
    name: string;
    phone: string;
  }) => Promise<string | undefined>;
  /** No-op if trimmed name is empty (never override with blank name). */
  updateCustomer: (
    id: string,
    input: { name: string; phone: string },
  ) => Promise<void>;
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

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  loading: true,

  subscribeToCustomers: () => {
    set({ loading: true });

    // Serve cache immediately, then refresh from Firestore in the background.
    loadCustomersCache().then((cached) => {
      if (cached && cached.length > 0) {
        set({ customers: cached, loading: false });
      }
    });

    void getDocs(query(collection(db, CUSTOMERS_COLLECTION)))
      .then((snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Customer),
          id: docSnap.id,
        }));
        set({ customers: data, loading: false });
        void saveCustomersCache(data);
      })
      .catch((e) => {
        console.error("❌ Error fetching customers:", e);
        set({ loading: false });
      });

    // No realtime listener — return a no-op cleanup for compatibility.
    return () => {};
  },

  addCustomer: async ({ name, phone }) => {
    const n = name.trim().toUpperCase();
    const p = extractPhoneDigits(phone) || phone.trim();
    if (!n || !p) return undefined;

    const ref = await addDoc(collection(db, CUSTOMERS_COLLECTION), {
      name: n,
      phone: p,
      createdAt: Timestamp.now(),
    });

    // Write-through: reflect the new customer in local state immediately.
    const newCustomer = { id: ref.id, name: n, phone: p } as Customer;
    const updated = [...get().customers, newCustomer];
    set({ customers: updated });
    void saveCustomersCache(updated);

    return ref.id;
  },

  updateCustomer: async (id, { name, phone }) => {
    const n = name.trim().toUpperCase();
    const p = extractPhoneDigits(phone) || phone.trim();
    if (!n || !p) return;

    await updateDoc(doc(db, CUSTOMERS_COLLECTION, id), { name: n, phone: p });

    // Write-through: update the matching customer in local state immediately.
    const updated = get().customers.map((c) =>
      c.id === id ? { ...c, name: n, phone: p } : c,
    );
    set({ customers: updated });
    void saveCustomersCache(updated);
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
    void clearCustomersCache();
    set({ customers: [], loading: true });
  },
}));
