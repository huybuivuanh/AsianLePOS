import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enums";
import FullScreenLoadingOverlay from "@/ui/FullScreenLoadingOverlay";
import Header from "@/ui/Header";
import { showAlert } from "@/utils/helpers";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChangeTakeOutToDineInScreen() {
  const router = useRouter();
  const { orderId: orderIdParam } = useLocalSearchParams<{ orderId: string }>();
  const orderIdStr = Array.isArray(orderIdParam)
    ? orderIdParam[0]
    : orderIdParam;

  const { tables } = useTableStore();
  const convertTakeOutOrderToDineIn = useOrderStore(
    (s) => s.convertTakeOutOrderToDineIn,
  );

  const [submitting, setSubmitting] = useState(false);
  const [guestModalTable, setGuestModalTable] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);

  const openGuestModal = (tableNumber: string) => {
    setGuests(1);
    setGuestModalTable(tableNumber);
  };

  const closeGuestModal = () => {
    if (submitting) return;
    setGuestModalTable(null);
  };

  const handleConfirmGuests = async () => {
    if (!orderIdStr || !guestModalTable) return;
    if (guests < 1) {
      showAlert("Guests", "Enter at least one guest.");
      return;
    }

    const tableNumber = guestModalTable;
    const guestCount = guests;

    try {
      setSubmitting(true);
      setGuestModalTable(null);
      await convertTakeOutOrderToDineIn({
        orderId: orderIdStr,
        tableNumber,
        guests: guestCount,
      });
      router.replace("/tables");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Could not convert this order.";
      showAlert("Change type failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  const increaseGuests = () => setGuests((g) => g + 1);
  const decreaseGuests = () => setGuests((g) => Math.max(1, g - 1));

  if (!orderIdStr) {
    return (
      <SafeAreaViewWrapper className="flex-1 bg-gray-100 justify-center items-center p-6">
        <Text className="text-gray-600 text-center mb-4">Missing order.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-4 py-2 rounded-lg bg-gray-800"
        >
          <Text className="text-white font-semibold">Go back</Text>
        </TouchableOpacity>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper className="flex-1 bg-gray-100">
      <Header
        title="Change to dine in"
        onBack={() => {
          if (!submitting && !guestModalTable) router.back();
          else if (!submitting) closeGuestModal();
        }}
      />

      <Text className="px-4 pt-2 pb-1 text-sm text-gray-600">
        Choose an open table, then enter guest count.
      </Text>

      <FlatList
        data={tables}
        keyExtractor={(t) => t.tableNumber}
        numColumns={3}
        contentContainerStyle={{ padding: 8, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isSelectable =
            item.status === TableStatus.Open && !item.currentOrderId;
          const isOccupied =
            item.status === TableStatus.Occupied ||
            Boolean(item.currentOrderId);

          return (
            <TouchableOpacity
              activeOpacity={isSelectable && !submitting ? 0.75 : 1}
              disabled={!isSelectable || submitting}
              onPress={() => openGuestModal(item.tableNumber)}
              className={`flex-1 m-1.5 p-3 rounded-xl border-2 min-h-[104px] ${
                isOccupied && !isSelectable
                  ? "border-red-400 bg-red-100"
                  : isSelectable
                    ? "border-green-400 bg-green-50"
                    : "border-gray-200 bg-gray-100"
              }`}
            >
              <Text className="text-base font-bold text-gray-900">
                Table {item.tableNumber}
              </Text>
              {isOccupied && (
                <Text className="text-xs font-semibold text-red-700 mt-1">
                  Occupied
                </Text>
              )}
              {isSelectable && (
                <Text className="text-xs text-green-800 mt-1">Open</Text>
              )}
              <Text className="text-xs text-gray-600 mt-1">
                Guests: {item.guests}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={guestModalTable !== null}
        transparent
        animationType="fade"
        onRequestClose={closeGuestModal}
      >
        <View className="flex-1 justify-center items-center px-6">
          <Pressable
            style={StyleSheet.absoluteFill}
            className="bg-black/50"
            onPress={closeGuestModal}
          />
          <View className="w-full max-w-sm rounded-2xl bg-white p-6 border border-gray-200">
            <Text className="text-lg font-bold text-gray-900 text-center mb-1">
              Table {guestModalTable}
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-5">
              Number of guests
            </Text>

            <View className="flex-row items-center justify-center mb-6">
              <TouchableOpacity
                onPress={decreaseGuests}
                disabled={submitting || guests <= 1}
                className="w-12 h-12 rounded-full bg-gray-100 justify-center items-center border border-gray-200"
              >
                <Text className="text-2xl font-bold text-gray-700">−</Text>
              </TouchableOpacity>
              <Text className="mx-8 text-3xl font-bold text-gray-800">
                {guests}
              </Text>
              <TouchableOpacity
                onPress={increaseGuests}
                disabled={submitting}
                className="w-12 h-12 rounded-full bg-gray-100 justify-center items-center border border-gray-200"
              >
                <Text className="text-2xl font-bold text-gray-700">＋</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={closeGuestModal}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-gray-200"
              >
                <Text className="text-center font-semibold text-gray-800">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleConfirmGuests()}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-gray-900"
              >
                <Text className="text-center font-semibold text-white">
                  {submitting ? "Saving…" : "Confirm"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FullScreenLoadingOverlay
        visible={submitting}
        title="Updating order and table…"
        subtitle="This can take a few seconds."
      />
    </SafeAreaViewWrapper>
  );
}
