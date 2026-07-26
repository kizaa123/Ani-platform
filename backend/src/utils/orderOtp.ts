import crypto from 'crypto';

/** Generate a random 4-digit release code (1000–9999). */
export function generateReleaseOtp(): string {
  return String(crypto.randomInt(1000, 10000));
}

export function verifyReleaseOtp(otp: string, stored: string | null | undefined): boolean {
  if (!stored || !/^\d{4}$/.test(otp)) return false;
  return otp === stored;
}
