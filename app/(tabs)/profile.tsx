import { useAuth } from "@/providers/AuthProvider"; // adjust path
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Profile = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <SafeAreaView className="flex-1 p-5 bg-white">
      <View className="mb-4">
        <Text className="text-lg font-bold">Name:</Text>
        <Text className="text-base">{user?.displayName || "N/A"}</Text>
      </View>

      <View className="mb-6">
        <Text className="text-lg font-bold">Email:</Text>
        <Text className="text-base">{user?.email || "N/A"}</Text>
      </View>

      <Pressable
        onPress={handleLogout}
        className="bg-red-500 rounded-lg py-3 px-5 items-center"
      >
        <Text className="text-white font-semibold">Logout</Text>
      </Pressable>
    </SafeAreaView>
  );
};

export default Profile;
