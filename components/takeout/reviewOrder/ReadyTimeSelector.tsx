import { useOrderStore } from "@/stores/useOrderStore";
import { timestampToDate } from "@/utils/utils";
import React, { useState } from "react";
import { Platform, Switch, Text, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

const READY_TIMES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];

export default function ReadyTimeSelector() {
  const { order, updateOrder } = useOrderStore();
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);

  // Convert preorderTime to Date if it's a Timestamp
  const preorderDate = timestampToDate(order.preorderTime as any) ?? new Date();

  // Format date for HTML5 date input (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Format time for HTML5 time input (HH:MM)
  const formatTimeForInput = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleConfirm = (date: Date) => {
    updateOrder({ preorderTime: date });
    setPickerMode(null);
  };

  const handleWebDateChange = (dateString: string) => {
    const newDate = new Date(dateString);
    // Preserve the existing time
    newDate.setHours(preorderDate.getHours());
    newDate.setMinutes(preorderDate.getMinutes());
    updateOrder({ preorderTime: newDate });
  };

  const handleWebTimeChange = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const newDate = new Date(preorderDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    updateOrder({ preorderTime: newDate });
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
          {Platform.OS === "web" ? (
            // Web: Use HTML5 native date/time inputs
            <View className="flex-row space-x-4">
              <View className="flex-1">
                <input
                  type="date"
                  value={formatDateForInput(preorderDate)}
                  onChange={(e) => handleWebDateChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "16px",
                    color: "#374151",
                  }}
                />
              </View>
              <View className="flex-1">
                <input
                  type="time"
                  value={formatTimeForInput(preorderDate)}
                  onChange={(e) => handleWebTimeChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "16px",
                    color: "#374151",
                  }}
                />
              </View>
            </View>
          ) : (
            // Mobile: Use modal picker with buttons
            <>
              <View className="flex-row space-x-4">
                <TouchableOpacity
                  onPress={() => setPickerMode("date")}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white"
                >
                  <Text className="text-gray-700 text-center">
                    {preorderDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPickerMode("time")}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white"
                >
                  <Text className="text-gray-700 text-center">
                    {preorderDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Modal Picker for Mobile */}
              <DateTimePickerModal
                isVisible={!!pickerMode}
                mode={pickerMode ?? "date"}
                date={preorderDate}
                onConfirm={handleConfirm}
                onCancel={() => setPickerMode(null)}
                is24Hour={false}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}
