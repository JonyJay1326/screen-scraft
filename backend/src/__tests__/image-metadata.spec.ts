import { describe, expect, it } from 'vitest';
import { extensionMatchesImage, inspectSupportedImage } from '../ai/image-metadata';

describe('AI 参考图真实文件头解析', () => {
  it('读取 PNG IHDR 尺寸并校验扩展名', () => {
    const buffer = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
    buffer.write('IHDR', 12, 'ascii');
    buffer.writeUInt32BE(1920, 16);
    buffer.writeUInt32BE(1080, 20);

    const metadata = inspectSupportedImage(buffer);

    expect(metadata).toEqual({ mimeType: 'image/png', width: 1920, height: 1080, extension: '.png' });
    expect(extensionMatchesImage('design.PNG', metadata!)).toBe(true);
    expect(extensionMatchesImage('design.webp', metadata!)).toBe(false);
  });

  it('读取 JPEG SOF 尺寸并同时接受 jpg/jpeg', () => {
    const buffer = Buffer.from([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0x38, 0x07, 0x80,
      0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    ]);

    const metadata = inspectSupportedImage(buffer);

    expect(metadata).toMatchObject({ mimeType: 'image/jpeg', width: 1920, height: 1080 });
    expect(extensionMatchesImage('design.jpg', metadata!)).toBe(true);
    expect(extensionMatchesImage('design.jpeg', metadata!)).toBe(true);
  });

  it('读取 WebP VP8X 尺寸并拒绝伪造内容', () => {
    const buffer = Buffer.alloc(30);
    buffer.write('RIFF', 0, 'ascii');
    buffer.write('WEBP', 8, 'ascii');
    buffer.write('VP8X', 12, 'ascii');
    writeUInt24LE(buffer, 24, 1919);
    writeUInt24LE(buffer, 27, 1079);

    expect(inspectSupportedImage(buffer)).toEqual({
      mimeType: 'image/webp',
      width: 1920,
      height: 1080,
      extension: '.webp',
    });
    expect(inspectSupportedImage(Buffer.from('not-an-image'))).toBeNull();
  });
});

function writeUInt24LE(buffer: Buffer, offset: number, value: number): void {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
  buffer[offset + 2] = (value >> 16) & 0xff;
}
