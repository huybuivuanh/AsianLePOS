import { useOrderStore } from "@/stores/useOrderStore";
import { TakeOutFulfillmentKind } from "@/types/enums";
import { timestampToDate } from "@/utils/helpers";
import { Timestamp } from "firebase/firestore";
import React, { useState } from "react";
import { Platform, Switch, Text, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

const READY_TIMES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];

export default function ReadyTimeSelector() {
  const { order, updateOrder } = useOrderStore();
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);

  const fulfillment = order.fulfillment;
  const isScheduled =
    fulfillment?.kind === TakeOutFulfillmentKind.Scheduled;
  const scheduledDate =
    fulfillment?.kind === TakeOutFulfillmentKind.Scheduled
      ? timestampToDate(fulfillment.scheduledAt as Timestamp) ?? new Date()
      : new Date();
  const readyMinutes =
    fulfillment?.kind === TakeOutFulfillmentKind.Immediate
      ? fulfillment.readyTimeMinutes
      : undefined;

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTimeForInput = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const setImmediateWithMinutes = (minutes: number) => {
    updateOrder({
      fulfillment: {
        kind: TakeOutFulfillmentKind.Immediate,
        readyTimeMinutes: minutes,
      },
    });
  };

  const setScheduledAt = (date: Date) => {
    updateOrder({
      fulfillment: {
        kind: TakeOutFulfillmentKind.Scheduled,
        scheduledAt: Timestamp.fromDate(date),
      },
    });
  };

  const handlePreorderToggle = (scheduled: boolean) => {
    if (scheduled) {
      setScheduledAt(scheduledDate);
    } else {
      updateOrder({
        fulfillment: {
          kind: TakeOutFulfillmentKind.Immediate,
          readyTimeMinutes: readyMinutes ?? 15,
        },
      });
    }
  };

  const handleConfirm = (date: Date) => {
    setScheduledAt(date);
    setPickerMode(null);
  };

  const handleWebDateChange = (dateString: string) => {
    const newDate = new Date(dateString);
    newDate.setHours(scheduledDate.getHours());
    newDate.setMinutes(scheduledDate.getMinutes());
    setScheduledAt(newDate);
  };

  const handleWebTimeChange = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const newDate = new Date(scheduledDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    setScheduledAt(newDate);
  };

  return (
    <View className="mb-5 space-y-4">
      <View className="flex-row items-center justify-end">
        <Text className="text-gray-700 font-medium mr-2">Pre-order</Text>
        <Switch value={isScheduled} onValueChange={handlePreorderToggle} />
      </View>

      {!isScheduled && (
        <View>
          <Text className="text-gray-700 font-medium mb-2">
            Ready In (minutes)
          </Text>
          <View className="flex-row flex-wrap">
            {READY_TIMES.map((time) => (
              <TouchableOpacity
                key={time}
                onPress={() => setImmediateWithMinutes(time)}
                className={`px-4 py-2 m-1 rounded-full border ${
                  readyMinutes === time
                    ? "bg-gray-800 border-gray-800"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text
                  className={`${
                    readyMinutes === time ? "text-white" : "text-gray-700"
                  } font-medium`}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {isScheduled && (
        <View>
          <Text className="text-gray-700 font-medium mb-2">Pre-order For</Text>
          {Platform.OS === "web" ? (
            <View className="flex-row space-x-4">
              <View className="flex-1">
                <input
                  type="date"
                  value={formatDateForInput(scheduledDate)}
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
                  value={formatTimeForInput(scheduledDate)}
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
            <>
              <View className="flex-row space-x-4">
                <TouchableOpacity
                  onPress={() => setPickerMode("date")}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white"
                >
                  <Text className="text-gray-700 text-center">
                    {scheduledDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPickerMode("time")}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white"
                >
                  <Text className="text-gray-700 text-center">
                    {scheduledDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePickerModal
                isVisible={!!pickerMode}
                mode={pickerMode ?? "date"}
                date={scheduledDate}
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
