// app/layout.tsx (Expo)
import { AuthProvider } from "@/providers/AuthProvider";
import { loadCachedMenu } from "@/stores/useMenuStore";
import { useNetworkStore } from "@/stores/useNetworkStore";
import OfflineBanner from "@/ui/OfflineBanner";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform, View } from "react-native";
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
  // Web static export: Ionicons otherwise mount before the .ttf resolves and can stay blank.
  // Preloading at root matches https://docs.expo.dev/develop/user-interface/fonts/#expo-vector-icons
  const [ioniconsReady, ioniconsError] = useFonts(
    Platform.OS === "web" ? { ...Ionicons.font } : {},
  );
  const webFontsBlocking =
    Platform.OS === "web" && !ioniconsReady && !ioniconsError;

  const startListening = useNetworkStore((s) => s.startListening);
  useEffect(() => startListening(), [startListening]);

  // Start loading the menu cache immediately — runs in parallel with auth
  // initialization so menu data is ready the moment the user is authenticated.
  useEffect(() => { void loadCachedMenu(); }, []);

  if (webFontsBlocking) {
    return null;
  }

  return (
    <GestureHandlerRootView style={rootGestureStyle}>
      <BottomSheetModalProvider>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <AuthProvider>
            <View style={{ flex: 1 }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { flex: 1, width: "100%" },
                }}
              >
                {children}
              </Stack>
              <OfflineBanner />
            </View>
          </AuthProvider>
        </SafeAreaProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
