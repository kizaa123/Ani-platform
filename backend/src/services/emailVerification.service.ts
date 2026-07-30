import prisma from '../database/prisma';
import { AppError } from '../utils/errors';
import { sendVerificationCodeEmail } from './email.service';

const CHALLENGE_TTL_MS = 15 * 60 * 1000;

function generateVerificationCode(): number {
  return Math.floor(100000 + Math.random() * 900000);
}

export class EmailVerificationService {
  async sendChallenge(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

    await prisma.emailVerificationChallenge.updateMany({
      where: { email: normalizedEmail, verified: false },
      data: { verified: true },
    });

    const challenge = await prisma.emailVerificationChallenge.create({
      data: {
        email: normalizedEmail,
        choices: [code],
        correctIndex: 0,
        expiresAt,
      },
    });

    const delivery = await sendVerificationCodeEmail(normalizedEmail, code);

    return {
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt.toISOString(),
      emailSent: true,
      devMode: delivery.devMode,
      ...(delivery.devMode ? { devHint: `Dev mode: verification code is ${code}` } : {}),
    };
  }

  async verifyChallenge(email: string, challengeId: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      throw new AppError(400, 'Enter the 6-digit code from your email');
    }

    const challenge = await prisma.emailVerificationChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || challenge.email !== normalizedEmail) {
      throw new AppError(400, 'Invalid verification challenge');
    }
    if (challenge.verified) {
      throw new AppError(400, 'This challenge was already used');
    }
    if (challenge.expiresAt < new Date()) {
      throw new AppError(400, 'Verification code expired. Request a new one.');
    }

    const storedCode = challenge.choices[0];
    if (storedCode === undefined || Number(normalizedCode) !== storedCode) {
      throw new AppError(400, 'Incorrect code. Check your email and try again.');
    }

    await prisma.emailVerificationChallenge.update({
      where: { id: challenge.id },
      data: { verified: true },
    });

    return { verified: true };
  }
}

export const emailVerificationService = new EmailVerificationService();
