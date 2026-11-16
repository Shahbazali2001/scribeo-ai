export type ScanStatus = 'processing' | 'done' | 'failed';

export type SummaryStyle = 'short' | 'bullets' | 'detailed';

export type ApiErrorCode =
  | 'NOT_ENGLISH'
  | 'NO_TEXT_FOUND'
  | 'UNREADABLE'
  | 'IMAGE_TOO_SMALL'
  | 'UNSUPPORTED_FORMAT'
  | 'QUOTA_EXCEEDED'
  | 'MODEL_BUSY'
  | 'VERSION_CONFLICT'
  | 'UNAUTHORIZED'
  | 'UPGRADE_REQUIRED'
  | 'NETWORK_ERROR';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  reset_at?: string;
}

export interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  speechSpeed: number; // 0.75 | 1.0 | 1.25 | 1.5
  consentForTraining: boolean;
}

export interface UsageStats {
  day: string;
  scansUsed: number;
  scansLimit: number;
  summariesUsed: number;
  summariesLimit: number;
  resetsAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  authProvider: 'email' | 'google';
  settings: UserSettings;
  createdAt: string;
}

export interface ScanLine {
  text: string;
  confidence: number;
  box: [number, number, number, number];
}

export interface Summary {
  id: string;
  scanId: string;
  style: SummaryStyle;
  text: string;
  textVersion: number;
  summaryModel: string;
  createdAt: string;
}

export interface Scan {
  id: string;
  userId: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  text: string | null;
  textVersion: number;
  wordCount: number;
  confidence: number | null;
  ocrModelVersion: string | null;
  language: string | null;
  languageConfidence: number | null;
  status: ScanStatus;
  errorCode?: ApiErrorCode | null;
  errorMessage?: string | null;
  idempotencyKey: string;
  lines?: ScanLine[];
  summaries: Partial<Record<SummaryStyle, Summary>>;
  createdAt: string;
  updatedAt: string;
}

export interface MeResponse {
  profile: UserProfile;
  usage: UsageStats;
  recentScans: Scan[];
}

export interface PaginatedScansResponse {
  items: Scan[];
  nextCursor: string | null;
  totalCount: number;
}

export interface ScanFeedbackPayload {
  rating: 1 | 2 | 3 | 4 | 5;
  correctedText?: string;
  consentForTraining: boolean;
}

export type SamplePresetType =
  | 'long_lecture_notes'
  | 'short_grocery_list'
  | 'low_confidence_cursive'
  | 'non_english_text'
  | 'blank_page';
