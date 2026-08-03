import prisma from '../database/prisma';
import { AppError } from '../utils/errors';
import { sendSmsOtp } from './sms.service';
import { normalizePhoneForStorage } from '../utils/phone';

const CHALLENGE_TTL_MS = 15 * 60 * 1000;

function generateVerificationCode(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

// Helper to access Prisma models dynamically without stale @prisma/client type errors in IDE
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDb = () => prisma as any;

export class PhoneVerificationService {
  async sendChallenge(phone: string, country?: string) {
    const normalizedPhone = normalizePhoneForStorage(phone, country);
    if (!normalizedPhone) {
      throw new AppError(400, 'Invalid phone number format');
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

    await getDb().phoneVerificationChallenge.updateMany({
      where: { phone: normalizedPhone, verified: false },
      data: { verified: true },
    });

    const challenge = await getDb().phoneVerificationChallenge.create({
      data: {
        phone: normalizedPhone,
        code,
        expiresAt,
      },
    });

    const smsRes = await sendSmsOtp(normalizedPhone, code);

    return {
      challengeId: challenge.id as string,
      expiresAt: new Date(challenge.expiresAt).toISOString(),
      smsSent: smsRes.sent,
      devMode: 'devMode' in smsRes ? smsRes.devMode : false,
      devCode: 'devCode' in smsRes ? smsRes.devCode : undefined,
    };
  }

  async verifyChallenge(phone: string, challengeId: string, code: string, country?: string) {
    const normalizedPhone = normalizePhoneForStorage(phone, country);
    const rawPhone = phone ? phone.trim() : '';
    const normalizedCode = code.trim();
    if (!/^\d{4}$/.test(normalizedCode)) {
      throw new AppError(400, 'Enter the 4-digit verification code from your SMS');
    }

    const challenge = await getDb().phoneVerificationChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || (challenge.phone !== normalizedPhone && challenge.phone !== rawPhone)) {
      throw new AppError(400, 'Invalid phone verification challenge');
    }
    if (challenge.verified) {
      throw new AppError(400, 'This verification code was already used');
    }
    if (new Date(challenge.expiresAt) < new Date()) {
      throw new AppError(400, 'SMS verification code expired. Request a new one.');
    }

    if (Number(normalizedCode) !== Number(challenge.code)) {
      throw new AppError(400, 'Incorrect code. Check your SMS messages and try again.');
    }

    await getDb().phoneVerificationChallenge.update({
      where: { id: challenge.id },
      data: { verified: true },
    });

    return { verified: true };
  }
}

export const phoneVerificationService = new PhoneVerificationService();
