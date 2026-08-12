import nodemailer from 'nodemailer';
import { AppError } from '../utils/errors';
import { PLATFORM_NAME } from '../constants/platform';

function getFormattedFrom(): string {
  const userEmail = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
  const envFrom = process.env.EMAIL_FROM?.trim();
  if (envFrom) {
    const match = envFrom.match(/^(?:"?([^"<]+)"?\s+)?<([^>]+)>$/);
    if (match) {
      const name = match[1] ? match[1].trim() : PLATFORM_NAME;
      const address = match[2].trim();
      return `"${name}" <${address}>`;
    }
  }
  if (userEmail) {
    return `"${PLATFORM_NAME}" <${userEmail}>`;
  }
  return `"${PLATFORM_NAME}" <noreply@concordiaorbis.local>`;
}

function getTransports() {
  const user = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
  const rawPass = process.env.SMTP_PASS?.trim() || process.env.GMAIL_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
  const pass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;

  if (!user || !pass) return [];

  const isGmail = !!(user.endsWith('@gmail.com') || process.env.GMAIL_USER);

  const transports: { name: string; transport: nodemailer.Transporter }[] = [];

  if (isGmail) {
    transports.push({
      name: 'Gmail Service',
      transport: nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      }),
    });
  }

  transports.push({
    name: 'SMTP Port 587',
    transport: nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: { rejectUnauthorized: false },
    }),
  });

  transports.push({
    name: 'SMTP Port 465',
    transport: nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: { rejectUnauthorized: false },
    }),
  });

  return transports;
}

export async function sendVerificationCodeEmail(to: string, code: number) {
  const from = getFormattedFrom();
  const formattedCode = String(code).padStart(4, '0');
  const subject = `Your ${PLATFORM_NAME} Verification Code: ${formattedCode}`;

  const text = [
    `Verify your email address on ${PLATFORM_NAME}.`,
    '',
    `Your 4-digit verification code is: ${formattedCode}`,
    '',
    'Enter this code on the screen to complete your email verification.',
    '',
    'This code expires in 15 minutes. If you did not request this, you can ignore this message.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #065f46; font-size: 20px; font-weight: bold; margin-top: 0; text-align: center;">${PLATFORM_NAME} Email Verification</h2>
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

  const transports = getTransports();
  if (transports.length === 0) {
    console.log('[email:dev] No SMTP transport configured. Verification code for', to, '→', formattedCode);
    return { devMode: true as const, devCode: formattedCode };
  }

  let lastError: unknown = null;
  for (const { name, transport } of transports) {
    try {
      await transport.sendMail({
        from,
        to,
        subject,
        text,
        html,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
        },
      });
      console.log(`[email] Successfully sent verification OTP (${formattedCode}) to ${to} via ${name}`);
      return { devMode: false as const };
    } catch (err) {
      console.error(`[email] Failed sending via ${name}:`, err);
      lastError = err;
    }
  }

  const errorMsg = lastError instanceof Error ? lastError.message : 'SMTP failed';
  console.error('[email] All SMTP transport attempts failed for', to, ':', errorMsg);

  throw new AppError(
    503,
    `Could not send verification email to ${to}: ${errorMsg}`
  );
}
