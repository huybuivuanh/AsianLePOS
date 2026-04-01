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
  clearDineInOrdersTabCache,
  loadDineInOrdersTabCache,
  saveDineInOrdersTabCache,
} from "../utils/orders-tab-cache";

type DineInOrdersTabState = {
  fullDineInOrders: DineInOrder[];
  dineInOrders: DineInOrder[];
  visibleLimit: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  lastFetchTime: number | null;
  loadDineInOrders: () => Promise<void>;
  loadMoreOrders: () => Promise<void>;
  refreshDineInOrders: () => Promise<void>;
  subscribeToDineInOrders: () => () => void;
  clearData: () => void;
};

const INITIAL_DISPLAY_LIMIT = 50;
const LOAD_MORE_BATCH_SIZE = 25;
const CACHE_LIMIT = 200;

function dineInTabQuery() {
  return query(
    collection(db, "dineInOrders"),
    orderBy("createdAt", "desc"),
    limit(CACHE_LIMIT),
  );
}

export const useDineInOrdersStore = create<DineInOrdersTabState>((set, get) => {
  const applyFullList = (full: DineInOrder[]) => {
    const capped = full.slice(0, CACHE_LIMIT);
    const { visibleLimit } = get();
    const displayed = capped.slice(0, Math.min(visibleLimit, capped.length));
    const hasMore = capped.length > displayed.length;
    set({
      fullDineInOrders: capped,
      dineInOrders: displayed,
      hasMore,
      loading: false,
      lastFetchTime: Date.now(),
    });
  };

  return {
    fullDineInOrders: [],
    dineInOrders: [],
    visibleLimit: INITIAL_DISPLAY_LIMIT,
    loading: true,
    loadingMore: false,
    hasMore: false,
    lastFetchTime: null,

    loadDineInOrders: async () => {
      try {
        const { fullDineInOrders, lastFetchTime } = get();
        // Non-empty list, or realtime already delivered (including empty) — do
        // not flip loading back on (avoids race with tab mount + subscribe).
        if (fullDineInOrders.length > 0 || lastFetchTime !== null) {
          set({ loading: false });
          return;
        }

        set({ loading: true });

        const { orders: cachedOrders } = await loadDineInOrdersTabCache();
        if (cachedOrders && cachedOrders.length > 0) {
          applyFullList(cachedOrders.slice(0, CACHE_LIMIT) as DineInOrder[]);
        }
      } catch (error) {
        console.error("❌ Error loading dine in orders tab:", error);
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
        const { fullDineInOrders, visibleLimit } = state;
        if (fullDineInOrders.length === 0) {
          set({ loadingMore: false, hasMore: false });
          return;
        }

        const nextLimit = visibleLimit + LOAD_MORE_BATCH_SIZE;
        const displayed = fullDineInOrders.slice(
          0,
          Math.min(nextLimit, fullDineInOrders.length),
        );
        const hasMore = displayed.length < fullDineInOrders.length;

        set({
          visibleLimit: nextLimit,
          dineInOrders: displayed,
          hasMore,
          loadingMore: false,
        });
      } catch (error) {
        console.error("❌ Error loading more dine in orders:", error);
        set({ loadingMore: false });
      }
    },

    refreshDineInOrders: async () => {
      try {
        const snapshot = await getDocs(dineInTabQuery());
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as DineInOrder),
        }));
        await saveDineInOrdersTabCache(data);
        applyFullList(data);
      } catch (error) {
        console.error("❌ Error refreshing dine in orders:", error);
        set({ loading: false });
      }
    },

    subscribeToDineInOrders: () => {
      set({ loading: true });

      void loadDineInOrdersTabCache().then(({ orders: cachedOrders }) => {
        if (cachedOrders?.length && get().fullDineInOrders.length === 0) {
          applyFullList(cachedOrders.slice(0, CACHE_LIMIT) as DineInOrder[]);
        }
      });

      const q = dineInTabQuery();
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as DineInOrder),
          }));
          void saveDineInOrdersTabCache(data);
          applyFullList(data);
        },
        (error) => {
          console.error("❌ Dine in orders snapshot error:", error);
          set({ loading: false });
        },
      );

      return () => unsubscribe();
    },

    clearData: async () => {
      await clearDineInOrdersTabCache();
      set({
        fullDineInOrders: [],
        dineInOrders: [],
        visibleLimit: INITIAL_DISPLAY_LIMIT,
        loading: true,
        loadingMore: false,
        hasMore: false,
        lastFetchTime: null,
      });
    },
  };
});
