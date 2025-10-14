import { useMenuStore } from "@/stores/useMenuStore";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";

type Props = {
  item: MenuItem;
  onSubmit: (orderItem: OrderItem) => void;
  onClose: () => void;
};

export default function ItemSheetModal({ item, onSubmit, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string[]>
  >({});

  const { optionGroups, options } = useMenuStore();

  // Reset modal state on new item
  useEffect(() => {
    setQuantity(1);
    setInstructions("");
    setSelectedOptions({});
    bottomSheetRef.current?.present();
  }, [item]);

  // Toggle option selection
  const toggleOption = (group: OptionGroup, option: ItemOption) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id!] || [];
      let updated: string[];

      if (group.maxSelection === 1) {
        // Radio button behavior: selecting a new option replaces the old one
        updated = [option.id!];
      } else {
        // Multi-select behavior
        if (current.includes(option.id!)) {
          updated = current.filter((id) => id !== option.id!);
        } else {
          // Enforce maxSelection
          if (group.maxSelection && current.length >= group.maxSelection) {
            return prev; // do nothing if max reached
          }
          updated = [...current, option.id!];
        }
      }

      return { ...prev, [group.id!]: updated };
    });
  };

  const handleSubmit = () => {
    if (!item || !options || !optionGroups) return;

    // Validate minSelection
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

    // Flatten selected options
    const optionsToSubmit: ItemOption[] = [];
    Object.entries(selectedOptions).forEach(([groupId, optionIds]) => {
      optionIds.forEach((optId) => {
        const option = options.find((o) => o.id === optId);
        if (option) optionsToSubmit.push(option);
      });
    });

    const orderItemPrice =
      optionsToSubmit.reduce((acc, option) => acc + (option.price || 0), 0) +
      (item.price || 0);

    const cleanItem: OrderItem = {
      item: item,
      price: orderItemPrice,
      quantity: quantity,
      ...(instructions !== "" && { instructions }),
      ...(optionsToSubmit.length > 0 && { options: optionsToSubmit }),
    };

    onSubmit(cleanItem);

    bottomSheetRef.current?.dismiss();
    onClose();
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={["90%"]}
      enablePanDownToClose
      onDismiss={onClose}
    >
      <View className="flex-1">
        {/* Scrollable content */}
        <BottomSheetScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: Platform.OS === "ios" ? 180 : 160, // leave room for footer
            flexGrow: 1,
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
        </BottomSheetScrollView>

        {/* Fixed footer: quantity + submit */}
        <View className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-white border-t border-gray-200">
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
    </BottomSheetModal>
  );
}
