import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/** 用 JWT_SECRET 派生密钥，AES-256-GCM 加密后端密钥 */
export function encryptSecret(plain: string, secret: string): string {
  const key = scryptSync(secret, 'screencraft-salt', 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

/** 解密后端密钥 */
export function decryptSecret(payload: string, secret: string): string {
  const buf = Buffer.from(payload, 'base64');
  const key = scryptSync(secret, 'screencraft-salt', 32);
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

/** 密文回显：保留末 4 位 */
export function maskSecret(plain: string): string {
  if (!plain) {
    return '';
  }
  const tail = plain.slice(-4);
  return `********${tail}`;
}
