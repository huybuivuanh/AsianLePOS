import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  group: OptionGroup;
  options: ItemOption[];
  selectedOptions: Record<string, Record<string, number>>;
  onToggleOption: (group: OptionGroup, option: ItemOption) => void;
  onUpdateOptionQuantity: (groupId: string, optionId: string, delta: number) => void;
};

export function ItemOptionGroupSelector({
  group,
  options,
  selectedOptions,
  onToggleOption,
  onUpdateOptionQuantity,
}: Props) {
  const groupOptions = (group.optionIds ?? [])
    .map((optionId) => options.find((o) => o.id === optionId))
    .filter(Boolean) as ItemOption[];

  return (
    <View className="mb-4">
      <View className="flex-row items-center mb-3">
        <Text className="text-2xl font-semibold text-gray-800">{group.name}</Text>
        {group.minSelection > 0 && (
          <Text className="ml-2 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
            Required
          </Text>
        )}
      </View>

      {groupOptions.map((option) => {
        const optionQuantity = selectedOptions[group.id!]?.[option.id!] || 0;
        const isSelected = optionQuantity > 0;

        return (
          <View
            key={option.id}
            className={`py-2 px-3 mb-2 rounded-lg border ${
              isSelected ? "border-blue-600 bg-blue-100" : "border-gray-300 bg-white"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => onToggleOption(group, option)}
                className="flex-1"
              >
                <Text className="text-base">
                  {option.name}{option.price > 0 && ` - $${option.price.toFixed(2)}`}
                </Text>
              </TouchableOpacity>

              {group.multipleOptionQuantity && (
                <View className="flex-row items-center ml-3">
                  <TouchableOpacity
                    onPress={() => onUpdateOptionQuantity(group.id!, option.id!, -1)}
                    disabled={optionQuantity === 0}
                    className={`w-8 h-8 rounded-full bg-white justify-center items-center border ${
                      optionQuantity === 0 ? "border-gray-200 opacity-50" : "border-gray-300"
                    }`}
                  >
                    <Text className={`text-lg font-bold ${optionQuantity === 0 ? "text-gray-400" : "text-gray-700"}`}>
                      −
                    </Text>
                  </TouchableOpacity>
                  <Text className="mx-3 text-base font-semibold">{optionQuantity}</Text>
                  <TouchableOpacity
                    onPress={() => onUpdateOptionQuantity(group.id!, option.id!, 1)}
                    className="w-8 h-8 rounded-full bg-white justify-center items-center border border-gray-300"
                  >
                    <Text className="text-lg font-bold text-gray-700">＋</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
