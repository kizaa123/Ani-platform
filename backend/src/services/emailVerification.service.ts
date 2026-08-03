import prisma from '../database/prisma';
import { AppError } from '../utils/errors';
import { sendVerificationCodeEmail } from './email.service';

const CHALLENGE_TTL_MS = 15 * 60 * 1000;

function generateVerificationCode(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDb = () => prisma as any;

export class EmailVerificationService {
  async sendChallenge(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

    await getDb().emailVerificationChallenge.updateMany({
      where: { email: normalizedEmail, verified: false },
      data: { verified: true },
    });

    const challenge = await getDb().emailVerificationChallenge.create({
      data: {
        email: normalizedEmail,
        choices: [code],
        correctIndex: 0,
        expiresAt,
      },
    });

    await sendVerificationCodeEmail(normalizedEmail, code);

    return {
      challengeId: challenge.id as string,
      expiresAt: new Date(challenge.expiresAt).toISOString(),
      emailSent: true,
    };
  }

  async verifyChallenge(email: string, challengeId: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();
    if (!/^\d{4}$/.test(normalizedCode)) {
      throw new AppError(400, 'Enter the 4-digit code from your email');
    }

    const challenge = await getDb().emailVerificationChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || challenge.email !== normalizedEmail) {
      throw new AppError(400, 'Invalid verification challenge');
    }
    if (challenge.verified) {
      throw new AppError(400, 'This challenge was already used');
    }
    if (new Date(challenge.expiresAt) < new Date()) {
      throw new AppError(400, 'Verification code expired. Request a new one.');
    }

    const storedCode = challenge.choices?.[0];
    if (storedCode === undefined || Number(normalizedCode) !== Number(storedCode)) {
      throw new AppError(400, 'Incorrect code. Check your email and try again.');
    }

    await getDb().emailVerificationChallenge.update({
      where: { id: challenge.id },
      data: { verified: true },
    });

    return { verified: true };
  }
}

export const emailVerificationService = new EmailVerificationService();
