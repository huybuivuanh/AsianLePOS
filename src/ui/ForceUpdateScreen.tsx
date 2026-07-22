import { Linking, Text, TouchableOpacity, View } from "react-native";

export default function ForceUpdateScreen({ updateUrl }: { updateUrl?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-100 px-8">
      <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
        Update Required
      </Text>
      <Text className="text-base text-gray-600 mb-6 text-center">
        A new version of this app is required to continue. Please update to
        keep using it.
      </Text>
      {updateUrl && (
        <TouchableOpacity
          onPress={() => Linking.openURL(updateUrl)}
          activeOpacity={0.8}
          className="bg-blue-600 px-8 py-4 rounded-lg"
        >
          <Text className="text-white font-semibold text-base">
            Update Now
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
