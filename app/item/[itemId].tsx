import AddExtraEditor from "@/components/takeout/AddExtraEditor";
import ItemChangeEditor from "@/components/takeout/ItemChangeEditor";
import SpecialFlagsSelector from "@/components/takeout/SpecialFlagsSelector";
import Header from "@/components/ui/Header";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderType } from "@/types/enum";
import { generateFirestoreId } from "@/utils/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

export default function Item() {
  const router = useRouter();
  const { itemId, orderType } = useLocalSearchParams();
  const { menuItems, optionGroups, options } = useMenuStore();
  const { addItem } = useOrderStore();
  const item = menuItems.find((i) => i.id === itemId);

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

  if (!item)
    return (
      <SafeAreaView>
        <Text>Item not found</Text>
      </SafeAreaView>
    );

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
    if (!options || !optionGroups) return;

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

    addItem(cleanItem);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView className="flex-1 bg-white">
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
              <Text className="text-white font-bold text-lg">Add to Order</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
