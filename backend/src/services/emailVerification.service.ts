import prisma from '../database/prisma';
import { AppError } from '../utils/errors';
import { sendVerificationCodeEmail } from './email.service';

const CHALLENGE_TTL_MS = 15 * 60 * 1000;

function generateDistinctChoices(): { choices: number[]; correctIndex: number; correctCode: number } {
  const choices = new Set<number>();
  while (choices.size < 3) {
    choices.add(1000 + Math.floor(Math.random() * 9000));
  }
  const list = Array.from(choices);
  const correctIndex = Math.floor(Math.random() * 3);
  return { choices: list, correctIndex, correctCode: list[correctIndex] };
}

export class EmailVerificationService {
  async sendChallenge(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const { choices, correctIndex, correctCode } = generateDistinctChoices();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

    await prisma.emailVerificationChallenge.updateMany({
      where: { email: normalizedEmail, verified: false },
      data: { verified: true },
    });

    const challenge = await prisma.emailVerificationChallenge.create({
      data: {
        email: normalizedEmail,
        choices,
        correctIndex,
        expiresAt,
      },
    });

    const delivery = await sendVerificationCodeEmail(normalizedEmail, correctCode);

    return {
      challengeId: challenge.id,
      choices,
      expiresAt: challenge.expiresAt.toISOString(),
      devMode: delivery.devMode,
      ...(delivery.devMode ? { devHint: `Dev mode: emailed code is ${correctCode}` } : {}),
    };
  }

  async verifyChallenge(email: string, challengeId: string, selectedIndex: number) {
    const normalizedEmail = email.trim().toLowerCase();
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
    if (selectedIndex < 0 || selectedIndex > 2 || selectedIndex !== challenge.correctIndex) {
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
