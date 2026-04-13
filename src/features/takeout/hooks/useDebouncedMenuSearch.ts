import { debounce } from "@/utils/memory-utils";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Shared search field state for menu picker screens (debounced query + clear on focus).
 */
export function useDebouncedMenuSearch(debounceMs = 300) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const debouncedSetQuery = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedQuery(value);
      }, debounceMs),
    [debounceMs]
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      debouncedSetQuery(value);
    },
    [debouncedSetQuery]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  useEffect(() => {
    return () => debouncedSetQuery.cancel();
  }, [debouncedSetQuery]);

  useFocusEffect(
    useCallback(() => {
      setQuery("");
      setDebouncedQuery("");
    }, [])
  );

  const searching = debouncedQuery.trim().length > 0;

  return {
    query,
    debouncedQuery,
    handleQueryChange,
    clearSearch,
    searching,
  };
}
