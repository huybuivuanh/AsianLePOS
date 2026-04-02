import { useOrderStore } from "@/stores/useOrderStore";
import { calculateDiscountAmount, orderItemsSubtotal } from "@/utils/helpers";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const DISCOUNT_TYPES: { type: DiscountType; label: string }[] = [
  { type: "none", label: "None" },
  { type: "amount", label: "$ Amount" },
  { type: "percent", label: "% Percent" },
];

export default function DiscountButtonModalAndSummary() {
  const { order, updateOrder } = useOrderStore();

  const committedType = order.discountType ?? "none";
  const committedValue = order.discountValue ?? 0;

  const itemsSubtotal = useMemo(
    () => orderItemsSubtotal(order.orderItems),
    [order.orderItems],
  );

  const committedDiscountAmount = useMemo(
    () => calculateDiscountAmount(itemsSubtotal, committedType, committedValue),
    [itemsSubtotal, committedType, committedValue],
  );

  const finalTotal = order.taxBreakDown?.total ?? 0;

  const [modalVisible, setModalVisible] = useState(false);
  const [draftType, setDraftType] = useState<DiscountType>(committedType);
  const [draftValueText, setDraftValueText] = useState(
    committedValue === 0 ? "" : String(committedValue),
  );

  useEffect(() => {
    if (!modalVisible) return;
    setDraftType(committedType);
    setDraftValueText(committedValue === 0 ? "" : String(committedValue));
  }, [modalVisible, committedType, committedValue]);

  const draftValue = useMemo(() => {
    const n = Number(draftValueText);
    if (!Number.isFinite(n)) return 0;
    return n;
  }, [draftValueText]);

  const draftDiscountAmount = useMemo(() => {
    return calculateDiscountAmount(itemsSubtotal, draftType, draftValue);
  }, [itemsSubtotal, draftType, draftValue]);

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  const apply = () => {
    if (draftType === "none") {
      updateOrder({ discountType: "none", discountValue: 0 });
      closeModal();
      return;
    }

    updateOrder({
      discountType: draftType,
      discountValue: draftValue,
    });
    closeModal();
  };

  return (
    <View className="mt-3 mb-3">
      {/* Row: Discount button */}
      <View className="flex-row justify-end mb-2">
        <TouchableOpacity
          onPress={openModal}
          className="px-4 py-2 rounded-full bg-gray-900"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold">
            Discount
            {committedDiscountAmount > 0
              ? ` (-$${committedDiscountAmount.toFixed(2)})`
              : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary: discount + final total */}
      <View className="bg-white border border-gray-200 rounded-2xl p-4">
        {committedDiscountAmount > 0 ? (
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600 font-medium">Discount</Text>
            <Text className="text-gray-900 font-bold">
              -${committedDiscountAmount.toFixed(2)}
            </Text>
          </View>
        ) : null}

        <View className="flex-row justify-between">
          <Text className="text-gray-700 font-semibold">Total</Text>
          <Text className="text-gray-900 font-bold text-lg">
            ${finalTotal.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Modal: edit discount */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={closeModal}
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            ...(Platform.OS === "web"
              ? ({ backdropFilter: "blur(8px)" } as any)
              : {}),
          }}
        >
          <View className="flex-1 justify-center px-4 pb-6">
            <TouchableOpacity
              activeOpacity={1}
              className="bg-white border border-gray-200 rounded-2xl p-4"
              onPress={(e: any) => e?.stopPropagation?.()}
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-gray-900 font-bold text-lg">
                  Discount
                </Text>
                <TouchableOpacity onPress={closeModal} className="px-2 py-1">
                  <Text className="text-gray-700 font-semibold">Close</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row flex-wrap mb-3">
                {DISCOUNT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.type}
                    onPress={() => setDraftType(t.type)}
                    className={`px-3 py-2 rounded-full mr-2 mb-2 ${
                      draftType === t.type
                        ? "bg-gray-900"
                        : "bg-white border border-gray-300"
                    }`}
                  >
                    <Text
                      className={`font-semibold text-sm ${
                        draftType === t.type ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row items-center mb-3">
                <Text className="text-gray-700 font-semibold w-20">
                  {draftType === "percent" ? "%" : "$"}
                </Text>
                <TextInput
                  value={draftValueText}
                  onChangeText={setDraftValueText}
                  keyboardType="decimal-pad"
                  placeholder={draftType === "percent" ? "0" : "0.00"}
                  editable={draftType !== "none"}
                  className={`flex-1 border rounded-lg px-3 py-2 ${
                    draftType === "none"
                      ? "border-gray-200 bg-gray-100"
                      : "border-gray-300 bg-white"
                  }`}
                />
              </View>

              <Text className="text-gray-600 mb-4">
                Discount preview: -${draftDiscountAmount.toFixed(2)}
              </Text>

              <View className="flex-row">
                <TouchableOpacity
                  onPress={closeModal}
                  className="flex-1 mr-2 py-3 rounded-lg bg-gray-200"
                >
                  <Text className="text-gray-800 text-center font-semibold">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={apply}
                  className="flex-1 ml-2 py-3 rounded-lg bg-gray-900"
                >
                  <Text className="text-white text-center font-semibold">
                    Apply
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
