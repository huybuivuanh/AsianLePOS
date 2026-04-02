// app/layout.tsx (Expo)
import { AuthProvider } from "@/providers/AuthProvider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import "../global.css";

const rootGestureStyle =
  Platform.OS === "web"
    ? { flex: 1, width: "100%" as const, minHeight: "100%" as const }
    : { flex: 1 };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GestureHandlerRootView style={rootGestureStyle}>
      <BottomSheetModalProvider>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <AuthProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { flex: 1, width: "100%" },
              }}
            >
              {children}
            </Stack>
          </AuthProvider>
        </SafeAreaProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
