import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useMenuChangesStore } from "@/stores/useMenuChangesStore";
import {
  changeKey,
  usePendingItemChangesStore,
} from "@/stores/usePendingItemChangesStore";
import Header from "@/ui/Header";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function MenuChangesScreen() {
  const router = useRouter();
  const { existingChanges: existingChangesParam } = useLocalSearchParams<{
    existingChanges?: string;
  }>();
  const { menuChanges, loading } = useMenuChangesStore();
  const additions = usePendingItemChangesStore((s) => s.additions);
  const removals = usePendingItemChangesStore((s) => s.removals);
  const toggleAddition = usePendingItemChangesStore((s) => s.toggleAddition);
  const toggleRemoval = usePendingItemChangesStore((s) => s.toggleRemoval);

  const [query, setQuery] = useState("");

  const existingChanges = useMemo<ItemChange[]>(() => {
    const raw = Array.isArray(existingChangesParam)
      ? existingChangesParam[0]
      : existingChangesParam;
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ItemChange[];
    } catch {
      return [];
    }
  }, [existingChangesParam]);
  const existingKeys = useMemo(
    () => new Set(existingChanges.map(changeKey)),
    [existingChanges],
  );

  // Selected = (was on the item already, minus anything toggled off) plus anything newly added.
  const selectedKeys = useMemo(() => {
    const removedKeys = new Set(removals.map(changeKey));
    const base = existingChanges
      .filter((c) => !removedKeys.has(changeKey(c)))
      .map(changeKey);
    return new Set([...base, ...additions.map(changeKey)]);
  }, [existingChanges, additions, removals]);

  const handleToggleChange = (change: ItemChange) => {
    if (existingKeys.has(changeKey(change))) {
      toggleRemoval(change);
    } else {
      toggleAddition(change);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return menuChanges;
    return menuChanges.filter((row) => row.name.toLowerCase().includes(q));
  }, [menuChanges, query]);

  const showSpinner = loading;

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      <Header title="Menu changes" onBack={() => router.back()} />

      <View className="px-4 pt-3 pb-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name…"
          autoCorrect={false}
          autoCapitalize="none"
          className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-base"
          returnKeyType="search"
        />
      </View>

      {showSpinner ? (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="large" color="#007AFF" />
          <Text className="mt-2 text-gray-600">Loading…</Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id ?? item.name}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text className="py-8 text-center text-gray-500">
              {loading
                ? ""
                : query.trim()
                  ? "No matches for your search."
                  : "No menu changes in the catalog."}
            </Text>
          }
          renderItem={({ item }) => (
            <View className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3.5">
              <Text
                className="mb-2 text-center text-xl font-bold leading-snug text-gray-900"
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <View className="mb-2 h-px bg-gray-200" />
              {item.changes.map((change, index) => {
                const added = selectedKeys.has(changeKey(change));
                return (
                  <TouchableOpacity
                    key={`${change.from}-${change.to}-${index}`}
                    activeOpacity={0.6}
                    onPress={() => handleToggleChange(change)}
                    className={`flex-row flex-wrap items-center gap-x-2 rounded-lg px-2 py-2 ${index > 0 ? "mt-1.5 border-t border-gray-200 pt-2.5" : ""} ${added ? "bg-green-100" : ""}`}
                  >
                    <Text
                      className="shrink text-[15px] leading-snug text-gray-800"
                      numberOfLines={1}
                    >
                      {change.from}
                    </Text>
                    <Text className="shrink-0 text-sm text-gray-400">→</Text>
                    <Text
                      className="shrink text-[15px] leading-snug text-gray-800"
                      numberOfLines={1}
                    >
                      {change.to}
                    </Text>
                    <Text className="shrink-0 text-[15px] font-semibold tabular-nums text-gray-900">
                      · ${Number(change.price).toFixed(2)}
                    </Text>
                    <Check size={14} color={added ? "#15803d" : "transparent"} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />
      )}
    </SafeAreaViewWrapper>
  );
}
