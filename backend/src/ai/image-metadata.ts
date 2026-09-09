import { extname } from 'node:path';

export type SupportedImageMime = 'image/png' | 'image/jpeg' | 'image/webp';

export interface ImageMetadata {
  mimeType: SupportedImageMime;
  width: number;
  height: number;
  extension: '.png' | '.jpg' | '.webp';
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

/** 只读取图片容器头部，不解码像素，也不信任扩展名和上传 MIME。 */
export function inspectSupportedImage(buffer: Buffer): ImageMetadata | null {
  return inspectPng(buffer) ?? inspectJpeg(buffer) ?? inspectWebp(buffer);
}

export function extensionMatchesImage(filename: string, metadata: ImageMetadata): boolean {
  const extension = extname(filename).toLowerCase();
  if (metadata.mimeType === 'image/jpeg') {
    return extension === '.jpg' || extension === '.jpeg';
  }
  return extension === metadata.extension;
}

function inspectPng(buffer: Buffer): ImageMetadata | null {
  if (
    buffer.length < 24
    || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
    || buffer.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    return null;
  }
  return createMetadata('image/png', buffer.readUInt32BE(16), buffer.readUInt32BE(20), '.png');
}

function inspectJpeg(buffer: Buffer): ImageMetadata | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset + 3 < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= buffer.length) {
      return null;
    }
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) {
      return null;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (offset + 2 > buffer.length) {
      return null;
    }
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      return null;
    }
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (segmentLength < 7) {
        return null;
      }
      return createMetadata('image/jpeg', buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 3), '.jpg');
    }
    offset += segmentLength;
  }
  return null;
}

function inspectWebp(buffer: Buffer): ImageMetadata | null {
  if (
    buffer.length < 30
    || buffer.toString('ascii', 0, 4) !== 'RIFF'
    || buffer.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    return null;
  }
  const kind = buffer.toString('ascii', 12, 16);
  if (kind === 'VP8X') {
    return createMetadata(
      'image/webp',
      1 + readUInt24LE(buffer, 24),
      1 + readUInt24LE(buffer, 27),
      '.webp',
    );
  }
  if (kind === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];
    return createMetadata(
      'image/webp',
      1 + b1 + ((b2 & 0x3f) << 8),
      1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
      '.webp',
    );
  }
  if (
    kind === 'VP8 '
    && buffer.length >= 30
    && buffer[23] === 0x9d
    && buffer[24] === 0x01
    && buffer[25] === 0x2a
  ) {
    return createMetadata(
      'image/webp',
      buffer.readUInt16LE(26) & 0x3fff,
      buffer.readUInt16LE(28) & 0x3fff,
      '.webp',
    );
  }
  return null;
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function createMetadata(
  mimeType: SupportedImageMime,
  width: number,
  height: number,
  extension: ImageMetadata['extension'],
): ImageMetadata | null {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { mimeType, width, height, extension };
}
