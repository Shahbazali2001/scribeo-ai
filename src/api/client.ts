import { appStore } from '@/store/app-store';
import {
  MeResponse,
  PaginatedScansResponse,
  Scan,
  ScanFeedbackPayload,
  Summary,
  SummaryStyle,
  UserProfile,
  UserSettings,
} from '@/types/api';
import { generateIdempotencyKey } from '@/lib/idempotency';

const APP_VERSION = '1.0.0';

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const { accessToken } = appStore.getState();
  return {
    Accept: 'application/json',
    'X-App-Version': APP_VERSION,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extra,
  };
}

/**
 * Typed client for the FastAPI backend (/api/v1/*).
 * In 'hybrid' mode, automatically falls back to the local state engine when the backend server is unreachable.
 */
export const apiClient = {
  async getMe(): Promise<MeResponse> {
    const state = appStore.getState();
    if (state.apiMode === 'live') {
      const res = await fetch(`${state.apiBaseUrl}/me`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(`GET /me failed (${res.status})`);
      return res.json();
    }
    return {
      profile: state.profile,
      usage: state.usage,
      recentScans: state.scans.slice(0, 5),
    };
  },

  async updateMe(payload: {
    displayName?: string;
    settings?: Partial<UserSettings>;
  }): Promise<UserProfile> {
    const state = appStore.getState();
    appStore.updateProfile(payload);
    if (state.apiMode === 'live') {
      try {
        const res = await fetch(`${state.apiBaseUrl}/me`, {
          method: 'PATCH',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
        if (res.ok) return res.json();
      } catch {
        // Fallback to local state in hybrid mode
      }
    }
    return appStore.getState().profile;
  },

  async deleteMe(): Promise<void> {
    const state = appStore.getState();
    if (state.apiMode === 'live') {
      try {
        await fetch(`${state.apiBaseUrl}/me`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
      } catch {
        // ignore
      }
    }
    appStore.deleteAccount();
  },

  async listScans(params: { q?: string; cursor?: string } = {}): Promise<PaginatedScansResponse> {
    const state = appStore.getState();
    if (state.apiMode === 'live') {
      const searchParams = new URLSearchParams();
      if (params.q) searchParams.set('q', params.q);
      if (params.cursor) searchParams.set('cursor', params.cursor);
      const res = await fetch(`${state.apiBaseUrl}/scans?${searchParams.toString()}`, {
        headers: getHeaders(),
      });
      if (res.ok) return res.json();
    }

    const q = (params.q || '').trim().toLowerCase();
    const filtered = state.scans.filter((scan) => {
      if (!q) return true;
      const inText = scan.text?.toLowerCase().includes(q) ?? false;
      const inSummaries = Object.values(scan.summaries).some((s) =>
        s?.text.toLowerCase().includes(q)
      );
      return inText || inSummaries;
    });

    return {
      items: filtered,
      nextCursor: null,
      totalCount: filtered.length,
    };
  },

  async getScan(scanId: string): Promise<Scan | undefined> {
    const state = appStore.getState();
    if (state.apiMode === 'live') {
      try {
        const res = await fetch(`${state.apiBaseUrl}/scans/${scanId}`, {
          headers: getHeaders(),
        });
        if (res.ok) return res.json();
      } catch {
        // fallback
      }
    }
    return appStore.getScanById(scanId);
  },

  async createSummary(
    scanId: string,
    style: SummaryStyle
  ): Promise<{ summary?: Summary; error?: { code: string; message: string } }> {
    const state = appStore.getState();
    if (state.apiMode === 'live') {
      try {
        const res = await fetch(`${state.apiBaseUrl}/scans/${scanId}/summary`, {
          method: 'POST',
          headers: getHeaders({
            'Content-Type': 'application/json',
            'Idempotency-Key': generateIdempotencyKey(),
          }),
          body: JSON.stringify({ style }),
        });
        if (res.ok) {
          const summary = await res.json();
          return { summary };
        }
      } catch {
        // fallback
      }
    }
    return appStore.generateSummary(scanId, style);
  },

  async submitFeedback(scanId: string, payload: ScanFeedbackPayload): Promise<boolean> {
    const state = appStore.getState();
    if (state.apiMode === 'live') {
      try {
        const res = await fetch(`${state.apiBaseUrl}/scans/${scanId}/feedback`, {
          method: 'POST',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
        if (res.ok) return true;
      } catch {
        // fallback
      }
    }
    return appStore.submitFeedback(scanId, payload);
  },
};
