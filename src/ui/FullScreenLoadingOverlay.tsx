import React from "react";
import { ActivityIndicator, Modal, Text, View } from "react-native";

export type FullScreenLoadingOverlayProps = {
  visible: boolean;
  /** Primary line under the spinner */
  title?: string;
  /** Secondary line; set to empty string to hide */
  subtitle?: string;
};

/**
 * Blocks interaction while a slow Firestore (or similar) operation runs.
 * Uses `Modal` so it stacks above other modals (e.g. edit-table dialog).
 */
export default function FullScreenLoadingOverlay({
  visible,
  title = "Please wait…",
  subtitle = "This may take a few seconds.",
}: FullScreenLoadingOverlayProps) {
  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/45 justify-center items-center px-8">
        <View className="w-full max-w-sm rounded-2xl bg-white px-8 py-7 items-center border border-gray-200 shadow-lg">
          <ActivityIndicator size="large" color="#111827" />
          <Text className="mt-4 text-base font-semibold text-gray-800 text-center">
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-2 text-sm text-gray-500 text-center">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
