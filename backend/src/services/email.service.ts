import nodemailer from 'nodemailer';
import { AppError } from '../utils/errors';

function createTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return null;
}

export async function sendVerificationCodeEmail(to: string, code: number) {
  const from = process.env.EMAIL_FROM?.trim() || 'ANI Platform <noreply@ani-platform.local>';
  const subject = 'Your ANI Platform verification code';
  const formattedCode = String(code).padStart(4, '0');
  const text = [
    'Verify your email address on ANI Platform.',
    '',
    `Your 4-digit verification code is: ${formattedCode}`,
    '',
    'Enter this code on the Complete Profile screen to verify your email.',
    '',
    'This code expires in 15 minutes. If you did not request this, you can ignore this message.',
  ].join('\n');

  const transport = createTransport();
  if (!transport) {
    console.log('[email:dev] Verification code for', to, '→', formattedCode);
    return { devMode: true as const };
  }

  try {
    await transport.sendMail({ from, to, subject, text });
    return { devMode: false as const };
  } catch (err) {
    console.error('[email] Failed to send verification email:', err);
    throw new AppError(
      503,
      'Could not send verification email. Please try again later.'
    );
  }
}
