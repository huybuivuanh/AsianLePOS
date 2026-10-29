import { useRewardsAuthStore } from "@/stores/useRewardsAuthStore";
import { FirebaseError } from "firebase/app";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

const signInErrorMessage = (err: unknown) => {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
      case "auth/invalid-email":
        return "Wrong email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again in a few minutes.";
      case "auth/network-request-failed":
        return "No connection. Check the internet and try again.";
    }
  }
  return "Could not sign in. Try again.";
};

/** Profile tab section: sign this device into the Rewards project once. */
export default function RewardsDeviceCard() {
  const configured = useRewardsAuthStore((s) => s.configured);
  const ready = useRewardsAuthStore((s) => s.ready);
  const user = useRewardsAuthStore((s) => s.user);
  const isPosAccount = useRewardsAuthStore((s) => s.isPosAccount);
  const signIn = useRewardsAuthStore((s) => s.signIn);
  const signOut = useRewardsAuthStore((s) => s.signOut);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      setPassword("");
    } catch (err) {
      setError(signInErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [email, password, signIn]);

  const handleSignOut = useCallback(async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  }, [signOut]);

  return (
    <View className="mt-5 bg-gray-50 border border-gray-200 rounded-2xl p-4">
      <Text className="text-base font-bold text-gray-900">Rewards</Text>

      {!configured ? (
        <Text className="text-sm text-gray-500 mt-0.5">
          Rewards isn&apos;t set up in this build (missing
          EXPO_PUBLIC_REWARDS_FIREBASE_* values).
        </Text>
      ) : !ready ? (
        <ActivityIndicator className="mt-3 self-start" />
      ) : user ? (
        <>
          <Text className="text-sm text-gray-500 mt-0.5">
            This device is signed in to Rewards.
          </Text>
          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text
                className="text-sm font-semibold text-gray-900"
                numberOfLines={1}
              >
                {user.email}
              </Text>
              {!isPosAccount && (
                <Text className="text-xs text-amber-700 mt-0.5">
                  This account doesn&apos;t have POS access yet (role: pos).
                </Text>
              )}
            </View>
            <Pressable
              onPress={handleSignOut}
              disabled={busy}
              className={`rounded-xl border border-gray-300 bg-white px-4 py-2.5 ${busy ? "opacity-60" : ""}`}
            >
              <Text className="font-semibold text-gray-800">Sign out</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text className="text-sm text-gray-500 mt-0.5">
            Sign this device in once to collect and redeem points.
          </Text>
          <TextInput
            className="mt-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            className="mt-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleSignIn}
          />
          {error && <Text className="mt-2 text-sm text-red-600">{error}</Text>}
          <Pressable
            onPress={handleSignIn}
            disabled={busy || !email.trim() || !password}
            className={`mt-3 rounded-xl bg-red-600 py-3 items-center ${
              busy || !email.trim() || !password ? "opacity-60" : ""
            }`}
          >
            <Text className="font-semibold text-white">
              {busy ? "Signing in…" : "Sign in to Rewards"}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
