// Order history caching utilities using AsyncStorage
import AsyncStorage from "@react-native-async-storage/async-storage";

const ORDER_HISTORY_CACHE_KEY = "@orderHistory:cache";
const ORDER_HISTORY_CACHE_TIMESTAMP_KEY = "@orderHistory:cacheTimestamp";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export interface CachedOrderHistory {
  orders: AnyOrder[];
  timestamp: number;
}

/**
 * Save order history to AsyncStorage cache
 */
export async function saveOrderHistoryToCache(
  orders: AnyOrder[]
): Promise<void> {
  try {
    const cacheData: CachedOrderHistory = {
      orders,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      ORDER_HISTORY_CACHE_KEY,
      JSON.stringify(cacheData)
    );
  } catch (error) {
    console.error("❌ Error saving order history to cache:", error);
  }
}

/**
 * Load order history from AsyncStorage cache
 * Returns the cached data and whether it's expired
 */
export async function loadOrderHistoryFromCache(): Promise<{
  orders: AnyOrder[] | null;
  isExpired: boolean;
}> {
  try {
    const cachedData = await AsyncStorage.getItem(ORDER_HISTORY_CACHE_KEY);
    if (!cachedData) {
      return { orders: null, isExpired: true };
    }

    const parsed: CachedOrderHistory = JSON.parse(cachedData);
    const now = Date.now();
    const isExpired = now - parsed.timestamp > CACHE_EXPIRY_MS;

    // Always return cached data (even if expired) for offline support
    // The store will decide whether to refresh based on isExpired flag
    return { orders: parsed.orders, isExpired };
  } catch (error) {
    console.error("❌ Error loading order history from cache:", error);
    return { orders: null, isExpired: true };
  }
}

/**
 * Clear the order history cache
 */
export async function clearOrderHistoryCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      ORDER_HISTORY_CACHE_KEY,
      ORDER_HISTORY_CACHE_TIMESTAMP_KEY,
    ]);
  } catch (error) {
    console.error("❌ Error clearing order history cache:", error);
  }
}

/**
 * Get cache timestamp
 */
export async function getCacheTimestamp(): Promise<number | null> {
  try {
    const timestamp = await AsyncStorage.getItem(
      ORDER_HISTORY_CACHE_TIMESTAMP_KEY
    );
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error("❌ Error getting cache timestamp:", error);
    return null;
  }
}
