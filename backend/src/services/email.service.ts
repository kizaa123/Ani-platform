import nodemailer from 'nodemailer';
import { AppError } from '../utils/errors';

function createTransport() {
  const user = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim() || process.env.GMAIL_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
  const host = process.env.SMTP_HOST?.trim() || (user?.endsWith('@gmail.com') || process.env.GMAIL_USER ? 'smtp.gmail.com' : undefined);
  const port = Number(process.env.SMTP_PORT || (host === 'smtp.gmail.com' ? 465 : 587));

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      ...(host === 'smtp.gmail.com' ? { service: 'gmail' } : {}),
    });
  }

  return null;
}

export async function sendVerificationCodeEmail(to: string, code: number) {
  const userEmail = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
  const from = process.env.EMAIL_FROM?.trim() || (userEmail ? `ANI Platform <${userEmail}>` : 'ANI Platform <noreply@ani-platform.local>');
  const subject = 'Your ANI Platform Verification Code';
  const formattedCode = String(code).padStart(4, '0');

  const text = [
    'Verify your email address on ANI Platform.',
    '',
    `Your 4-digit verification code is: ${formattedCode}`,
    '',
    'Enter this code on the screen to complete your email verification.',
    '',
    'This code expires in 15 minutes. If you did not request this, you can ignore this message.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #065f46; font-size: 20px; font-weight: bold; margin-top: 0; text-align: center;">ANI Platform Email Verification</h2>
      <p style="font-size: 15px; color: #334155; line-height: 1.5; margin-bottom: 20px; text-align: center;">
        Use the 4-digit code below to verify your email address:
      </p>
      <div style="background-color: #f0fdf4; border: 2px dashed #059669; padding: 18px; text-align: center; border-radius: 12px; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #047857; font-family: monospace;">${formattedCode}</span>
      </div>
      <p style="font-size: 13px; color: #64748b; text-align: center; margin-bottom: 24px;">
        This code expires in 15 minutes.
      </p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
        If you did not request this code, you can safely ignore this email.
      </p>
    </div>
  `;

  const transport = createTransport();
  if (!transport) {
    console.log('[email:dev] Verification code for', to, '→', formattedCode);
    return { devMode: true as const, devCode: formattedCode };
  }

  try {
    await transport.sendMail({ from, to, subject, text, html });
    console.log(`[email] Successfully sent verification OTP (${formattedCode}) to ${to}`);
    return { devMode: false as const };
  } catch (err) {
    console.error('[email] Failed to send verification email:', err);
    throw new AppError(
      503,
      `Could not send verification email to ${to}: ${err instanceof Error ? err.message : 'SMTP failed'}`
    );
  }
}
