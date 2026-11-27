import {
  ApiErrorCode,
  SamplePresetType,
  Scan,
  ScanFeedbackPayload,
  Summary,
  SummaryStyle,
  UsageStats,
  UserProfile,
  UserSettings,
} from '@/types/api';
import { countWords, generateIdempotencyKey } from '@/lib/idempotency';

const STORAGE_KEY = 'scribeo_ai_app_state_v2';

const INITIAL_SCANS: Scan[] = [
  {
    id: 'scan-101',
    userId: 'user-demo-1',
    imageUrl:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80',
    imageWidth: 1200,
    imageHeight: 1600,
    text: `Lecture 4: Memory Consolidation & Sleep Architecture

During slow-wave sleep, hippocampal neural replay reactivates newly encoded episodic memories and gradually transfers representations toward distributed neocortical networks. This two-stage memory model explains why cramming late at night impairs long-term retention compared to spaced practice followed by uninterrupted sleep cycles.

Key experimental findings discussed in class:
1. Participants who slept after learning word-pair associations recalled 38% more items after 48 hours than awake controls.
2. Targeted memory reactivation using subtle auditory cues during non-REM sleep selectively strengthened cued spatial memories.
3. Deprivation of REM sleep primarily disrupted procedural motor sequences and emotional regulation rather than declarative vocabulary lists.

For Friday's seminar, review chapters 6 and 7 and prepare two questions on synaptic homeostasis.`,
    textVersion: 1,
    wordCount: 122,
    confidence: 0.94,
    ocrModelVersion: 'microsoft/trocr-base-handwritten@v1.0',
    language: 'en',
    languageConfidence: 0.99,
    status: 'done',
    idempotencyKey: 'idem-seed-101',
    lines: [
      {
        text: 'Lecture 4: Memory Consolidation & Sleep Architecture',
        confidence: 0.97,
        box: [40, 48, 860, 96],
      },
      {
        text: 'During slow-wave sleep, hippocampal neural replay reactivates newly encoded',
        confidence: 0.93,
        box: [40, 120, 880, 165],
      },
    ],
    summaries: {
      short: {
        id: 'sum-101-short',
        scanId: 'scan-101',
        style: 'short',
        text: 'Slow-wave sleep transfers newly encoded memories from the hippocampus to the neocortex via neural replay, improving 48-hour recall by 38% compared to staying awake, while REM sleep primarily supports motor and emotional memory.',
        textVersion: 1,
        summaryModel: 'gemini-2.5-flash',
        createdAt: '2026-11-15T08:30:00.000Z',
      },
    },
    createdAt: '2026-11-15T08:00:00.000Z',
    updatedAt: '2026-11-15T08:30:00.000Z',
  },
  {
    id: 'scan-102',
    userId: 'user-demo-1',
    imageUrl:
      'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=80',
    imageWidth: 1080,
    imageHeight: 1440,
    text: `Sprint Planning Action Items - Thursday
- Finalize Supabase Storage RLS policy for private scan bucket
- Benchmark docTR + TrOCR CER on 100 phone photos before release
- Test offline idempotency retry behaviour on poor 3G connections`,
    textVersion: 1,
    wordCount: 36,
    confidence: 0.91,
    ocrModelVersion: 'microsoft/trocr-base-handwritten@v1.0',
    language: 'en',
    languageConfidence: 0.98,
    status: 'done',
    idempotencyKey: 'idem-seed-102',
    summaries: {},
    createdAt: '2026-11-15T06:15:00.000Z',
    updatedAt: '2026-11-15T06:15:00.000Z',
  },
  {
    id: 'scan-103',
    userId: 'user-demo-1',
    imageUrl:
      'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=900&q=80',
    imageWidth: 1000,
    imageHeight: 1300,
    text: `Field observation notes (rainy afternoon):
Sample #14 collected near the northern creek bend at 4:15 PM. Soil pH measured around 6.4 with noticeable clay sediment and fern root clusters.`,
    textVersion: 1,
    wordCount: 30,
    confidence: 0.68,
    ocrModelVersion: 'microsoft/trocr-base-handwritten@v1.0',
    language: 'en',
    languageConfidence: 0.95,
    status: 'done',
    idempotencyKey: 'idem-seed-103',
    summaries: {},
    createdAt: '2026-11-14T16:40:00.000Z',
    updatedAt: '2026-11-14T16:40:00.000Z',
  },
];

export const SAMPLE_PRESETS: Record<
  SamplePresetType,
  {
    label: string;
    subtitle: string;
    badge: string;
    imageUrl: string;
    width: number;
    height: number;
    resultStatus: 'done' | 'failed';
    text: string | null;
    confidence: number | null;
    language: string | null;
    languageConfidence: number | null;
    errorCode?: ApiErrorCode;
    errorMessage?: string;
  }
> = {
  long_lecture_notes: {
    label: 'Long Handwritten Page (95+ words)',
    subtitle: 'Triggers the 80+ word AI Summary suggestion popup',
    badge: '80+ words • 95% conf',
    imageUrl:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80',
    width: 1200,
    height: 1600,
    resultStatus: 'done',
    text: `Product Architecture Notes: Handwriting Recognition Pipeline

When capturing handwritten pages on mobile devices, lighting gradients and perspective tilt are the two largest sources of recognition errors. By running a dedicated line detector first (docTR db_mobilenet_v3_large) and feeding tightly cropped horizontal line strips into Microsoft TrOCR, character error rates drop significantly compared to whole-page inference.

Furthermore, keeping the OCR model in its own stateless microservice allows the FastAPI backend to stay lightweight while scaling GPU workers independently. Every uploaded scan uses a client-generated Idempotency-Key so retries over spotty mobile networks never create duplicate records or consume extra daily quota.`,
    confidence: 0.95,
    language: 'en',
    languageConfidence: 0.99,
  },
  short_grocery_list: {
    label: 'Short Handwritten Note (24 words)',
    subtitle: 'Skips language check & summary popup (< 80 words)',
    badge: '24 words • 92% conf',
    imageUrl:
      'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=80',
    width: 1080,
    height: 1440,
    resultStatus: 'done',
    text: `Weekend Errands & Groceries:
- Fresh sourdough bread & olive oil
- Pick up dry cleaning before 5 PM
- Call dentist to reschedule Tuesday appointment`,
    confidence: 0.92,
    language: 'en',
    languageConfidence: 0.96,
  },
  low_confidence_cursive: {
    label: 'Messy Cursive Note (Low Confidence)',
    subtitle: 'Shows the "Please review and edit mistakes" banner',
    badge: '64% conf • Review banner',
    imageUrl:
      'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=900&q=80',
    width: 1080,
    height: 1440,
    resultStatus: 'done',
    text: `Meeting with Dr. Hargrove regarding the archival manuscript restoration schedule. Need to verify whether the 19th-century iron gall ink samples require deacidification treatment before digitization.`,
    confidence: 0.64,
    language: 'en',
    languageConfidence: 0.92,
  },
  non_english_text: {
    label: 'Non-English Handwriting Edge Case',
    subtitle: 'Tests NOT_ENGLISH rule (not saved to history)',
    badge: 'Edge case • NOT_ENGLISH',
    imageUrl:
      'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?auto=format&fit=crop&w=900&q=80',
    width: 1080,
    height: 1440,
    resultStatus: 'failed',
    text: null,
    confidence: 0.78,
    language: 'es',
    languageConfidence: 0.94,
    errorCode: 'NOT_ENGLISH',
    errorMessage: 'Sorry, I can only read English handwriting right now.',
  },
  blank_page: {
    label: 'Blank / Unreadable Page Edge Case',
    subtitle: 'Tests NO_TEXT_FOUND rule with lighting tips',
    badge: 'Edge case • NO_TEXT_FOUND',
    imageUrl:
      'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=900&q=80',
    width: 1080,
    height: 1440,
    resultStatus: 'failed',
    text: null,
    confidence: 0.0,
    language: null,
    languageConfidence: null,
    errorCode: 'NO_TEXT_FOUND',
    errorMessage:
      'No handwritten text was detected on this page. Try moving closer, improving lighting, and keeping the page flat.',
  },
};

export function buildGeneratedSummary(text: string, style: SummaryStyle): string {
  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (style === 'short') {
    const firstTwo = sentences.slice(0, 2).join(' ');
    return (
      firstTwo ||
      'This handwritten note outlines key observations and action items captured from the page.'
    );
  }

  if (style === 'bullets') {
    const points = sentences.slice(0, 4).map((s) => `• ${s.replace(/^[•\-*\d.]+\s*/, '')}`);
    return points.length > 0
      ? points.join('\n')
      : `• Main topic captured from handwritten notes\n• Key action items and follow-up tasks identified`;
  }

  return `Overview:\n${sentences.slice(0, 2).join(' ')}\n\nKey Takeaways:\n${sentences
    .slice(2, 5)
    .map((s, idx) => `${idx + 1}. ${s}`)
    .join('\n')}\n\nWord count analyzed: ${countWords(text)} words.`;
}

function getNextUtcMidnightIso(): string {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
  );
  return tomorrow.toISOString();
}

interface StoredAccount {
  id: string;
  email: string;
  password: string;
  displayName: string;
  authProvider: 'email' | 'google';
}

export interface AppState {
  isAuthenticated: boolean;
  accessToken: string | null;
  profile: UserProfile;
  usage: UsageStats;
  scans: Scan[];
  ephemeralFailedScans: Record<string, Scan>;
  simulateOffline: boolean;
  pendingDraftImageUri: string | null;
  apiMode: 'hybrid' | 'live';
  apiBaseUrl: string;
}

type Listener = () => void;

class AppStore {
  private listeners = new Set<Listener>();

  private accounts: Record<string, StoredAccount> = {
    'alex.morgan@example.com': {
      id: 'user-demo-1',
      email: 'alex.morgan@example.com',
      password: 'password123',
      displayName: 'Alex Morgan',
      authProvider: 'email',
    },
  };

  private state: AppState = {
    isAuthenticated: false, // Starts on Login screen so authentication flow works properly
    accessToken: null,
    profile: {
      id: 'user-demo-1',
      email: 'alex.morgan@example.com',
      displayName: 'Alex Morgan',
      authProvider: 'email',
      settings: {
        theme: 'light', // Default to the new Warm Editorial Paper + Emerald/Teal light theme
        speechSpeed: 1.0,
        consentForTraining: false,
      },
      createdAt: '2026-11-01T10:00:00.000Z',
    },
    usage: {
      day: '2026-11-16',
      scansUsed: 3,
      scansLimit: 30,
      summariesUsed: 1,
      summariesLimit: 20,
      resetsAt: getNextUtcMidnightIso(),
    },
    scans: INITIAL_SCANS,
    ephemeralFailedScans: {},
    simulateOffline: false,
    pendingDraftImageUri: null,
    apiMode: 'hybrid',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  };

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage() {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
        const raw = globalThis.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.accounts) {
            this.accounts = { ...this.accounts, ...parsed.accounts };
          }
          if (parsed.state) {
            this.state = {
              ...this.state,
              ...parsed.state,
              ephemeralFailedScans: {},
            };
          }
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  private persistToStorage() {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
        globalThis.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            accounts: this.accounts,
            state: {
              isAuthenticated: this.state.isAuthenticated,
              accessToken: this.state.accessToken,
              profile: this.state.profile,
              usage: this.state.usage,
              scans: this.state.scans,
              apiMode: this.state.apiMode,
              apiBaseUrl: this.state.apiBaseUrl,
            },
          })
        );
      }
    } catch {
      // ignore
    }
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(updater: Partial<AppState> | ((prev: AppState) => AppState)) {
    this.state = typeof updater === 'function' ? updater(this.state) : { ...this.state, ...updater };
    this.persistToStorage();
    this.listeners.forEach((l) => l());
  }

  // Auth actions with real validation
  signInWithEmail(
    email: string,
    password?: string
  ): { ok: boolean; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }

    const existing = this.accounts[cleanEmail];
    if (existing && existing.password !== password) {
      return {
        ok: false,
        error: 'Incorrect password for this account. Try "password123" for the demo account or reset your password.',
      };
    }

    const account: StoredAccount = existing ?? {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      password,
      displayName: cleanEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      authProvider: 'email',
    };
    this.accounts[cleanEmail] = account;

    this.setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      accessToken: `sb-jwt-${Date.now()}`,
      profile: {
        ...prev.profile,
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        authProvider: 'email',
      },
    }));

    return { ok: true };
  }

  signUpWithEmail(
    displayName: string,
    email: string,
    password?: string
  ): { ok: boolean; error?: string } {
    const cleanName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      return { ok: false, error: 'Please enter your full name.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 8) {
      return { ok: false, error: 'Password must be at least 8 characters long.' };
    }
    if (this.accounts[cleanEmail]) {
      return {
        ok: false,
        error: 'An account with this email already exists. Please sign in instead.',
      };
    }

    const newAccount: StoredAccount = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      password,
      displayName: cleanName,
      authProvider: 'email',
    };
    this.accounts[cleanEmail] = newAccount;

    this.setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      accessToken: `sb-jwt-${Date.now()}`,
      profile: {
        ...prev.profile,
        id: newAccount.id,
        email: newAccount.email,
        displayName: newAccount.displayName,
        authProvider: 'email',
        createdAt: new Date().toISOString(),
      },
    }));

    return { ok: true };
  }

  resetPassword(email: string, newPassword?: string): { ok: boolean; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (this.accounts[cleanEmail] && newPassword && newPassword.length >= 6) {
      this.accounts[cleanEmail].password = newPassword;
      this.persistToStorage();
    }
    return { ok: true };
  }

  signInWithGoogle(): { ok: boolean } {
    const googleEmail = 'alex.morgan@gmail.com';
    this.accounts[googleEmail] = {
      id: 'user-google-1',
      email: googleEmail,
      password: 'google-oauth-token',
      displayName: 'Alex Morgan',
      authProvider: 'google',
    };

    this.setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      accessToken: `sb-google-jwt-${Date.now()}`,
      profile: {
        ...prev.profile,
        id: 'user-google-1',
        email: googleEmail,
        displayName: 'Alex Morgan',
        authProvider: 'google',
      },
    }));

    return { ok: true };
  }

  signOut() {
    this.setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      accessToken: null,
    }));
  }

  deleteAccount() {
    const currentEmail = this.state.profile.email.toLowerCase();
    delete this.accounts[currentEmail];
    this.setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      accessToken: null,
      scans: [],
      ephemeralFailedScans: {},
      usage: {
        ...prev.usage,
        scansUsed: 0,
        summariesUsed: 0,
      },
    }));
  }

  updateProfile(updates: { displayName?: string; settings?: Partial<UserSettings> }) {
    this.setState((prev) => {
      const nextName = updates.displayName ?? prev.profile.displayName;
      const emailKey = prev.profile.email.toLowerCase();
      if (this.accounts[emailKey]) {
        this.accounts[emailKey].displayName = nextName;
      }
      return {
        ...prev,
        profile: {
          ...prev.profile,
          displayName: nextName,
          settings: {
            ...prev.profile.settings,
            ...(updates.settings ?? {}),
          },
        },
      };
    });
  }

  setApiMode(mode: 'hybrid' | 'live', apiBaseUrl?: string) {
    this.setState((prev) => ({
      ...prev,
      apiMode: mode,
      apiBaseUrl: apiBaseUrl ?? prev.apiBaseUrl,
    }));
  }

  setSimulateOffline(offline: boolean) {
    this.setState((prev) => ({
      ...prev,
      simulateOffline: offline,
    }));
  }

  async retryFailedScan(scanId: string): Promise<void> {
    const failed = this.state.ephemeralFailedScans[scanId];
    if (!failed) return;
    this.setState((prev) => ({
      ...prev,
      simulateOffline: false,
      ephemeralFailedScans: {
        ...prev.ephemeralFailedScans,
        [scanId]: {
          ...failed,
          status: 'processing',
          errorCode: null,
          errorMessage: null,
          updatedAt: new Date().toISOString(),
        },
      },
    }));

    setTimeout(() => {
      const targetPreset = SAMPLE_PRESETS.long_lecture_notes;
      const completedScan: Scan = {
        ...failed,
        status: 'done',
        text: targetPreset.text,
        wordCount: countWords(targetPreset.text ?? ''),
        confidence: targetPreset.confidence,
        ocrModelVersion: 'microsoft/trocr-base-handwritten@v1.0',
        language: 'en',
        languageConfidence: 0.99,
        errorCode: null,
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      };

      this.setState((prev) => {
        const nextEphemeral = { ...prev.ephemeralFailedScans };
        delete nextEphemeral[scanId];
        return {
          ...prev,
          ephemeralFailedScans: nextEphemeral,
          scans: [completedScan, ...prev.scans],
          usage: {
            ...prev.usage,
            scansUsed: prev.usage.scansUsed + 1,
          },
        };
      });
    }, 1500);
  }

  async submitScan(options: {
    imageUri: string;
    width?: number;
    height?: number;
    preset?: SamplePresetType;
    customText?: string;
    idempotencyKey?: string;
  }): Promise<{ scanId: string; error?: { code: ApiErrorCode; message: string } }> {
    const idemKey = options.idempotencyKey || generateIdempotencyKey();

    const existing = this.state.scans.find((s) => s.idempotencyKey === idemKey);
    if (existing) {
      return { scanId: existing.id };
    }

    if (this.state.usage.scansUsed >= this.state.usage.scansLimit) {
      return {
        scanId: '',
        error: {
          code: 'QUOTA_EXCEEDED',
          message: `Daily scan limit (${this.state.usage.scansLimit}/day) reached. Resets at midnight UTC.`,
        },
      };
    }

    const scanId = `scan-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const presetConfig = options.preset ? SAMPLE_PRESETS[options.preset] : null;

    const processingScan: Scan = {
      id: scanId,
      userId: this.state.profile.id,
      imageUrl: options.imageUri || presetConfig?.imageUrl || INITIAL_SCANS[0].imageUrl,
      imageWidth: options.width || presetConfig?.width || 1200,
      imageHeight: options.height || presetConfig?.height || 1600,
      text: null,
      textVersion: 1,
      wordCount: 0,
      confidence: null,
      ocrModelVersion: null,
      language: null,
      languageConfidence: null,
      status: 'processing',
      idempotencyKey: idemKey,
      summaries: {},
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.setState((prev) => ({
      ...prev,
      pendingDraftImageUri: processingScan.imageUrl,
      ephemeralFailedScans: {
        ...prev.ephemeralFailedScans,
        [scanId]: processingScan,
      },
    }));

    if (this.state.simulateOffline) {
      setTimeout(() => {
        const networkFailedScan: Scan = {
          ...processingScan,
          status: 'failed',
          errorCode: 'NETWORK_ERROR',
          errorMessage:
            'Network connection lost while uploading photo. Your photo and Idempotency-Key are saved — tap Retry when back online.',
          updatedAt: new Date().toISOString(),
        };
        this.setState((prev) => ({
          ...prev,
          ephemeralFailedScans: {
            ...prev.ephemeralFailedScans,
            [scanId]: networkFailedScan,
          },
        }));
      }, 600);
      return { scanId };
    }

    setTimeout(() => {
      const targetPreset = presetConfig ?? SAMPLE_PRESETS.long_lecture_notes;

      if (targetPreset.resultStatus === 'failed' && !options.customText?.trim()) {
        const failedScan: Scan = {
          ...processingScan,
          status: 'failed',
          language: targetPreset.language,
          languageConfidence: targetPreset.languageConfidence,
          confidence: targetPreset.confidence,
          errorCode: targetPreset.errorCode,
          errorMessage: targetPreset.errorMessage,
          updatedAt: new Date().toISOString(),
        };
        this.setState((prev) => ({
          ...prev,
          ephemeralFailedScans: {
            ...prev.ephemeralFailedScans,
            [scanId]: failedScan,
          },
        }));
        return;
      }

      const finalText = options.customText?.trim() || targetPreset.text || '';
      const completedScan: Scan = {
        ...processingScan,
        status: 'done',
        text: finalText,
        wordCount: countWords(finalText),
        confidence: targetPreset.confidence ?? 0.93,
        ocrModelVersion: 'microsoft/trocr-base-handwritten@v1.0',
        language: 'en',
        languageConfidence: targetPreset.languageConfidence ?? 0.99,
        updatedAt: new Date().toISOString(),
      };

      this.setState((prev) => {
        const nextEphemeral = { ...prev.ephemeralFailedScans };
        delete nextEphemeral[scanId];
        return {
          ...prev,
          ephemeralFailedScans: nextEphemeral,
          scans: [completedScan, ...prev.scans],
          usage: {
            ...prev.usage,
            scansUsed: prev.usage.scansUsed + 1,
          },
        };
      });
    }, 1800);

    return { scanId };
  }

  getScanById(id: string): Scan | undefined {
    return this.state.scans.find((s) => s.id === id) ?? this.state.ephemeralFailedScans[id];
  }

  updateScanText(
    scanId: string,
    newText: string,
    expectedVersion: number
  ): { ok: boolean; error?: string } {
    const scan = this.state.scans.find((s) => s.id === scanId);
    if (!scan) {
      return { ok: false, error: 'Scan not found.' };
    }
    if (scan.textVersion !== expectedVersion) {
      return {
        ok: false,
        error: 'Version conflict: this scan was modified on another device. Refresh and try again.',
      };
    }

    const trimmed = newText.trim();
    const nextVersion = scan.textVersion + 1;

    this.setState((prev) => ({
      ...prev,
      scans: prev.scans.map((s) =>
        s.id === scanId
          ? {
              ...s,
              text: trimmed,
              textVersion: nextVersion,
              wordCount: countWords(trimmed),
              summaries: {},
              updatedAt: new Date().toISOString(),
            }
          : s
      ),
    }));

    return { ok: true };
  }

  deleteScan(scanId: string) {
    this.setState((prev) => {
      const nextEphemeral = { ...prev.ephemeralFailedScans };
      delete nextEphemeral[scanId];
      return {
        ...prev,
        scans: prev.scans.filter((s) => s.id !== scanId),
        ephemeralFailedScans: nextEphemeral,
      };
    });
  }

  async generateSummary(
    scanId: string,
    style: SummaryStyle
  ): Promise<{ summary?: Summary; error?: { code: ApiErrorCode; message: string } }> {
    const scan = this.state.scans.find((s) => s.id === scanId);
    if (!scan || !scan.text) {
      return {
        error: { code: 'NO_TEXT_FOUND', message: 'Cannot summarize an empty scan.' },
      };
    }

    const existing = scan.summaries[style];
    if (existing && existing.textVersion === scan.textVersion) {
      return { summary: existing };
    }

    if (this.state.usage.summariesUsed >= this.state.usage.summariesLimit) {
      return {
        error: {
          code: 'QUOTA_EXCEEDED',
          message: `Daily summary limit (${this.state.usage.summariesLimit}/day) reached. Resets at midnight UTC.`,
        },
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 800));

    const summaryText = buildGeneratedSummary(scan.text, style);
    const summary: Summary = {
      id: `sum-${scanId}-${style}-${scan.textVersion}`,
      scanId,
      style,
      text: summaryText,
      textVersion: scan.textVersion,
      summaryModel: 'gemini-2.5-flash',
      createdAt: new Date().toISOString(),
    };

    this.setState((prev) => ({
      ...prev,
      usage: {
        ...prev.usage,
        summariesUsed: prev.usage.summariesUsed + 1,
      },
      scans: prev.scans.map((s) =>
        s.id === scanId
          ? {
              ...s,
              summaries: {
                ...s.summaries,
                [style]: summary,
              },
              updatedAt: new Date().toISOString(),
            }
          : s
      ),
    }));

    return { summary };
  }

  async submitFeedback(_scanId: string, payload: ScanFeedbackPayload): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (payload.consentForTraining !== this.state.profile.settings.consentForTraining) {
      this.updateProfile({
        settings: { consentForTraining: payload.consentForTraining },
      });
    }
    return true;
  }
}

export const appStore = new AppStore();
