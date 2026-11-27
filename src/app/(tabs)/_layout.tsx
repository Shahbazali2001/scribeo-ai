import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '@/hooks/use-app-store';
import { useAppTheme } from '@/hooks/use-app-theme';

function TabLabel({
  label,
  focused,
  activeColor,
  inactiveColor,
  activeBg,
}: {
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
          height: Platform.OS === 'ios' ? 76 : 60,
          paddingBottom: Platform.OS === 'ios' ? 16 : 8,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabLabel
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
            <TabLabel
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
            <TabLabel
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
            <TabLabel
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
    paddingVertical: 7,
    borderRadius: 14,
  },
  labelText: { fontSize: 12, fontWeight: '700' },
});