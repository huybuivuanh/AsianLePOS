import { Check } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type FlagType = "appetizer" | "toGo" | null;

type Props = {
  selected: FlagType;
  onChange: (newValue: FlagType) => void;
};

export default function SpecialFlagsSelector({ selected, onChange }: Props) {
  const options: { key: FlagType; label: string }[] = [
    { key: "appetizer", label: "Appetizer" },
    { key: "toGo", label: "To Go" },
  ];

  const toggleOption = (key: FlagType) => {
    // If same option clicked again, deselect it
    onChange(selected === key ? null : key);
  };

  return (
    <View className="mt-4 mb-6">
      <Text className="text-xl font-semibold mb-3 text-gray-800">Optional</Text>

      {options.map((opt) => {
        const isSelected = selected === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => toggleOption(opt.key)}
            activeOpacity={0.7}
            className="flex-row items-center mb-3"
          >
            <View
              className={`w-6 h-6 rounded-full border-2 mr-3 justify-center items-center ${
                isSelected
                  ? "border-blue-600 bg-blue-600"
                  : "border-gray-400 bg-white"
              }`}
            >
              {isSelected && <Check size={16} color="white" />}
            </View>
            <Text className="text-base text-gray-800 font-medium">
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
