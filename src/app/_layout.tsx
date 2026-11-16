import "@/global.css";

import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { useAppStore } from "@/hooks/use-app-store";
import { useAppTheme } from "@/hooks/use-app-theme";

SplashScreen.preventAutoHideAsync().catch(() => {
  // ignore
});

export default function RootLayout() {
  const palette = useAppTheme();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // ignore
    });
  }, []);

  useEffect(() => {
    if (!navigationState?.key) return;

    const firstSegment = String(segments[0] ?? "");
    const inAuthGroup =
      firstSegment === "(auth)" ||
      firstSegment === "login" ||
      firstSegment === "register" ||
      firstSegment === "forgot-password";
    const isPrivacyModal = firstSegment === "privacy";

    if (!isAuthenticated && !inAuthGroup && !isPrivacyModal) {
      router.replace("/(auth)/login" as never);
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)" as never);
    }
  }, [isAuthenticated, segments, navigationState?.key, router]);

  return (
    <ThemeProvider value={palette.isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={palette.isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="scan/[id]"
          options={{
            presentation: "card",
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="privacy"
          options={{
            presentation: "modal",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
