import { useCartStore } from "@/stores/useCartStore";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import CustomerInfoForm from "./CustomerInfoForm";
import ReadyTimeSelector from "./ReadyTimeSelector";

interface Props {
  onSubmit: () => void;
  submitting: boolean;
  disabled: boolean;
  /** When set, used as the primary button label (instead of submit/update defaults). */
  submitLabel?: string;
}

export default function OrderFooter({
  onSubmit,
  submitting,
  disabled,
  submitLabel,
}: Props) {
  const orderId = useCartStore((s) => s.order.id);
  const getTotalItems = useCartStore((s) => s.getTotalItems);
  const getTaxBreakdown = useCartStore((s) => s.getTaxBreakdown);
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
        <Text className="text-white font-bold text-base">
          {submitting
            ? "Submitting…"
            : submitLabel ??
              (isUpdatingExistingOrder
                ? `Submit Update - $${taxBreakDown?.total.toFixed(2) ?? "0.00"}`
                : ` Submit ${totalItems} Item(s) - $${taxBreakDown?.total.toFixed(2) ?? "0.00"}`)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
