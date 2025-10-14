import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import CustomerInfoForm from "./CustomerInfoForm";
import ReadyTimeSelector from "./ReadyTimeSelector";

interface Props {
  onSubmit: () => void;
  submitting: boolean;
  disabled: boolean;
  totalItems: number;
  totalPrice: number;

  customerName: string;
  customerPhone: string;
  setCustomerName: (v: string) => void;
  setCustomerPhone: (v: string) => void;

  readyTime: number;
  setReadyTime: (v: number) => void;
  isPreorder: boolean;
  setIsPreorder: (v: boolean) => void;
  preorderDate: Date;
  setPreorderDate: (d: Date) => void;
}

export default function OrderFooter({
  onSubmit,
  submitting,
  disabled,
  totalItems,
  totalPrice,
  customerName,
  customerPhone,
  setCustomerName,
  setCustomerPhone,
  readyTime,
  setReadyTime,
  isPreorder,
  setIsPreorder,
  preorderDate,
  setPreorderDate,
}: Props) {
  return (
    <View className="p-4 bg-white border-t border-gray-200">
      <CustomerInfoForm
        name={customerName}
        phone={customerPhone}
        onChangeName={setCustomerName}
        onChangePhone={setCustomerPhone}
      />

      <ReadyTimeSelector
        readyTime={readyTime}
        onSelectReadyTime={setReadyTime}
        isPreorder={isPreorder}
        onTogglePreorder={setIsPreorder}
        preorderDate={preorderDate}
        onChangePreorderDate={setPreorderDate}
      />

      <TouchableOpacity
        onPress={onSubmit}
        disabled={disabled}
        className={`py-3 rounded-lg items-center ${
          disabled ? "bg-gray-500" : "bg-gray-800"
        }`}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-base">
            Submit {totalItems} Items - ${totalPrice.toFixed(2)}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
