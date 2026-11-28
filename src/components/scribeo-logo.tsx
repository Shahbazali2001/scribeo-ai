import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

interface ScribeoLogoProps {
  size?: number;
}

export function ScribeoLogo({ size = 68 }: ScribeoLogoProps) {
  const palette = useAppTheme();
  const radius = Math.round(size * 0.29);
  const fontSize = Math.round(size * 0.56);

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: palette.primary,
          shadowColor: palette.primary,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.innerBorder,
          {
            borderRadius: radius - 3,
          },
        ]}
      />
      <Text
        style={[
          styles.monogram,
          {
            fontSize,
            lineHeight: Math.round(fontSize * 1.12),
          },
        ]}
      >
        S
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.24,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: "0 10px 24px -6px rgba(37, 99, 235, 0.35)",
      },
    }),
  },
  innerBorder: {
    position: "absolute",
    top: 3,
    right: 3,
    bottom: 3,
    left: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
  },
  monogram: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontFamily: Platform.select({
      ios: "Georgia",
      android: "serif",
      web: "Georgia, 'Times New Roman', serif",
    }),
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
});
