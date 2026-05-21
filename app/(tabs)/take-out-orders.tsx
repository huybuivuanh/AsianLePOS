import CashPaymentModal from "@/features/dinein/CashPaymentModal";
import { TakeOutOrderCard } from "@/features/takeout/components/TakeOutOrderCard";
import { useTakeOutOrderActions } from "@/features/takeout/hooks/useTakeOutOrderActions";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useTakeOutOrdersStore } from "@/stores/useTakeOutOrdersStore";
import FullScreenLoadingOverlay from "@/ui/FullScreenLoadingOverlay";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";

const EMPTY_SELECTED_IDS = new Set<string>();

const FLASH_LIST_STYLE = {
  flex: 1,
  minHeight: 0,
  width: "100%" as const,
  alignSelf: "stretch" as const,
  paddingTop: 6,
};

const FLASH_LIST_CONTENT_STYLE = {
  flexGrow: 1,
  alignSelf: "stretch" as const,
  width: "100%" as const,
};

export default function TakeOutOrdersTab() {
  const {
    takeOutOrders,
    loading,
    loadingMore,
    hasMore,
    loadTakeOutOrders,
    loadMoreOrders,
    refreshTakeOutOrders,
  } = useTakeOutOrdersStore();

  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderIdParam = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;

  const {
    actionOverlay,
    expandedOrderId,
    setExpandedOrderId,
    selectionMode,
    selectedItemIds,
    cashPaymentOrderId,
    cashPaymentModalTotal,
    extraData,
    toggleExpand,
    handleComplete,
    handleCancel,
    handlePrint,
    handleToggleSelectionMode,
    handleToggleItemSelection,
    handlePrintSelected,
    handleMarkAsPaid,
    handleEditOrder,
    handleOpenCashPayment,
    handleCloseCashPayment,
    handleChangeToDineIn,
  } = useTakeOutOrderActions(takeOutOrders);

  useEffect(() => {
    loadTakeOutOrders();
  }, [loadTakeOutOrders]);

  useEffect(() => {
    if (!orderIdParam) return;
    setExpandedOrderId(orderIdParam);
    void refreshTakeOutOrders();
  }, [orderIdParam, refreshTakeOutOrders, setExpandedOrderId]);

  const renderOrder = useCallback(
    ({ item }: { item: TakeOutOrder }) => {
      const isSelectionMode = selectionMode === item.id;
      return (
        <TakeOutOrderCard
          item={item}
          expanded={expandedOrderId === item.id}
          isSelectionMode={isSelectionMode}
          selectedItemIds={isSelectionMode ? selectedItemIds : EMPTY_SELECTED_IDS}
          onToggleExpand={toggleExpand}
          onComplete={handleComplete}
          onCancel={handleCancel}
          onPrint={handlePrint}
          onToggleSelectionMode={handleToggleSelectionMode}
          onToggleItemSelection={handleToggleItemSelection}
          onPrintSelected={handlePrintSelected}
          onMarkAsPaid={handleMarkAsPaid}
          onEditOrder={handleEditOrder}
          onOpenCashPayment={handleOpenCashPayment}
          onChangeToDineIn={handleChangeToDineIn}
        />
      );
    },
    [
      expandedOrderId, selectionMode, selectedItemIds,
      toggleExpand, handleComplete, handleCancel, handlePrint,
      handleToggleSelectionMode, handleToggleItemSelection, handlePrintSelected,
      handleMarkAsPaid, handleEditOrder, handleOpenCashPayment, handleChangeToDineIn,
    ],
  );

  if (loading) {
    return (
      <SafeAreaViewWrapper className="flex-1 justify-center items-center bg-white" includeBottomInset={false}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-2 text-gray-600">Loading take out orders...</Text>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper className="flex-1 p-4" includeBottomInset={false}>
      {takeOutOrders.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">No takeout orders yet.</Text>
        </View>
      ) : (
        <FlashList
          style={FLASH_LIST_STYLE}
          contentContainerStyle={FLASH_LIST_CONTENT_STYLE}
          keyboardShouldPersistTaps="always"
          data={takeOutOrders}
          keyExtractor={(item, index) => item.id ?? `order-${index}`}
          renderItem={renderOrder}
          extraData={extraData}
          refreshing={loading}
          onRefresh={refreshTakeOutOrders}
          onEndReached={() => { if (hasMore && !loadingMore) loadMoreOrders(); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4">
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            ) : null
          }
        />
      )}

      {cashPaymentOrderId !== null && (
        <CashPaymentModal
          onClose={handleCloseCashPayment}
          orderTotal={cashPaymentModalTotal}
        />
      )}

      <FullScreenLoadingOverlay
        visible={Boolean(actionOverlay)}
        title={actionOverlay?.title ?? ""}
      />
    </SafeAreaViewWrapper>
  );
}
