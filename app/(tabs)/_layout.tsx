// app/(tabs)/_layout.tsx
import { useAuth } from "@/providers/AuthProvider";
import { useCustomersStore } from "@/stores/useCustomersStore";
import { useDineInOrdersStore } from "@/stores/useDineInOrdersStore";
import { loadCachedMenu, useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { useMenuChangesStore } from "@/stores/useMenuChangesStore";
import { useTakeOutOrdersStore } from "@/stores/useTakeOutOrdersStore";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform, Text, View } from "react-native";

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
  const router = useRouter();
  const {
    subscribeToMenuVersion,
    loading: menuLoading,
    clearData: clearMenu,
  } = useMenuStore();
  const { subscribeToTakeOutOrders, clearData: clearTakeOutOrders } =
    useTakeOutOrdersStore();
  const { subscribeToDineInOrders, clearData: clearDineInOrdersTab } =
    useDineInOrdersStore();
  const { subscribeToTables, clearData: clearTables } = useTableStore();
  const { subscribeToCustomers, clearData: clearCustomers } =
    useCustomersStore();
  const { clearData: clearMenuChanges } = useMenuChangesStore();
  const { clearData: clearCredits } = useCreditsStore();
  const { clearOrder } = useOrderStore();

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
      clearCredits();
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
    clearActiveDineIn,
    clearTables,
    clearCustomers,
    clearMenuChanges,
    clearCredits,
    clearOrder,
  ]);

  // Subscriptions setup
  useEffect(() => {
    if (!user) return;

    loadCachedMenu();

    // Menu changes & credits: one fetch per signed-in session (stores skip if already loaded).
    void useMenuChangesStore.getState().fetchMenuChanges();
    void useCreditsStore.getState().fetchCredits();

    // Set up all synchronous subscriptions immediately so cleanup is guaranteed
    const unsubMenu = subscribeToMenuVersion();
    const unsubTakeOut = subscribeToTakeOutOrders();
    const unsubDineInTab = subscribeToDineInOrders();
    const unsubCustomers = subscribeToCustomers();

    // subscribeToTables is async; track mount state so we can clean it up
    // immediately if the effect re-runs before the promise resolves
    let mounted = true;
    let unsubTables: (() => void) | undefined;

    subscribeToTables().then((unsub) => {
      if (mounted) {
        unsubTables = unsub;
      } else {
        unsub?.();
      }
    });

    return () => {
      mounted = false;
      unsubMenu?.();
      unsubTakeOut?.();
      unsubDineInTab?.();
      unsubCustomers?.();
      unsubTables?.();
    };
  }, [
    user,
    subscribeToMenuVersion,
    subscribeToTakeOutOrders,
    subscribeToDineInOrders,
    subscribeToCustomers,
    subscribeToTables,
  ]);

  if (authLoading || !user || menuLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-lg font-medium">Loading...</Text>
      </View>
    );
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
