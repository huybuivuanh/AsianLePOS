// src/stores/useOrderHistoryStore.ts
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";
import {
  clearOrderHistoryCache,
  loadOrderHistoryFromCache,
  saveOrderHistoryToCache,
} from "../utils/order-history-cache";

type OrderHistoryState = {
  fullOrderHistory: AnyOrder[];
  orderHistory: AnyOrder[];
  visibleLimit: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  lastFetchTime: number | null;
  loadOrderHistory: () => Promise<void>;
  loadMoreOrders: () => Promise<void>;
  refreshOrderHistory: () => Promise<void>;
  subscribeToOrderHistory: () => () => void;
  clearData: () => void;
};

const INITIAL_DISPLAY_LIMIT = 50;
const LOAD_MORE_BATCH_SIZE = 25;
const CACHE_LIMIT = 200;

function historyQuery() {
  return query(
    collection(db, "orderHistory"),
    orderBy("createdAt", "desc"),
    limit(CACHE_LIMIT),
  );
}

export const useOrderHistoryStore = create<OrderHistoryState>((set, get) => {
  const applyFullList = (full: AnyOrder[]) => {
    const capped = full.slice(0, CACHE_LIMIT);
    const { visibleLimit } = get();
    const displayed = capped.slice(0, Math.min(visibleLimit, capped.length));
    const hasMore = capped.length > displayed.length;
    set({
      fullOrderHistory: capped,
      orderHistory: displayed,
      hasMore,
      loading: false,
      lastFetchTime: Date.now(),
    });
  };

  return {
    fullOrderHistory: [],
    orderHistory: [],
    visibleLimit: INITIAL_DISPLAY_LIMIT,
    loading: true,
    loadingMore: false,
    hasMore: false,
    lastFetchTime: null,

    loadOrderHistory: async () => {
      try {
        if (get().fullOrderHistory.length > 0) {
          set({ loading: false });
          return;
        }

        set({ loading: true });

        const { orders: cachedOrders } = await loadOrderHistoryFromCache();
        if (cachedOrders && cachedOrders.length > 0) {
          applyFullList(cachedOrders.slice(0, CACHE_LIMIT));
        }
        // Live data arrives via subscribeToOrderHistory onSnapshot
      } catch (error) {
        console.error("❌ Error loading order history:", error);
        set({ loading: false });
      }
    },

    loadMoreOrders: async () => {
      const state = get();
      if (state.loadingMore || !state.hasMore) {
        return;
      }

      set({ loadingMore: true });

      try {
        const { fullOrderHistory, visibleLimit } = state;
        if (fullOrderHistory.length === 0) {
          set({ loadingMore: false, hasMore: false });
          return;
        }

        const nextLimit = visibleLimit + LOAD_MORE_BATCH_SIZE;
        const displayed = fullOrderHistory.slice(
          0,
          Math.min(nextLimit, fullOrderHistory.length),
        );
        const hasMore = displayed.length < fullOrderHistory.length;

        set({
          visibleLimit: nextLimit,
          orderHistory: displayed,
          hasMore,
          loadingMore: false,
        });
      } catch (error) {
        console.error("❌ Error loading more orders:", error);
        set({ loadingMore: false });
      }
    },

    refreshOrderHistory: async () => {
      try {
        const snapshot = await getDocs(historyQuery());
        const orderHistoryData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as AnyOrder),
        }));

        await saveOrderHistoryToCache(orderHistoryData);
        applyFullList(orderHistoryData);
      } catch (error) {
        console.error("❌ Error refreshing order history:", error);
        set({ loading: false });
      }
    },

    subscribeToOrderHistory: () => {
      set({ loading: true });

      void loadOrderHistoryFromCache().then(({ orders: cachedOrders }) => {
        if (cachedOrders?.length && get().fullOrderHistory.length === 0) {
          applyFullList(cachedOrders.slice(0, CACHE_LIMIT));
        }
      });

      const q = historyQuery();
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const orderHistoryData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as AnyOrder),
          }));
          void saveOrderHistoryToCache(orderHistoryData);
          applyFullList(orderHistoryData);
        },
        (error) => {
          console.error("❌ Order history snapshot error:", error);
          set({ loading: false });
        },
      );

      return () => unsubscribe();
    },

    clearData: async () => {
      await clearOrderHistoryCache();
      set({
        fullOrderHistory: [],
        orderHistory: [],
        visibleLimit: INITIAL_DISPLAY_LIMIT,
        loading: true,
        loadingMore: false,
        hasMore: false,
        lastFetchTime: null,
      });
    },
  };
});
