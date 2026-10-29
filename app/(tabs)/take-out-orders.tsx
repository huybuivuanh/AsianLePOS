import CashPaymentModal from "@/features/dinein/CashPaymentModal";
import RewardsModal from "@/features/order/components/RewardsModal";
import { openRewardsMember } from "@/features/rewards/rewardsNavigation";
import { OnlineOrderCard } from "@/features/takeout/components/OnlineOrderCard";
import { TakeOutOrderCard } from "@/features/takeout/components/TakeOutOrderCard";
import {
  isOnlineOrder,
  type TakeOutListItem,
  useTakeOutHistoryList,
} from "@/features/takeout/hooks/useTakeOutHistoryList";
import { useTakeOutOrderActions } from "@/features/takeout/hooks/useTakeOutOrderActions";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useTakeOutOrdersStore } from "@/stores/useTakeOutOrdersStore";
import FullScreenLoadingOverlay from "@/ui/FullScreenLoadingOverlay";
import { FlashList } from "@shopify/flash-list";
import { OrderType } from "@/types/enums";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
    fullTakeOutOrders,
    loading,
    loadTakeOutOrders,
    refreshTakeOutOrders,
  } = useTakeOutOrdersStore();
  // POS take-out orders + read-only online orders, newest first.
  const { items, hasMore, loadMore } = useTakeOutHistoryList();

  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderIdParam = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;

  const {
    actionOverlay,
    expandedOrderIds,
    expandOrder,
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
  } = useTakeOutOrderActions(fullTakeOutOrders);

  const [rewardsOrderId, setRewardsOrderId] = useState<string | null>(null);
  const handleCloseRewards = useCallback(() => setRewardsOrderId(null), []);
  const router = useRouter();
  const handleOpenRewards = useCallback(
    (order: TakeOutOrder) => {
      if (!order.id) return;
      // Member already linked (redeemed earlier): skip scanning.
      if (order.loyalty?.memberId) {
        openRewardsMember(router, order.id, OrderType.TakeOut, {
          memberId: order.loyalty.memberId,
        });
      } else {
        setRewardsOrderId(order.id);
      }
    },
    [router],
  );

  useEffect(() => {
    loadTakeOutOrders();
  }, [loadTakeOutOrders]);

  useEffect(() => {
    if (!orderIdParam) return;
    expandOrder(orderIdParam);
    void refreshTakeOutOrders();
  }, [orderIdParam, refreshTakeOutOrders, expandOrder]);

  const renderOrder = useCallback(
    ({ item }: { item: TakeOutListItem }) => {
      if (isOnlineOrder(item)) {
        return (
          <OnlineOrderCard
            item={item}
            expanded={expandedOrderIds.has(item.id)}
            onToggleExpand={toggleExpand}
          />
        );
      }
      const isSelectionMode = selectionMode === item.id;
      return (
        <TakeOutOrderCard
          item={item}
          expanded={Boolean(item.id && expandedOrderIds.has(item.id))}
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
          onOpenRewards={handleOpenRewards}
        />
      );
    },
    [
      expandedOrderIds, selectionMode, selectedItemIds,
      toggleExpand, handleComplete, handleCancel, handlePrint,
      handleToggleSelectionMode, handleToggleItemSelection, handlePrintSelected,
      handleMarkAsPaid, handleEditOrder, handleOpenCashPayment, handleChangeToDineIn,
      handleOpenRewards,
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
      {items.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">No takeout orders yet.</Text>
        </View>
      ) : (
        <FlashList
          style={FLASH_LIST_STYLE}
          contentContainerStyle={FLASH_LIST_CONTENT_STYLE}
          keyboardShouldPersistTaps="always"
          data={items}
          keyExtractor={(item, index) =>
            isOnlineOrder(item) ? `online-${item.id}` : (item.id ?? `order-${index}`)
          }
          getItemType={(item) => (isOnlineOrder(item) ? "online" : "pos")}
          renderItem={renderOrder}
          extraData={extraData}
          refreshing={loading}
          onRefresh={refreshTakeOutOrders}
          onEndReached={() => { if (hasMore) loadMore(); }}
          onEndReachedThreshold={0.5}
        />
      )}

      {rewardsOrderId !== null && (
        <RewardsModal
          orderId={rewardsOrderId}
          orderType={OrderType.TakeOut}
          onClose={handleCloseRewards}
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
