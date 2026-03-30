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
  const orderId = useOrderStore((s) => s.order.id);
  const getTotalItems = useOrderStore((s) => s.getTotalItems);
  const getTaxBreakdown = useOrderStore((s) => s.getTaxBreakdown);
  const isUpdatingExistingOrder = Boolean(orderId);

  const totalItems = getTotalItems();
  const taxBreakDown = getTaxBreakdown();
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
            {isUpdatingExistingOrder
              ? `Submit Update - $${taxBreakDown?.total.toFixed(2) ?? "0.00"}`
              : ` Submit ${totalItems} Item(s) - $${taxBreakDown?.total.toFixed(2) ?? "0.00"}`}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
