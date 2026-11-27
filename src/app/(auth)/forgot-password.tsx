import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';
import { triggerHaptic } from '@/lib/device';
import { appStore } from '@/store/app-store';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const palette = useAppTheme();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setError(null);
    setLoading(true);
    const res = await appStore.resetPassword(email);
    setLoading(false);

    if (!res.ok) {
      await triggerHaptic('error');
      setError(res.error || 'Please enter a valid email address.');
      return;
    }
    await triggerHaptic('success');
    setSent(true);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.bg }]}>
      <View style={styles.container}>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            { backgroundColor: palette.bgCard, borderColor: palette.border },
          ]}>
          <Text style={{ color: palette.text, fontSize: 13, fontWeight: '700' }}>
            ← Back to Sign In
          </Text>
        </Pressable>

        <View
          style={[
            styles.card,
            { backgroundColor: palette.bgCard, borderColor: palette.border },
          ]}>
          <Text style={[styles.title, { color: palette.text }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            Enter your account email and we will send you a Supabase password recovery link.
          </Text>

          {sent ? (
            <View
              style={[
                styles.successBox,
                { backgroundColor: palette.successSoft, borderColor: palette.success },
              ]}>
              <Text style={{ color: palette.success, fontSize: 16, fontWeight: '800' }}>
                ✓ Reset Link Sent
              </Text>
              <Text
                style={{
                  color: palette.text,
                  fontSize: 13,
                  marginTop: 6,
                  lineHeight: 19,
                }}>
                If an account exists for {email.trim()}, you will receive an email with
                instructions to reset your password.
              </Text>
              <Pressable
                onPress={() => router.replace('/(auth)/login' as never)}
                style={[styles.primaryBtn, { backgroundColor: palette.primary, marginTop: 16 }]}>
                <Text style={styles.primaryBtnText}>Return to Sign In</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ marginTop: 18 }}>
              {error ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: palette.dangerSoft, borderColor: palette.danger },
                  ]}>
                  <Text style={{ color: palette.danger, fontSize: 13, fontWeight: '600' }}>
                    ⚠️ {error}
                  </Text>
                </View>
              ) : null}

              <Text style={[styles.label, { color: palette.textSecondary }]}>
                EMAIL ADDRESS
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={palette.textMuted}
                editable={!loading}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.bgInput,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
              />

              <Pressable
                onPress={handleReset}
                disabled={loading}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: palette.primary, marginTop: 18, opacity: loading ? 0.7 : 1 },
                ]}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Reset Email</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 28,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  card: { borderRadius: 24, borderWidth: 1, padding: 22 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 6, lineHeight: 19 },
  successBox: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 18 },
  errorBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
  },
  primaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
