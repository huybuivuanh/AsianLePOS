// app/(tabs)/_layout.tsx
import { useForceUpdate } from "@/hooks/useForceUpdate";
import { useAuth } from "@/providers/AuthProvider";
import { useAddExtrasStore } from "@/stores/useAddExtrasStore";
import { useCartStore } from "@/stores/useCartStore";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { useCustomersStore } from "@/stores/useCustomersStore";
import { useDineInOrdersStore } from "@/stores/useDineInOrdersStore";
import { useMenuChangesStore } from "@/stores/useMenuChangesStore";
import { useMenuStore } from "@/stores/useMenuStore";
import { useStaffStore } from "@/stores/useStaffStore";
import { useTableStore } from "@/stores/useTableStore";
import { useTakeOutOrdersStore } from "@/stores/useTakeOutOrdersStore";
import ForceUpdateScreen from "@/ui/ForceUpdateScreen";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform, Text, View } from "react-native";

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

const TAB_SCREEN_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor: "#1D4ED8",
  tabBarInactiveTintColor: "#6B7280",
  tabBarStyle: { backgroundColor: "#F3F4F6", height: 80 },
  tabBarLabelStyle: { fontSize: 12, marginBottom: 5 },
  sceneStyle: {
    flex: 1,
    width: "100%" as const,
    ...(Platform.OS === "web" ? { alignSelf: "stretch" as const } : {}),
  },
} as const;

export default function TabsLayout() {
  const { user, loading: authLoading } = useAuth();
  const { updateRequired, updateUrl } = useForceUpdate(!!user);
  const router = useRouter();
  const {
    subscribeToMenuVersion,
    clearData: clearMenu,
  } = useMenuStore();
  const { subscribeToTakeOutOrders, clearData: clearTakeOutOrders } =
    useTakeOutOrdersStore();
  const { subscribeToDineInOrders, clearData: clearDineInOrdersTab } =
    useDineInOrdersStore();
  const { subscribeToTables, clearData: clearTables } = useTableStore();
  const { subscribeToCustomersVersion, clearData: clearCustomers } =
    useCustomersStore();
  const { subscribeToMenuChanges, clearData: clearMenuChanges } = useMenuChangesStore();
  const { subscribeToAddExtras, clearData: clearAddExtras } = useAddExtrasStore();
  const { subscribeToCredits, clearData: clearCredits } = useCreditsStore();
  const { fetchStaff, clearData: clearStaff } = useStaffStore();
  const { clearOrder } = useCartStore();

  // Redirect to login if not authenticated and clear data
  useEffect(() => {
    if (!authLoading && !user) {
      // Clear all store data when user logs out to prevent memory leaks
      clearMenu();
      clearTakeOutOrders();
      clearDineInOrdersTab();
      clearTables();
      clearCustomers();
      clearMenuChanges();
      clearAddExtras();
      clearCredits();
      clearStaff();
      clearOrder();
      router.push("/login");
    }
  }, [
    user,
    authLoading,
    router,
    clearMenu,
    clearTakeOutOrders,
    clearDineInOrdersTab,
    clearTables,
    clearCustomers,
    clearMenuChanges,
    clearAddExtras,
    clearCredits,
    clearStaff,
    clearOrder,
  ]);

  const unsubsRef = useRef<(() => void)[]>([]);

  const stopListeners = useCallback(() => {
    unsubsRef.current.forEach((fn) => fn());
    unsubsRef.current = [];
  }, []);

  const startListeners = useCallback(() => {
    stopListeners();
    const unsubs: (() => void)[] = [];
    const add = (fn: (() => void) | undefined) => { if (fn) unsubs.push(fn); };
    add(subscribeToMenuVersion());
    add(subscribeToTakeOutOrders());
    add(subscribeToDineInOrders());
    add(subscribeToCustomersVersion());
    add(subscribeToCredits());
    add(subscribeToMenuChanges());
    add(subscribeToAddExtras());
    void fetchStaff();
    unsubsRef.current = unsubs;

    let active = true;
    subscribeToTables().then((unsub) => {
      if (active && unsub) unsubsRef.current.push(unsub);
      else unsub?.();
    });

    return () => { active = false; };
  }, [
    stopListeners,
    subscribeToMenuVersion,
    subscribeToTakeOutOrders,
    subscribeToDineInOrders,
    subscribeToCustomersVersion,
    subscribeToCredits,
    subscribeToMenuChanges,
    subscribeToAddExtras,
    fetchStaff,
    subscribeToTables,
  ]);

  useEffect(() => {
    if (!user) return;
    const cleanup = startListeners();
    return () => {
      cleanup?.();
      stopListeners();
    };
  }, [user, startListeners, stopListeners]);

  // Tear down listeners only after a long background period to prevent
  // use-after-free crashes from stale Firebase callbacks firing against
  // memory iOS reclaimed during a long background period.
  // Short background events (phone lock, app switch) are ignored — Firebase
  // reconnects automatically and restarting would cost hundreds of reads.
  const backgroundAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!user) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        backgroundAtRef.current = Date.now();
      } else if (state === "active") {
        const elapsed = backgroundAtRef.current ? Date.now() - backgroundAtRef.current : 0;
        backgroundAtRef.current = null;
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          startListeners();
        }
      }
    });
    return () => sub.remove();
  }, [user, startListeners, stopListeners]);

  if (authLoading || !user) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-lg font-medium">Loading...</Text>
      </View>
    );
  }

  if (updateRequired) {
    return <ForceUpdateScreen updateUrl={updateUrl} />;
  }

  return (
    <Tabs screenOptions={TAB_SCREEN_OPTIONS}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Take Out",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fast-food-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="take-out-orders"
        options={{
          title: "Out Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bag-handle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="tables"
        options={{
          title: "Tables",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dine-in-orders"
        options={{
          title: "In Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
