import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  extractPhoneDigits,
  findBestCustomerByLast7,
  lastSevenDigits,
} from "../utils/customerPhone";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";
import { useOrderStore } from "./useOrderStore";

const CUSTOMERS_COLLECTION = "customers";

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
   * Reads `customerName` / `phoneNumber` from the current take-out cart
   * (`useOrderStore`). Writes to `customers` only when name is non-empty and
   * phone has ≥7 digits. Does not throw (logs only) so order submit can proceed.
   */
  syncTakeOutCustomerFromCart: () => Promise<void>;
  clearData: () => void;
};

function customersQuery() {
  return query(collection(db, CUSTOMERS_COLLECTION));
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  loading: true,

  addCustomer: async ({ name, phone }) => {
    const n = name.trim().toUpperCase();
    const p = extractPhoneDigits(phone) || phone.trim();
    if (!n || !p) {
      return undefined;
    }

    const ref = await addDoc(collection(db, CUSTOMERS_COLLECTION), {
      name: n,
      phone: p,
      createdAt: Timestamp.now(),
    });
    return ref.id;
  },

  updateCustomer: async (id, { name, phone }) => {
    const n = name.trim().toUpperCase();
    const p = extractPhoneDigits(phone) || phone.trim();
    if (!n) {
      return;
    }
    if (!p) {
      return;
    }
    await updateDoc(doc(db, CUSTOMERS_COLLECTION, id), {
      name: n,
      phone: p,
    });
  },

  syncTakeOutCustomerFromCart: async () => {
    const { order } = useOrderStore.getState();
    const { customers, addCustomer, updateCustomer } = get();

    const name = (order.customerName || "").trim();
    const digits = extractPhoneDigits(order.phoneNumber || "");
    const last7 = lastSevenDigits(digits);
    if (!last7 || !name) return;

    const existing = findBestCustomerByLast7(customers, last7);
    const upperName = name.toUpperCase();

    try {
      if (existing?.id) {
        const sameName =
          existing.name.trim().toUpperCase() === upperName;
        const samePhone = extractPhoneDigits(existing.phone) === digits;
        if (sameName && samePhone) return;
        await updateCustomer(existing.id, { name: upperName, phone: digits });
      } else {
        await addCustomer({ name: upperName, phone: digits });
      }
    } catch (e) {
      console.error("Customer sync failed:", e);
    }
  },

  subscribeToCustomers: () => {
    set({ loading: true });

    const unsubscribe = onSnapshot(
      customersQuery(),
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const raw = docSnap.data() as Customer;
          return { ...raw, id: docSnap.id };
        });
        set({ customers: data, loading: false });
      },
      (error) => {
        console.error("❌ Customers snapshot error:", error);
        set({ loading: false });
      },
    );

    return () => unsubscribe();
  },

  clearData: () => {
    set({
      customers: [],
      loading: true,
    });
  },
}));
