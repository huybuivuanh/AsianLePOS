import SafeAreaViewWrapper from "@/components/layout/SafeAreaViewWrapper";
import { OrderItemCard } from "@/features/order";
import Header from "@/components/ui/Header";
import { useAuth } from "@/providers/AuthProvider";
import { useLiveOrdersStore } from "@/stores/useLiveOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import {
  calculateTaxBreakdown,
  convertOrderTimestamps,
  showAlert,
} from "@/utils/helpers";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function EditDinInOrder() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const router = useRouter();
  const { updateOrderOnFirestore, clearOrder, setOrder, setEditingOrder } =
    useOrderStore();

  const { user } = useAuth();

  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber),
  );

  const { dineInOrders } = useLiveOrdersStore();

  // ✅ Find the current order using table.currentOrderId
  const currentOrder = useMemo(() => {
    if (!table?.currentOrderId) return undefined;
    return dineInOrders.find(
      (o) => o.id === table.currentOrderId && o.status !== "completed",
    );
  }, [dineInOrders, table]);

  // ✅ Use LOCAL STATE for editing - no conflicts with order store
  const [localOrder, setLocalOrder] = useState<Partial<Order> | null>(null);

  // ✅ Initialize local order from Firestore on mount
  useEffect(() => {
    if (currentOrder) {
      const convertedOrder = convertOrderTimestamps(currentOrder);
      setLocalOrder(convertedOrder);
    } else {
      setLocalOrder(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder?.id]); // Only re-init if order ID changes

  // Local UI states
  const [submitting, setSubmitting] = useState(false);

  // Calculate tax breakdown from local order
  const taxBreakDown = useMemo(() => {
    if (!localOrder) return undefined;
    if (localOrder.taxBreakDown) return localOrder.taxBreakDown;
    const total = (localOrder.orderItems ?? []).reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
    return total > 0 ? calculateTaxBreakdown(total) : undefined;
  }, [localOrder]);

  // Handle order submission
  const handleSubmit = async () => {
    if (!user || !localOrder) {
      showAlert("Error", "You must be logged in to submit an order.");
      return;
    }

    try {
      const staff: User = {
        id: user.uid,
        name: user.displayName || "Unknown",
        email: user.email || undefined,
      };
      setSubmitting(true);

      // Create a clean order object with only the fields we need
      const cleanOrder: Partial<Order> = {
        id: localOrder.id,
        orderType: localOrder.orderType,
        orderItems: localOrder.orderItems,
        total: localOrder.total,
        taxBreakDown: localOrder.taxBreakDown,
        status: localOrder.status,
        paid: localOrder.paid,
        printed: localOrder.printed,
        tableNumber: localOrder.tableNumber,
        guests: localOrder.guests,
        readyTime: localOrder.readyTime,
        isPreorder: localOrder.isPreorder,
        preorderTime: localOrder.preorderTime,
        createdAt: localOrder.createdAt,
        staff,
      };

      await updateOrderOnFirestore(cleanOrder);
      clearOrder();
      setEditingOrder(false);
      router.replace({
        pathname: "/dinein/table/[tableNumber]",
        params: { tableNumber },
      });
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = () => {
    if (!localOrder) return;
    // Temporarily set order in store for item editing, then restore local state
    setOrder(localOrder);
    setEditingOrder(true);
    router.push("/live-orders/add-item");
  };

  // Sync: Keep store in sync with local order for OrderItemCard to work
  // OrderItemCard uses the store, so we need bidirectional sync
  const orderStoreOrder = useOrderStore((state) => state.order);
  const isSyncingRef = useRef(false);
  const prevLocalOrderItemsRef = useRef<string>("");
  const prevStoreOrderItemsRef = useRef<string>("");

  // Sync local to store (OrderItemCard needs store to work)
  // This ensures store always has the latest local state
  useEffect(() => {
    if (localOrder && localOrder.id) {
      const currentItemsStr = JSON.stringify(localOrder.orderItems || []);
      // Always sync if orderItems changed or if store doesn't have this order
      const needsSync =
        currentItemsStr !== prevLocalOrderItemsRef.current ||
        orderStoreOrder.id !== localOrder.id;

      if (needsSync && !isSyncingRef.current) {
        prevLocalOrderItemsRef.current = currentItemsStr;
        isSyncingRef.current = true;
        setOrder(localOrder);
        setEditingOrder(true);
        // Reset flag after a tick
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localOrder?.id, localOrder?.orderItems, orderStoreOrder.id]);

  // Sync store back to local when store is updated (from OrderItemCard or item editing)
  useEffect(() => {
    if (
      !isSyncingRef.current &&
      orderStoreOrder.id &&
      localOrder?.id === orderStoreOrder.id &&
      orderStoreOrder.orderItems
    ) {
      const storeItemsStr = JSON.stringify(orderStoreOrder.orderItems);
      // Only update if orderItems actually changed
      if (storeItemsStr !== prevStoreOrderItemsRef.current) {
        prevStoreOrderItemsRef.current = storeItemsStr;
        const localItemsStr = JSON.stringify(localOrder.orderItems || []);
        if (storeItemsStr !== localItemsStr) {
          isSyncingRef.current = true;
          // Create a clean copy of the order to avoid corruption
          const cleanOrder: Partial<Order> = {
            id: orderStoreOrder.id,
            orderType: orderStoreOrder.orderType,
            orderItems: orderStoreOrder.orderItems,
            total: orderStoreOrder.total,
            taxBreakDown: orderStoreOrder.taxBreakDown,
            status: orderStoreOrder.status,
            paid: orderStoreOrder.paid,
            printed: orderStoreOrder.printed,
            tableNumber: orderStoreOrder.tableNumber,
            guests: orderStoreOrder.guests,
            readyTime: orderStoreOrder.readyTime,
            isPreorder: orderStoreOrder.isPreorder,
            preorderTime: orderStoreOrder.preorderTime,
            createdAt: orderStoreOrder.createdAt,
            staff: orderStoreOrder.staff,
          };
          setLocalOrder(cleanOrder);
          prevLocalOrderItemsRef.current = storeItemsStr;
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 0);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderStoreOrder.id, orderStoreOrder.orderItems]);

  // Sync store back to local when returning from item editing page
  useFocusEffect(
    useCallback(() => {
      // Small delay to ensure store has been updated
      const timeoutId = setTimeout(() => {
        if (
          orderStoreOrder.id &&
          localOrder?.id === orderStoreOrder.id &&
          orderStoreOrder.orderItems &&
          !isSyncingRef.current
        ) {
          // Check if store has changes that need to be synced back
          const storeItemsStr = JSON.stringify(orderStoreOrder.orderItems);
          const localItemsStr = JSON.stringify(localOrder.orderItems || []);
          if (storeItemsStr !== localItemsStr) {
            isSyncingRef.current = true;
            setLocalOrder(orderStoreOrder);
            setTimeout(() => {
              isSyncingRef.current = false;
            }, 0);
          }
        }
      }, 100);

      return () => clearTimeout(timeoutId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderStoreOrder.id, orderStoreOrder.orderItems?.length]),
  );

  const isSubmitDisabled =
    submitting || (localOrder?.orderItems?.length ?? 0) === 0;

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      {/* Custom Header */}
      <Header
        title="Edit Order"
        onBack={() => {
          clearOrder();
          setEditingOrder(false);
          router.back();
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Add Item Button */}
        <View className="flex-row justify-center items-center p-4">
          <TouchableOpacity
            className="bg-orange-400 px-4 py-3 rounded-full w-80 mb-4 items-center"
            onPress={handleAddItem}
          >
            <Text className="text-white font-semibold">Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Items */}
        <KeyboardAwareScrollView
          className="flex-1 px-4"
          keyboardShouldPersistTaps="handled"
        >
          {!localOrder?.orderItems || localOrder.orderItems.length === 0 ? (
            <Text className="text-gray-500 text-center mt-10">
              Your order is empty.
            </Text>
          ) : (
            localOrder.orderItems.map((item, index) => (
              <OrderItemCard key={`${item.id}-${index}`} item={item} />
            ))
          )}
        </KeyboardAwareScrollView>

        <View className="flex-row justify-between items-center px-4 mb-2">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            className={`flex-1 bg-gray-800 py-4 rounded-lg items-center ${
              isSubmitDisabled ? "opacity-50" : ""
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                {`Submit Update - $${taxBreakDown?.grandTotal.toFixed(2) ?? "0.00"}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaViewWrapper>
  );
}
