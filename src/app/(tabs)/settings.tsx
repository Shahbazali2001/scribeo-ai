import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiClient } from '@/api/client';
import { useAppStore } from '@/hooks/use-app-store';
import { useAppTheme } from '@/hooks/use-app-theme';
import { speechManager, triggerHaptic } from '@/lib/device';
import { appStore } from '@/store/app-store';

const SPEECH_SPEEDS = [0.75, 1.0, 1.25, 1.5];

export default function SettingsScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const { isDark } = palette;
  const profile = useAppStore((s) => s.profile);
  const apiMode = useAppStore((s) => s.apiMode);
  const apiBaseUrl = useAppStore((s) => s.apiBaseUrl);

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [urlInput, setUrlInput] = useState(apiBaseUrl);
  const [savedBanner, setSavedBanner] = useState(false);
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    await triggerHaptic('success');
    await apiClient.updateMe({ displayName: displayName.trim() });
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2000);
  };

  const handleSpeedChange = async (speed: number) => {
    await triggerHaptic('light');
    await apiClient.updateMe({ settings: { speechSpeed: speed } });
    speechManager.speak(`Speech speed set to ${speed}x`, { rate: speed });
  };

  const handleThemeChange = async (theme: 'system' | 'light' | 'dark') => {
    await triggerHaptic('light');
    await apiClient.updateMe({ settings: { theme } });
  };

  const handleSignOut = async () => {
    await triggerHaptic('light');
    speechManager.stop();
    appStore.signOut();
    router.replace('/(auth)/login' as never);
  };

  const handleDeleteAccount = async () => {
    await triggerHaptic('error');
    speechManager.stop();
    setDeleteAccountModal(false);
    await apiClient.deleteMe();
    router.replace('/(auth)/login' as never);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: palette.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          Manage your profile, theme, speech speed, privacy & backend connection
        </Text>

        {savedBanner ? (
          <View
            style={[
              styles.savedBanner,
              {
                backgroundColor: palette.primarySoft,
                borderColor: palette.primary,
              },
            ]}>
            <Text style={[styles.savedBannerText, { color: palette.primary }]}>
               Profile settings updated
            </Text>
          </View>
        ) : null}

        {/* Appearance / Theme Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                Theme & Appearance
              </Text>
              <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
                Active mode: {isDark ? 'Dark (Obsidian Teal)' : 'Light (Editorial Paper)'}
              </Text>
            </View>
            <Text style={{ fontSize: 20 }}>{isDark ? '' : ''}</Text>
          </View>
          <View style={styles.segmentRow}>
            {(
              [
                { id: 'light', label: ' Light' },
                { id: 'dark', label: ' Dark' },
                { id: 'system', label: ' System' },
              ] as const
            ).map((t) => {
              const active = profile.settings.theme === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => handleThemeChange(t.id)}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: active
                        ? palette.primary
                        : palette.surfaceMuted,
                      borderColor: active ? palette.primary : palette.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.segmentBtnText,
                      { color: active ? '#FFFFFF' : palette.text },
                    ]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Profile Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            Account Profile
          </Text>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            Signed in via {profile.authProvider.toUpperCase()} ({profile.email})
          </Text>

          <View style={styles.nameRow}>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display name"
              placeholderTextColor={palette.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: palette.surfaceMuted,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
            />
            <Pressable
              onPress={handleSaveName}
              style={[styles.saveBtn, { backgroundColor: palette.primary }]}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>

        {/* Speech Speed (TTS) */}
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            Text-to-Speech (Listen) Speed
          </Text>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            Controls on-device speech playback speed for recognized text and summaries
          </Text>
          <View style={styles.segmentRow}>
            {SPEECH_SPEEDS.map((speed) => {
              const active = profile.settings.speechSpeed === speed;
              return (
                <Pressable
                  key={speed}
                  onPress={() => handleSpeedChange(speed)}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: active
                        ? palette.primary
                        : palette.surfaceMuted,
                      borderColor: active ? palette.primary : palette.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.segmentBtnText,
                      { color: active ? '#FFFFFF' : palette.text },
                    ]}>
                    {speed}x
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Privacy & Model Training Consent */}
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                Opt-in Model Accuracy Feedback
              </Text>
              <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
                Allow explicitly submitted text corrections to help fine-tune the TrOCR handwriting model.
              </Text>
            </View>
            <Switch
              value={profile.settings.consentForTraining}
              onValueChange={(val) => {
                void apiClient.updateMe({ settings: { consentForTraining: val } });
              }}
              trackColor={{ false: palette.border, true: palette.primary }}
            />
          </View>

          <View
            style={[
              styles.privacySubbox,
              {
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.border,
              },
            ]}>
            <Text style={[styles.privacyTitle, { color: palette.text }]}>
               Security & Privacy Notice
            </Text>
            <Text style={[styles.privacyBody, { color: palette.textSecondary }]}>
               Handwritten photos are stored in a private Supabase bucket and viewed via short-lived signed URLs.{'\n'}
               Location (EXIF) metadata is stripped on your device before upload.{'\n'}
               When you tap Summarize, recognized text is sent to Google Gemini API by our backend (treated strictly as data, never instructions).
            </Text>
            <Pressable
              onPress={() => router.push('/privacy' as never)}
              style={[
                styles.privacyLinkBtn,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}>
              <Text style={[styles.privacyLinkText, { color: palette.primary }]}>
                Read Full Privacy Policy 
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Backend Connection Mode */}
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            Backend API Mode (Developer)
          </Text>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            Switch between Hybrid mode (instant local + mock pipeline) and Live FastAPI Backend (`backend/`):
          </Text>
          <View style={styles.segmentRow}>
            {(['hybrid', 'live'] as const).map((m) => {
              const active = apiMode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => appStore.setApiMode(m, urlInput)}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: active
                        ? palette.primary
                        : palette.surfaceMuted,
                      borderColor: active ? palette.primary : palette.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.segmentBtnText,
                      { color: active ? '#FFFFFF' : palette.text },
                    ]}>
                    {m === 'hybrid' ? 'Hybrid (Instant)' : 'Strict Live API'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={urlInput}
            onChangeText={(v) => {
              setUrlInput(v);
              appStore.setApiMode(apiMode, v);
            }}
            autoCapitalize="none"
            placeholder="http://localhost:4000/api/v1"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.input,
              {
                marginTop: 10,
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
          />
        </View>

        {/* Account Actions */}
        <View style={styles.accountActions}>
          <Pressable
            onPress={handleSignOut}
            style={[
              styles.logoutBtn,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
            <Text style={[styles.logoutBtnText, { color: palette.text }]}>
              Sign Out ({profile.email})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setDeleteAccountModal(true)}
            style={[
              styles.deleteAccountBtn,
              {
                backgroundColor: palette.dangerSoft,
                borderColor: palette.danger,
              },
            ]}>
            <Text style={[styles.deleteAccountText, { color: palette.danger }]}>
              Delete Account & All Data
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteAccountModal(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: palette.surface, borderColor: palette.danger },
            ]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              Delete Your Account?
            </Text>
            <Text style={[styles.modalBody, { color: palette.textSecondary }]}>
              This action is irreversible. Your profile, all saved scans, private images in Supabase Storage, and generated summaries will be permanently erased (`DELETE /api/v1/me`).
            </Text>
            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setDeleteAccountModal(false)}
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor: palette.border,
                  },
                ]}>
                <Text style={[styles.modalCancelText, { color: palette.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteAccount}
                style={[styles.modalConfirmBtn, { backgroundColor: palette.danger }]}>
                <Text style={styles.modalConfirmText}>Delete Everything</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 42,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: 18,
    fontSize: 12,
  },
  savedBanner: {
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  savedBannerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },
  segmentRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  nameRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13,
  },
  saveBtn: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  privacySubbox: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  privacyTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  privacyBody: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
  },
  privacyLinkBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  privacyLinkText: {
    fontSize: 11,
    fontWeight: '800',
  },
  accountActions: {
    gap: 10,
    marginTop: 4,
  },
  logoutBtn: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 15,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  deleteAccountBtn: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 15,
  },
  deleteAccountText: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
  },
  modalBtnRow: {
    marginTop: 22,
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
