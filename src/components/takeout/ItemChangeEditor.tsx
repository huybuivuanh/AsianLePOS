import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ItemChangeEditor({
  changes,
  onChange,
}: {
  changes: ItemChange[];
  onChange: (updated: ItemChange[]) => void;
}) {
  // Track if we're updating from props to prevent infinite loops
  const isUpdatingFromProps = useRef(false);
  const prevChangesRef = useRef<string>("");

  // Initialize drafts from existing changes (price stored as string for TextInput)
  // If price is 0, show blank instead of "0"
  const [drafts, setDrafts] = useState<
    (Omit<ItemChange, "price"> & { price: string })[]
  >(() =>
    changes.length > 0
      ? changes.map((c) => ({
          from: c.from,
          to: c.to,
          price: c.price === 0 ? "" : c.price.toString(),
        }))
      : [],
  );

  // Sync drafts when changes change externally (e.g., when editing existing item)
  useEffect(() => {
    const changesStr = JSON.stringify(changes);

    // Only update if changes actually changed
    if (changesStr !== prevChangesRef.current) {
      prevChangesRef.current = changesStr;

      const newDrafts =
        changes.length > 0
          ? changes.map((c) => ({
              from: c.from,
              to: c.to,
              price: c.price === 0 ? "" : c.price.toString(),
            }))
          : [];

      isUpdatingFromProps.current = true;
      setDrafts((prevDrafts) => {
        const prevDraftsStr = JSON.stringify(prevDrafts);
        const newDraftsStr = JSON.stringify(newDrafts);
        // Only update if different
        if (prevDraftsStr !== newDraftsStr) {
          return newDrafts;
        }
        return prevDrafts;
      });

      // Reset flag after state update
      setTimeout(() => {
        isUpdatingFromProps.current = false;
      }, 0);
    }
  }, [changes]);

  // Update parent whenever drafts change - but only when all drafts are complete
  // (have both from and to). When user clears a field, we keep drafts locally
  // and don't propagate, so the sync effect won't overwrite and remove the row.
  useEffect(() => {
    // Don't call onChange if we're updating from props
    if (isUpdatingFromProps.current) {
      return;
    }

    // Don't propagate when any draft has empty required fields - user is editing
    const hasIncomplete = drafts.some(
      (d) => d.from.trim() === "" || d.to.trim() === ""
    );
    if (hasIncomplete) {
      return;
    }

    const validChanges: ItemChange[] = drafts.map((d) => {
      const priceStr = d.price.trim();
      const price = priceStr === "" ? 0 : parseFloat(priceStr) || 0;
      return {
        from: d.from.trim(),
        to: d.to.trim(),
        price,
      };
    });

    const currentChangesStr = JSON.stringify(changes);
    const newChangesStr = JSON.stringify(validChanges);

    if (currentChangesStr !== newChangesStr) {
      onChange(validChanges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts]);

  const handleAddDraft = () => {
    setDrafts([...drafts, { from: "", to: "", price: "" }]);
  };

  const handleUpdateDraft = (
    index: number,
    field: "from" | "to" | "price",
    value: string,
  ) => {
    setDrafts((prev) =>
      prev.map((draft, i) =>
        i === index ? { ...draft, [field]: value } : draft,
      ),
    );
  };

  const handleRemoveDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View className="mt-4 mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xl font-semibold">Item Changes</Text>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-xl"
          onPress={handleAddDraft}
        >
          <Text className="text-white font-semibold">Add</Text>
        </TouchableOpacity>
      </View>

      {/* Draft Changes List */}
      {drafts.map((draft, index) => (
        <View key={index} className="flex-row items-end mb-3 space-x-2">
          <View className="flex-1">
            <Text className="text-sm text-gray-600 mb-1">From</Text>
            <TextInput
              className="border border-gray-300 rounded-xl p-3"
              placeholder="Original item"
              value={draft.from}
              onChangeText={(text) => handleUpdateDraft(index, "from", text)}
              returnKeyLabel="Hide"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>

          <View className="flex-1">
            <Text className="text-sm text-gray-600 mb-1">To</Text>
            <TextInput
              className="border border-gray-300 rounded-xl p-3"
              placeholder="Replacement item"
              value={draft.to}
              onChangeText={(text) => handleUpdateDraft(index, "to", text)}
              returnKeyLabel="Hide"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>

          <View className="w-24">
            <Text className="text-sm text-gray-600 mb-1">Price</Text>
            <TextInput
              className="border border-gray-300 rounded-xl p-3 text-right"
              placeholder="0.00"
              keyboardType="numeric"
              value={draft.price}
              onChangeText={(text) => handleUpdateDraft(index, "price", text)}
              returnKeyLabel="Hide"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>

          <TouchableOpacity
            className="bg-red-500 px-3 py-3 rounded-xl"
            onPress={() => handleRemoveDraft(index)}
          >
            <Text className="text-white text-sm font-bold">×</Text>
          </TouchableOpacity>
        </View>
      ))}

      {drafts.length === 0 && (
        <Text className="text-gray-500 text-sm italic">
          Press Add to create a new change
        </Text>
      )}
    </View>
  );
}
