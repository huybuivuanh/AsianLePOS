import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { X } from "lucide-react-native"; // lightweight icon
import React, { useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  item: MenuItem | null;
  onSubmit: (itemId: string, quantity: number, instructions: string) => void;
  onClose: () => void;
};

export default function OrderSheet({ item, onSubmit, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");

  // auto-open when item changes
  useEffect(() => {
    if (item) bottomSheetRef.current?.expand();
  }, [item]);

  if (!item) return null;

  const handleSubmit = () => {
    if (!item?.id) return;
    onSubmit(item.id, quantity, instructions);
    setQuantity(1);
    setInstructions("");
    onClose();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={["90%"]}
      index={1}
      enablePanDownToClose
      onClose={onClose}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold flex-1">{item.name}</Text>

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 justify-center items-center"
          >
            <X size={20} color="black" />
          </TouchableOpacity>
        </View>

        {/* Body */}
        <Text className="text-base mb-2">Special instructions:</Text>
        <BottomSheetTextInput
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
              className="w-12 h-12 rounded-full bg-gray-200 justify-center items-center"
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Text className="text-2xl font-bold">−</Text>
            </TouchableOpacity>

            <Text className="mx-5 text-2xl font-semibold">{quantity}</Text>

            <TouchableOpacity
              className="w-12 h-12 rounded-full bg-gray-200 justify-center items-center"
              onPress={() => setQuantity((q) => q + 1)}
            >
              <Text className="text-2xl font-bold">＋</Text>
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
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
