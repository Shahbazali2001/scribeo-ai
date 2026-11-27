import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';
import { triggerHaptic } from '@/lib/device';
import { appStore } from '@/store/app-store';

export default function RegisterScreen() {
  const router = useRouter();
  const palette = useAppTheme();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    await triggerHaptic('light');
    const res = await appStore.signUpWithEmail(displayName, email, password);
    setLoading(false);

    if (!res.ok) {
      await triggerHaptic('error');
      setError(res.error || 'Could not create account.');
      return;
    }

    await triggerHaptic('success');
    if (res.needsEmailConfirmation) {
      setNeedsConfirmation(true);
      return;
    }
    router.replace('/(tabs)' as never);
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setGoogleLoading(true);
    await triggerHaptic('light');

    const res = await appStore.signInWithGoogle();
    setGoogleLoading(false);

    if (res.cancelled) {
      return;
    }

    if (!res.ok) {
      await triggerHaptic('error');
      setError(res.error || 'Could not sign up with Google.');
      return;
    }

    await triggerHaptic('success');
    if (Platform.OS !== 'web') {
      router.replace('/(tabs)' as never);
    }
  };

  const busy = loading || googleLoading;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
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

          <Text style={[styles.title, { color: palette.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            Includes 30 free daily handwriting scans and 20 AI summaries.
          </Text>

          <View
            style={[
              styles.card,
              { backgroundColor: palette.bgCard, borderColor: palette.border },
            ]}>
            {needsConfirmation ? (
              <View
                style={[
                  styles.successBox,
                  { backgroundColor: palette.successSoft, borderColor: palette.success },
                ]}>
                <Text style={{ color: palette.success, fontSize: 16, fontWeight: '800' }}>
                  ✓ Check Your Email
                </Text>
                <Text
                  style={{
                    color: palette.text,
                    fontSize: 13,
                    marginTop: 6,
                    lineHeight: 19,
                  }}>
                  We sent a verification link to {email.trim()}. Confirm your email address, then
                  return to Sign In.
                </Text>
                <Pressable
                  onPress={() => router.replace('/(auth)/login' as never)}
                  style={[styles.primaryBtn, { backgroundColor: palette.primary, marginTop: 16 }]}>
                  <Text style={styles.primaryBtnText}>Return to Sign In</Text>
                </Pressable>
              </View>
            ) : (
              <>
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

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: palette.textSecondary }]}>
                    FULL NAME
                  </Text>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Alex Morgan"
                    placeholderTextColor={palette.textMuted}
                    editable={!busy}
                    style={[
                      styles.input,
                      {
                        backgroundColor: palette.bgInput,
                        borderColor: palette.border,
                        color: palette.text,
                      },
                    ]}
                  />
                </View>

                <View style={styles.fieldGroup}>
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
                    editable={!busy}
                    style={[
                      styles.input,
                      {
                        backgroundColor: palette.bgInput,
                        borderColor: palette.border,
                        color: palette.text,
                      },
                    ]}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: palette.textSecondary }]}>
                    PASSWORD (MIN 8 CHARACTERS)
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="At least 8 characters"
                    placeholderTextColor={palette.textMuted}
                    editable={!busy}
                    style={[
                      styles.input,
                      {
                        backgroundColor: palette.bgInput,
                        borderColor: palette.border,
                        color: palette.text,
                      },
                    ]}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: palette.textSecondary }]}>
                    CONFIRM PASSWORD
                  </Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="Re-enter your password"
                    placeholderTextColor={palette.textMuted}
                    editable={!busy}
                    style={[
                      styles.input,
                      {
                        backgroundColor: palette.bgInput,
                        borderColor: palette.border,
                        color: palette.text,
                      },
                    ]}
                  />
                </View>

                <Pressable
                  onPress={handleRegister}
                  disabled={busy}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: palette.primary, opacity: busy ? 0.7 : 1 },
                  ]}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Create Free Account →</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleGoogleRegister}
                  disabled={busy}
                  style={[
                    styles.googleBtn,
                    {
                      backgroundColor: palette.bgInput,
                      borderColor: palette.border,
                      opacity: busy ? 0.7 : 1,
                    },
                  ]}>
                  {googleLoading ? (
                    <ActivityIndicator color={palette.primary} size="small" />
                  ) : (
                    <Text style={[styles.googleBtnText, { color: palette.text }]}>
                      🌐 Sign up with Google
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
    marginBottom: 18,
  },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  card: { borderRadius: 24, borderWidth: 1, padding: 22 },
  successBox: { borderRadius: 16, borderWidth: 1, padding: 16 },
  errorBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  googleBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  googleBtnText: { fontSize: 13, fontWeight: '700' },
});
