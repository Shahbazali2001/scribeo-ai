import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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

  const handleRegister = async () => {
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const res = appStore.signUpWithEmail(displayName, email, password);
    if (!res.ok) {
      await triggerHaptic('error');
      setError(res.error || 'Could not create account.');
      return;
    }

    await triggerHaptic('success');
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
              <Text style={[styles.label, { color: palette.textSecondary }]}>
                PASSWORD (MIN 8 CHARACTERS)
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="At least 8 characters"
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
                CONFIRM PASSWORD
              </Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Re-enter your password"
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

            <Pressable
              onPress={handleRegister}
              style={[styles.primaryBtn, { backgroundColor: palette.primary }]}>
              <Text style={styles.primaryBtnText}>Create Free Account →</Text>
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
});
