// app/(tabs)/layout.tsx
import ModalProvider from "@/providers/ModalProvider";
import { useLiveOrdersStore } from "@/stores/useLiveOrdersStore";
import { loadCachedMenu, useMenuStore } from "@/stores/useMenuStore";
import { useOrderHistoryStore } from "@/stores/useOrderHistoryStore";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useAuth } from "../../providers/AuthProvider";

export default function TabsLayout() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { subscribeToMenuVersion, loading: menuLoading } = useMenuStore();
  const { subscribeToLiveOrders } = useLiveOrdersStore();
  const { subscribeToOrderHistory } = useOrderHistoryStore();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    loadCachedMenu();
    const unsubscribe = subscribeToMenuVersion();
    const unsubscribeToLiveOrders = subscribeToLiveOrders();
    const unsubscribeToOrderHistory = subscribeToOrderHistory();

    return () => {
      unsubscribe?.();
      unsubscribeToLiveOrders?.();
      unsubscribeToOrderHistory?.();
    };
  }, [
    user,
    subscribeToMenuVersion,
    subscribeToLiveOrders,
    subscribeToOrderHistory,
  ]);

  if (authLoading || !user || menuLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-lg font-medium">Loading...</Text>
      </View>
    );
  }

  return (
    <>
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
          name="dinein"
          options={{
            title: "Dine In",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="restaurant-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="liveorders"
          options={{
            title: "Live Orders",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="orderhistory"
          options={{
            title: "History",
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
              <Ionicons
                name="person-circle-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
      </Tabs>
      <ModalProvider />
    </>
  );
}
