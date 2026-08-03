import nodemailer from 'nodemailer';
import { AppError } from '../utils/errors';

function createTransport() {
  const user = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
  const rawPass = process.env.SMTP_PASS?.trim() || process.env.GMAIL_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
  const pass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;
  const isGmail = !!(user?.endsWith('@gmail.com') || process.env.GMAIL_USER);
  const host = process.env.SMTP_HOST?.trim() || (isGmail ? 'smtp.gmail.com' : undefined);
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : (isGmail ? 465 : 587);
  const secure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : (port === 465);

  if (user && pass && host) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  if (user && pass && isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return null;
}

export async function sendVerificationCodeEmail(to: string, code: number) {
  const userEmail = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
  const formattedFrom = process.env.EMAIL_FROM?.trim() || (userEmail ? `"ANI Platform" <${userEmail}>` : '"ANI Platform" <noreply@ani-platform.local>');
  const formattedCode = String(code).padStart(4, '0');
  const subject = `Your ANI Platform Verification Code: ${formattedCode}`;

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
    console.log('[email:dev] No SMTP transport configured. Verification code for', to, '→', formattedCode);
    return { devMode: true as const, devCode: formattedCode };
  }

  try {
    await transport.sendMail({
      from: formattedFrom,
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
    console.log(`[email] Successfully sent verification OTP (${formattedCode}) to ${to}`);
    return { devMode: false as const };
  } catch (err) {
    console.error('[email] Failed to send verification email via primary transport:', err);

    try {
      if (userEmail) {
        const rawPass = process.env.SMTP_PASS?.trim() || process.env.GMAIL_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
        const pass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;
        if (pass) {
          const fallbackTransport = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: userEmail, pass },
            tls: { rejectUnauthorized: false },
          });
          await fallbackTransport.sendMail({
            from: formattedFrom,
            to,
            subject,
            text,
            html,
          });
          console.log(`[email:fallback] Sent verification OTP (${formattedCode}) via fallback Gmail transport to ${to}`);
          return { devMode: false as const };
        }
      }
    } catch (fallbackErr) {
      console.error('[email:fallback] Fallback Gmail transport also failed:', fallbackErr);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[email:dev-fallback] Verification code for ${to} → ${formattedCode}`);
      return { devMode: true as const, devCode: formattedCode };
    }

    throw new AppError(
      503,
      `Could not send verification email to ${to}: ${err instanceof Error ? err.message : 'SMTP failed'}`
    );
  }
}
