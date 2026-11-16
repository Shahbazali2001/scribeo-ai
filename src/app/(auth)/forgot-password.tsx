import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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

  const [email, setEmail] = useState('alex.morgan@example.com');
  const [newPassword, setNewPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setError(null);
    const res = appStore.resetPassword(email, newPassword || undefined);
    if (!res.ok) {
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
            Enter your account email and optional new password to reset access immediately.
          </Text>

          {sent ? (
            <View
              style={[
                styles.successBox,
                { backgroundColor: palette.successSoft, borderColor: palette.success },
              ]}>
              <Text style={{ color: palette.success, fontSize: 16, fontWeight: '800' }}>
                ✓ Password Reset Complete
              </Text>
              <Text
                style={{
                  color: palette.text,
                  fontSize: 13,
                  marginTop: 6,
                  lineHeight: 19,
                }}>
                Your password has been updated for {email}. You can now sign in with your new credentials.
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
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.bgInput,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
              />

              <Text style={[styles.label, { color: palette.textSecondary, marginTop: 14 }]}>
                NEW PASSWORD (OPTIONAL FOR DEMO RESET)
              </Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password (min 6 chars)"
                placeholderTextColor={palette.textMuted}
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
                style={[styles.primaryBtn, { backgroundColor: palette.primary, marginTop: 18 }]}>
                <Text style={styles.primaryBtnText}>Reset Password</Text>
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
