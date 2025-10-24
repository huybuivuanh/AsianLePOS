// app/stores/useLiveOrdersStore.ts
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";

type OrderHistoryState = {
  orderHistory: Order[];
  loading: boolean;
  subscribeToOrderHistory: () => () => void;
  clearData: () => void;
};

export const useOrderHistoryStore = create<OrderHistoryState>((set) => ({
  orderHistory: [],
  loading: true,
  subscribeToOrderHistory: () => {
    set({ loading: true });

    const orderHistoryRef = collection(db, "orderHistory");
    // Query to fetch only the latest 100 orders, ordered by createdAt descending
    const q = query(orderHistoryRef, orderBy("createdAt", "desc"), limit(100));

    const unsubscribeOrderHistory = onSnapshot(q, (snapshot) => {
      const orderHistoryData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Order),
      }));
      // Data is already sorted by Firestore, no need for additional sorting
      set({ orderHistory: orderHistoryData, loading: false });
    });

    return () => {
      unsubscribeOrderHistory();
    };
  },

  clearData: () => {
    set({ orderHistory: [], loading: true });
  },
}));
