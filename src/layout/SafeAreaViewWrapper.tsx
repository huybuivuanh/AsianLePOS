// src/components/layout/SafeAreaViewWrapper.tsx
import React, { ReactNode } from "react";
import { Platform, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props extends ViewProps {
  children: ReactNode;
  backgroundColor?: string;
}

export default function SafeAreaViewWrapper({
  children,
  style,
  backgroundColor = "white",
  ...props
}: Props) {
  const insets = useSafeAreaInsets();

  const webLayout =
    Platform.OS === "web"
      ? {
          width: "100%" as const,
          minHeight: "100%" as const,
          alignSelf: "stretch" as const,
        }
      : undefined;

  return (
    <View
      style={[
        {
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor,
          ...webLayout,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
