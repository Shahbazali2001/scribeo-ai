export function generateIdempotencyKey(): string {
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4';
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8];
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  return uuid;
}

export function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export interface ImageQualityCheck {
  valid: boolean;
  warning?: string;
  errorCode?: 'IMAGE_TOO_SMALL' | 'UNSUPPORTED_FORMAT';
  errorMessage?: string;
}

export function validateImageDimensions(
  width: number,
  height: number,
  mimeType = 'image/jpeg'
): ImageQualityCheck {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      errorCode: 'UNSUPPORTED_FORMAT',
      errorMessage: 'Please choose a JPEG, PNG, or WebP photo.',
    };
  }

  if (width < 200 || height < 200) {
    return {
      valid: false,
      errorCode: 'IMAGE_TOO_SMALL',
      errorMessage: 'This image is too small to read reliably (minimum 200×200 px).',
    };
  }

  if (width < 500 || height < 500) {
    return {
      valid: true,
      warning:
        'This photo has low resolution. Handwriting recognition works best with clear, close-up lighting.',
    };
  }

  return { valid: true };
}
