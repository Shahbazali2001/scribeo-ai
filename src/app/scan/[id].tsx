import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { copyTextToClipboard, speechManager, triggerHaptic } from '@/lib/device';
import { appStore } from '@/store/app-store';
import { SummaryStyle } from '@/types/api';

const MIN_SUMMARY_WORDS = 80;

export default function ScanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const palette = useAppTheme();

  const scan = useAppStore((s) =>
    id ? s.scans.find((item) => item.id === id) ?? s.ephemeralFailedScans[id] : undefined
  );
  const speechSpeed = useAppStore((s) => s.profile.settings.speechSpeed);
  const defaultConsent = useAppStore((s) => s.profile.settings.consentForTraining);

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [copiedTarget, setCopiedTarget] = useState<'text' | 'summary' | null>(null);
  const [speakingTarget, setSpeakingTarget] = useState<'text' | 'summary' | null>(null);

  const [summaryPopupDismissed, setSummaryPopupDismissed] = useState(false);
  const [activeSummaryStyle, setActiveSummaryStyle] = useState<SummaryStyle>('short');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [feedbackCorrectedText, setFeedbackCorrectedText] = useState('');
  const [feedbackConsent, setFeedbackConsent] = useState(defaultConsent);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    if (scan?.text) {
      setEditedText(scan.text);
      setFeedbackCorrectedText(scan.text);
    }
  }, [scan?.text]);

  useEffect(() => {
    return () => {
      speechManager.stop();
    };
  }, []);

  if (!scan) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          styles.centered,
          { backgroundColor: palette.bg },
        ]}>
        <Text style={[styles.emptyTitle, { color: palette.text }]}>Scan Not Found</Text>
        <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>
          This scan may have been deleted or expired.
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)' as never)}
          style={[styles.primaryBtnSmall, { backgroundColor: palette.primary }]}>
          <Text style={styles.primaryBtnText}>Back to Home</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // 1. Processing State (Polling GET /scans/{id})
  if (scan.status === 'processing') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
        <View style={[styles.centered, { flex: 1 }]}>
          <View
            style={[
              styles.processingImageWrap,
              { backgroundColor: palette.surface, borderColor: palette.primary },
            ]}>
            <Image
              source={{ uri: scan.imageUrl }}
              style={styles.processingImage}
              contentFit="cover"
            />
          </View>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.processingTitle, { color: palette.text }]}>
            Reading Handwriting...
          </Text>
          <Text style={[styles.processingKey, { color: palette.textMuted }]}>
            Idempotency-Key: {scan.idempotencyKey.slice(0, 12)}...
          </Text>

          <View
            style={[
              styles.stepsCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
            <Text style={[styles.stepItem, { color: palette.primary }]}>
               1. Uploaded to private Supabase Storage
            </Text>
            <Text style={[styles.stepItem, { color: palette.accent }]}>
               2. Detecting text lines (docTR db_mobilenet_v3_large)
            </Text>
            <Text style={[styles.stepItem, { color: palette.textSecondary }]}>
               3. Recognizing lines (microsoft/trocr-base-handwritten)
            </Text>
            <Text style={[styles.stepItem, { color: palette.textSecondary }]}>
               4. Verifying English language & confidence
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Failed / Edge-Case State (NOT_ENGLISH, NO_TEXT_FOUND, NETWORK_ERROR, etc.)
  if (scan.status === 'failed') {
    const isNotEnglish = scan.errorCode === 'NOT_ENGLISH';
    const isNetworkError = scan.errorCode === 'NETWORK_ERROR';
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
        <View style={styles.scrollContent}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
            <Text style={[styles.backBtnText, { color: palette.text }]}>Back</Text>
          </Pressable>

          <View
            style={[
              styles.failedCard,
              { backgroundColor: palette.surface, borderColor: palette.amber },
            ]}>
            <View
              style={[styles.failedIconWrap, { backgroundColor: palette.amberSoft }]}>
              <Text style={{ fontSize: 24 }}>
                {isNotEnglish ? '' : isNetworkError ? '' : ''}
              </Text>
            </View>
            <View style={[styles.failedBadge, { backgroundColor: palette.amberSoft }]}>
              <Text style={[styles.failedBadgeText, { color: palette.amber }]}>
                {scan.errorCode || 'SCAN_FAILED'} {' '}
                {isNetworkError
                  ? `IDEMPOTENCY-KEY: ${scan.idempotencyKey.slice(0, 8)}`
                  : 'NOT SAVED TO HISTORY'}
              </Text>
            </View>

            <Text style={[styles.failedTitle, { color: palette.text }]}>
              {isNotEnglish
                ? 'Sorry, I can only read English handwriting right now.'
                : isNetworkError
                  ? 'Upload Interrupted (Offline)'
                  : 'No Readable Handwriting Found'}
            </Text>

            <Text style={[styles.failedBody, { color: palette.textSecondary }]}>
              {isNotEnglish
                ? 'Our recognizer reads Latin characters and verified that this text does not appear to be English. Per privacy and product rules, this scan was not saved to your history.'
                : scan.errorMessage ||
                  'We could not find clear handwritten lines on this page.'}
            </Text>

            <View
              style={[
                styles.tipsSubbox,
                {
                  backgroundColor: palette.surfaceMuted,
                  borderColor: palette.border,
                },
              ]}>
              <Text style={[styles.tipsTitle, { color: palette.text }]}>
                {isNetworkError
                  ? 'Idempotent Retry Guarantee:'
                  : 'Tips for best accuracy:'}
              </Text>
              <Text style={[styles.tipsBody, { color: palette.textSecondary }]}>
                {isNetworkError
                  ? ` Your photo is preserved locally\n Retrying sends the same Idempotency-Key (${scan.idempotencyKey.slice(0, 12)}...)\n Exactly one scan is created and quota is never double-counted`
                  : ' Write in clear English using dark ink on light paper\n Hold the camera directly above the page in bright light\n Keep lines horizontal and avoid strong shadows'}
              </Text>
            </View>

            <View style={styles.failedActionRow}>
              {isNetworkError ? (
                <Pressable
                  onPress={() => {
                    void appStore.retryFailedScan(scan.id);
                  }}
                  style={[styles.primaryBtnFlex, { backgroundColor: palette.primary }]}>
                  <Text style={styles.primaryBtnText}>
                     Retry with Same Idempotency-Key
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => router.replace('/(tabs)/scan' as never)}
                  style={[styles.primaryBtnFlex, { backgroundColor: palette.primary }]}>
                  <Text style={styles.primaryBtnText}>Try Another Scan</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => router.replace('/(tabs)' as never)}
                style={[
                  styles.secondaryBtnFlex,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor: palette.border,
                  },
                ]}>
                <Text style={[styles.secondaryBtnText, { color: palette.text }]}>
                  Dashboard
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 3. Done State
  const isLowConfidence = (scan.confidence ?? 1) < 0.75;
  const activeSummary = scan.summaries[activeSummaryStyle];
  const hasAnySummary = Object.keys(scan.summaries).length > 0;
  const showSummarySuggestionPopup =
    scan.wordCount >= MIN_SUMMARY_WORDS && !hasAnySummary && !summaryPopupDismissed;

  const handleCopy = async (content: string, target: 'text' | 'summary') => {
    await triggerHaptic('success');
    await copyTextToClipboard(content);
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget(null), 2000);
  };

  const handleListenToggle = async (content: string, target: 'text' | 'summary') => {
    await triggerHaptic('light');
    if (speakingTarget === target) {
      speechManager.stop();
      setSpeakingTarget(null);
      return;
    }

    setSpeakingTarget(target);
    speechManager.speak(content, {
      rate: speechSpeed,
      onDone: () => setSpeakingTarget(null),
      onError: () => setSpeakingTarget(null),
    });
  };

  const handleSaveEdit = async () => {
    setEditError(null);
    if (!editedText.trim()) {
      setEditError('Scan text cannot be empty.');
      return;
    }
    const res = appStore.updateScanText(scan.id, editedText, scan.textVersion);
    if (!res.ok) {
      setEditError(res.error || 'Could not update text.');
      return;
    }
    await triggerHaptic('success');
    setIsEditing(false);
  };

  const handleRequestSummary = async (style: SummaryStyle) => {
    setActiveSummaryStyle(style);
    setSummaryPopupDismissed(true);
    setSummaryError(null);

    if (scan.summaries[style]?.textVersion === scan.textVersion) {
      return;
    }

    setSummaryLoading(true);
    await triggerHaptic('light');
    const result = await apiClient.createSummary(scan.id, style);
    setSummaryLoading(false);

    if (result.error) {
      setSummaryError(result.error.message);
    }
  };

  const handleSubmitFeedback = async () => {
    await triggerHaptic('success');
    await apiClient.submitFeedback(scan.id, {
      rating: feedbackRating,
      correctedText:
        feedbackCorrectedText.trim() !== scan.text
          ? feedbackCorrectedText.trim()
          : undefined,
      consentForTraining: feedbackConsent,
    });
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackModalVisible(false);
      setFeedbackSubmitted(false);
    }, 1200);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <Pressable
            onPress={() => {
              speechManager.stop();
              router.back();
            }}
            style={[
              styles.backBtn,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
            <Text style={[styles.backBtnText, { color: palette.text }]}>Back</Text>
          </Pressable>

          <Pressable
            onPress={() => setFeedbackModalVisible(true)}
            style={[
              styles.rateBtn,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
            <Text style={[styles.rateBtnText, { color: palette.primary }]}>Rate Accuracy</Text>
          </Pressable>
        </View>

        {/* Image + Metadata Header Card */}
        <View
          style={[
            styles.imageMetaCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <Image
            source={{ uri: scan.imageUrl }}
            style={styles.detailThumb}
            contentFit="cover"
          />
          <View style={styles.metaInfo}>
            <View style={styles.pillRow}>
              <View
                style={[styles.metaPill, { backgroundColor: palette.surfaceMuted }]}>
                <Text style={[styles.metaPillText, { color: palette.text }]}>
                  {scan.wordCount} words
                </Text>
              </View>
              {scan.confidence != null ? (
                <View
                  style={[
                    styles.metaPill,
                    {
                      backgroundColor: isLowConfidence
                        ? palette.amberSoft
                        : palette.primarySoft,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.metaPillText,
                      {
                        color: isLowConfidence ? palette.amber : palette.primary,
                      },
                    ]}>
                    {Math.round(scan.confidence * 100)}% confidence
                  </Text>
                </View>
              ) : null}
              <View
                style={[styles.metaPill, { backgroundColor: palette.surfaceMuted }]}>
                <Text style={[styles.metaPillText, { color: palette.textSecondary }]}>
                  v{scan.textVersion}
                </Text>
              </View>
            </View>
            <Text style={[styles.modelText, { color: palette.textMuted }]}>
              Model: {scan.ocrModelVersion || 'microsoft/trocr-base-handwritten'}
            </Text>
          </View>
        </View>

        {/* Low Confidence Review Banner */}
        {isLowConfidence ? (
          <View
            style={[
              styles.lowConfBanner,
              { backgroundColor: palette.amberSoft, borderColor: palette.amber },
            ]}>
            <Text style={[styles.lowConfTitle, { color: palette.amber }]}>
               Please Review Recognized Text
            </Text>
            <Text style={[styles.lowConfBody, { color: palette.text }]}>
              This scan had lower recognition confidence (
              {Math.round((scan.confidence ?? 0) * 100)}%). Please check for handwriting errors and tap Edit to fix any mistakes.
            </Text>
          </View>
        ) : null}

        {/* Dismissible 80+ Word Summary Suggestion Popup (Never Automatic) */}
        {showSummarySuggestionPopup ? (
          <View
            style={[
              styles.suggestionPopup,
              {
                backgroundColor: palette.accentSoft,
                borderColor: palette.accent,
              },
            ]}>
            <View style={styles.suggestionTop}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.suggestionTitle, { color: palette.accent }]}>
                   Long Note Detected ({scan.wordCount} words)
                </Text>
                <Text style={[styles.suggestionBody, { color: palette.text }]}>
                  Would you like an AI summary of this scan? Summaries are optional and only generated when you request one.
                </Text>
              </View>
              <Pressable
                onPress={() => setSummaryPopupDismissed(true)}
                hitSlop={10}
                style={{ paddingHorizontal: 6 }}>
                <Text style={{ color: palette.textMuted, fontWeight: '800' }}></Text>
              </Pressable>
            </View>
            <View style={styles.suggestionBtnRow}>
              <Pressable
                onPress={() => handleRequestSummary('short')}
                style={[styles.summarizeNowBtn, { backgroundColor: palette.accent }]}>
                <Text style={styles.summarizeNowText}>Summarize Now</Text>
              </Pressable>
              <Pressable
                onPress={() => setSummaryPopupDismissed(true)}
                style={[
                  styles.notNowBtn,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}>
                <Text style={[styles.notNowText, { color: palette.textSecondary }]}>
                  Not Now
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Recognized Text Card */}
        <View
          style={[
            styles.mainCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardEyebrow, { color: palette.textMuted }]}>
              RECOGNIZED ENGLISH TEXT
            </Text>
            <Pressable
              onPress={() => {
                setIsEditing((v) => !v);
                setEditedText(scan.text || '');
              }}
              style={[
                styles.editToggleBtn,
                {
                  backgroundColor: palette.surfaceMuted,
                  borderColor: palette.border,
                },
              ]}>
              <Text style={[styles.editToggleText, { color: palette.primary }]}>
                {isEditing ? 'Cancel Edit' : ' Edit Text'}
              </Text>
            </Pressable>
          </View>

          {editError ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: palette.dangerSoft, borderColor: palette.danger },
              ]}>
              <Text style={[styles.errorText, { color: palette.danger }]}>
                {editError}
              </Text>
            </View>
          ) : null}

          {isEditing ? (
            <View>
              <TextInput
                value={editedText}
                onChangeText={setEditedText}
                multiline
                style={[
                  styles.editInput,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor: palette.primary,
                    color: palette.text,
                  },
                ]}
              />
              <Pressable
                onPress={handleSaveEdit}
                style={[styles.saveEditBtn, { backgroundColor: palette.primary }]}>
                <Text style={styles.primaryBtnText}>
                  Save Edited Text (v{scan.textVersion + 1})
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text selectable style={[styles.recognizedText, { color: palette.text }]}>
              {scan.text}
            </Text>
          )}

          {/* Primary Action Buttons: Copy & Listen */}
          <View style={[styles.actionBar, { borderTopColor: palette.border }]}>
            <Pressable
              onPress={() => handleCopy(scan.text || '', 'text')}
              style={[styles.copyBtn, { backgroundColor: palette.primary }]}>
              <Text style={styles.primaryBtnText}>
                {copiedTarget === 'text' ? ' Copied to Clipboard!' : ' Copy Text'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleListenToggle(scan.text || '', 'text')}
              style={[
                styles.listenBtn,
                {
                  backgroundColor:
                    speakingTarget === 'text'
                      ? palette.amberSoft
                      : palette.surfaceMuted,
                  borderColor:
                    speakingTarget === 'text' ? palette.amber : palette.border,
                },
              ]}>
              <Text
                style={[
                  styles.listenBtnText,
                  {
                    color: speakingTarget === 'text' ? palette.amber : palette.text,
                  },
                ]}>
                {speakingTarget === 'text'
                  ? ` Stop (${speechSpeed}x)`
                  : ` Listen (${speechSpeed}x)`}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* AI Summary Card (Short, Bullets, Detailed) */}
        <View
          style={[
            styles.mainCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={[styles.summaryHeaderTitle, { color: palette.text }]}>
                AI Summary
              </Text>
              <Text style={[styles.summarySubtitle, { color: palette.textSecondary }]}>
                AI-generated via Google Gemini  Verify important details
              </Text>
            </View>
            <View
              style={[styles.optionalBadge, { backgroundColor: palette.accentSoft }]}>
              <Text style={[styles.optionalBadgeText, { color: palette.accent }]}>
                Optional
              </Text>
            </View>
          </View>

          {/* Style Selector Tabs: Short | Bullets | Detailed */}
          <View style={styles.tabRow}>
            {(
              [
                { id: 'short', label: 'Short' },
                { id: 'bullets', label: 'Bullets' },
                { id: 'detailed', label: 'Detailed' },
              ] as const
            ).map((tab) => {
              const isSelected = activeSummaryStyle === tab.id;
              const isCached =
                scan.summaries[tab.id]?.textVersion === scan.textVersion;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => handleRequestSummary(tab.id)}
                  style={[
                    styles.tabBtn,
                    {
                      backgroundColor: isSelected
                        ? palette.primary
                        : palette.surfaceMuted,
                      borderColor: isSelected ? palette.primary : palette.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: isSelected ? '#FFFFFF' : palette.text },
                    ]}>
                    {tab.label} {isCached ? '' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {summaryError ? (
            <View
              style={[
                styles.errorBox,
                {
                  marginTop: 12,
                  backgroundColor: palette.dangerSoft,
                  borderColor: palette.danger,
                },
              ]}>
              <Text style={[styles.errorText, { color: palette.danger }]}>
                {summaryError}
              </Text>
            </View>
          ) : null}

          {summaryLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={palette.primary} />
              <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
                Generating {activeSummaryStyle} summary with Gemini...
              </Text>
            </View>
          ) : activeSummary ? (
            <View style={{ marginTop: 14 }}>
              <View
                style={[
                  styles.summaryContentBox,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor: palette.border,
                  },
                ]}>
                <Text selectable style={[styles.summaryText, { color: palette.text }]}>
                  {activeSummary.text}
                </Text>
              </View>

              <View style={styles.summaryActions}>
                <Pressable
                  onPress={() => handleCopy(activeSummary.text, 'summary')}
                  style={[
                    styles.summaryCopyBtn,
                    {
                      backgroundColor: palette.primarySoft,
                      borderColor: palette.primary,
                    },
                  ]}>
                  <Text style={[styles.summaryCopyText, { color: palette.primary }]}>
                    {copiedTarget === 'summary'
                      ? ' Summary Copied!'
                      : ' Copy Summary'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleListenToggle(activeSummary.text, 'summary')}
                  style={[
                    styles.listenBtn,
                    {
                      backgroundColor:
                        speakingTarget === 'summary'
                          ? palette.amberSoft
                          : palette.surfaceMuted,
                      borderColor:
                        speakingTarget === 'summary' ? palette.amber : palette.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.listenBtnText,
                      {
                        color:
                          speakingTarget === 'summary' ? palette.amber : palette.text,
                      },
                    ]}>
                    {speakingTarget === 'summary'
                      ? ' Stop Summary'
                      : ' Listen Summary'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.emptySummaryBox,
                {
                  backgroundColor: palette.surfaceMuted,
                  borderColor: palette.border,
                },
              ]}>
              <Text
                style={[styles.emptySummaryText, { color: palette.textSecondary }]}>
                Tap Short, Bullets, or Detailed above to generate an AI summary for this scan.
              </Text>
              <Pressable
                onPress={() => handleRequestSummary(activeSummaryStyle)}
                style={[styles.generateBtn, { backgroundColor: palette.primary }]}>
                <Text style={styles.primaryBtnText}>
                   Generate {activeSummaryStyle} Summary
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Accuracy Feedback Modal */}
      <Modal
        visible={feedbackModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedbackModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                Handwriting Accuracy Feedback
              </Text>
              <Pressable onPress={() => setFeedbackModalVisible(false)}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: palette.textMuted }}>
                  
                </Text>
              </Pressable>
            </View>

            {feedbackSubmitted ? (
              <View style={styles.thankYouWrap}>
                <Text style={{ fontSize: 32 }}></Text>
                <Text style={[styles.thankYouText, { color: palette.primary }]}>
                  Thank you for your feedback!
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>
                  How accurate was the handwriting recognition?
                </Text>
                <View style={styles.starRow}>
                  {([1, 2, 3, 4, 5] as const).map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setFeedbackRating(star)}
                      style={[
                        styles.starBtn,
                        {
                          backgroundColor:
                            feedbackRating >= star
                              ? palette.amberSoft
                              : palette.surfaceMuted,
                          borderColor:
                            feedbackRating >= star ? palette.amber : palette.border,
                        },
                      ]}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: palette.text }}>
                         {star}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text
                  style={[
                    styles.modalLabel,
                    { marginTop: 14, color: palette.textSecondary },
                  ]}>
                  Corrected Text (Optional)
                </Text>
                <TextInput
                  value={feedbackCorrectedText}
                  onChangeText={setFeedbackCorrectedText}
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.feedbackInput,
                    {
                      backgroundColor: palette.surfaceMuted,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                />

                <View
                  style={[
                    styles.consentRow,
                    {
                      backgroundColor: palette.surfaceMuted,
                      borderColor: palette.border,
                    },
                  ]}>
                  <Text style={[styles.consentText, { color: palette.textSecondary }]}>
                    I consent to allow this image and corrected text to be used for fine-tuning the handwriting OCR model.
                  </Text>
                  <Switch
                    value={feedbackConsent}
                    onValueChange={setFeedbackConsent}
                    trackColor={{ false: palette.border, true: palette.primary }}
                  />
                </View>

                <Pressable
                  onPress={handleSubmitFeedback}
                  style={[styles.submitFeedbackBtn, { backgroundColor: palette.primary }]}>
                  <Text style={styles.primaryBtnText}>Submit Feedback</Text>
                </Pressable>
              </View>
            )}
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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 44,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyBody: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 13,
  },
  primaryBtnSmall: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  processingImageWrap: {
    marginBottom: 22,
    borderRadius: 24,
    borderWidth: 2,
    padding: 10,
  },
  processingImage: {
    width: 200,
    height: 220,
    borderRadius: 16,
  },
  processingTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: '800',
  },
  processingKey: {
    marginTop: 4,
    fontSize: 11,
  },
  stepsCard: {
    marginTop: 22,
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  stepItem: {
    fontSize: 12,
    fontWeight: '700',
  },
  topNav: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rateBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  rateBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  failedCard: {
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  failedIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  failedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  failedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  failedTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
  },
  failedBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
  },
  tipsSubbox: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  tipsBody: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 19,
  },
  failedActionRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtnFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  secondaryBtnFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  imageMetaCard: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  detailThumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  metaInfo: {
    marginLeft: 14,
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modelText: {
    marginTop: 6,
    fontSize: 11,
  },
  lowConfBanner: {
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  lowConfTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  lowConfBody: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  suggestionPopup: {
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  suggestionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  suggestionBody: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  suggestionBtnRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  summarizeNowBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  summarizeNowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  notNowBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  notNowText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mainCard: {
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  editToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  editToggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  errorBox: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editInput: {
    minHeight: 160,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    lineHeight: 22,
  },
  saveEditBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  recognizedText: {
    fontSize: 14,
    lineHeight: 23,
  },
  actionBar: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  copyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
  },
  listenBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  listenBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  summaryHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  summarySubtitle: {
    marginTop: 2,
    fontSize: 11,
  },
  optionalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  loadingWrap: {
    marginVertical: 20,
    alignItems: 'center',
    paddingVertical: 14,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
  },
  summaryContentBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 21,
  },
  summaryActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  summaryCopyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryCopyText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptySummaryBox: {
    marginTop: 14,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 18,
  },
  emptySummaryText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
  generateBtn: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 22,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  thankYouWrap: {
    marginVertical: 24,
    alignItems: 'center',
  },
  thankYouText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '800',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  starRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  starBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedbackInput: {
    marginTop: 6,
    maxHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 12,
  },
  consentRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  consentText: {
    flex: 1,
    paddingRight: 12,
    fontSize: 11,
    lineHeight: 16,
  },
  submitFeedbackBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
});
