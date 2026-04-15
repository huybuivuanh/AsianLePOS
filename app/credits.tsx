import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useCreditsStore } from "@/stores/useCreditsStore";
import Header from "@/ui/Header";
import { extractPhoneDigits } from "@/utils/customerPhone";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  View,
} from "react-native";

function matchesSearch(c: Credit, queryRaw: string): boolean {
  const q = queryRaw.trim().toLowerCase();
  if (!q) return true;

  const name = (c.name ?? "").toLowerCase();
  if (name.includes(q)) return true;

  const phone = c.phoneNumber ?? "";
  if (phone.toLowerCase().includes(q)) return true;

  const qDigits = extractPhoneDigits(queryRaw);
  if (qDigits.length >= 1) {
    const phoneDigits = extractPhoneDigits(phone);
    if (phoneDigits.includes(qDigits)) return true;
  }

  return false;
}

export default function CreditsPreviewScreen() {
  const router = useRouter();
  const { credits, loading, error, hasFetched } = useCreditsStore();

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return credits.filter((c) => matchesSearch(c, query));
  }, [credits, query]);

  const showSpinner = loading && !hasFetched;

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      <Header title="Credits (preview)" onBack={() => router.back()} />

      <View className="px-4 pt-3 pb-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or phone…"
          autoCorrect={false}
          autoCapitalize="none"
          className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-base"
          returnKeyType="search"
          keyboardType="default"
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
        <FlatList
          data={filtered}
          keyExtractor={(item) =>
            item.id ?? `${item.name}-${item.phoneNumber}-${item.amount}`
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text className="py-8 text-center text-gray-500">
              {!hasFetched
                ? ""
                : query.trim()
                  ? "No matches for your search."
                  : "No credits in the catalog."}
            </Text>
          }
          renderItem={({ item }) => (
            <View className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3.5">
              <View className="flex-row items-start justify-between gap-3">
                <Text
                  className="min-w-0 flex-1 text-base font-semibold leading-snug text-gray-900"
                  numberOfLines={2}
                >
                  {item.name?.trim() || "—"}
                </Text>
                <Text className="shrink-0 text-base font-bold tabular-nums text-gray-900">
                  ${Number(item.amount).toFixed(2)}
                </Text>
              </View>
              {item.phoneNumber ? (
                <Text className="mt-2 text-[15px] text-gray-700">
                  {item.phoneNumber}
                </Text>
              ) : null}
              <View className="mt-2 flex-row items-center">
                <View
                  className={`rounded-full px-2.5 py-1 ${
                    item.completed ? "bg-emerald-100" : "bg-amber-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      item.completed ? "text-emerald-800" : "text-amber-900"
                    }`}
                  >
                    {item.completed ? "Completed" : "Open"}
                  </Text>
                </View>
              </View>
              {item.description?.trim() ? (
                <Text className="mt-2 border-t border-gray-200 pt-2 text-[15px] leading-snug text-gray-600">
                  {item.description.trim()}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}
    </SafeAreaViewWrapper>
  );
}
