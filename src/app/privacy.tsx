import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const palette = useAppTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <Text style={[styles.backBtnText, { color: palette.text }]}>← Back</Text>
        </Pressable>

        <Text style={[styles.title, { color: palette.text }]}>
          Privacy Policy & Data Handling
        </Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          How Scribeo AI protects your handwritten photos, recognized text, and summaries
        </Text>

        <View style={styles.sectionList}>
          {[
            {
              title: '1. Private Image Storage & EXIF Stripping',
              body: 'All uploaded photos of handwritten pages have their location (GPS/EXIF) metadata removed on your device before upload. Images are stored in a private Supabase Storage bucket and are only accessible to your signed-in account via short-lived signed URLs.',
            },
            {
              title: '2. Handwriting Recognition (OCR Service)',
              body: 'Handwriting is processed by our isolated OCR model service (docTR line detector + Microsoft TrOCR). Non-English or blank pages are immediately discarded and are never saved to your history. Image content and recognized text are never written to application logs.',
            },
            {
              title: '3. Optional AI Summaries (Google Gemini API)',
              body: 'Summaries are never generated automatically. Only when you explicitly tap Summarize is the recognized English text sent from our backend to the Google Gemini API. Scanned text is wrapped in strict XML data delimiters to prevent prompt injection.',
            },
            {
              title: '4. Opt-In Model Training & Account Deletion',
              body: 'Your scans are never used to train models unless you explicitly toggle consent when submitting accuracy feedback. You can delete individual scans or your entire account at any time in Settings, which permanently deletes your profile, database rows, and private storage objects.',
            },
          ].map((sec) => (
            <View
              key={sec.title}
              style={[
                styles.card,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}>
              <Text style={[styles.cardTitle, { color: palette.primary }]}>
                {sec.title}
              </Text>
              <Text style={[styles.cardBody, { color: palette.textSecondary }]}>
                {sec.body}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
  backBtn: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 20,
    fontSize: 12,
  },
  sectionList: {
    gap: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardBody: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 19,
  },
});
