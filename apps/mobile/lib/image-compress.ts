/**
 * 클라이언트 이미지 압축 (Web Canvas API).
 *
 * 원본 3MB 명함 → 200KB 수준으로. 영업맨 50명 × 일 2장 × 30일 = 3,000장/월.
 * 압축 안 하면 9GB/월. 압축 후 600MB/월.
 *
 * 사용: const compressed = await compressImage(file)
 *      그대로 supabase.storage.upload() 에 넘김.
 */

import { Platform } from 'react-native';

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  /** 0.0 ~ 1.0 — jpeg 품질 */
  quality?: number;
  /** 압축 후 mime type */
  outputType?: 'image/jpeg' | 'image/webp';
}

const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8,
  outputType: 'image/jpeg',
};

/**
 * Web 전용 — Blob 또는 File 입력 → 압축된 Blob 반환.
 * 네이티브에선 expo-image-manipulator 필요 (V2).
 */
export async function compressImage(
  input: Blob,
  opts: CompressOptions = {},
): Promise<Blob> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    // 네이티브: 원본 그대로 반환 (V2에서 expo-image-manipulator 추가)
    return input;
  }
  if (!input.type.startsWith('image/')) return input;

  const { maxWidth, maxHeight, quality, outputType } = { ...DEFAULTS, ...opts };

  const bitmap = await createImageBitmap(input);
  let { width, height } = bitmap;

  // 비율 유지 리사이즈
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return input;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, quality),
  );

  if (!blob) return input;
  // 원본보다 압축본이 더 크면 (드물지만) 원본 그대로
  return blob.size < input.size ? blob : input;
}

/** 사람이 읽기 좋은 파일 크기 표시 */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
