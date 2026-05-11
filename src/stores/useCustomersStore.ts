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
import { createStoreCache } from "@/utils/storeCache";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";

const CUSTOMERS_COLLECTION = "customers";
const cache = createStoreCache<Customer[]>("@customers:cache");

type CustomersState = {
  customers: Customer[];
  loading: boolean;
  subscribeToCustomers: () => () => void;
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

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  loading: true,

  subscribeToCustomers: () => {
    set({ loading: true });

    // Serve cache immediately, then refresh from Firestore in the background.
    cache.load().then((cached) => {
      if (cached && cached.length > 0) set({ customers: cached, loading: false });
    });

    void getDocs(query(collection(db, CUSTOMERS_COLLECTION)))
      .then((snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Customer),
          id: docSnap.id,
        }));
        set({ customers: data, loading: false });
        void cache.save(data);
      })
      .catch((e) => {
        console.error("❌ Error fetching customers:", e);
        set({ loading: false });
      });

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

    const newCustomer = { id: ref.id, name: n, phone: p } as Customer;
    const updated = [...get().customers, newCustomer];
    set({ customers: updated });
    void cache.save(updated);

    return ref.id;
  },

  updateCustomer: async (id, { name, phone }) => {
    const n = name.trim().toUpperCase();
    const p = extractPhoneDigits(phone) || phone.trim();
    if (!n || !p) return;

    await updateDoc(doc(db, CUSTOMERS_COLLECTION, id), { name: n, phone: p });

    const updated = get().customers.map((c) =>
      c.id === id ? { ...c, name: n, phone: p } : c,
    );
    set({ customers: updated });
    void cache.save(updated);
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
    void cache.clear();
    set({ customers: [], loading: true });
  },
}));
