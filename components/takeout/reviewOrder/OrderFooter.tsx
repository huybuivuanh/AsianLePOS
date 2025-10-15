import { useOrderStore } from "@/stores/useOrderStore";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import CustomerInfoForm from "./CustomerInfoForm";
import ReadyTimeSelector from "./ReadyTimeSelector";

interface Props {
  onSubmit: () => void;
  submitting: boolean;
  disabled: boolean;
}

export default function OrderFooter({ onSubmit, submitting, disabled }: Props) {
  const { editingOrder, getTotalItems, getOrderTotal } = useOrderStore();

  const totalItems = getTotalItems();
  const totalPrice = getOrderTotal();

  return (
    <View className="p-4 bg-white border-t border-gray-200">
      {/* These components now read/write from the store directly */}
      <CustomerInfoForm />
      <ReadyTimeSelector />

      <TouchableOpacity
        onPress={onSubmit}
        disabled={disabled}
        className={`py-3 rounded-lg items-center ${
          disabled ? "bg-gray-300" : "bg-gray-800"
        }`}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-base">
            {editingOrder
              ? "Submit Update"
              : ` Submit ${totalItems} Item(s) - $${totalPrice.toFixed(2)}`}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
