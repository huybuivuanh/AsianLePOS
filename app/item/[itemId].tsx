import {
  AddExtraEditor,
  ItemChangeEditor,
  SpecialFlagsSelector,
} from "@/features/order";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderType } from "@/types/enums";
import Header from "@/ui/Header";
import {
  generateFirestoreId,
  orderPaidFromLineItems,
  showAlert,
} from "@/utils/helpers";
import {
  appendOrderItemOptionsForGroup,
  getItemOptionGroupsInDisplayOrder,
  getMenuItemOptionGroupIdSet,
} from "@/utils/menuOrdering";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
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
  const { itemId, orderType, orderItemId, menuEntry } = useLocalSearchParams();
  const { menuItems, optionGroups, options } = useMenuStore();
  const { addItem, updateOrderItem, order } = useOrderStore();

  const itemIdStr = Array.isArray(itemId) ? itemId[0] : itemId;
  const orderTypeStr = Array.isArray(orderType) ? orderType[0] : orderType;
  const menuEntryStr = Array.isArray(menuEntry) ? menuEntry[0] : menuEntry;

  const item = menuItems.find((i) => i.id === itemIdStr);
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
    existingOrderItem?.instructions ?? "",
  );
  // State: Record<groupId, Record<optionId, quantity>>
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, Record<string, number>>
  >(() => {
    if (!existingOrderItem?.options || !optionGroups || !item?.optionGroupIds)
      return {};
    const selected: Record<string, Record<string, number>> = {};
    // Only check groups that belong to this item
    const itemGroups = getItemOptionGroupsInDisplayOrder(item, optionGroups);

    existingOrderItem.options.forEach((opt) => {
      // Find matching option by name and price
      const matchingOption = options?.find(
        (o) => o.name === opt.name && o.price === opt.price,
      );
      if (matchingOption) {
        // Only check groups that belong to this item
        for (const group of itemGroups) {
          if (group.optionIds?.includes(matchingOption.id!)) {
            if (!selected[group.id!]) selected[group.id!] = {};
            selected[group.id!][matchingOption.id!] = opt.quantity || 1;
            break; // Only add to the first matching group for this item
          }
        }
      }
    });
    return selected;
  });
  const [extras, setExtras] = useState<AddExtra[]>(
    existingOrderItem?.extras ?? [],
  );
  const [changes, setChanges] = useState<ItemChange[]>(
    existingOrderItem?.changes ?? [],
  );
  const [specialFlag, setSpecialFlag] = useState<"appetizer" | "toGo" | null>(
    () => {
      if (existingOrderItem?.togo) return "toGo";
      if (existingOrderItem?.appetizer) return "appetizer";
      return null;
    },
  );

  const prevItemIdForDefaultsRef = useRef<string | undefined>(undefined);

  // Pre-select default options when adding a new item (after menu data is ready).
  useEffect(() => {
    if (isEditMode || !item?.id) return;
    if (!item.optionGroupIds?.length || !optionGroups.length || !options.length) {
      return;
    }

    const switchedItem = prevItemIdForDefaultsRef.current !== item.id;
    if (switchedItem) {
      prevItemIdForDefaultsRef.current = item.id;
    }

    setSelectedOptions((prev) => {
      const allowed = getMenuItemOptionGroupIdSet(item);
      let next: Record<string, Record<string, number>>;

      if (switchedItem) {
        next = {};
        for (const gid of Object.keys(prev)) {
          if (allowed.has(gid)) next[gid] = { ...prev[gid] };
        }
      } else {
        next = { ...prev };
      }

      const itemGroups = getItemOptionGroupsInDisplayOrder(item, optionGroups);

      let changed = switchedItem;

      for (const group of itemGroups) {
        const gid = group.id;
        if (!gid) continue;
        const defaultId = group.defaultOptionId;
        if (!defaultId || !group.optionIds?.includes(defaultId)) continue;
        const existing = next[gid];
        if (existing && Object.keys(existing).length > 0) continue;
        if (!options.some((o) => o.id === defaultId)) continue;
        next[gid] = { [defaultId]: 1 };
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [isEditMode, item, optionGroups, options]);

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
      if (
        existingOrderItem.options &&
        optionGroups &&
        options &&
        item?.optionGroupIds
      ) {
        const selected: Record<string, Record<string, number>> = {};
        // Only check groups that belong to this item
        const itemGroups = getItemOptionGroupsInDisplayOrder(
          item,
          optionGroups,
        );

        existingOrderItem.options.forEach((opt) => {
          // Find matching option by name and price
          const matchingOption = options.find(
            (o) => o.name === opt.name && o.price === opt.price,
          );
          if (matchingOption) {
            // Only check groups that belong to this item
            for (const group of itemGroups) {
              if (group.optionIds?.includes(matchingOption.id!)) {
                if (!selected[group.id!]) selected[group.id!] = {};
                selected[group.id!][matchingOption.id!] = opt.quantity || 1;
                break; // Only add to the first matching group for this item
              }
            }
          }
        });
        setSelectedOptions(selected);
      } else {
        setSelectedOptions({});
      }
    }
  }, [existingOrderItem, isEditMode, optionGroups, options, item]);

  if (!item)
    return (
      <SafeAreaViewWrapper>
        <Text>Item not found</Text>
      </SafeAreaViewWrapper>
    );

  const toggleOption = (group: OptionGroup, option: ItemOption) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id!] || {};

      if (group.multipleOptionQuantity) {
        const currentQty = current[option.id!] || 0;
        if (currentQty > 0) {
          const updated = { ...current };
          delete updated[option.id!];
          return { ...prev, [group.id!]: updated };
        }
        // Select this option (qty 1): respect max distinct options
        const activeIds = Object.keys(current).filter((id) => current[id] > 0);
        if (group.maxSelection === 1) {
          return {
            ...prev,
            [group.id!]: { [option.id!]: 1 },
          };
        }
        if (
          group.maxSelection != null &&
          group.maxSelection > 0 &&
          activeIds.length >= group.maxSelection
        ) {
          return prev;
        }
        return {
          ...prev,
          [group.id!]: {
            ...current,
            [option.id!]: 1,
          },
        };
      }

      // Groups without per-option quantity (multipleOptionQuantity false)
      if (group.maxSelection === 1) {
        // If clicking the already selected option, deselect it
        if (current[option.id!]) {
          return { ...prev, [group.id!]: {} };
        }
        // Otherwise, select this option (deselecting any previous selection)
        return { ...prev, [group.id!]: { [option.id!]: 1 } };
      } else {
        const currentIds = Object.keys(current);
        if (current[option.id!]) {
          // Remove option (deselect)
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
    delta: number,
  ) => {
    setSelectedOptions((prev) => {
      const group = optionGroups.find((g) => g.id === groupId);
      if (!group) return prev;

      const current = prev[groupId] || {};
      const currentQty = current[optionId] || 0;
      const newQty = Math.max(0, currentQty + delta);

      if (newQty === 0) {
        const updated = { ...current };
        delete updated[optionId];
        return { ...prev, [groupId]: updated };
      }

      // First unit on this option counts as a new distinct choice — same caps as toggle
      if (currentQty === 0 && delta > 0) {
        const activeIds = Object.keys(current).filter((id) => current[id] > 0);
        const addingNewDistinct = !activeIds.includes(optionId);
        if (addingNewDistinct) {
          if (group.maxSelection === 1) {
            return {
              ...prev,
              [groupId]: { [optionId]: newQty },
            };
          }
          if (
            group.maxSelection != null &&
            group.maxSelection > 0 &&
            activeIds.length >= group.maxSelection
          ) {
            return prev;
          }
        }
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

    const groups = getItemOptionGroupsInDisplayOrder(item, optionGroups);

    for (const group of groups) {
      const selectedCount = Object.values(
        selectedOptions[group.id!] || {},
      ).filter((q) => q > 0).length;
      if (selectedCount < group.minSelection) {
        showAlert("Please Select Required Options");
        return;
      }
    }

    // Group order = MenuItem.optionGroupIds[].order; within group = optionIds order.
    const optionsToSubmit: OrderItemOption[] = [];
    for (const group of groups) {
      appendOrderItemOptionsForGroup(
        optionsToSubmit,
        group,
        selectedOptions[group.id!],
        options,
      );
    }

    const extrasTotal = extras.reduce((sum, e) => sum + (e.price || 0), 0);
    const changesTotal = changes.reduce((sum, c) => sum + (c.price || 0), 0);
    const orderItemPrice =
      (item.price || 0) +
      optionsToSubmit.reduce((acc, o) => acc + (o.price * o.quantity || 0), 0) +
      extrasTotal +
      changesTotal;

    if (isEditMode && orderItemIdStr) {
      // Update existing order item
      // Only include instructions if it has a value (use conditional spreading)
      const updatedItem: Partial<OrderItem> = {
        name: item.name,
        togo: specialFlag === "toGo",
        appetizer: specialFlag === "appetizer",
        kitchenType: item.kitchenType,
        price: orderItemPrice,
        quantity,
        ...(instructions.trim() && { instructions: instructions.trim() }),
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
        // Keep order-level paid state: new lines on an already fully-paid order stay paid
        // (add-on collected immediately at the register).
        paid: orderPaidFromLineItems(order.orderItems ?? []),
        price: orderItemPrice,
        quantity,
        ...(instructions !== "" && { instructions }),
        ...(optionsToSubmit.length > 0 && { options: optionsToSubmit }),
        ...(extras.length > 0 && { extras }),
        ...(changes.length > 0 && { changes }),
      };
      addItem(cleanItem);
    }

    // Pop stack when dine-in, or take-out with an existing order (e.g. edit-order + add-item).
    // New take-out from tabs (no order.id yet) still goes to tab root.
    const shouldPopStack =
      orderTypeStr === OrderType.DineIn || Boolean(order.id);

    if (shouldPopStack) {
      router.back();
      // Category path: […, category, item] — second pop skips category (take-order / add-item grid,
      // or edit-order after add-item → category). Search path is […, item] — one back only.
      // Applies to both new lines and editing a line when menuEntry is still "category".
      if (menuEntryStr === "category") {
        queueMicrotask(() => router.back());
      }
    } else {
      router.push("/(tabs)");
    }
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
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          className="flex-1"
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

          {/* Option groups: per-item OptionGroupId.order (same as saved orderItem.options) */}
          {getItemOptionGroupsInDisplayOrder(item, optionGroups).map((group) => (
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

                {(() => {
                  // Same order as group.optionIds (matches orderItem.options / kitchen ticket).
                  const normalizedOptions =
                    (group.optionIds ?? [])
                      .map((optionId) =>
                        options.find((o) => o.id === optionId),
                      )
                      .filter(Boolean) as ItemOption[];

                  return normalizedOptions.map((option) => {
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

                          {/* Quantity Stepper when multipleOptionQuantity */}
                          {group.multipleOptionQuantity && (
                            <View className="flex-row items-center ml-3">
                              <TouchableOpacity
                                onPress={() =>
                                  updateOptionQuantity(
                                    group.id!,
                                    option.id!,
                                    -1,
                                  )
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
                                  updateOptionQuantity(
                                    group.id!,
                                    option.id!,
                                    1,
                                  )
                                }
                                className="w-8 h-8 rounded-full bg-white justify-center items-center border border-gray-300"
                              >
                                <Text className="text-lg font-bold text-gray-700">
                                  ＋
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  });
                })()}
              </View>
          ))}

          <AddExtraEditor extras={extras} onChange={setExtras} />
          <ItemChangeEditor
            changes={changes}
            onChange={setChanges}
            onBrowseMenuChanges={() => router.push("/menu-changes")}
          />
          {orderTypeStr === OrderType.DineIn && (
            <View className="mt-3">
              <SpecialFlagsSelector
                selected={specialFlag}
                onChange={setSpecialFlag}
              />
            </View>
          )}

          {/* Footer at bottom of scrollable content */}
          <View className="mt-6 mb-4 bg-white border-t border-gray-200 pt-4">
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
