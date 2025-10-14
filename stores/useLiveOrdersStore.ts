// app/stores/useLiveOrdersStore.ts
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
      set({ dineInOrders: dineInData, loading: false });
    });

    // Subscribe to takeOutOrders
    const takeOutRef = collection(db, "takeOutOrders");
    const unsubscribeTakeOut = onSnapshot(takeOutRef, (snapshot) => {
      const takeOutData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Order),
      }));
      set({ takeOutOrders: takeOutData, loading: false });
    });

    // Return a combined unsubscribe function
    return () => {
      unsubscribeDineIn();
      unsubscribeTakeOut();
    };
  },
}));
