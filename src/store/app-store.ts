import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

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
import {
  configureGoogleSignIn,
  signInWithGoogleNative,
  signOutFromGoogle,
} from '@/lib/google-auth';
import { countWords, generateIdempotencyKey } from '@/lib/idempotency';
import {
  fetchBackendState,
  ScanUploadError,
  uploadScanRequest,
} from '@/lib/scan-upload';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

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

function deriveDisplayName(email: string, metadata?: Record<string, unknown>): string {
  const fullName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    '';
  if (fullName) return fullName;
  if (!email) return 'Scribeo User';
  return email
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface AppState {
  isAuthenticated: boolean;
  authInitialized: boolean;
  accessToken: string | null;
  profile: UserProfile;
  usage: UsageStats;
  scans: Scan[];
  ephemeralFailedScans: Record<string, Scan>;
  scanIdAliases: Record<string, string>;
  simulateOffline: boolean;
  pendingDraftImageUri: string | null;
  apiMode: 'hybrid' | 'live';
  apiBaseUrl: string;
}

type Listener = () => void;

class AppStore {
  private listeners = new Set<Listener>();
  private liveUploadMeta = new Map<string, { isLiveUpload: boolean }>();

  private state: AppState = {
    isAuthenticated: false,
    authInitialized: false,
    accessToken: null,
    profile: {
      id: 'user-demo-1',
      email: 'alex.morgan@example.com',
      displayName: 'Alex Morgan',
      authProvider: 'email',
      settings: {
        theme: 'light', // Default to the Royal Blue light theme
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
    scanIdAliases: {},
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
          if (parsed.state) {
            const isDemoToken =
              typeof parsed.state.accessToken === 'string' &&
              parsed.state.accessToken.startsWith('sb-demo-jwt');
            this.state = {
              ...this.state,
              ...parsed.state,
              // Real Supabase sessions are hydrated authoritatively in initAuth()
              isAuthenticated: isDemoToken ? Boolean(parsed.state.isAuthenticated) : false,
              accessToken: isDemoToken ? parsed.state.accessToken : null,
              authInitialized: false,
              ephemeralFailedScans: {},
              scanIdAliases: {},
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

  private applySupabaseSession(session: Session | null, event?: string) {
    if (session?.user) {
      const user = session.user;
      const email = user.email ?? '';
      const provider = user.app_metadata?.provider === 'google' ? 'google' : 'email';
      const displayName = deriveDisplayName(email, user.user_metadata);

      this.setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        authInitialized: true,
        accessToken: session.access_token,
        profile: {
          ...prev.profile,
          id: user.id,
          email,
          displayName,
          authProvider: provider,
          createdAt: user.created_at ?? prev.profile.createdAt,
        },
      }));
      void this.syncFromBackend();
      return;
    }

    // Preserve active local demo session on initial check unless explicitly signed out
    const isDemoSession =
      event !== 'SIGNED_OUT' && Boolean(this.state.accessToken?.startsWith('sb-demo-jwt'));

    this.setState((prev) => ({
      ...prev,
      authInitialized: true,
      ...(isDemoSession
        ? {}
        : {
            isAuthenticated: false,
            accessToken: null,
          }),
    }));
  }

  initAuth(): () => void {
    configureGoogleSignIn();

    if (!isSupabaseConfigured) {
      this.setState({ authInitialized: true });
      return () => {};
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        this.applySupabaseSession(session, 'INITIAL_SESSION');
      })
      .catch(() => {
        this.setState({ authInitialized: true });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      this.applySupabaseSession(session, event);
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  async signInWithEmail(
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    if (!isSupabaseConfigured) {
      return {
        ok: false,
        error:
          'Supabase is not configured. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.',
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (data.session) {
      this.applySupabaseSession(data.session, 'SIGNED_IN');
    }

    return { ok: true };
  }

  async signUpWithEmail(
    displayName: string,
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string; needsEmailConfirmation?: boolean }> {
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
    if (!isSupabaseConfigured) {
      return {
        ok: false,
        error:
          'Supabase is not configured. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.',
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: cleanName },
      },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (data.session) {
      this.applySupabaseSession(data.session, 'SIGNED_IN');
      return { ok: true, needsEmailConfirmation: false };
    }

    return { ok: true, needsEmailConfirmation: true };
  }

  async resetPassword(email: string): Promise<{ ok: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (!isSupabaseConfigured) {
      return {
        ok: false,
        error:
          'Supabase is not configured. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.',
      };
    }

    const redirectTo = Linking.createURL('/(auth)/login');
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  async signInWithGoogle(): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
    const result = await signInWithGoogleNative();
    if (!result.ok) {
      return {
        ok: false,
        cancelled: result.cancelled,
        error: result.error,
      };
    }

    if (result.session) {
      this.applySupabaseSession(result.session, 'SIGNED_IN');
    }

    return { ok: true };
  }

  signInDemo(): { ok: boolean } {
    this.setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      authInitialized: true,
      accessToken: `sb-demo-jwt-${Date.now()}::user-demo-1::alex.morgan@example.com`,
      profile: {
        ...prev.profile,
        id: 'user-demo-1',
        email: 'alex.morgan@example.com',
        displayName: 'Alex Morgan',
        authProvider: 'email',
      },
    }));
    return { ok: true };
  }

  async signOut(): Promise<void> {
    await signOutFromGoogle();
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Clear local state even if network sign-out fails
      }
    }
    this.setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      accessToken: null,
    }));
  }

  async deleteAccount(): Promise<void> {
    await signOutFromGoogle();
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
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
    const isRealSession = Boolean(
      this.state.accessToken && !this.state.accessToken.startsWith('sb-demo-jwt')
    );

    this.setState((prev) => {
      const nextName = updates.displayName ?? prev.profile.displayName;
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

    if (updates.displayName && isRealSession && isSupabaseConfigured) {
      void supabase.auth.updateUser({
        data: { full_name: updates.displayName },
      });
    }
  }

  setApiMode(mode: 'hybrid' | 'live', apiBaseUrl?: string) {
    this.setState((prev) => ({
      ...prev,
      apiMode: mode,
      apiBaseUrl: apiBaseUrl ?? prev.apiBaseUrl,
    }));
    if (mode === 'live') {
      void this.syncFromBackend();
    }
  }

  async syncFromBackend(): Promise<void> {
    const { accessToken, apiBaseUrl, simulateOffline } = this.state;
    if (!accessToken || simulateOffline || accessToken.startsWith('sb-demo-jwt')) {
      return;
    }

    try {
      const { me, scans } = await fetchBackendState({ apiBaseUrl, accessToken });
      this.setState((prev) => {
        const serverName = me.profile.displayName?.trim() || '';
        const isServerPlaceholder =
          (serverName === 'Alex Morgan' || serverName === 'Scribeo User') &&
          prev.profile.email.toLowerCase() !== 'alex.morgan@example.com';
        return {
          ...prev,
          usage: me.usage,
          scans: scans.items,
          profile: {
            ...prev.profile,
            displayName: !isServerPlaceholder && serverName ? serverName : prev.profile.displayName,
            settings: {
              ...prev.profile.settings,
              ...me.profile.settings,
            },
          },
        };
      });
    } catch {
      // Backend offline — stay usable with local state in hybrid mode
    }
  }

  upsertScanFromServer(scan: Scan) {
    this.setState((prev) => {
      const exists = prev.scans.some((s) => s.id === scan.id);
      return {
        ...prev,
        scans: exists
          ? prev.scans.map((s) => (s.id === scan.id ? scan : s))
          : [scan, ...prev.scans],
      };
    });
  }

  applySummaryFromServer(scanId: string, summary: Summary) {
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
                [summary.style]: summary,
              },
              updatedAt: summary.createdAt,
            }
          : s
      ),
    }));
  }

  setSimulateOffline(offline: boolean) {
    this.setState((prev) => ({
      ...prev,
      simulateOffline: offline,
    }));
  }

  private async runLiveScanUpload(
    tempScanId: string,
    processingScan: Scan,
    imageUri: string,
    idemKey: string
  ): Promise<void> {
    try {
      const serverScan = await uploadScanRequest({
        apiBaseUrl: this.state.apiBaseUrl,
        accessToken: this.state.accessToken,
        imageUri,
        idempotencyKey: idemKey,
      });

      const resolvedImageUrl =
        serverScan.imageUrl && !serverScan.imageUrl.includes('placeholder.supabase.co')
          ? serverScan.imageUrl
          : processingScan.imageUrl;

      const normalizedScan: Scan = {
        ...serverScan,
        imageUrl: resolvedImageUrl,
      };

      if (normalizedScan.status === 'done') {
        this.liveUploadMeta.delete(tempScanId);
        this.setState((prev) => {
          const nextEphemeral = { ...prev.ephemeralFailedScans };
          delete nextEphemeral[tempScanId];
          const withoutDup = prev.scans.filter((s) => s.id !== normalizedScan.id);
          return {
            ...prev,
            ephemeralFailedScans: nextEphemeral,
            scanIdAliases: {
              ...prev.scanIdAliases,
              [tempScanId]: normalizedScan.id,
            },
            scans: [normalizedScan, ...withoutDup],
            usage: {
              ...prev.usage,
              scansUsed: Math.min(prev.usage.scansLimit, prev.usage.scansUsed + 1),
            },
          };
        });
        void this.syncFromBackend();
      } else {
        this.setState((prev) => ({
          ...prev,
          ephemeralFailedScans: {
            ...prev.ephemeralFailedScans,
            [tempScanId]: {
              ...normalizedScan,
              id: tempScanId,
              imageUrl: processingScan.imageUrl,
            },
          },
        }));
      }
    } catch (err) {
      const errorCode: ApiErrorCode =
        err instanceof ScanUploadError
          ? (err.code as ApiErrorCode)
          : 'NETWORK_ERROR';
      const errorMessage =
        err instanceof ScanUploadError
          ? err.message
          : `Could not reach the backend at ${this.state.apiBaseUrl}. Make sure FastAPI (port 4000) and ocr-service (port 8000) are running, then tap Retry.`;

      this.setState((prev) => ({
        ...prev,
        ephemeralFailedScans: {
          ...prev.ephemeralFailedScans,
          [tempScanId]: {
            ...processingScan,
            status: 'failed',
            errorCode,
            errorMessage,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    }
  }

  async retryFailedScan(scanId: string): Promise<void> {
    const failed = this.state.ephemeralFailedScans[scanId];
    if (!failed) return;

    const processingScan: Scan = {
      ...failed,
      status: 'processing',
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date().toISOString(),
    };

    this.setState((prev) => ({
      ...prev,
      simulateOffline: false,
      ephemeralFailedScans: {
        ...prev.ephemeralFailedScans,
        [scanId]: processingScan,
      },
    }));

    const wasLive =
      this.liveUploadMeta.get(scanId)?.isLiveUpload || this.state.apiMode === 'live';
    if (wasLive) {
      void this.runLiveScanUpload(scanId, processingScan, failed.imageUrl, failed.idempotencyKey);
      return;
    }

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
    isRealPhoto?: boolean;
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
    const useLiveOcr =
      !options.customText?.trim() &&
      (Boolean(options.isRealPhoto) || this.state.apiMode === 'live');

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

    if (useLiveOcr) {
      this.liveUploadMeta.set(scanId, { isLiveUpload: true });
    }

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

    if (useLiveOcr) {
      void this.runLiveScanUpload(scanId, processingScan, processingScan.imageUrl, idemKey);
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
