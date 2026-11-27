import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React, { ComponentProps } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '@/hooks/use-app-store';
import { useAppTheme } from '@/hooks/use-app-theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabBarItem({
  label,
  icon,
  activeIcon,
  focused,
  activeColor,
  inactiveColor,
  activeBg,
}: {
  label: string;
  icon: IoniconName;
  activeIcon: IoniconName;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
  activeBg: string;
}) {
  const color = focused ? activeColor : inactiveColor;

  return (
    <View style={styles.tabItem}>
      <View
        style={[
          styles.iconPill,
          focused ? { backgroundColor: activeBg } : null,
        ]}>
        <Ionicons
          name={focused ? activeIcon : icon}
          size={21}
          color={color}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.labelText,
          { color, fontWeight: focused ? '700' : '600' },
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
          height: Platform.OS === 'ios' ? 86 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          elevation: 8,
        },
        tabBarItemStyle: {
          height: 52,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabBarItem
              label="Home"
              icon="home-outline"
              activeIcon="home"
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
            <TabBarItem
              label="Scan"
              icon="scan-outline"
              activeIcon="scan"
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
            <TabBarItem
              label="History"
              icon="time-outline"
              activeIcon="time"
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
            <TabBarItem
              label="Settings"
              icon="settings-outline"
              activeIcon="settings"
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
    minWidth: 64,
    gap: 3,
  },
  iconPill: {
    width: 46,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
