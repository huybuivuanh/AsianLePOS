import { OrderStatus } from "@/types/enums";
import { sortOrdersByDate } from "@/utils/helpers";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";

/**
 * In-progress dine-in orders only — used to resolve table currentOrderId without
 * subscribing to the full dineInOrders collection.
 */
type ActiveDineInOrdersState = {
  activeDineInOrders: DineInOrder[];
  loading: boolean;
  subscribeToActiveDineInOrders: () => () => void;
  clearData: () => void;
};

export const useActiveDineInOrdersStore = create<ActiveDineInOrdersState>(
  (set) => ({
    activeDineInOrders: [],
    loading: true,

    subscribeToActiveDineInOrders: () => {
      set({ loading: true });

      const q = query(
        collection(db, "dineInOrders"),
        where("status", "==", OrderStatus.InProgress),
        limit(100),
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as DineInOrder),
          }));
          const sorted = sortOrdersByDate(data);
          set({ activeDineInOrders: sorted, loading: false });
        },
        (error) => {
          console.error("❌ Active dine-in orders snapshot error:", error);
          set({ loading: false });
        },
      );

      return () => unsubscribe();
    },

    clearData: () => {
      set({ activeDineInOrders: [], loading: true });
    },
  }),
);
