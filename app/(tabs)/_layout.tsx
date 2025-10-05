// app/(tabs)/layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useAuth } from "../../providers/AuthProvider";

export default function TabsLayout() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!user) {
      router.push("/login"); // redirect to login if not authenticated
    }
  }, [user, router]);

  if (!user)
    return (
      <View>
        <Text>Loading</Text>
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1D4ED8", // blue
        tabBarInactiveTintColor: "#6B7280", // gray
        tabBarStyle: { backgroundColor: "#F3F4F6", height: 65 },
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
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
