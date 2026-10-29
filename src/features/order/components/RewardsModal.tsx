import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  formatRewardsPhone,
  REWARDS_PHONE_PLACEHOLDER,
  rewardsPhoneDigits,
} from "@/features/rewards/rewardsPhone";
import { openRewardsMember } from "@/features/rewards/rewardsNavigation";
import { useRewardsAuthStore } from "@/stores/useRewardsAuthStore";
import { OrderType } from "@/types/enums";
import { useRouter } from "expo-router";

type Step = "choose" | "phone" | "scan";

type Props = {
  orderId: string;
  orderType: OrderType;
  onClose: () => void;
};


export default function RewardsModal({ orderId, orderType, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [phoneText, setPhoneText] = useState("");
  const rewardsConfigured = useRewardsAuthStore((s) => s.configured);
  const rewardsReady = useRewardsAuthStore((s) => s.ready);
  const rewardsUser = useRewardsAuthStore((s) => s.user);
  const deviceSignedIn = rewardsConfigured && rewardsUser !== null;
  // Saved login is still being restored right after app start.
  const restoring = rewardsConfigured && !rewardsReady;

  const phone = useMemo(() => rewardsPhoneDigits(phoneText), [phoneText]);
  const phoneValid = phone.length === 10;

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleSubmitPhone = useCallback(() => {
    if (!phoneValid) return;
    Keyboard.dismiss();
    onClose();
    openRewardsMember(router, orderId, orderType, { phone });
  }, [phone, phoneValid, onClose, router, orderId, orderType]);

  const handleScanned = useCallback(
    (memberId: string) => {
      onClose();
      openRewardsMember(router, orderId, orderType, { memberId });
    },
    [onClose, router, orderId, orderType],
  );

  if (step === "scan") {
    return (
      <Modal visible animationType="slide" onRequestClose={() => setStep("choose")}>
        <RewardsScanner onScanned={handleScanned} onBack={() => setStep("choose")} />
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 justify-start px-5" style={{ paddingTop: insets.top + 16 }}>
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={handleClose}
            accessibilityLabel="Close rewards"
          />
          <View className="relative z-10 w-full max-w-md self-center rounded-2xl bg-white p-5 shadow-xl">
            {(deviceSignedIn || restoring) && (
              <Text className="mb-4 text-center text-lg font-bold text-gray-900">Rewards</Text>
            )}

            {restoring && (
              <View className="items-center py-6">
                <ActivityIndicator color="#DA251D" />
              </View>
            )}

            {!deviceSignedIn && !restoring && (
              <View className="items-center pt-2">
                <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                  <Ionicons name="lock-closed-outline" size={28} color="#b45309" />
                </View>
                <Text className="mb-2 text-center text-lg font-bold text-gray-900">
                  {rewardsConfigured ? "Admin access required" : "Rewards unavailable"}
                </Text>
                <Text className="text-center text-sm text-gray-600">
                  {rewardsConfigured
                    ? "Rewards isn't set up on this device yet. Ask an admin to sign in to Rewards from the Profile tab."
                    : "Rewards isn't set up in this build."}
                </Text>
              </View>
            )}

            {deviceSignedIn && step === "choose" && (
              <View className="flex-row">
                <TouchableOpacity
                  className="mr-2 flex-1 items-center rounded-xl bg-red-600 py-5"
                  onPress={() => setStep("scan")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="qr-code-outline" size={28} color="#fff" />
                  <Text className="mt-2 font-semibold text-white">QR Code</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="ml-2 flex-1 items-center rounded-xl bg-gray-800 py-5"
                  onPress={() => setStep("phone")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="call-outline" size={28} color="#fff" />
                  <Text className="mt-2 font-semibold text-white">Phone Number</Text>
                </TouchableOpacity>
              </View>
            )}

            {deviceSignedIn && step === "phone" && (
              <>
                <Text className="mb-1 text-sm font-medium text-gray-700">Phone number</Text>
                <TextInput
                  className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-lg text-gray-900"
                  placeholder={REWARDS_PHONE_PLACEHOLDER}
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  autoFocus
                  maxLength={14}
                  value={phoneText}
                  onChangeText={(text) => setPhoneText(formatRewardsPhone(text))}
                  onSubmitEditing={handleSubmitPhone}
                />
                <TouchableOpacity
                  className={`rounded-xl bg-red-600 py-3.5 ${phoneValid ? "" : "opacity-50"}`}
                  disabled={!phoneValid}
                  onPress={handleSubmitPhone}
                  activeOpacity={0.85}
                >
                  <Text className="text-center text-base font-semibold text-white">Find member</Text>
                </TouchableOpacity>
              </>
            )}

            <View className="mt-4 flex-row">
              {step !== "choose" && (
                <TouchableOpacity
                  className="mr-2 flex-1 rounded-xl border border-gray-300 py-3.5"
                  onPress={() => setStep("choose")}
                  activeOpacity={0.85}
                >
                  <Text className="text-center text-base font-semibold text-gray-800">Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className="flex-1 rounded-xl bg-gray-800 py-3.5"
                onPress={handleClose}
                activeOpacity={0.85}
              >
                <Text className="text-center text-base font-semibold text-white">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RewardsScanner({
  onScanned,
  onBack,
}: {
  onScanned: (memberId: string) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { width } = useWindowDimensions();
  // Ref, not state: the camera can fire several events before a re-render.
  const scannedRef = useRef(false);

  const frameSize = useMemo(
    () => Math.max(200, Math.min(320, Math.floor(width * 0.62))),
    [width],
  );

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (scannedRef.current) return;
      const id = data.trim().split("/").pop();
      if (!id) return;
      scannedRef.current = true;
      onScanned(id);
    },
    [onScanned],
  );

  const backButton = (
    <TouchableOpacity
      className="absolute left-4 z-10 flex-row items-center rounded-full bg-black/60 px-4 py-2"
      style={{ top: insets.top + 12 }}
      onPress={onBack}
      activeOpacity={0.85}
    >
      <Ionicons name="chevron-back" size={20} color="#fff" />
      <Text className="ml-1 font-semibold text-white">Back</Text>
    </TouchableOpacity>
  );

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        {backButton}
        <Text className="text-gray-500">Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        {backButton}
        <Ionicons name="camera-outline" size={32} color="#DA251D" />
        <Text className="mb-5 mt-3 text-center text-base text-gray-600">
          Camera access is required to scan rewards QR codes.
        </Text>
        <TouchableOpacity
          className="rounded-xl bg-red-600 px-6 py-3"
          onPress={requestPermission}
          activeOpacity={0.85}
        >
          <Text className="font-semibold text-white">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={handleBarcode}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />
      <View
        className="absolute inset-0 items-center justify-center"
        style={{ pointerEvents: "none" }}
      >
        <View
          className="rounded-xl border-2 border-white"
          style={{ width: frameSize, height: frameSize }}
        />
        <Text className="mt-4 text-sm text-white opacity-80">
          Align the rewards QR code within the frame
        </Text>
      </View>
      {backButton}
    </View>
  );
}
