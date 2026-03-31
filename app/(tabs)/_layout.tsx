// app/(tabs)/_layout.tsx
import { useActiveDineInOrdersStore } from "@/stores/useActiveDineInOrdersStore";
import { useDineInOrdersStore } from "@/stores/useDineInOrdersStore";
import { loadCachedMenu, useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { useTakeOutOrdersStore } from "@/stores/useTakeOutOrdersStore";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/providers/AuthProvider";

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
  const { subscribeToActiveDineInOrders, clearData: clearActiveDineIn } =
    useActiveDineInOrdersStore();
  const { subscribeToTables, clearData: clearTables } = useTableStore();
  const { clearOrder } = useOrderStore();

  // Redirect to login if not authenticated and clear data
  useEffect(() => {
    if (!authLoading && !user) {
      // Clear all store data when user logs out to prevent memory leaks
      clearMenu();
      clearTakeOutOrders();
      clearDineInOrdersTab();
      clearActiveDineIn();
      clearTables();
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
    clearOrder,
  ]);

  // Subscriptions setup
  useEffect(() => {
    if (!user) return;

    loadCachedMenu();

    let isMounted = true;
    let cleanup: (() => void) | undefined;

    const unsubscribeAll = async () => {
      if (!isMounted) return;

      const unsubscribeMenu = subscribeToMenuVersion();
      const unsubscribeTakeOut = subscribeToTakeOutOrders();
      const unsubscribeDineInTab = subscribeToDineInOrders();
      const unsubscribeActiveDineIn = subscribeToActiveDineInOrders();

      // ✅ Handle async subscribeToTables
      const unsubscribeTables = await subscribeToTables();

      if (!isMounted) {
        // Clean up immediately if component unmounted during async operation
        unsubscribeMenu?.();
        unsubscribeTakeOut?.();
        unsubscribeDineInTab?.();
        unsubscribeActiveDineIn?.();
        unsubscribeTables?.();
        return;
      }

      return () => {
        unsubscribeMenu?.();
        unsubscribeTakeOut?.();
        unsubscribeDineInTab?.();
        unsubscribeActiveDineIn?.();
        unsubscribeTables?.();
      };
    };

    unsubscribeAll().then((unsub) => {
      if (isMounted) {
        cleanup = unsub;
      }
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [
    user,
    subscribeToMenuVersion,
    subscribeToTakeOutOrders,
    subscribeToDineInOrders,
    subscribeToActiveDineInOrders,
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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1D4ED8",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: { backgroundColor: "#F3F4F6", height: 80 },
        tabBarLabelStyle: { fontSize: 12, marginBottom: 5 },
      }}
    >
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
        name="dine-in"
        options={{
          title: "Dine In",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="take-out-orders"
        options={{
          title: "Take Out Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bag-handle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dine-in-orders"
        options={{
          title: "Dine In Orders",
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
