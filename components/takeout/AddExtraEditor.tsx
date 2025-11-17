import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddExtraEditor({
  extras,
  onChange,
}: {
  extras: AddExtra[];
  onChange: (updated: AddExtra[]) => void;
}) {
  // Track if we're updating from props to prevent infinite loops
  const isUpdatingFromProps = useRef(false);
  const prevExtrasRef = useRef<string>("");

  // Initialize drafts from existing extras (price stored as string for TextInput)
  const [drafts, setDrafts] = useState<
    (Omit<AddExtra, "price"> & { price: string })[]
  >(() =>
    extras.length > 0
      ? extras.map((e) => ({
          description: e.description,
          price: e.price.toString(),
        }))
      : []
  );

  // Sync drafts when extras change externally (e.g., when editing existing item)
  useEffect(() => {
    const extrasStr = JSON.stringify(extras);

    // Only update if extras actually changed
    if (extrasStr !== prevExtrasRef.current) {
      prevExtrasRef.current = extrasStr;

      const newDrafts =
        extras.length > 0
          ? extras.map((e) => ({
              description: e.description,
              price: e.price.toString(),
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
  }, [extras]);

  // Update parent whenever drafts change, filtering out empty descriptions
  useEffect(() => {
    // Don't call onChange if we're updating from props
    if (isUpdatingFromProps.current) {
      return;
    }

    const validExtras: AddExtra[] = drafts
      .filter((d) => d.description.trim() !== "")
      .map((d) => ({
        description: d.description.trim(),
        price: parseFloat(d.price) || 0,
      }));

    // Only call onChange if the valid extras actually changed
    const currentExtrasStr = JSON.stringify(extras);
    const newExtrasStr = JSON.stringify(validExtras);

    if (currentExtrasStr !== newExtrasStr) {
      onChange(validExtras);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts]);

  const handleAddDraft = () => {
    setDrafts([...drafts, { description: "", price: "" }]);
  };

  const handleUpdateDraft = (
    index: number,
    field: "description" | "price",
    value: string
  ) => {
    setDrafts((prev) =>
      prev.map((draft, i) =>
        i === index ? { ...draft, [field]: value } : draft
      )
    );
  };

  const handleRemoveDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View className="mt-6 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xl font-semibold">Add Extras</Text>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-xl"
          onPress={handleAddDraft}
        >
          <Text className="text-white font-semibold">Add</Text>
        </TouchableOpacity>
      </View>

      {/* Draft Extras List */}
      {drafts.map((draft, index) => (
        <View key={index} className="flex-row items-end mb-3 space-x-2">
          <View className="flex-1">
            <Text className="text-sm text-gray-600 mb-1">Description</Text>
            <TextInput
              className="border border-gray-300 rounded-xl p-3"
              placeholder="Extra description"
              value={draft.description}
              onChangeText={(text) =>
                handleUpdateDraft(index, "description", text)
              }
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
          Press Add to create a new extra
        </Text>
      )}
    </View>
  );
}
