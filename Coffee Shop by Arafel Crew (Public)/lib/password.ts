import crypto from 'crypto';

// Harus identik dengan hashPassword_ di apps-script/Code.gs: SHA-256(salt + ':' + password) hex.
export function hashPassword(password: string, salt: string = crypto.randomUUID()): { salt: string; hash: string } {
  const hash = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const candidate = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(hash).digest();
  return crypto.timingSafeEqual(a, b);
}