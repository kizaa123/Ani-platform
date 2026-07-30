import nodemailer from 'nodemailer';

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
  const text = [
    'Verify your email address on ANI Platform.',
    '',
    `Your verification code is: ${code}`,
    '',
    'Return to the app and select the number shown in this email from the three options on screen.',
    '',
    'This code expires in 15 minutes. If you did not request this, you can ignore this message.',
  ].join('\n');

  const transport = createTransport();
  if (!transport) {
    console.log('[email:dev] Verification code for', to, '→', code);
    return { devMode: true as const };
  }

  await transport.sendMail({ from, to, subject, text });
  return { devMode: false as const };
}
