// Memory management utilities for React Native app

/**
 * Debounce function to limit the rate of function calls
 * Useful for search inputs and other frequent updates
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function to limit the rate of function calls
 * Useful for scroll events and other frequent updates
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memory cleanup utility for components
 * Call this in useEffect cleanup to clear any pending operations
 */
export function createCleanupManager() {
  const cleanupFunctions: (() => void)[] = [];

  const addCleanup = (fn: () => void) => {
    cleanupFunctions.push(fn);
  };

  const cleanup = () => {
    cleanupFunctions.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.warn("Cleanup function error:", error);
      }
    });
    cleanupFunctions.length = 0;
  };

  return { addCleanup, cleanup };
}

/**
 * Check if the app is running in development mode
 */
export const isDevelopment = __DEV__;

/**
 * Memory usage warning (for development)
 */
export function logMemoryUsage(label: string) {
  if (isDevelopment) {
    console.log(`Memory check - ${label}:`, {
      timestamp: new Date().toISOString(),
      // Note: React Native doesn't have direct memory access
      // This is just for debugging purposes
    });
  }
}
