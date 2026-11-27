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

import { useAppStore } from '@/hooks/use-app-store';
import { useAppTheme } from '@/hooks/use-app-theme';
import { triggerHaptic } from '@/lib/device';
import { appStore } from '@/store/app-store';

export default function LoginScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const themeSetting = useAppStore((s) => s.profile.settings.theme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const toggleTheme = () => {
    const next = palette.isDark ? 'light' : 'dark';
    appStore.updateProfile({ settings: { theme: next } });
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    await triggerHaptic('light');

    const result = await appStore.signInWithEmail(email, password);
    setLoading(false);

    if (!result.ok) {
      await triggerHaptic('error');
      setError(result.error || 'Could not sign in.');
      return;
    }

    await triggerHaptic('success');
    router.replace('/(tabs)' as never);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    await triggerHaptic('light');

    const result = await appStore.signInWithGoogle();
    setGoogleLoading(false);

    if (result.cancelled) {
      return;
    }

    if (!result.ok) {
      await triggerHaptic('error');
      setError(result.error || 'Could not sign in with Google.');
      return;
    }

    await triggerHaptic('success');
    if (Platform.OS !== 'web') {
      router.replace('/(tabs)' as never);
    }
  };

  const handleQuickDemo = async () => {
    setError(null);
    await triggerHaptic('success');
    appStore.signInDemo();
    router.replace('/(tabs)' as never);
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
          {/* Top Bar with Theme Switcher */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.pillBadge,
                { backgroundColor: palette.primarySoft, borderColor: palette.border },
              ]}>
              <Text style={[styles.pillText, { color: palette.primary }]}>English Handwriting OCR</Text>
            </View>

            <Pressable
              onPress={toggleTheme}
              style={[
                styles.themeBtn,
                { backgroundColor: palette.bgCard, borderColor: palette.border },
              ]}>
              <Text style={[styles.themeBtnText, { color: palette.text }]}>
                {palette.isDark ? ' Light' : ' Dark'} ({themeSetting})
              </Text>
            </Pressable>
          </View>

          {/* Brand Hero */}
          <View style={styles.brandSection}>
            <View style={[styles.logoBox, { backgroundColor: palette.primary }]}>
              <Text style={styles.logoLetter}></Text>
            </View>
            <Text style={[styles.title, { color: palette.text }]}>Scribeo AI</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
              Scan handwritten English pages into editable text, natural speech & AI summaries.
            </Text>
          </View>

          {/* Login Form Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: palette.bgCard, borderColor: palette.border },
            ]}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              Sign in to your account
            </Text>
            <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
              Enter your email and password or continue with Google
            </Text>

            {error ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: palette.dangerSoft, borderColor: palette.danger },
                ]}>
                <Text style={[styles.errorText, { color: palette.danger }]}>
                   {error}
                </Text>
              </View>
            ) : null}

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
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: palette.textSecondary }]}>
                  PASSWORD
                </Text>
                <Pressable
                  onPress={() => router.push('/(auth)/forgot-password' as never)}>
                  <Text style={[styles.linkText, { color: palette.primary }]}>
                    Forgot password?
                  </Text>
                </Pressable>
              </View>
              <View
                style={[
                  styles.passwordWrap,
                  {
                    backgroundColor: palette.bgInput,
                    borderColor: palette.border,
                  },
                ]}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  placeholder="Enter your password"
                  placeholderTextColor={palette.textMuted}
                  editable={!busy}
                  style={[styles.passwordInput, { color: palette.text }]}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}>
                  <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: pressed ? palette.primaryHover : palette.primary,
                  opacity: busy ? 0.7 : 1,
                },
              ]}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign In</Text>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
              <Text style={[styles.dividerText, { color: palette.textMuted }]}>
                OR CONTINUE WITH
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
            </View>

            <View style={styles.socialRow}>
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={busy}
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: palette.bgInput,
                    borderColor: palette.border,
                    opacity: busy ? 0.7 : 1,
                  },
                ]}>
                {googleLoading ? (
                  <ActivityIndicator color={palette.primary} size="small" />
                ) : (
                  <Text style={[styles.secondaryBtnText, { color: palette.text }]}>
                    Google Sign-In
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleQuickDemo}
                disabled={busy}
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: palette.primarySoft,
                    borderColor: palette.primary,
                    opacity: busy ? 0.7 : 1,
                  },
                ]}>
                <Text style={[styles.secondaryBtnText, { color: palette.primary }]}>
                  Instant Demo
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={{ color: palette.textSecondary, fontSize: 14 }}>
              Don&apos;t have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/register' as never)}>
              <Text style={[styles.footerLink, { color: palette.primary }]}>
                Create free account
              </Text>
            </Pressable>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  themeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  themeBtnText: { fontSize: 12, fontWeight: '600' },
  brandSection: { alignItems: 'center', marginBottom: 24 },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoLetter: { fontSize: 30 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  cardTitle: { fontSize: 20, fontWeight: '800' },
  cardSubtitle: { fontSize: 13, marginTop: 4, marginBottom: 18 },
  errorBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, fontWeight: '600' },
  fieldGroup: { marginBottom: 16 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  linkText: { fontSize: 12, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 8,
  },
  passwordInput: { flex: 1, paddingVertical: 13, fontSize: 14 },
  eyeBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 10, fontSize: 11, fontWeight: '700' },
  socialRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  footerLink: { fontSize: 14, fontWeight: '800' },
});
