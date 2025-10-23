// app/stores/useLiveOrdersStore.ts
import { sortOrdersByDate } from "@/utils/utils";
import { collection, onSnapshot } from "firebase/firestore";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";

type OrderHistoryState = {
  orderHistory: Order[];
  loading: boolean;
  subscribeToOrderHistory: () => () => void;
};

export const useOrderHistoryStore = create<OrderHistoryState>((set) => ({
  orderHistory: [],
  loading: true,
  subscribeToOrderHistory: () => {
    set({ loading: true });

    const orderHistoryRef = collection(db, "orderHistory");
    const unsubscribeOrderHistory = onSnapshot(orderHistoryRef, (snapshot) => {
      const orderHistoryData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Order),
      }));
      const sortedData = sortOrdersByDate(orderHistoryData);
      set({ orderHistory: sortedData, loading: false });
    });

    return () => {
      unsubscribeOrderHistory();
    };
  },
}));
