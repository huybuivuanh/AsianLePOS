import { Check } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type FlagType = "appetizer" | "toGo" | null;

type Props = {
  selected: FlagType;
  onChange: (newValue: FlagType) => void;
};

export default function SpecialFlagsSelector({ selected, onChange }: Props) {
  const options: { key: Exclude<FlagType, null>; label: string }[] = [
    { key: "appetizer", label: "Appetizer" },
    { key: "toGo", label: "To Go" },
  ];

  const toggleOption = (key: Exclude<FlagType, null>) => {
    onChange(selected === key ? null : key);
  };

  return (
    <View className="flex-row gap-1.5">
      {options.map((opt) => {
        const isSelected = selected === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => toggleOption(opt.key)}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            className={`flex-1 min-w-0 flex-row items-center justify-center rounded-lg border py-2 px-2 ${
              isSelected
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <View
              className={`w-5 h-5 rounded-[4px] border mr-1.5 justify-center items-center ${
                isSelected
                  ? "border-blue-600 bg-blue-600"
                  : "border-gray-400 bg-white"
              }`}
            >
              {isSelected && (
                <Check size={12} strokeWidth={2.5} color="white" />
              )}
            </View>
            <Text
              className={`text-medium font-semibold shrink min-w-0 ${
                isSelected ? "text-blue-900" : "text-gray-700"
              }`}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
