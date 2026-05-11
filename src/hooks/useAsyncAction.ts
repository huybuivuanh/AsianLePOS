import { useState, useCallback } from "react";
import { showAlert } from "@/utils/helpers";

type Options = {
  /** Alert title shown on error. Defaults to "Error". */
  errorTitle?: string;
  /** Called after a successful execution. */
  onSuccess?: () => void;
};

type AsyncActionResult<T extends unknown[]> = {
  execute: (...args: T) => Promise<void>;
  loading: boolean;
};

/**
 * Wraps an async function with loading state and automatic error alerting.
 * Eliminates the repeated try/catch/finally + useState(false) pattern.
 *
 * @example
 * const { execute: handleSubmit, loading: submitting } = useAsyncAction(
 *   async () => { await submitOrder(order); },
 *   { onSuccess: () => router.back() },
 * );
 */
export function useAsyncAction<T extends unknown[]>(
  action: (...args: T) => Promise<void>,
  options: Options = {},
): AsyncActionResult<T> {
  const [loading, setLoading] = useState(false);
  const { errorTitle = "Error", onSuccess } = options;

  const execute = useCallback(
    async (...args: T) => {
      if (loading) return;
      try {
        setLoading(true);
        await action(...args);
        onSuccess?.();
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Something went wrong.";
        showAlert(errorTitle, message);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, errorTitle, onSuccess],
  );

  return { execute, loading };
}
