import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

const Profile = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = (user?.displayName || user?.email || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white" includeBottomInset={false}>
      <View className="p-5">
        {/* Header card */}
        <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-blue-100 border border-blue-200 items-center justify-center">
              <Text className="text-blue-800 font-extrabold text-lg">
                {initials || "?"}
              </Text>
            </View>
            <View className="ml-4 flex-1">
              <Text
                className="text-xl font-extrabold text-gray-900"
                numberOfLines={1}
              >
                {user?.displayName || "Staff"}
              </Text>
              <Text className="text-sm text-gray-600" numberOfLines={1}>
                {user?.email || "No email"}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row justify-between">
            <View className="flex-1 bg-white border border-gray-200 rounded-xl p-3 mr-2">
              <Text className="text-xs text-gray-500">Role</Text>
              <Text className="text-base font-bold text-gray-900">Staff</Text>
            </View>
            <View className="flex-1 bg-white border border-gray-200 rounded-xl p-3 ml-2">
              <Text className="text-xs text-gray-500">Status</Text>
              <Text className="text-base font-bold text-green-700">Online</Text>
            </View>
          </View>
        </View>

        <View className="mt-5">
          <Pressable
            onPress={handleLogout}
            className="bg-red-500 rounded-xl py-4 px-5 items-center mt-3"
          >
            <Text className="text-white font-semibold">Logout</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaViewWrapper>
  );
};

export default Profile;
