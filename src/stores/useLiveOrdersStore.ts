// src/stores/useLiveOrdersStore.ts
import { sortOrdersByDate } from "@/utils/helpers";
import { collection, onSnapshot } from "firebase/firestore";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";

type LiveOrdersState = {
  dineInOrders: DineInOrder[];
  takeOutOrders: TakeOutOrder[];
  loading: boolean;
  subscribeToLiveOrders: () => () => void;
  clearData: () => void;
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
        ...(doc.data() as DineInOrder),
      }));
      const sortedData = sortOrdersByDate(dineInData);
      set({ dineInOrders: sortedData, loading: false });
    });

    // Subscribe to takeOutOrders
    const takeOutRef = collection(db, "takeOutOrders");
    const unsubscribeTakeOut = onSnapshot(takeOutRef, (snapshot) => {
      const takeOutData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as TakeOutOrder),
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

  clearData: () => {
    set({ dineInOrders: [], takeOutOrders: [], loading: true });
  },
}));
