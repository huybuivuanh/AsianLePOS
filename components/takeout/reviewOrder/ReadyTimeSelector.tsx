import { useOrderStore } from "@/stores/useOrderStore";
import React, { useState } from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

const READY_TIMES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];

export default function ReadyTimeSelector() {
  const { order, updateOrder } = useOrderStore();
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);

  const handleConfirm = (date: Date) => {
    updateOrder({ preorderTime: date });
    setPickerMode(null);
  };

  return (
    <View className="mb-5 space-y-4">
      {/* Preorder Toggle */}
      <View className="flex-row items-center justify-end">
        <Text className="text-gray-700 font-medium mr-2">Pre-order</Text>
        <Switch
          value={order.isPreorder ?? false}
          onValueChange={(v) => updateOrder({ isPreorder: v })}
        />
      </View>

      {/* Ready Time Selector */}
      {!order.isPreorder && (
        <View>
          <Text className="text-gray-700 font-medium mb-2">
            Ready In (minutes)
          </Text>
          <View className="flex-row flex-wrap">
            {READY_TIMES.map((time) => (
              <TouchableOpacity
                key={time}
                onPress={() => updateOrder({ readyTime: time })}
                className={`px-4 py-2 m-1 rounded-full border ${
                  order.readyTime === time
                    ? "bg-gray-800 border-gray-800"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text
                  className={`${
                    order.readyTime === time ? "text-white" : "text-gray-700"
                  } font-medium`}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Preorder Date/Time Pickers */}
      {order.isPreorder && (
        <View>
          <Text className="text-gray-700 font-medium mb-2">Pre-order For</Text>
          <View className="flex-row space-x-4">
            <TouchableOpacity
              onPress={() => setPickerMode("date")}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white"
            >
              <Text className="text-gray-700 text-center">
                {order.preorderTime?.toLocaleDateString() ??
                  new Date().toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPickerMode("time")}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white"
            >
              <Text className="text-gray-700 text-center">
                {order.preorderTime
                  ? order.preorderTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal Picker */}
      <DateTimePickerModal
        isVisible={!!pickerMode}
        mode={pickerMode ?? "date"}
        date={order.preorderTime ?? new Date()}
        onConfirm={handleConfirm}
        onCancel={() => setPickerMode(null)}
        is24Hour={false}
      />
    </View>
  );
}
