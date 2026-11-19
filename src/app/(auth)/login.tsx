import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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

const GOOGLE_PRESET_ACCOUNTS = [
  {
    email: 'alex.morgan@gmail.com',
    displayName: 'Alex Morgan',
    badge: 'Personal',
  },
  {
    email: 'shahbaz.ali@gmail.com',
    displayName: 'Shahbaz Ali',
    badge: 'Developer',
  },
  {
    email: 'research.team@scribeo.ai',
    displayName: 'Scribeo Research',
    badge: 'Workspace',
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const themeSetting = useAppStore((s) => s.profile.settings.theme);

  const [email, setEmail] = useState('alex.morgan@example.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Google Account Picker modal state
  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [showCustomGoogleForm, setShowCustomGoogleForm] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleError, setGoogleError] = useState<string | null>(null);

  const toggleTheme = () => {
    const next = palette.isDark ? 'light' : 'dark';
    appStore.updateProfile({ settings: { theme: next } });
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    await triggerHaptic('light');

    const result = appStore.signInWithEmail(email, password);
    setLoading(false);

    if (!result.ok) {
      await triggerHaptic('error');
      setError(result.error || 'Could not sign in.');
      return;
    }

    await triggerHaptic('success');
    router.replace('/(tabs)' as never);
  };

  const handleOpenGooglePicker = async () => {
    setError(null);
    setGoogleError(null);
    setShowCustomGoogleForm(false);
    await triggerHaptic('light');
    setGoogleModalVisible(true);
  };

  const handleSelectGoogleAccount = async (selectedEmail: string, selectedName: string) => {
    setGoogleError(null);
    const result = appStore.signInWithGoogle({
      email: selectedEmail,
      displayName: selectedName,
    });

    if (!result.ok) {
      await triggerHaptic('error');
      setGoogleError(result.error || 'Could not sign in with Google.');
      return;
    }

    setGoogleModalVisible(false);
    await triggerHaptic('success');
    router.replace('/(tabs)' as never);
  };

  const handleCustomGoogleSubmit = async () => {
    setGoogleError(null);
    const cleanEmail = googleEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      await triggerHaptic('error');
      setGoogleError('Please enter a valid Google email address.');
      return;
    }
    await handleSelectGoogleAccount(cleanEmail, googleName.trim());
  };

  const handleQuickDemo = async () => {
    setError(null);
    setEmail('alex.morgan@example.com');
    setPassword('password123');
    await triggerHaptic('success');
    appStore.signInWithEmail('alex.morgan@example.com', 'password123');
    router.replace('/(tabs)' as never);
  };

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
              <Text style={[styles.pillText, { color: palette.primary }]}>
                ✦ English Handwriting OCR
              </Text>
            </View>

            <Pressable
              onPress={toggleTheme}
              style={[
                styles.themeBtn,
                { backgroundColor: palette.bgCard, borderColor: palette.border },
              ]}>
              <Text style={[styles.themeBtnText, { color: palette.text }]}>
                {palette.isDark ? '☀️ Light' : '🌙 Dark'} ({themeSetting})
              </Text>
            </Pressable>
          </View>

          {/* Brand Hero */}
          <View style={styles.brandSection}>
            <View style={[styles.logoBox, { backgroundColor: palette.primary }]}>
              <Text style={styles.logoLetter}>✒️</Text>
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
              Enter your email and password or use Google Sign-In
            </Text>

            {error ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: palette.dangerSoft, borderColor: palette.danger },
                ]}>
                <Text style={[styles.errorText, { color: palette.danger }]}>
                  ⚠️ {error}
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
                  placeholder="Enter your password"
                  placeholderTextColor={palette.textMuted}
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
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: pressed ? palette.primaryHover : palette.primary,
                },
              ]}>
              <Text style={styles.primaryBtnText}>
                {loading ? 'Signing in...' : 'Sign In →'}
              </Text>
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
                onPress={handleOpenGooglePicker}
                style={[
                  styles.secondaryBtn,
                  { backgroundColor: palette.bgInput, borderColor: palette.border },
                ]}>
                <Text style={[styles.secondaryBtnText, { color: palette.text }]}>
                  🌐 Google Sign-In
                </Text>
              </Pressable>

              <Pressable
                onPress={handleQuickDemo}
                style={[
                  styles.secondaryBtn,
                  { backgroundColor: palette.primarySoft, borderColor: palette.primary },
                ]}>
                <Text style={[styles.secondaryBtnText, { color: palette.primary }]}>
                  ⚡ Instant Demo Login
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

      {/* Interactive Google Account Selector Modal */}
      <Modal
        visible={googleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGoogleModalVisible(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setGoogleModalVisible(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalCard,
              { backgroundColor: palette.bgCard, borderColor: palette.border },
            ]}>
            <View style={styles.modalHeader}>
              <View style={[styles.googleBadge, { backgroundColor: palette.primarySoft }]}>
                <Text style={[styles.googleBadgeLetter, { color: palette.primary }]}>G</Text>
              </View>
              <View style={styles.flex}>
                <Text style={[styles.modalTitle, { color: palette.text }]}>
                  Choose an account
                </Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>
                  to continue to Scribeo AI
                </Text>
              </View>
              <Pressable
                onPress={() => setGoogleModalVisible(false)}
                style={styles.closeBtn}>
                <Text style={{ color: palette.textMuted, fontSize: 18, fontWeight: '700' }}>
                  ✕
                </Text>
              </Pressable>
            </View>

            {googleError ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: palette.dangerSoft, borderColor: palette.danger },
                ]}>
                <Text style={[styles.errorText, { color: palette.danger }]}>
                  ⚠️ {googleError}
                </Text>
              </View>
            ) : null}

            {!showCustomGoogleForm ? (
              <View style={styles.accountList}>
                {GOOGLE_PRESET_ACCOUNTS.map((acct) => {
                  const initials = acct.displayName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2);
                  return (
                    <Pressable
                      key={acct.email}
                      onPress={() => handleSelectGoogleAccount(acct.email, acct.displayName)}
                      style={({ pressed }) => [
                        styles.accountRow,
                        {
                          backgroundColor: pressed ? palette.primarySoft : palette.bgInput,
                          borderColor: palette.border,
                        },
                      ]}>
                      <View style={[styles.avatarCircle, { backgroundColor: palette.primary }]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                      <View style={styles.flex}>
                        <Text style={[styles.accountName, { color: palette.text }]}>
                          {acct.displayName}
                        </Text>
                        <Text style={[styles.accountEmail, { color: palette.textSecondary }]}>
                          {acct.email}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.accountTag,
                          { backgroundColor: palette.primarySoft, borderColor: palette.border },
                        ]}>
                        <Text style={[styles.accountTagText, { color: palette.primary }]}>
                          {acct.badge}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={() => {
                    setGoogleError(null);
                    setShowCustomGoogleForm(true);
                  }}
                  style={[
                    styles.useAnotherRow,
                    { borderColor: palette.border, backgroundColor: palette.bg },
                  ]}>
                  <Text style={[styles.useAnotherText, { color: palette.primary }]}>
                    + Use another Google account
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.customGoogleForm}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: palette.textSecondary }]}>
                    GOOGLE EMAIL
                  </Text>
                  <TextInput
                    value={googleEmail}
                    onChangeText={setGoogleEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="your.name@gmail.com"
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
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: palette.textSecondary }]}>
                    DISPLAY NAME (OPTIONAL)
                  </Text>
                  <TextInput
                    value={googleName}
                    onChangeText={setGoogleName}
                    placeholder="Your Full Name"
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
                </View>

                <View style={styles.socialRow}>
                  <Pressable
                    onPress={() => {
                      setGoogleError(null);
                      setShowCustomGoogleForm(false);
                    }}
                    style={[
                      styles.secondaryBtn,
                      { backgroundColor: palette.bgInput, borderColor: palette.border },
                    ]}>
                    <Text style={[styles.secondaryBtnText, { color: palette.text }]}>
                      ← Back
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCustomGoogleSubmit}
                    style={[styles.secondaryBtn, { backgroundColor: palette.primary, borderColor: palette.primary }]}>
                    <Text style={[styles.secondaryBtnText, { color: '#FFFFFF' }]}>
                      Continue →
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  googleBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeLetter: { fontSize: 22, fontWeight: '900' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSubtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 6 },
  accountList: { gap: 10 },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  accountName: { fontSize: 14, fontWeight: '700' },
  accountEmail: { fontSize: 12, marginTop: 2 },
  accountTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  accountTagText: { fontSize: 10, fontWeight: '700' },
  useAnotherRow: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  useAnotherText: { fontSize: 13, fontWeight: '700' },
  customGoogleForm: { marginTop: 4 },
});
