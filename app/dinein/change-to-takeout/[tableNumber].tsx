import { OrderLinesList } from "@/features/order";
import DiscountButtonModalAndSummary from "@/features/order/components/DiscountButtonModalAndSummary";
import { OrderFooter } from "@/features/takeout";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useActiveDineInOrdersStore } from "@/stores/useActiveDineInOrdersStore";
import { useCustomersStore } from "@/stores/useCustomersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { OrderStatus, OrderType } from "@/types/enums";
import FullScreenLoadingOverlay from "@/ui/FullScreenLoadingOverlay";
import Header from "@/ui/Header";
import { convertOrderTimestamps, showAlert } from "@/utils/helpers";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
  type Href,
} from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
export default function ChangeDineInToTakeOutScreen() {
  const router = useRouter();
  const { tableNumber: tableNumberParam } = useLocalSearchParams<{
    tableNumber: string;
  }>();
  const tableNumber = Array.isArray(tableNumberParam)
    ? tableNumberParam[0]
    : tableNumberParam;

  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber),
  );
  const { activeDineInOrders } = useActiveDineInOrdersStore();
  const setOrder = useOrderStore((s) => s.setOrder);
  const updateOrder = useOrderStore((s) => s.updateOrder);
  const clearOrder = useOrderStore((s) => s.clearOrder);
  const convertDineInOrderToTakeOut = useOrderStore(
    (s) => s.convertDineInOrderToTakeOut,
  );
  const order = useOrderStore((s) => s.order);
  const getTaxBreakdown = useOrderStore((s) => s.getTaxBreakdown);

  const [submitting, setSubmitting] = useState(false);
  const [footerVisible, setFooterVisible] = useState(true);
  const hydratedOrderIdRef = useRef<string | null>(null);

  const currentOrder = useMemo(() => {
    if (!table?.currentOrderId) return undefined;
    return activeDineInOrders.find(
      (o) =>
        o.id === table.currentOrderId &&
        o.orderType === OrderType.DineIn &&
        o.status === OrderStatus.InProgress,
    );
  }, [activeDineInOrders, table]);

  useEffect(() => {
    if (!currentOrder?.id) return;
    if (hydratedOrderIdRef.current === currentOrder.id) return;
    hydratedOrderIdRef.current = currentOrder.id;
    setOrder(convertOrderTimestamps(currentOrder));
    updateOrder({ orderType: OrderType.TakeOut });
  }, [currentOrder, setOrder, updateOrder]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        clearOrder();
      };
    }, [clearOrder]),
  );

  const handleSubmit = async () => {
    if (!tableNumber || !currentOrder?.id) return;

    const o = useOrderStore.getState().order;
    if (!o.fulfillment) {
      showAlert("Error", "Choose ready time or pre-order.");
      return;
    }

    try {
      setSubmitting(true);
      await useCustomersStore.getState().syncTakeOutCustomerFromCart();
      await convertDineInOrderToTakeOut({
        orderId: currentOrder.id,
        tableNumber,
        customerName: o.customerName,
        phoneNumber: o.phoneNumber,
        fulfillment: o.fulfillment,
      });
      router.replace({
        pathname: "/(tabs)/take-out-orders",
        params: { orderId: currentOrder.id },
      } as unknown as Href);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Could not convert this order.";
      showAlert("Convert failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  const taxBreakDown = getTaxBreakdown();
  const isSubmitDisabled =
    submitting ||
    !currentOrder?.id ||
    (order.orderItems?.length ?? 0) === 0 ||
    (!order.customerName?.trim() && !order.phoneNumber?.trim());

  if (!tableNumber) {
    return (
      <SafeAreaViewWrapper className="flex-1 bg-white justify-center items-center p-6">
        <Text className="text-gray-600 text-center">Missing table.</Text>
      </SafeAreaViewWrapper>
    );
  }

  if (!currentOrder) {
    return (
      <SafeAreaViewWrapper className="flex-1 bg-white">
        <Header
          title="Change To Take Out"
          onBack={() => {
            clearOrder();
            router.back();
          }}
        />
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-gray-600 text-center text-base">
            No active dine-in order on this table.
          </Text>
        </View>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      <Header
        title="Change To Take Out"
        onBack={() => {
          if (submitting) return;
          clearOrder();
          router.back();
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <KeyboardAwareScrollView
          className="flex-1 px-4 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          <OrderLinesList orderItems={order.orderItems} />
          {order.orderItems && order.orderItems.length > 0 && (
            <DiscountButtonModalAndSummary />
          )}
        </KeyboardAwareScrollView>

        {order.orderItems && order.orderItems.length > 0 && (
          <TouchableOpacity
            onPress={() => setFooterVisible(!footerVisible)}
            disabled={submitting}
            className={`bg-orange-300 py-4 px-4 rounded-lg mx-4 mb-2 items-center ${
              submitting ? "opacity-50" : ""
            }`}
          >
            <Text className="text-gray-800 font-medium">
              {footerVisible ? "Hide Submit Section" : "Show Submit Section"}
            </Text>
          </TouchableOpacity>
        )}

        {footerVisible && order.orderItems && order.orderItems.length > 0 && (
          <OrderFooter
            onSubmit={handleSubmit}
            submitting={submitting}
            disabled={isSubmitDisabled}
            submitLabel={`Change To Take Out — $${taxBreakDown?.total.toFixed(2) ?? "0.00"}`}
          />
        )}
      </KeyboardAvoidingView>

      <FullScreenLoadingOverlay
        visible={submitting}
        title="Converting order…"
      />
    </SafeAreaViewWrapper>
  );
}
