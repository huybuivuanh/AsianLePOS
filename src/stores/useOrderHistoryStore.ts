// src/stores/useOrderHistoryStore.ts
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";
import {
  clearOrderHistoryCache,
  loadOrderHistoryFromCache,
  saveOrderHistoryToCache,
} from "../utils/order-history-cache";

type OrderHistoryState = {
  orderHistory: AnyOrder[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  lastFetchTime: number | null;
  loadOrderHistory: () => Promise<void>;
  loadMoreOrders: () => Promise<void>;
  refreshOrderHistory: () => Promise<void>;
  subscribeToOrderHistory: () => () => void; // Backward compatibility
  clearData: () => void;
};

// Initial display: show first 50 orders
// Load more in batches of 25 as user scrolls
// Full cache stored in AsyncStorage
const INITIAL_DISPLAY_LIMIT = 50;
const LOAD_MORE_BATCH_SIZE = 25;
const CACHE_LIMIT = 200;

export const useOrderHistoryStore = create<OrderHistoryState>((set, get) => ({
  orderHistory: [],
  loading: true,
  loadingMore: false,
  hasMore: false,
  lastFetchTime: null,

  loadOrderHistory: async () => {
    set({ loading: true });

    try {
      // Try to load from cache first (instant display)
      const { orders: cachedOrders, isExpired } =
        await loadOrderHistoryFromCache();
      if (cachedOrders && cachedOrders.length > 0) {
        // Display initial batch
        const initialOrders = cachedOrders.slice(0, INITIAL_DISPLAY_LIMIT);
        const hasMore = cachedOrders.length > INITIAL_DISPLAY_LIMIT;
        set({
          orderHistory: initialOrders,
          hasMore,
          loading: false,
          lastFetchTime: Date.now(),
        });
      }

      // Only fetch fresh data if cache is expired or doesn't exist
      // This saves network requests and battery when cache is still fresh
      if (isExpired || !cachedOrders || cachedOrders.length === 0) {
        await get().refreshOrderHistory();
      }
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
      // Load more from cache
      const { orders: cachedOrders } = await loadOrderHistoryFromCache();
      if (cachedOrders && cachedOrders.length > 0) {
        const currentCount = state.orderHistory.length;
        const nextBatch = cachedOrders.slice(
          currentCount,
          currentCount + LOAD_MORE_BATCH_SIZE
        );
        const hasMore =
          cachedOrders.length > currentCount + LOAD_MORE_BATCH_SIZE;

        set({
          orderHistory: [...state.orderHistory, ...nextBatch],
          hasMore,
          loadingMore: false,
        });
      } else {
        set({ loadingMore: false, hasMore: false });
      }
    } catch (error) {
      console.error("❌ Error loading more orders:", error);
      set({ loadingMore: false });
    }
  },

  refreshOrderHistory: async () => {
    try {
      const orderHistoryRef = collection(db, "orderHistory");
      // Query to fetch only the latest orders, ordered by createdAt descending
      const q = query(
        orderHistoryRef,
        orderBy("createdAt", "desc"),
        limit(CACHE_LIMIT)
      );

      const snapshot = await getDocs(q);
      const orderHistoryData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as AnyOrder),
      }));

      // Save full dataset to cache
      await saveOrderHistoryToCache(orderHistoryData);

      // Display initial batch, allow loading more
      const initialOrders = orderHistoryData.slice(0, INITIAL_DISPLAY_LIMIT);
      const hasMore = orderHistoryData.length > INITIAL_DISPLAY_LIMIT;

      set({
        orderHistory: initialOrders,
        hasMore,
        loading: false,
        lastFetchTime: Date.now(),
      });
    } catch (error) {
      console.error("❌ Error refreshing order history:", error);
      set({ loading: false });
    }
  },

  // Backward compatibility: subscribeToOrderHistory now just loads data once
  // (History doesn't need real-time updates like live orders)
  subscribeToOrderHistory: () => {
    // Load data immediately
    get().loadOrderHistory();
    // Return a no-op cleanup function for compatibility
    return () => {
      // No-op: we're not using real-time subscriptions anymore
    };
  },

  clearData: async () => {
    await clearOrderHistoryCache();
    set({
      orderHistory: [],
      loading: true,
      loadingMore: false,
      hasMore: false,
      lastFetchTime: null,
    });
  },
}));
