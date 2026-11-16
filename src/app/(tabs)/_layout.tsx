import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '@/hooks/use-app-store';
import { useAppTheme } from '@/hooks/use-app-theme';

function TabIcon({
  icon,
  label,
  focused,
  activeColor,
  inactiveColor,
  activeBg,
}: {
  icon: string;
  label: string;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
  activeBg: string;
}) {
  return (
    <View
      style={[
        styles.tabItem,
        focused ? { backgroundColor: activeBg } : null,
      ]}>
      <Text style={[styles.iconText, { opacity: focused ? 1 : 0.65 }]}>{icon}</Text>
      <Text
        style={[
          styles.labelText,
          { color: focused ? activeColor : inactiveColor },
        ]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const palette = useAppTheme();

  if (!isAuthenticated) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: palette.tabBarBg,
          borderTopColor: palette.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 70,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="🏠"
              label="Home"
              focused={focused}
              activeColor={palette.primary}
              inactiveColor={palette.textMuted}
              activeBg={palette.primarySoft}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="📷"
              label="Scan"
              focused={focused}
              activeColor={palette.primary}
              inactiveColor={palette.textMuted}
              activeBg={palette.primarySoft}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="📚"
              label="History"
              focused={focused}
              activeColor={palette.primary}
              inactiveColor={palette.textMuted}
              activeBg={palette.primarySoft}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="⚙️"
              label="Settings"
              focused={focused}
              activeColor={palette.primary}
              inactiveColor={palette.textMuted}
              activeBg={palette.primarySoft}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 14,
  },
  iconText: { fontSize: 18 },
  labelText: { fontSize: 11, fontWeight: '700', marginTop: 2 },
});
