import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppStore } from "@/hooks/use-app-store";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  capturePhotoWithCamera,
  pickPhotoFromGallery,
  triggerHaptic,
} from "@/lib/device";
import { appStore, SAMPLE_PRESETS } from "@/store/app-store";
import { SamplePresetType } from "@/types/api";

export default function DashboardScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const profile = useAppStore((s) => s.profile);
  const usage = useAppStore((s) => s.usage);
  const scans = useAppStore((s) => s.scans);

  const [bannerError, setBannerError] = useState<string | null>(null);

  useEffect(() => {
    void appStore.syncFromBackend();
  }, []);

  const recentScans = scans.slice(0, 4);

  const toggleTheme = async () => {
    await triggerHaptic("light");
    const next = palette.isDark ? "light" : "dark";
    appStore.updateProfile({ settings: { theme: next } });
  };

  const handleDirectCameraCapture = async () => {
    setBannerError(null);
    await triggerHaptic("light");
    const picked = await capturePhotoWithCamera();
    if (picked.errorMessage) {
      setBannerError(picked.errorMessage);
      return;
    }
    if (!picked.canceled && picked.uri) {
      const res = await appStore.submitScan({
        imageUri: picked.uri,
        width: picked.width,
        height: picked.height,
        isRealPhoto: true,
      });
      if (res.error) {
        setBannerError(res.error.message);
      } else if (res.scanId) {
        router.push(`/scan/${res.scanId}` as never);
      }
    }
  };

  const handleDirectGalleryPick = async () => {
    setBannerError(null);
    await triggerHaptic("light");
    const picked = await pickPhotoFromGallery();
    if (picked.errorMessage) {
      setBannerError(picked.errorMessage);
      return;
    }
    if (!picked.canceled && picked.uri) {
      const res = await appStore.submitScan({
        imageUri: picked.uri,
        width: picked.width,
        height: picked.height,
        isRealPhoto: true,
      });
      if (res.error) {
        setBannerError(res.error.message);
      } else if (res.scanId) {
        router.push(`/scan/${res.scanId}` as never);
      }
    }
  };

  const handleQuickPresetScan = async (preset: SamplePresetType) => {
    setBannerError(null);
    await triggerHaptic("light");
    const result = await appStore.submitScan({
      imageUri: SAMPLE_PRESETS[preset].imageUrl,
      preset,
    });
    if (result.error) {
      setBannerError(result.error.message);
      return;
    }
    if (result.scanId) {
      router.push(`/scan/${result.scanId}` as never);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Greeting & Theme Bar */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: palette.primary }]}>
              SCRIBEO AI STUDIO
            </Text>
            <Text style={[styles.greeting, { color: palette.text }]}>
              Hello, {profile.displayName.split(" ")[0]}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={toggleTheme}
              style={[
                styles.iconPill,
                {
                  backgroundColor: palette.bgCard,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text
                style={{ color: palette.text, fontSize: 12, fontWeight: "700" }}
              >
                {palette.isDark ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(tabs)/settings" as never)}
              style={[
                styles.avatarBtn,
                {
                  backgroundColor: palette.primarySoft,
                  borderColor: palette.primary,
                },
              ]}
            >
              <Text
                style={{
                  color: palette.primary,
                  fontSize: 15,
                  fontWeight: "800",
                }}
              >
                {profile.displayName.charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        {bannerError ? (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: palette.dangerSoft,
                borderColor: palette.danger,
              },
            ]}
          >
            <Text
              style={{ color: palette.danger, fontSize: 13, fontWeight: "600" }}
            >
              ⚠️ {bannerError}
            </Text>
          </View>
        ) : null}

        {/* Hero Scan Studio Card */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: palette.bgCard, borderColor: palette.border },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View
                style={[styles.badge, { backgroundColor: palette.primarySoft }]}
              >
                <Text
                  style={{
                    color: palette.primary,
                    fontSize: 11,
                    fontWeight: "800",
                  }}
                >
                  docTR Line Detector + Microsoft TrOCR
                </Text>
              </View>
              <Text style={[styles.heroTitle, { color: palette.text }]}>
                Scan Handwritten English Page
              </Text>
              <Text
                style={[styles.heroSubtitle, { color: palette.textSecondary }]}
              >
                Take a photo with your phone camera or select an image from your
                gallery. Copy text, listen aloud, or generate AI summaries.
              </Text>
            </View>
            <View
              style={[styles.heroIconBox, { backgroundColor: palette.primary }]}
            >
              <Text style={{ fontSize: 26 }}>📷</Text>
            </View>
          </View>

          <View style={styles.heroBtnRow}>
            <Pressable
              onPress={handleDirectCameraCapture}
              style={[styles.primaryCta, { backgroundColor: palette.primary }]}
            >
              <Text style={styles.primaryCtaText}>📸 Take Photo</Text>
            </Pressable>

            <Pressable
              onPress={handleDirectGalleryPick}
              style={[
                styles.secondaryCta,
                {
                  backgroundColor: palette.bgInput,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.secondaryCtaText, { color: palette.text }]}>
                🖼️ Pick from Gallery
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/(tabs)/scan" as never)}
            style={[
              styles.studioLinkBtn,
              {
                borderColor: palette.border,
                backgroundColor: palette.bgSubtle,
              },
            ]}
          >
            <Text
              style={{
                color: palette.primary,
                fontSize: 12,
                fontWeight: "800",
              }}
            >
              Open Full Camera Viewfinder & Custom Text Studio →
            </Text>
          </Pressable>
        </View>

        {/* Daily Quota Meters */}
        <View style={styles.quotaRow}>
          <View
            style={[
              styles.quotaCard,
              { backgroundColor: palette.bgCard, borderColor: palette.border },
            ]}
          >
            <View style={styles.quotaHeader}>
              <Text
                style={{
                  color: palette.textSecondary,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                Daily Scans
              </Text>
              <Text
                style={{
                  color: palette.primary,
                  fontSize: 13,
                  fontWeight: "800",
                }}
              >
                {usage.scansUsed} / {usage.scansLimit}
              </Text>
            </View>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: palette.bgInput },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: palette.primary,
                    width: `${Math.min(100, (usage.scansUsed / usage.scansLimit) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={{ color: palette.textMuted, fontSize: 11, marginTop: 6 }}
            >
              {usage.scansLimit - usage.scansUsed} scans left today
            </Text>
          </View>

          <View
            style={[
              styles.quotaCard,
              { backgroundColor: palette.bgCard, borderColor: palette.border },
            ]}
          >
            <View style={styles.quotaHeader}>
              <Text
                style={{
                  color: palette.textSecondary,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                AI Summaries
              </Text>
              <Text
                style={{
                  color: palette.accent,
                  fontSize: 13,
                  fontWeight: "800",
                }}
              >
                {usage.summariesUsed} / {usage.summariesLimit}
              </Text>
            </View>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: palette.bgInput },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: palette.accent,
                    width: `${Math.min(
                      100,
                      (usage.summariesUsed / usage.summariesLimit) * 100,
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={{ color: palette.textMuted, fontSize: 11, marginTop: 6 }}
            >
              Gemini 2.5 • Resets 00:00 UTC
            </Text>
          </View>
        </View>

        {/* Recent Scans */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Recent Scans
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/history" as never)}>
            <Text
              style={{
                color: palette.primary,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              View All ({scans.length}) →
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          {recentScans.map((scan) => {
            const hasSummaries = Object.keys(scan.summaries).length > 0;
            const isLowConf = (scan.confidence ?? 1) < 0.75;
            return (
              <Pressable
                key={scan.id}
                onPress={() => router.push(`/scan/${scan.id}` as never)}
                style={[
                  styles.scanCard,
                  {
                    backgroundColor: palette.bgCard,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Image
                  source={{ uri: scan.imageUrl }}
                  style={styles.scanThumb}
                  contentFit="cover"
                />
                <View style={styles.scanInfo}>
                  <View style={styles.metaChipRow}>
                    <View
                      style={[
                        styles.metaChip,
                        { backgroundColor: palette.bgInput },
                      ]}
                    >
                      <Text
                        style={{
                          color: palette.textSecondary,
                          fontSize: 10,
                          fontWeight: "700",
                        }}
                      >
                        {scan.wordCount} words
                      </Text>
                    </View>
                    {scan.confidence != null ? (
                      <View
                        style={[
                          styles.metaChip,
                          {
                            backgroundColor: isLowConf
                              ? palette.warningSoft
                              : palette.successSoft,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: isLowConf
                              ? palette.warning
                              : palette.success,
                            fontSize: 10,
                            fontWeight: "800",
                          }}
                        >
                          {Math.round(scan.confidence * 100)}% conf
                        </Text>
                      </View>
                    ) : null}
                    {hasSummaries ? (
                      <View
                        style={[
                          styles.metaChip,
                          { backgroundColor: palette.primarySoft },
                        ]}
                      >
                        <Text
                          style={{
                            color: palette.primary,
                            fontSize: 10,
                            fontWeight: "800",
                          }}
                        >
                          ✦ Summarized
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[styles.scanPreview, { color: palette.text }]}
                  >
                    {scan.text}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Interactive FRD Scenarios */}
        <View style={{ marginTop: 26 }}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Quick Demo & Edge-Case Scenarios
          </Text>
          <Text
            style={{
              color: palette.textSecondary,
              fontSize: 12,
              marginTop: 2,
              marginBottom: 12,
            }}
          >
            Test every FRD scenario with one tap:
          </Text>
          <View style={{ gap: 8 }}>
            {(Object.keys(SAMPLE_PRESETS) as SamplePresetType[]).map((key) => {
              const item = SAMPLE_PRESETS[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => handleQuickPresetScan(key)}
                  style={[
                    styles.presetCard,
                    {
                      backgroundColor: palette.bgCard,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text
                      style={{
                        color: palette.text,
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        color: palette.textSecondary,
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.metaChip,
                      { backgroundColor: palette.primarySoft },
                    ]}
                  >
                    <Text
                      style={{
                        color: palette.primary,
                        fontSize: 10,
                        fontWeight: "800",
                      }}
                    >
                      {item.badge}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  greeting: { fontSize: 24, fontWeight: "800", marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 18,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  heroTitle: { fontSize: 20, fontWeight: "800" },
  heroSubtitle: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBtnRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  primaryCta: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCtaText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  secondaryCta: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryCtaText: { fontSize: 14, fontWeight: "700" },
  studioLinkBtn: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  quotaRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  quotaCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  quotaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: { height: "100%", borderRadius: 999 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  scanCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  scanThumb: { width: 64, height: 64, borderRadius: 12 },
  scanInfo: { flex: 1, marginLeft: 12 },
  metaChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  scanPreview: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontWeight: "500",
  },
  presetCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
