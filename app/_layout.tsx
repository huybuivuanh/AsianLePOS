// app/layout.tsx (Expo)
import { Stack } from "expo-router";
import "../global.css";
import { AuthProvider } from "../providers/AuthProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>{children}</Stack>;
    </AuthProvider>
  );
}
