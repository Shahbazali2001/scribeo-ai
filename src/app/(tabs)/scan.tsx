import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppStore } from "@/hooks/use-app-store";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  capturePhotoWithCamera,
  pickPhotoFromGallery,
  triggerHaptic,
} from "@/lib/device";
import { generateIdempotencyKey } from "@/lib/idempotency";
import { appStore, SAMPLE_PRESETS } from "@/store/app-store";
import { SamplePresetType } from "@/types/api";

export default function ScanCaptureScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const usage = useAppStore((s) => s.usage);
  const simulateOffline = useAppStore((s) => s.simulateOffline);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [liveCameraActive, setLiveCameraActive] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [flashOn, setFlashOn] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [selectedPhotoDims, setSelectedPhotoDims] = useState<{
    w: number;
    h: number;
  }>({
    w: 1200,
    h: 1600,
  });

  const [selectedPreset, setSelectedPreset] =
    useState<SamplePresetType>("long_lecture_notes");
  const [simulatePoorLighting, setSimulatePoorLighting] = useState(false);
  const [qualityWarningModal, setQualityWarningModal] = useState(false);
  const [customHandwritingText, setCustomHandwritingText] = useState("");
  const [pendingIdempotencyKey, setPendingIdempotencyKey] = useState<string>(
    () => generateIdempotencyKey(),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activePreset = SAMPLE_PRESETS[selectedPreset];
  const displayImageUri = selectedPhotoUri || activePreset.imageUrl;

  const handleOpenPhoneCamera = async () => {
    setErrorMessage(null);
    await triggerHaptic("light");
    const picked = await capturePhotoWithCamera();
    if (picked.errorMessage) {
      setErrorMessage(picked.errorMessage);
      return;
    }
    if (!picked.canceled && picked.uri) {
      setSelectedPhotoUri(picked.uri);
      setSelectedPhotoDims({
        w: picked.width ?? 1200,
        h: picked.height ?? 1600,
      });
      setLiveCameraActive(false);
    }
  };

  const handleOpenPhoneGallery = async () => {
    setErrorMessage(null);
    await triggerHaptic("light");
    const picked = await pickPhotoFromGallery();
    if (picked.errorMessage) {
      setErrorMessage(picked.errorMessage);
      return;
    }
    if (!picked.canceled && picked.uri) {
      setSelectedPhotoUri(picked.uri);
      setSelectedPhotoDims({
        w: picked.width ?? 1200,
        h: picked.height ?? 1600,
      });
      setLiveCameraActive(false);
    }
  };

  const handleToggleLiveViewfinder = async () => {
    setErrorMessage(null);
    if (Platform.OS === "web") {
      // On web, open camera file capture directly
      await handleOpenPhoneCamera();
      return;
    }
    if (!liveCameraActive) {
      if (!cameraPermission?.granted) {
        const res = await requestCameraPermission();
        if (!res.granted) {
          setErrorMessage(
            'Camera permission was denied. You can still use "Pick from Gallery" or grant camera access in phone settings.',
          );
          return;
        }
      }
      setLiveCameraActive(true);
    } else {
      setLiveCameraActive(false);
    }
  };

  const handleTakeLivePicture = async () => {
    setErrorMessage(null);
    await triggerHaptic("light");
    if (liveCameraActive && cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          exif: false,
        });
        if (photo?.uri) {
          setSelectedPhotoUri(photo.uri);
          setSelectedPhotoDims({
            w: photo.width ?? 1200,
            h: photo.height ?? 1600,
          });
          setLiveCameraActive(false);
          if (simulatePoorLighting) {
            setQualityWarningModal(true);
            return;
          }
          await proceedWithUpload(photo.uri, photo.width, photo.height);
          return;
        }
      } catch {
        // Fallback to current display image
      }
    }

    if (simulatePoorLighting) {
      setQualityWarningModal(true);
      return;
    }
    await proceedWithUpload(
      displayImageUri,
      selectedPhotoDims.w,
      selectedPhotoDims.h,
    );
  };

  const proceedWithUpload = async (
    imageUri: string,
    width = selectedPhotoDims.w,
    height = selectedPhotoDims.h,
  ) => {
    setErrorMessage(null);
    setQualityWarningModal(false);
    const result = await appStore.submitScan({
      imageUri,
      width,
      height,
      preset: selectedPreset,
      customText: customHandwritingText.trim() || undefined,
      idempotencyKey: pendingIdempotencyKey,
    });

    if (result.error) {
      await triggerHaptic("error");
      setErrorMessage(result.error.message);
      return;
    }

    setPendingIdempotencyKey(generateIdempotencyKey());
    router.push(`/scan/${result.scanId}` as never);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: palette.text }]}>
              Scan Studio
            </Text>
            <Text
              style={{
                color: palette.textSecondary,
                fontSize: 12,
                marginTop: 2,
              }}
            >
              Capture with phone camera or pick from gallery  EXIF stripped
            </Text>
          </View>
          <View
            style={[
              styles.quotaBadge,
              {
                backgroundColor: palette.primarySoft,
                borderColor: palette.primary,
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
              {usage.scansLimit - usage.scansUsed} left today
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: palette.dangerSoft,
                borderColor: palette.danger,
              },
            ]}
          >
            <Text
              style={{ color: palette.danger, fontSize: 13, fontWeight: "700" }}
            >
               {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* Primary Phone Camera & Gallery Buttons */}
        <View style={styles.actionGrid}>
          <Pressable
            onPress={handleOpenPhoneCamera}
            style={[
              styles.primaryActionBtn,
              { backgroundColor: palette.primary },
            ]}
          >
            <Text style={styles.primaryActionIcon}></Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryActionTitle}>Open Phone Camera</Text>
              <Text style={styles.primaryActionSub}>
                Take a new photo of your handwritten page
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleOpenPhoneGallery}
            style={[
              styles.secondaryActionBtn,
              { backgroundColor: palette.bgCard, borderColor: palette.border },
            ]}
          >
            <Text style={styles.primaryActionIcon}></Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.secondaryActionTitle, { color: palette.text }]}
              >
                Select Photo from Phone Gallery
              </Text>
              <Text
                style={{
                  color: palette.textSecondary,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Choose an existing handwritten note from your photos
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Viewfinder / Selected Photo Preview Card */}
        <View
          style={[
            styles.viewfinderCard,
            { backgroundColor: palette.bgCard, borderColor: palette.border },
          ]}
        >
          <View style={styles.viewfinderHeader}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: selectedPhotoUri
                      ? palette.success
                      : palette.primary,
                  },
                ]}
              />
              <Text
                style={{ color: palette.text, fontSize: 13, fontWeight: "800" }}
              >
                {liveCameraActive
                  ? "Live Camera Viewfinder"
                  : selectedPhotoUri
                    ? "Your Selected Phone Photo (Ready to Scan)"
                    : `Sample Preview: ${activePreset.label}`}
              </Text>
            </View>

            {Platform.OS !== "web" ? (
              <Pressable
                onPress={handleToggleLiveViewfinder}
                style={[
                  styles.smallPill,
                  { backgroundColor: palette.primarySoft },
                ]}
              >
                <Text
                  style={{
                    color: palette.primary,
                    fontSize: 11,
                    fontWeight: "800",
                  }}
                >
                  {liveCameraActive ? "Close Live View" : " Live Viewfinder"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.previewFrame}>
            {liveCameraActive && Platform.OS !== "web" ? (
              <CameraView
                ref={cameraRef}
                style={styles.cameraFill}
                facing={facing}
                enableTorch={flashOn}
              />
            ) : (
              <Image
                source={{ uri: displayImageUri }}
                style={[
                  styles.cameraFill,
                  { opacity: simulatePoorLighting ? 0.35 : 0.96 },
                ]}
                contentFit="cover"
              />
            )}

            {showGrid ? (
              <View pointerEvents="none" style={styles.gridOverlay}>
                <View style={styles.gridChip}>
                  <Text style={styles.gridChipText}>
                    Keep handwritten lines horizontal & well-lit
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Top Overlay Controls */}
            <View style={styles.overlayTopRight}>
              {liveCameraActive ? (
                <Pressable
                  onPress={() =>
                    setFacing((f) => (f === "back" ? "front" : "back"))
                  }
                  style={styles.overlayBtn}
                >
                  <Text style={styles.overlayBtnText}> Flip</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setFlashOn((v) => !v)}
                style={[
                  styles.overlayBtn,
                  flashOn ? { backgroundColor: "#F59E0B" } : null,
                ]}
              >
                <Text style={styles.overlayBtnText}>
                   {flashOn ? "Flash ON" : "Flash"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowGrid((v) => !v)}
                style={styles.overlayBtn}
              >
                <Text style={styles.overlayBtnText}>
                  # {showGrid ? "Grid ON" : "Grid"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Bottom Shutter / Scan Bar */}
          <View style={styles.shutterBar}>
            {selectedPhotoUri ? (
              <Pressable
                onPress={() => setSelectedPhotoUri(null)}
                style={[
                  styles.barSideBtn,
                  {
                    backgroundColor: palette.bgInput,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: palette.text,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                   Clear Photo
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleOpenPhoneGallery}
                style={[
                  styles.barSideBtn,
                  {
                    backgroundColor: palette.bgInput,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: palette.text,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >Gallery</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleTakeLivePicture}
              style={[styles.scanNowBtn, { backgroundColor: palette.primary }]}
            >
              <Text style={styles.scanNowText}>
                {selectedPhotoUri
                  ? " Scan Selected Photo"
                  : " Extract Text Now"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Custom Handwritten Text Override */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: palette.bgCard, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Custom Text Simulator (Optional)
          </Text>
          <Text
            style={{
              color: palette.textSecondary,
              fontSize: 12,
              marginTop: 2,
              marginBottom: 10,
            }}
          >
            Type or paste custom English text to test TTS speech & Gemini
            summarization with your photo:
          </Text>
          <TextInput
            value={customHandwritingText}
            onChangeText={setCustomHandwritingText}
            multiline
            numberOfLines={3}
            placeholder="Leave blank to use the selected preset text below..."
            placeholderTextColor={palette.textMuted}
            style={[
              styles.textArea,
              {
                backgroundColor: palette.bgInput,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
          />
        </View>

        {/* Sample Presets */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: palette.bgCard, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Sample Handwriting Presets & Edge Cases
          </Text>
          <Text
            style={{
              color: palette.textSecondary,
              fontSize: 12,
              marginTop: 2,
              marginBottom: 10,
            }}
          >
            Select how the demo OCR pipeline responds when scanning:
          </Text>

          <View style={{ gap: 8 }}>
            {(Object.keys(SAMPLE_PRESETS) as SamplePresetType[]).map((key) => {
              const item = SAMPLE_PRESETS[key];
              const isSelected = selectedPreset === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    setSelectedPreset(key);
                    setSelectedPhotoUri(null);
                  }}
                  style={[
                    styles.presetRow,
                    {
                      backgroundColor: isSelected
                        ? palette.primarySoft
                        : palette.bgInput,
                      borderColor: isSelected
                        ? palette.primary
                        : palette.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
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
                      styles.radioCircle,
                      {
                        borderColor: isSelected
                          ? palette.primary
                          : palette.textMuted,
                        backgroundColor: isSelected
                          ? palette.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {isSelected ? (
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 10,
                          fontWeight: "800",
                        }}
                      >
                        
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Edge-case Toggles */}
        <View style={{ gap: 10 }}>
          <View
            style={[
              styles.toggleCard,
              { backgroundColor: palette.bgCard, borderColor: palette.border },
            ]}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text
                style={{ color: palette.text, fontSize: 13, fontWeight: "700" }}
              >
                Simulate Low-Light / Blurry Photo Warning
              </Text>
              <Text
                style={{
                  color: palette.textSecondary,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                Triggers the FRD &ldquo;Retake or Use Anyway&rdquo; pre-upload
                quality dialog
              </Text>
            </View>
            <Pressable
              onPress={() => setSimulatePoorLighting((v) => !v)}
              style={[
                styles.togglePill,
                {
                  backgroundColor: simulatePoorLighting
                    ? palette.warning
                    : palette.bgInput,
                },
              ]}
            >
              <Text
                style={{
                  color: simulatePoorLighting
                    ? "#FFFFFF"
                    : palette.textSecondary,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                {simulatePoorLighting ? "Active" : "Off"}
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.toggleCard,
              { backgroundColor: palette.bgCard, borderColor: palette.border },
            ]}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text
                style={{ color: palette.text, fontSize: 13, fontWeight: "700" }}
              >
                Simulate Offline / Network Loss During Upload
              </Text>
              <Text
                style={{
                  color: palette.textSecondary,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                Tests retry with the same Idempotency-Key (no duplicate scan
                created)
              </Text>
            </View>
            <Pressable
              onPress={() => appStore.setSimulateOffline(!simulateOffline)}
              style={[
                styles.togglePill,
                {
                  backgroundColor: simulateOffline
                    ? palette.warning
                    : palette.bgInput,
                },
              ]}
            >
              <Text
                style={{
                  color: simulateOffline ? "#FFFFFF" : palette.textSecondary,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                {simulateOffline ? "Offline ON" : "Off"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Pre-upload Quality Warning Modal */}
      <Modal
        visible={qualityWarningModal}
        transparent
        animationType="fade"
        onRequestClose={() => setQualityWarningModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: palette.bgCard, borderColor: palette.border },
            ]}
          >
            <Text
              style={{
                color: palette.warning,
                fontSize: 17,
                fontWeight: "800",
              }}
            >
               Photo Looks Dark or Blurry
            </Text>
            <Text
              style={{
                color: palette.textSecondary,
                fontSize: 13,
                lineHeight: 19,
                marginTop: 8,
              }}
            >
              Low contrast or motion blur can reduce handwriting recognition
              accuracy. Hold your phone steady in bright light for best results.
            </Text>
            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setQualityWarningModal(false)}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: palette.bgInput,
                    borderColor: palette.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: palette.text,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  Retake Photo
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  proceedWithUpload(
                    displayImageUri,
                    selectedPhotoDims.w,
                    selectedPhotoDims.h,
                  )
                }
                style={[styles.modalBtn, { backgroundColor: palette.primary }]}
              >
                <Text
                  style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}
                >
                  Use Anyway
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: "800" },
  quotaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  actionGrid: { gap: 10, marginBottom: 16 },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  primaryActionIcon: { fontSize: 26 },
  primaryActionTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  primaryActionSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  secondaryActionTitle: { fontSize: 15, fontWeight: "800" },
  viewfinderCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  viewfinderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  smallPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  previewFrame: {
    height: 260,
    width: "100%",
    backgroundColor: "#000000",
    position: "relative",
  },
  cameraFill: { width: "100%", height: "100%" },
  gridOverlay: {
    position: "absolute",
    top: 16,
    right: 16,
    bottom: 16,
    left: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(20, 184, 166, 0.75)",
  },
  gridChip: {
    alignSelf: "flex-start",
    margin: 10,
    backgroundColor: "rgba(11, 17, 20, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gridChipText: { color: "#5EEAD4", fontSize: 11, fontWeight: "700" },
  overlayTopRight: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    gap: 6,
  },
  overlayBtn: {
    backgroundColor: "rgba(11, 17, 20, 0.78)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  overlayBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  shutterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  barSideBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  scanNowBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  scanNowText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  textArea: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    textAlignVertical: "top",
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  togglePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  modalBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
});
