import dayjs from "dayjs";
import React, { type ChangeEvent } from "react";
import { View } from "react-native";

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
};

/**
 * Web-only picker using `datetime-local` + dayjs so values stay in **local** time.
 * (Split `type="date"` + `new Date(iso)` often shifts the calendar day across TZs.)
 */
export default function WebScheduledDateTimeInput({
  value,
  onChange,
  disabled,
}: Props) {
  const valueStr = dayjs(value).format("YYYY-MM-DDTHH:mm");

  return (
    <View className="w-full">
      <input
        type="datetime-local"
        disabled={disabled}
        value={valueStr}
        step={60}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const raw = e.target.value;
          if (!raw) return;
          const parsed = dayjs(raw);
          if (!parsed.isValid()) return;
          onChange(parsed.toDate());
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px 14px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          fontSize: "16px",
          color: "#374151",
          backgroundColor: disabled ? "#f3f4f6" : "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      />
    </View>
  );
}
