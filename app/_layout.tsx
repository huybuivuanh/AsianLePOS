// app/layout.tsx (Expo)
import { AuthProvider } from "@/providers/AuthProvider";
import { loadCachedMenu } from "@/stores/useMenuStore";
import { useNetworkStore } from "@/stores/useNetworkStore";
import OfflineBanner from "@/ui/OfflineBanner";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { enableNetwork } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { db } from "@/lib/firebaseConfig";
import "../global.css";

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

const rootGestureStyle =
  Platform.OS === "web"
    ? { flex: 1, width: "100%" as const, minHeight: "100%" as const }
    : { flex: 1 };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [resetKey, setResetKey] = useState(0);
  const backgroundTimeRef = useRef<number | null>(null);

  // After 5 min of inactivity, reset to home with fresh Firestore listeners.
  // Web: navigate to root (avoids 404 on deep routes in the static export).
  // Native: remount the navigation tree (Stack resets to initial route).
  useEffect(() => {
    if (Platform.OS === "web") {
      // Tab hidden then visible after 5 min → reload.
      let hiddenAt: number | null = null;
      const handleVisibility = () => {
        if (document.visibilityState === "hidden") {
          hiddenAt = hiddenAt ?? Date.now();
        } else if (hiddenAt !== null) {
          if (Date.now() - hiddenAt >= INACTIVITY_TIMEOUT_MS) {
            window.location.replace("/");
          }
          hiddenAt = null;
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);

      // Tab stays open but no interaction for 5 min → reload.
      let inactivityTimer: ReturnType<typeof setTimeout>;
      const resetInactivityTimer = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => window.location.replace("/"), INACTIVITY_TIMEOUT_MS);
      };
      const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
      events.forEach((e) => document.addEventListener(e, resetInactivityTimer, { passive: true }));
      resetInactivityTimer();

      return () => {
        document.removeEventListener("visibilitychange", handleVisibility);
        events.forEach((e) => document.removeEventListener(e, resetInactivityTimer));
        clearTimeout(inactivityTimer);
      };
    }

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== "active") {
        if (backgroundTimeRef.current === null)
          backgroundTimeRef.current = Date.now();
      } else {
        const t = backgroundTimeRef.current;
        backgroundTimeRef.current = null;
        if (t !== null && Date.now() - t >= INACTIVITY_TIMEOUT_MS) {
          void enableNetwork(db);
          setResetKey((k) => k + 1);
        }
      }
    };
    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, []);

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
  useEffect(() => {
    void loadCachedMenu();
  }, []);

  if (webFontsBlocking) {
    return null;
  }

  return (
    <GestureHandlerRootView style={rootGestureStyle}>
      <BottomSheetModalProvider>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <AuthProvider>
            <View key={resetKey} style={{ flex: 1 }}>
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
