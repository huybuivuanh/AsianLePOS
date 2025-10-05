import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { auth } from "../../lib/firebaseConfig";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <View className="flex-1 justify-center p-5 bg-gray-100">
      <Text className="text-2xl font-bold text-center mb-6">Login</Text>

      {error && <Text className="text-red-500 mb-4">{error}</Text>}

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        className="border rounded-lg px-3 py-2 mb-4"
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border rounded-lg px-3 py-2 mb-4"
      />

      <Pressable onPress={handleLogin} className="bg-blue-600 py-2 rounded-lg">
        <Text className="text-white text-center font-semibold">Login</Text>
      </Pressable>
    </View>
  );
}
