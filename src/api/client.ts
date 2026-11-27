import { generateIdempotencyKey } from '@/lib/idempotency';
import { ScanUploadError, uploadScanRequest } from '@/lib/scan-upload';
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

const APP_VERSION = '1.0.0';

export const ApiRequestError = ScanUploadError;

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const { accessToken } = appStore.getState();
  return {
    Accept: 'application/json',
    'X-App-Version': APP_VERSION,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extra,
  };
}

async function parseErrorResponse(res: Response, fallbackMessage: string): Promise<ScanUploadError> {
  try {
    const body = await res.json();
    const err = body?.error;
    if (err?.message) {
      return new ScanUploadError(err.code || 'API_ERROR', err.message, res.status);
    }
    if (typeof body?.detail === 'string') {
      return new ScanUploadError('API_ERROR', body.detail, res.status);
    }
  } catch {
    // ignore non-JSON body
  }
  return new ScanUploadError('API_ERROR', `${fallbackMessage} (${res.status})`, res.status);
}

/**
 * Typed client for the FastAPI backend (/api/v1/*).
 * Real photo uploads always go to POST /api/v1/scans (FastAPI -> docTR + Hugging Face TrOCR).
 */
export const apiClient = {
  async getMe(): Promise<MeResponse> {
    const state = appStore.getState();
    const res = await fetch(`${state.apiBaseUrl}/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'GET /me failed');
    }
    return res.json();
  },

  async updateMe(payload: {
    displayName?: string;
    settings?: Partial<UserSettings>;
  }): Promise<UserProfile> {
    const state = appStore.getState();
    appStore.updateProfile(payload);
    try {
      const res = await fetch(`${state.apiBaseUrl}/me`, {
        method: 'PATCH',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      if (res.ok) return res.json();
    } catch {
      // Keep local update when offline in hybrid mode
    }
    return appStore.getState().profile;
  },

  async deleteMe(): Promise<void> {
    const state = appStore.getState();
    try {
      await fetch(`${state.apiBaseUrl}/me`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
    } catch {
      // ignore
    }
    await appStore.deleteAccount();
  },

  async createScan(imageUri: string, idempotencyKey: string): Promise<Scan> {
    const state = appStore.getState();
    return uploadScanRequest({
      apiBaseUrl: state.apiBaseUrl,
      accessToken: state.accessToken,
      imageUri,
      idempotencyKey,
    });
  },

  async listScans(params: { q?: string; cursor?: string } = {}): Promise<PaginatedScansResponse> {
    const state = appStore.getState();
    try {
      const searchParams = new URLSearchParams();
      if (params.q) searchParams.set('q', params.q);
      if (params.cursor) searchParams.set('cursor', params.cursor);
      const queryStr = searchParams.toString();
      const url = `${state.apiBaseUrl}/scans${queryStr ? `?${queryStr}` : ''}`;
      const res = await fetch(url, {
        headers: getHeaders(),
      });
      if (res.ok) return res.json();
    } catch {
      if (state.apiMode === 'live') {
        throw new ApiRequestError('NETWORK_ERROR', 'Could not reach backend server.', 0);
      }
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
    try {
      const res = await fetch(`${state.apiBaseUrl}/scans/${scanId}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const scan: Scan = await res.json();
        appStore.upsertScanFromServer(scan);
        return scan;
      }
    } catch {
      // fallback to local cache
    }
    return appStore.getScanById(scanId);
  },

  async updateScanText(
    scanId: string,
    newText: string,
    expectedVersion: number
  ): Promise<{ ok: boolean; error?: string }> {
    const state = appStore.getState();
    const isSeedScan = scanId.startsWith('scan-10');

    if (!isSeedScan) {
      try {
        const res = await fetch(`${state.apiBaseUrl}/scans/${scanId}`, {
          method: 'PATCH',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ text: newText.trim(), textVersion: expectedVersion }),
        });

        if (res.ok) {
          const updated: Scan = await res.json();
          appStore.upsertScanFromServer(updated);
          return { ok: true };
        }

        if (res.status === 409 || state.apiMode === 'live') {
          const err = await parseErrorResponse(res, 'Could not update scan text');
          return { ok: false, error: err.message };
        }
      } catch {
        if (state.apiMode === 'live') {
          return { ok: false, error: 'Could not reach backend server to save changes.' };
        }
      }
    }

    return appStore.updateScanText(scanId, newText, expectedVersion);
  },

  async deleteScan(scanId: string): Promise<void> {
    const state = appStore.getState();
    const isSeedScan = scanId.startsWith('scan-10');

    if (!isSeedScan) {
      try {
        await fetch(`${state.apiBaseUrl}/scans/${scanId}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
      } catch {
        // Still remove locally
      }
    }

    appStore.deleteScan(scanId);
  },

  async createSummary(
    scanId: string,
    style: SummaryStyle
  ): Promise<{ summary?: Summary; error?: { code: string; message: string } }> {
    const state = appStore.getState();
    const isSeedScan = scanId.startsWith('scan-10');

    if (!isSeedScan) {
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
          const summary: Summary = await res.json();
          appStore.applySummaryFromServer(scanId, summary);
          return { summary };
        }
        if (state.apiMode === 'live') {
          const err = await parseErrorResponse(res, 'Failed to generate summary');
          return { error: { code: err.code, message: err.message } };
        }
      } catch {
        if (state.apiMode === 'live') {
          return {
            error: {
              code: 'NETWORK_ERROR',
              message: 'Could not reach backend server to generate summary.',
            },
          };
        }
      }
    }

    return appStore.generateSummary(scanId, style);
  },

  async submitFeedback(scanId: string, payload: ScanFeedbackPayload): Promise<boolean> {
    const state = appStore.getState();
    const isSeedScan = scanId.startsWith('scan-10');

    if (!isSeedScan) {
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
