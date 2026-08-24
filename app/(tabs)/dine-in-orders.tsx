import { DineInOrderCard } from "@/features/dinein/components/DineInOrderCard";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useDineInOrdersStore } from "@/stores/useDineInOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import FullScreenLoadingOverlay from "@/ui/FullScreenLoadingOverlay";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

const EMPTY_SELECTED_IDS = new Set<string>();

export default function DineInOrdersTab() {
  const {
    dineInOrders,
    loading,
    loadingMore,
    hasMore,
    loadDineInOrders,
    loadMoreOrders,
    refreshDineInOrders,
  } = useDineInOrdersStore();

  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderIdParam = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;

  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(
    () => new Set(orderIdParam ? [orderIdParam] : []),
  );
  const [selectionMode, setSelectionMode] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [actionOverlay, setActionOverlay] = useState<{ title: string } | null>(null);

  const { markOrderAsPaid, submitToPrintQueue, submitSelectedItemsToPrintQueue } = useOrderStore();

  useEffect(() => { loadDineInOrders(); }, [loadDineInOrders]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handlePrint = useCallback(
    async (order: DineInOrder) => {
      try {
        setActionOverlay({ title: "Sending to printer…" });
        await submitToPrintQueue(order);
      } catch (e) { console.error("❌ Error submitting to print queue:", e); } finally { setActionOverlay(null); }
    },
    [submitToPrintQueue],
  );

  const handleToggleSelectionMode = useCallback((orderId: string) => {
    setSelectionMode((prev) => (prev === orderId ? null : orderId));
    setSelectedItemIds(new Set());
  }, []);

  const handleToggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  }, []);

  const handlePrintSelected = useCallback(
    async (order: DineInOrder) => {
      try {
        setActionOverlay({ title: "Sending to printer…" });
        await submitSelectedItemsToPrintQueue(order, Array.from(selectedItemIds));
        setSelectionMode(null);
        setSelectedItemIds(new Set());
      } catch (e) { console.error("❌ Error printing selected items:", e); } finally { setActionOverlay(null); }
    },
    [submitSelectedItemsToPrintQueue, selectedItemIds],
  );

  const handleMarkAsPaid = useCallback(
    async (order: DineInOrder, paid: boolean) => {
      try { await markOrderAsPaid(order, paid); } catch (e) { console.error("❌ Error marking order as paid:", e); }
    },
    [markOrderAsPaid],
  );

  const extraData = useMemo(
    () => ({ expandedOrderIds, selectionMode, selectedItemIdsSize: selectedItemIds.size }),
    [expandedOrderIds, selectionMode, selectedItemIds.size],
  );

  const renderOrder = useCallback(
    ({ item }: { item: DineInOrder }) => {
      const isSelectionMode = selectionMode === item.id;
      return (
        <DineInOrderCard
          item={item}
          expanded={Boolean(item.id && expandedOrderIds.has(item.id))}
          isSelectionMode={isSelectionMode}
          selectedItemIds={isSelectionMode ? selectedItemIds : EMPTY_SELECTED_IDS}
          onToggleExpand={toggleExpand}
          onPrint={handlePrint}
          onToggleSelectionMode={handleToggleSelectionMode}
          onToggleItemSelection={handleToggleItemSelection}
          onPrintSelected={handlePrintSelected}
          onMarkAsPaid={handleMarkAsPaid}
        />
      );
    },
    [
      expandedOrderIds, selectionMode, selectedItemIds,
      toggleExpand, handlePrint, handleToggleSelectionMode, handleToggleItemSelection,
      handlePrintSelected, handleMarkAsPaid,
    ],
  );

  if (loading) {
    return (
      <SafeAreaViewWrapper className="flex-1 justify-center items-center bg-white" includeBottomInset={false}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-2 text-gray-600">Loading dine in orders...</Text>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper className="flex-1 p-4" includeBottomInset={false}>
      {dineInOrders.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">No dine in orders yet.</Text>
        </View>
      ) : (
        <FlashList
          style={{ flex: 1, minHeight: 0, width: "100%", alignSelf: "stretch", paddingTop: 6 }}
          contentContainerStyle={{ flexGrow: 1, alignSelf: "stretch", width: "100%" }}
          keyboardShouldPersistTaps="always"
          data={dineInOrders}
          keyExtractor={(item, index) => item.id ?? `order-${index}`}
          renderItem={renderOrder}
          extraData={extraData}
          refreshing={loading}
          onRefresh={refreshDineInOrders}
          onEndReached={() => { if (hasMore && !loadingMore) loadMoreOrders(); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4"><ActivityIndicator size="small" color="#007AFF" /></View>
            ) : null
          }
        />
      )}
      <FullScreenLoadingOverlay
        visible={Boolean(actionOverlay)}
        title={actionOverlay?.title ?? "Please wait…"}
      />
    </SafeAreaViewWrapper>
  );
}
