import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export interface PickedPhotoResult {
  canceled: boolean;
  uri?: string;
  width?: number;
  height?: number;
  permissionDenied?: boolean;
  errorMessage?: string;
}

/**
 * Opens the phone's native camera (or web file/camera capture) to take a photo.
 */
export async function capturePhotoWithCamera(): Promise<PickedPhotoResult> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment');
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve({ canceled: true });
          return;
        }
        const url = URL.createObjectURL(file);
        resolve({ canceled: false, uri: url, width: 1200, height: 1600 });
      };
      input.oncancel = () => resolve({ canceled: true });
      input.click();
    });
  }

  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return {
        canceled: true,
        permissionDenied: true,
        errorMessage:
          'Camera permission was denied. Please enable camera access in your phone settings or select a photo from your gallery.',
      };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
      exif: false, // Strip EXIF/GPS metadata per privacy requirement
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return { canceled: true };
    }

    const asset = result.assets[0];
    return {
      canceled: false,
      uri: asset.uri,
      width: asset.width ?? 1200,
      height: asset.height ?? 1600,
    };
  } catch (err) {
    return {
      canceled: true,
      errorMessage:
        err instanceof Error
          ? err.message
          : 'Could not launch phone camera. Try selecting a photo from your gallery.',
    };
  }
}

/**
 * Opens the phone's photo gallery / media library to choose an existing photo.
 */
export async function pickPhotoFromGallery(): Promise<PickedPhotoResult> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp,image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve({ canceled: true });
          return;
        }
        const url = URL.createObjectURL(file);
        resolve({ canceled: false, uri: url, width: 1200, height: 1600 });
      };
      input.oncancel = () => resolve({ canceled: true });
      input.click();
    });
  }

  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return {
        canceled: true,
        permissionDenied: true,
        errorMessage:
          'Photo library permission was denied. Please grant photo access in your phone settings.',
      };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
      exif: false, // Strip EXIF/GPS metadata
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return { canceled: true };
    }

    const asset = result.assets[0];
    return {
      canceled: false,
      uri: asset.uri,
      width: asset.width ?? 1200,
      height: asset.height ?? 1600,
    };
  } catch (err) {
    return {
      canceled: true,
      errorMessage:
        err instanceof Error ? err.message : 'Could not open photo library.',
    };
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return true;
  }
}

export async function triggerHaptic(
  type: 'light' | 'success' | 'warning' | 'error' = 'light'
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (type === 'light') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (type === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'warning') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (type === 'error') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  } catch {
    // Ignore on unsupported devices
  }
}

class SpeechManager {
  private speaking = false;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  speak(
    text: string,
    options: {
      rate?: number;
      onStart?: () => void;
      onDone?: () => void;
      onError?: (err: string) => void;
    } = {}
  ) {
    this.stop();
    const rate = options.rate ?? 1.0;

    if (!text.trim()) {
      options.onError?.('Nothing to read aloud.');
      return;
    }

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    ) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = rate;
        utterance.onstart = () => {
          this.speaking = true;
          options.onStart?.();
        };
        utterance.onend = () => {
          this.speaking = false;
          options.onDone?.();
        };
        utterance.onerror = () => {
          this.speaking = false;
          options.onDone?.();
        };
        this.speaking = true;
        options.onStart?.();
        window.speechSynthesis.speak(utterance);
        return;
      } catch {
        // Fall through
      }
    }

    try {
      this.speaking = true;
      options.onStart?.();
      Speech.speak(text, {
        language: 'en-US',
        rate,
        onDone: () => {
          this.speaking = false;
          options.onDone?.();
        },
        onStopped: () => {
          this.speaking = false;
          options.onDone?.();
        },
        onError: () => {
          this.speaking = false;
          options.onError?.('Speech synthesis encountered an audio error.');
        },
      });
      return;
    } catch {
      // Fallback timer
    }

    this.speaking = true;
    options.onStart?.();
    const words = text.trim().split(/\s+/).length;
    const durationMs = Math.min(Math.max((words / (2.5 * rate)) * 1000, 2000), 12000);
    this.fallbackTimer = setTimeout(() => {
      this.speaking = false;
      options.onDone?.();
    }, durationMs);
  }

  stop() {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    try {
      Speech.stop();
    } catch {
      // ignore
    }
    this.speaking = false;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }
}

export const speechManager = new SpeechManager();
