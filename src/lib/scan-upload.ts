import { Platform } from 'react-native';

import { ApiErrorCode, MeResponse, PaginatedScansResponse, Scan } from '@/types/api';

const APP_VERSION = '1.0.0';

export class ScanUploadError extends Error {
  code: ApiErrorCode | string;
  status: number;

  constructor(code: ApiErrorCode | string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
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

async function buildImageFormData(imageUri: string): Promise<FormData> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    formData.append('image', blob, `handwriting.${ext}`);
  } else {
    const lower = imageUri.toLowerCase();
    const mimeType = lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    formData.append('image', {
      uri: imageUri,
      name: `handwriting.${ext}`,
      type: mimeType,
    } as unknown as Blob);
  }

  return formData;
}

export async function uploadScanRequest(params: {
  apiBaseUrl: string;
  accessToken: string | null;
  imageUri: string;
  idempotencyKey: string;
}): Promise<Scan> {
  const formData = await buildImageFormData(params.imageUri);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-App-Version': APP_VERSION,
    'Idempotency-Key': params.idempotencyKey,
    ...(params.accessToken ? { Authorization: `Bearer ${params.accessToken}` } : {}),
  };

  const res = await fetch(`${params.apiBaseUrl.replace(/\/$/, '')}/scans`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, 'Scan upload failed');
  }

  return res.json();
}

export async function fetchBackendState(params: {
  apiBaseUrl: string;
  accessToken: string;
}): Promise<{ me: MeResponse; scans: PaginatedScansResponse }> {
  const base = params.apiBaseUrl.replace(/\/$/, '');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-App-Version': APP_VERSION,
    Authorization: `Bearer ${params.accessToken}`,
  };

  const [meRes, scansRes] = await Promise.all([
    fetch(`${base}/me`, { headers }),
    fetch(`${base}/scans`, { headers }),
  ]);

  if (!meRes.ok) {
    throw await parseErrorResponse(meRes, 'GET /me failed');
  }
  if (!scansRes.ok) {
    throw await parseErrorResponse(scansRes, 'GET /scans failed');
  }

  return {
    me: await meRes.json(),
    scans: await scansRes.json(),
  };
}
