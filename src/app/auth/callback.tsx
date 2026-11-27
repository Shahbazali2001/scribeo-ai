import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();

  useEffect(() => {
    let active = true;

    async function finishAuth() {
      try {
        // Supabase JS (detectSessionInUrl: true on web) may already have exchanged the code.
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (existingSession) {
          if (active) router.replace('/(tabs)' as never);
          return;
        }

        const code = typeof params.code === 'string' ? params.code : undefined;
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (active) {
            router.replace((session ? '/(tabs)' : '/(auth)/login') as never);
          }
          return;
        }

        if (active) {
          router.replace('/(auth)/login' as never);
        }
      } catch {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (active) {
          router.replace((session ? '/(tabs)' : '/(auth)/login') as never);
        }
      }
    }

    void finishAuth();

    return () => {
      active = false;
    };
  }, [params.code, router]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={[styles.title, { color: palette.text }]}>
          Completing Google Sign-In...
        </Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          Verifying your Supabase session
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
  },
});
