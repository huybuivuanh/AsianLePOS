import { CheckCircle2, XCircle } from "lucide-react-native";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type MessageModalProps = {
  visible: boolean;
  /** "loading" shows a spinner and no button; switch tone to show the result in place. */
  tone: "loading" | "success" | "error";
  title: string;
  message?: string;
  buttonLabel?: string;
  onClose: () => void;
};

/**
 * In-app replacement for a browser / system alert: icon, title, message, one button.
 * Keep one instance mounted and change its tone (loading → result): opening a new
 * Modal while another is closing can be dropped on iOS.
 */
export default function MessageModal({
  visible,
  tone,
  title,
  message,
  buttonLabel = "OK",
  onClose,
}: MessageModalProps) {
  const success = tone === "success";
  const loading = tone === "loading";
  const close = loading ? () => {} : onClose;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View className="flex-1 items-center justify-center px-5">
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={close}
          accessibilityLabel="Close"
        />
        <View className="relative z-10 w-full max-w-sm items-center rounded-2xl bg-white p-6 shadow-xl">
          <View
            className={`mb-3 h-14 w-14 items-center justify-center rounded-full ${
              loading ? "bg-gray-100" : success ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {loading ? (
              <ActivityIndicator size="large" />
            ) : success ? (
              <CheckCircle2 size={32} color="#16a34a" />
            ) : (
              <XCircle size={32} color="#dc2626" />
            )}
          </View>
          <Text className="text-center text-lg font-bold text-gray-900">
            {title}
          </Text>
          {message ? (
            <Text className="mt-2 text-center text-base text-gray-600">
              {message}
            </Text>
          ) : null}
          {!loading && (
            <TouchableOpacity
              className={`mt-5 w-full rounded-xl py-3.5 ${success ? "bg-green-600" : "bg-gray-800"}`}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text className="text-center text-base font-semibold text-white">
                {buttonLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
