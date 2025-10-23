// app/stores/useLiveOrdersStore.ts
import { sortOrdersByDate } from "@/utils/utils";
import { collection, onSnapshot } from "firebase/firestore";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";

type LiveOrdersState = {
  dineInOrders: Order[];
  takeOutOrders: Order[];
  loading: boolean;
  subscribeToLiveOrders: () => () => void;
};

export const useLiveOrdersStore = create<LiveOrdersState>((set) => ({
  dineInOrders: [],
  takeOutOrders: [],
  loading: true,

  subscribeToLiveOrders: () => {
    set({ loading: true });

    // Subscribe to dineInOrders
    const dineInRef = collection(db, "dineInOrders");
    const unsubscribeDineIn = onSnapshot(dineInRef, (snapshot) => {
      const dineInData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Order),
      }));
      const sortedData = sortOrdersByDate(dineInData);
      set({ dineInOrders: sortedData, loading: false });
    });

    // Subscribe to takeOutOrders
    const takeOutRef = collection(db, "takeOutOrders");
    const unsubscribeTakeOut = onSnapshot(takeOutRef, (snapshot) => {
      const takeOutData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Order),
      }));
      const sortedData = sortOrdersByDate(takeOutData);
      set({ takeOutOrders: sortedData, loading: false });
    });

    // Return a combined unsubscribe function
    return () => {
      unsubscribeDineIn();
      unsubscribeTakeOut();
    };
  },
}));
