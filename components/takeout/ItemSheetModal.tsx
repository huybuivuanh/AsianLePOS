import { useMenuStore } from "@/stores/useMenuStore";
import { OrderType } from "@/types/enum";
import { generateFirestoreId } from "@/utils/utils";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AddExtraEditor } from "./AddExtraEditor";
import { ItemChangeEditor } from "./ItemChangeEditor";
import SpecialFlagsSelector from "./SpecialFlagsSelector";

type Props = {
  item: MenuItem;
  orderType: OrderType;
  onSubmit: (orderItem: OrderItem) => void;
  onClose: () => void;
};

export default function ItemSheetModal({
  item,
  orderType,
  onSubmit,
  onClose,
}: Props) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string[]>
  >({});
  const [extras, setExtras] = useState<AddExtra[]>([]);
  const [changes, setChanges] = useState<ItemChange[]>([]);
  const [specialFlag, setSpecialFlag] = useState<"appetizer" | "toGo" | null>(
    null
  );
  const [footerHeight, setFooterHeight] = useState(0);

  const { optionGroups, options } = useMenuStore();

  useEffect(() => {
    bottomSheetRef.current?.present();
  }, []);

  // Reset modal state on new item
  useEffect(() => {
    setQuantity(1);
    setInstructions("");
    setSelectedOptions({});
  }, [item]);

  // Toggle option selection
  const toggleOption = (group: OptionGroup, option: ItemOption) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id!] || [];
      let updated: string[];

      if (group.maxSelection === 1) {
        updated = [option.id!];
      } else {
        if (current.includes(option.id!)) {
          updated = current.filter((id) => id !== option.id!);
        } else {
          if (group.maxSelection && current.length >= group.maxSelection)
            return prev;
          updated = [...current, option.id!];
        }
      }

      return { ...prev, [group.id!]: updated };
    });
  };

  const handleSubmit = () => {
    if (!item || !options || !optionGroups) return;

    const groups =
      (item.optionGroupIds
        ?.map((id) => optionGroups.find((g) => g.id === id))
        .filter(Boolean) as OptionGroup[]) || [];

    for (const group of groups) {
      const selectedCount = selectedOptions[group.id!]?.length || 0;
      if (selectedCount < group.minSelection) {
        Alert.alert(
          "Selection required",
          `Please select at least ${group.minSelection} option(s) for "${group.name}"`
        );
        return;
      }
    }

    const optionsToSubmit: ItemOption[] = [];
    Object.entries(selectedOptions).forEach(([groupId, optionIds]) => {
      optionIds.forEach((optId) => {
        const option = options.find((o) => o.id === optId);
        if (option) optionsToSubmit.push(option);
      });
    });

    const extrasTotal = extras.reduce((sum, e) => sum + (e.price || 0), 0);
    const changesTotal = changes.reduce((sum, c) => sum + (c.price || 0), 0);

    const orderItemPrice =
      (item.price || 0) +
      optionsToSubmit.reduce((acc, o) => acc + (o.price || 0), 0) +
      extrasTotal +
      changesTotal;

    const cleanItem: OrderItem = {
      id: generateFirestoreId(),
      name: item.name,
      togo: specialFlag === "toGo",
      appetizer: specialFlag === "appetizer",
      kitchenType: item.kitchenType,
      price: orderItemPrice,
      quantity,
      ...(instructions !== "" && { instructions }),
      ...(optionsToSubmit.length > 0 && { options: optionsToSubmit }),
      ...(extras.length > 0 && { extras }),
      ...(changes.length > 0 && { changes }),
    };

    onSubmit(cleanItem);

    bottomSheetRef.current?.dismiss();
    onClose();
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={["95%"]}
      enablePanDownToClose
      onDismiss={() => {
        onClose();
        // cleanup — ensure modal state is cleared from zustand
        setTimeout(() => bottomSheetRef.current?.dismiss(), 0);
      }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1">
          {/* Scrollable content */}
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: 16,
              paddingBottom: footerHeight + 32,
            }}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold flex-1">{item.name}</Text>
              <TouchableOpacity
                onPress={() => bottomSheetRef.current?.dismiss()}
                className="w-9 h-9 rounded-full bg-gray-100 justify-center items-center"
              >
                <X size={20} color="black" />
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            <Text className="text-base mb-2">Special instructions:</Text>
            <BottomSheetTextInput
              className="border border-gray-300 rounded-lg p-3 mb-4 min-h-[80px]"
              placeholder="Add instructions..."
              multiline
              value={instructions}
              onChangeText={setInstructions}
            />

            {/* Option Groups */}
            {item.optionGroupIds?.map((groupId) => {
              const group = optionGroups.find((g) => g.id === groupId);
              if (!group) return null;

              return (
                <View key={group.id} className="mb-4">
                  <View className="flex-row items-center mb-3">
                    <Text className="text-2xl font-semibold text-gray-800">
                      {group.name}
                    </Text>
                    {group.minSelection > 0 && (
                      <Text className="ml-2 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        Required
                      </Text>
                    )}
                  </View>

                  {group.optionIds?.map((optionId) => {
                    const option = options.find((o) => o.id === optionId);
                    if (!option) return null;

                    const isSelected = selectedOptions[group.id!]?.includes(
                      option.id!
                    );

                    return (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => toggleOption(group, option)}
                        className={`py-2 px-3 mb-2 rounded-lg border ${
                          isSelected
                            ? "border-blue-600 bg-blue-100"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        <Text className="text-base">
                          {option.name}{" "}
                          {option.price > 0 && `- $${option.price.toFixed(2)}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}

            <AddExtraEditor extras={extras} onChange={setExtras} />
            <ItemChangeEditor changes={changes} onChange={setChanges} />
            {orderType === OrderType.DineIn && (
              <SpecialFlagsSelector
                selected={specialFlag}
                onChange={setSpecialFlag}
              />
            )}
          </BottomSheetScrollView>

          {/* Sticky footer */}
          <View
            onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
            className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10"
          >
            {/* Quantity Stepper */}
            <View className="flex-row justify-center items-center mb-4">
              <TouchableOpacity
                className="w-14 h-14 rounded-full bg-gray-200 justify-center items-center"
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Text className="text-2xl font-bold">−</Text>
              </TouchableOpacity>

              <Text className="mx-6 text-2xl font-semibold">{quantity}</Text>

              <TouchableOpacity
                className="w-14 h-14 rounded-full bg-gray-200 justify-center items-center"
                onPress={() => setQuantity((q) => q + 1)}
              >
                <Text className="text-2xl font-bold">＋</Text>
              </TouchableOpacity>
            </View>

            {/* Add to Order Button */}
            <TouchableOpacity
              className="bg-gray-800 py-4 rounded-lg items-center w-full"
              onPress={handleSubmit}
            >
              <Text className="text-white font-bold text-lg">Add to Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
}
