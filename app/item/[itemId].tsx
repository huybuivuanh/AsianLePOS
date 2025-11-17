import SafeAreaViewWrapper from "@/components/SafeAreaViewWrapper";
import AddExtraEditor from "@/components/takeout/AddExtraEditor";
import ItemChangeEditor from "@/components/takeout/ItemChangeEditor";
import SpecialFlagsSelector from "@/components/takeout/SpecialFlagsSelector";
import Header from "@/components/ui/Header";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderType } from "@/types/enum";
import { generateFirestoreId } from "@/utils/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Item() {
  const router = useRouter();
  const { itemId, orderType, orderItemId } = useLocalSearchParams();
  const { menuItems, optionGroups, options } = useMenuStore();
  const { addItem, updateOrderItem, order } = useOrderStore();
  const item = menuItems.find((i) => i.id === itemId);
  const orderItemIdStr = Array.isArray(orderItemId)
    ? orderItemId[0]
    : orderItemId;
  const isEditMode = !!orderItemIdStr;

  // Find the existing order item if in edit mode
  const existingOrderItem = isEditMode
    ? order.orderItems?.find((oi) => oi.id === orderItemIdStr)
    : null;

  const [quantity, setQuantity] = useState(existingOrderItem?.quantity ?? 1);
  const [instructions, setInstructions] = useState(
    existingOrderItem?.instructions ?? ""
  );
  // State: Record<groupId, Record<optionId, quantity>>
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, Record<string, number>>
  >(() => {
    if (!existingOrderItem?.options || !optionGroups) return {};
    const selected: Record<string, Record<string, number>> = {};
    existingOrderItem.options.forEach((opt) => {
      // Find which group this option belongs to by matching name and price
      optionGroups.forEach((group) => {
        if (group.optionIds) {
          const matchingOption = options?.find(
            (o) => o.name === opt.name && o.price === opt.price
          );
          if (matchingOption && group.optionIds.includes(matchingOption.id!)) {
            if (!selected[group.id!]) selected[group.id!] = {};
            selected[group.id!][matchingOption.id!] = opt.quantity || 1;
          }
        }
      });
    });
    return selected;
  });
  const [extras, setExtras] = useState<AddExtra[]>(
    existingOrderItem?.extras ?? []
  );
  const [changes, setChanges] = useState<ItemChange[]>(
    existingOrderItem?.changes ?? []
  );
  const [specialFlag, setSpecialFlag] = useState<"appetizer" | "toGo" | null>(
    () => {
      if (existingOrderItem?.togo) return "toGo";
      if (existingOrderItem?.appetizer) return "appetizer";
      return null;
    }
  );

  // Sync form state when existingOrderItem changes (for edit mode)
  useEffect(() => {
    if (isEditMode && existingOrderItem) {
      setQuantity(existingOrderItem.quantity ?? 1);
      setInstructions(existingOrderItem.instructions ?? "");
      setExtras(existingOrderItem.extras ?? []);
      setChanges(existingOrderItem.changes ?? []);

      if (existingOrderItem.togo) {
        setSpecialFlag("toGo");
      } else if (existingOrderItem.appetizer) {
        setSpecialFlag("appetizer");
      } else {
        setSpecialFlag(null);
      }

      // Rebuild selectedOptions from existing order item
      if (existingOrderItem.options && optionGroups && options) {
        const selected: Record<string, Record<string, number>> = {};
        existingOrderItem.options.forEach((opt) => {
          // Find matching option by name and price
          const matchingOption = options.find(
            (o) => o.name === opt.name && o.price === opt.price
          );
          if (matchingOption) {
            optionGroups.forEach((group) => {
              if (group.optionIds?.includes(matchingOption.id!)) {
                if (!selected[group.id!]) selected[group.id!] = {};
                selected[group.id!][matchingOption.id!] = opt.quantity || 1;
              }
            });
          }
        });
        setSelectedOptions(selected);
      } else {
        setSelectedOptions({});
      }
    }
  }, [existingOrderItem, isEditMode, optionGroups, options]);

  if (!item)
    return (
      <SafeAreaViewWrapper>
        <Text>Item not found</Text>
      </SafeAreaViewWrapper>
    );

  const toggleOption = (group: OptionGroup, option: ItemOption) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id!] || {};

      // If multipleSelection is enabled, increment quantity instead of toggling
      if (group.multipleSelection) {
        const currentQty = current[option.id!] || 0;
        const newQty = currentQty > 0 ? 0 : 1; // Toggle between 0 and 1 initially
        return {
          ...prev,
          [group.id!]: {
            ...current,
            [option.id!]: newQty,
          },
        };
      }

      // For non-multiple selection groups
      if (group.maxSelection === 1) {
        return { ...prev, [group.id!]: { [option.id!]: 1 } };
      } else {
        const currentIds = Object.keys(current);
        if (current[option.id!]) {
          // Remove option
          const updated = { ...current };
          delete updated[option.id!];
          return { ...prev, [group.id!]: updated };
        } else {
          // Add option
          if (group.maxSelection && currentIds.length >= group.maxSelection)
            return prev;
          return {
            ...prev,
            [group.id!]: {
              ...current,
              [option.id!]: 1,
            },
          };
        }
      }
    });
  };

  const updateOptionQuantity = (
    groupId: string,
    optionId: string,
    delta: number
  ) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || {};
      const currentQty = current[optionId] || 0;
      const newQty = Math.max(0, currentQty + delta);

      if (newQty === 0) {
        // Remove option if quantity is 0
        const updated = { ...current };
        delete updated[optionId];
        return { ...prev, [groupId]: updated };
      }

      return {
        ...prev,
        [groupId]: {
          ...current,
          [optionId]: newQty,
        },
      };
    });
  };

  const handleSubmit = () => {
    if (!options || !optionGroups) return;

    const groups =
      (item.optionGroupIds
        ?.map((id) => optionGroups.find((g) => g.id === id))
        .filter(Boolean) as OptionGroup[]) || [];

    for (const group of groups) {
      const selectedCount = Object.keys(
        selectedOptions[group.id!] || {}
      ).length;
      if (selectedCount < group.minSelection) {
        Alert.alert(
          "Selection required",
          `Please select at least ${group.minSelection} option(s) for "${group.name}"`
        );
        return;
      }
    }

    const optionsToSubmit: OrderItemOption[] = [];
    Object.entries(selectedOptions).forEach(([groupId, optionQuantities]) => {
      Object.entries(optionQuantities).forEach(([optionId, quantity]) => {
        if (quantity > 0) {
          const option = options.find((o) => o.id === optionId);
          if (option) {
            optionsToSubmit.push({
              name: option.name,
              price: option.price,
              quantity: quantity,
            });
          }
        }
      });
    });

    const extrasTotal = extras.reduce((sum, e) => sum + (e.price || 0), 0);
    const changesTotal = changes.reduce((sum, c) => sum + (c.price || 0), 0);
    const orderItemPrice =
      (item.price || 0) +
      optionsToSubmit.reduce((acc, o) => acc + (o.price * o.quantity || 0), 0) +
      extrasTotal +
      changesTotal;

    if (isEditMode && orderItemIdStr) {
      // Update existing order item
      const updatedItem: Partial<OrderItem> = {
        name: item.name,
        togo: specialFlag === "toGo",
        appetizer: specialFlag === "appetizer",
        kitchenType: item.kitchenType,
        price: orderItemPrice,
        quantity,
        instructions: instructions || undefined,
        options: optionsToSubmit,
        extras: extras,
        changes: changes,
      };
      updateOrderItem(orderItemIdStr, updatedItem);
    } else {
      // Add new order item
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
      addItem(cleanItem);
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaViewWrapper className="flex-1 bg-white">
        <Header title={item.name} onBack={() => router.back()} />

        <ScrollView
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        >
          {/* Instructions */}
          <Text className="text-base mb-2">Special instructions:</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 mb-4 min-h-[80px]"
            placeholder="Add instructions..."
            value={instructions}
            onChangeText={setInstructions}
            returnKeyLabel="Hide"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
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

                  const optionQuantity =
                    selectedOptions[group.id!]?.[option.id!] || 0;
                  const isSelected = optionQuantity > 0;

                  return (
                    <View
                      key={option.id}
                      className={`py-2 px-3 mb-2 rounded-lg border ${
                        isSelected
                          ? "border-blue-600 bg-blue-100"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <TouchableOpacity
                          onPress={() => toggleOption(group, option)}
                          className="flex-1"
                        >
                          <Text className="text-base">
                            {option.name}{" "}
                            {option.price > 0 &&
                              `- $${option.price.toFixed(2)}`}
                          </Text>
                        </TouchableOpacity>

                        {/* Quantity Stepper for multipleSelection groups */}
                        {group.multipleSelection && (
                          <View className="flex-row items-center ml-3">
                            <TouchableOpacity
                              onPress={() =>
                                updateOptionQuantity(group.id!, option.id!, -1)
                              }
                              disabled={optionQuantity === 0}
                              className={`w-8 h-8 rounded-full bg-white justify-center items-center border ${
                                optionQuantity === 0
                                  ? "border-gray-200 opacity-50"
                                  : "border-gray-300"
                              }`}
                            >
                              <Text
                                className={`text-lg font-bold ${
                                  optionQuantity === 0
                                    ? "text-gray-400"
                                    : "text-gray-700"
                                }`}
                              >
                                −
                              </Text>
                            </TouchableOpacity>
                            <Text className="mx-3 text-base font-semibold">
                              {optionQuantity}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                updateOptionQuantity(group.id!, option.id!, 1)
                              }
                              disabled={optionQuantity === 0}
                              className={`w-8 h-8 rounded-full bg-white justify-center items-center border ${
                                optionQuantity === 0
                                  ? "border-gray-200 opacity-50"
                                  : "border-gray-300"
                              }`}
                            >
                              <Text
                                className={`text-lg font-bold ${
                                  optionQuantity === 0
                                    ? "text-gray-400"
                                    : "text-gray-700"
                                }`}
                              >
                                ＋
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
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

          {/* Footer now inside scroll view */}
          <View className="mt-6 border-t border-gray-200 pt-4">
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

            <TouchableOpacity
              className="bg-gray-800 py-4 rounded-lg items-center"
              onPress={handleSubmit}
            >
              <Text className="text-white font-bold text-lg">
                {isEditMode ? "Update Item" : "Add to Order"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaViewWrapper>
    </KeyboardAvoidingView>
  );
}
