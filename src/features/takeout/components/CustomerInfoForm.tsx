import { useCustomersStore } from "@/stores/useCustomersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import {
  extractPhoneDigits,
  findBestCustomerByLast7,
  lastSevenDigits,
} from "@/utils/customerPhone";
import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function CustomerInfoForm() {
  const { order, updateOrder } = useOrderStore();
  const customers = useCustomersStore((s) => s.customers);

  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  const phoneDigits = useMemo(
    () => extractPhoneDigits(order.phoneNumber || ""),
    [order.phoneNumber],
  );

  const last7 = useMemo(
    () => lastSevenDigits(phoneDigits),
    [phoneDigits],
  );

  const matchedCustomer = useMemo(
    () => (last7 ? findBestCustomerByLast7(customers, last7) : undefined),
    [customers, last7],
  );

  const nameFieldEmpty = (order.customerName || "").trim().length === 0;

  /** Only suggest when phone already matches someone and name is still empty (phone typed first). */
  const showSuggestion =
    nameFieldEmpty &&
    Boolean(last7 && matchedCustomer && !suggestionDismissed);

  useEffect(() => {
    setSuggestionDismissed(false);
  }, [last7]);

  useEffect(() => {
    if (showSuggestion) {
      Keyboard.dismiss();
    }
  }, [showSuggestion]);

  const onYesUseSavedName = () => {
    if (!matchedCustomer) return;
    updateOrder({
      customerName: matchedCustomer.name.trim().toUpperCase(),
    });
    setSuggestionDismissed(true);
  };

  const onNoSuggestion = () => {
    setSuggestionDismissed(true);
  };

  return (
    <View className="mb-4 space-y-4">
      <View className="flex-row items-center">
        <Text className="w-32 font-medium text-gray-700">Customer Name</Text>
        <TextInput
          placeholder="Enter name"
          value={order.customerName || ""}
          onChangeText={(text) =>
            updateOrder({ customerName: text.toUpperCase() })
          }
          onSubmitEditing={() => Keyboard.dismiss()}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
        />
      </View>

      <View className="flex-row items-center">
        <Text className="w-32 font-medium text-gray-700">Phone Number</Text>
        <TextInput
          placeholder="Enter phone"
          keyboardType="number-pad"
          inputMode="numeric"
          value={order.phoneNumber || ""}
          onChangeText={(text) =>
            updateOrder({ phoneNumber: extractPhoneDigits(text) })
          }
          onSubmitEditing={() => Keyboard.dismiss()}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
        />
      </View>

      <Modal
        visible={showSuggestion}
        transparent
        animationType="fade"
        onRequestClose={onNoSuggestion}
      >
        <View className="flex-1 justify-center px-5">
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={onNoSuggestion}
            accessibilityLabel="Dismiss customer suggestion"
          />
          {matchedCustomer ? (
            <View className="relative z-10 w-full max-w-md self-center rounded-2xl border border-stone-200 bg-white px-5 py-6 shadow-2xl">
              <Text className="mb-1 text-center text-lg font-bold text-stone-900">
                Customer found
              </Text>
              <Text className="mb-6 text-center text-[15px] leading-6 text-stone-600">
                Use saved name{" "}
                <Text className="font-bold text-stone-900">
                  {matchedCustomer.name.trim().toUpperCase()}
                </Text>
                ?
              </Text>
              <View className="flex-row justify-center gap-3">
                <TouchableOpacity
                  className="min-w-[100px] flex-1 rounded-xl bg-emerald-600 py-3.5"
                  onPress={onYesUseSavedName}
                  activeOpacity={0.85}
                >
                  <Text className="text-center text-base font-bold text-white">
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="min-w-[100px] flex-1 rounded-xl bg-stone-200 py-3.5"
                  onPress={onNoSuggestion}
                  activeOpacity={0.85}
                >
                  <Text className="text-center text-base font-bold text-stone-800">
                    No
                  </Text>
                </TouchableOpacity>
              </View>
              <Text className="mt-4 text-center text-xs text-stone-500">
                Tap outside to dismiss. You can still submit the order without
                choosing.
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
