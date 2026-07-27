import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useAddExtrasStore } from "@/stores/useAddExtrasStore";
import {
  extraKey,
  usePendingExtrasStore,
} from "@/stores/usePendingExtrasStore";
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

export default function AddExtrasScreen() {
  const router = useRouter();
  const { existingExtras: existingExtrasParam } = useLocalSearchParams<{
    existingExtras?: string;
  }>();
  const { addExtras, loading } = useAddExtrasStore();
  const additions = usePendingExtrasStore((s) => s.additions);
  const removals = usePendingExtrasStore((s) => s.removals);
  const toggleAddition = usePendingExtrasStore((s) => s.toggleAddition);
  const toggleRemoval = usePendingExtrasStore((s) => s.toggleRemoval);

  const [query, setQuery] = useState("");

  const existingExtras = useMemo<AddExtra[]>(() => {
    const raw = Array.isArray(existingExtrasParam)
      ? existingExtrasParam[0]
      : existingExtrasParam;
    if (!raw) return [];
    try {
      return JSON.parse(raw) as AddExtra[];
    } catch {
      return [];
    }
  }, [existingExtrasParam]);
  const existingKeys = useMemo(
    () => new Set(existingExtras.map(extraKey)),
    [existingExtras],
  );

  // Selected = (was on the item already, minus anything toggled off) plus anything newly added.
  const selectedKeys = useMemo(() => {
    const removedKeys = new Set(removals.map(extraKey));
    const base = existingExtras
      .filter((e) => !removedKeys.has(extraKey(e)))
      .map(extraKey);
    return new Set([...base, ...additions.map(extraKey)]);
  }, [existingExtras, additions, removals]);

  const handleToggleExtra = (extra: AddExtra) => {
    if (existingKeys.has(extraKey(extra))) {
      toggleRemoval(extra);
    } else {
      toggleAddition(extra);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return addExtras;
    return addExtras.filter((row) =>
      row.description.toLowerCase().includes(q),
    );
  }, [addExtras, query]);

  const showSpinner = loading;

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      <Header title="Add extras" onBack={() => router.back()} />

      <View className="px-4 pt-3 pb-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by description…"
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
          keyExtractor={(item, index) => item.id ?? `${item.description}-${index}`}
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
                  : "No extras in the catalog."}
            </Text>
          }
          renderItem={({ item }) => {
            const added = selectedKeys.has(extraKey(item));
            return (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => handleToggleExtra(item)}
                className={`mb-3 flex-row flex-wrap items-center gap-x-2 rounded-xl border border-gray-200 px-3.5 py-3.5 ${added ? "bg-green-100" : "bg-gray-50"}`}
              >
                <Text
                  className="shrink flex-1 text-[15px] leading-snug text-gray-800"
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
                <Text className="shrink-0 text-[15px] font-semibold tabular-nums text-gray-900">
                  ${Number(item.price).toFixed(2)}
                </Text>
                <Check size={14} color={added ? "#15803d" : "transparent"} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaViewWrapper>
  );
}
