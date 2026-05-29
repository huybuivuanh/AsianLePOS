import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useMenuChangesStore } from "@/stores/useMenuChangesStore";
import Header from "@/ui/Header";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import {
  ActivityIndicator,
  Text,
  TextInput,
  View,
} from "react-native";

export default function MenuChangesScreen() {
  const router = useRouter();
  const { menuChanges, loading, error, lastFetchedAt } = useMenuChangesStore();

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return menuChanges;
    return menuChanges.filter((row) => {
      const from = (row.from ?? "").toLowerCase();
      const to = (row.to ?? "").toLowerCase();
      return from.includes(q) || to.includes(q);
    });
  }, [menuChanges, query]);

  const showSpinner = loading && lastFetchedAt === null;

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      <Header title="Menu changes (preview)" onBack={() => router.back()} />

      <View className="px-4 pt-3 pb-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by from or to…"
          autoCorrect={false}
          autoCapitalize="none"
          className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-base"
          returnKeyType="search"
        />
      </View>

      {error ? (
        <View className="px-4 py-2">
          <Text className="text-center text-red-600">{error}</Text>
        </View>
      ) : null}

      {showSpinner ? (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="large" color="#007AFF" />
          <Text className="mt-2 text-gray-600">Loading…</Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item) =>
            item.id ?? `${item.from}-${item.to}-${item.price}`
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text className="py-8 text-center text-gray-500">
              {lastFetchedAt === null
                ? ""
                : query.trim()
                  ? "No matches for your search."
                  : "No menu changes in the catalog."}
            </Text>
          }
          renderItem={({ item }) => (
            <View className="mb-3 flex-row items-stretch rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3.5">
              <View className="min-w-0 flex-1 flex-row items-center gap-x-2.5">
                <Text
                  className="min-w-0 flex-1 text-base font-semibold leading-snug text-gray-900"
                  numberOfLines={2}
                >
                  {item.from}
                </Text>
                <Text className="shrink-0 px-0.5 text-base text-gray-400">
                  →
                </Text>
                <Text
                  className="min-w-0 flex-1 text-[15px] leading-snug text-gray-800"
                  numberOfLines={2}
                >
                  {item.to}
                </Text>
              </View>
              <View className="ml-3 min-w-[4.75rem] justify-center border-l border-gray-200 pl-3">
                <Text className="text-right text-base font-bold tabular-nums text-gray-900">
                  ${Number(item.price).toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaViewWrapper>
  );
}
