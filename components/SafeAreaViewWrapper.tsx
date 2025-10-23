// components/SafeAreaViewWrapper.tsx
import React, { ReactNode } from "react";
import { View, ViewProps } from "react-native";
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

  return (
    <View
      style={[
        {
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
