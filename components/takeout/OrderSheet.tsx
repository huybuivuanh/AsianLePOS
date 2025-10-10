import BottomSheet from "@gorhom/bottom-sheet";
import React, { useMemo, useRef, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  item: { id: string; name: string; price: number } | null;
  onSubmit: (itemId: string, quantity: number, instructions: string) => void;
  onClose: () => void;
};

export default function OrderSheet({ item, onSubmit, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "70%"], []);

  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");

  if (!item) return null;

  const handleSubmit = () => {
    onSubmit(item.id, quantity, instructions);
    setQuantity(1);
    setInstructions("");
    onClose();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
    >
      <View className="flex-1 p-4">
        <Text className="text-2xl font-bold mb-4">{item.name}</Text>

        <Text className="text-base mb-2">Special instructions:</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-4 min-h-[80px]"
          placeholder="Add instructions..."
          multiline
          value={instructions}
          onChangeText={setInstructions}
        />

        <View className="flex-row justify-between items-center mt-auto">
          {/* Quantity stepper */}
          <View className="flex-row items-center">
            <TouchableOpacity
              className="w-9 h-9 rounded-full bg-gray-200 justify-center items-center"
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Text className="text-lg">-</Text>
            </TouchableOpacity>

            <Text className="mx-3 text-lg">{quantity}</Text>

            <TouchableOpacity
              className="w-9 h-9 rounded-full bg-gray-200 justify-center items-center"
              onPress={() => setQuantity((q) => q + 1)}
            >
              <Text className="text-lg">+</Text>
            </TouchableOpacity>
          </View>

          {/* Submit button */}
          <TouchableOpacity
            className="bg-gray-800 px-6 py-3 rounded-lg"
            onPress={handleSubmit}
          >
            <Text className="text-white font-bold text-base">Add to Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}
