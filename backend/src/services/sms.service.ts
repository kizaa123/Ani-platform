export async function sendSmsOtp(toPhone: string, code: number) {
  const formattedCode = String(code).padStart(4, '0');
  const message = `Your ANI Platform verification code is: ${formattedCode}. Expires in 15 minutes.`;

  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();

  const smsApiKey = process.env.SMS_API_KEY?.trim();
  const smsSenderId = process.env.SMS_SENDER_ID?.trim() || 'ANI Platform';

  if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
    try {
      const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
      const body = new URLSearchParams({
        To: toPhone,
        From: twilioPhoneNumber,
        Body: message,
      });

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        console.error('[sms:twilio] Error sending SMS:', errorData);
        throw new Error((errorData?.message as string) || `Twilio HTTP ${res.status}`);
      }

      console.log(`[sms] Successfully sent SMS OTP (${formattedCode}) to ${toPhone} via Twilio`);
      return { sent: true, provider: 'twilio' as const };
    } catch (err) {
      console.error('[sms:twilio] Failed to send SMS via Twilio:', err);
    }
  }

  if (smsApiKey && process.env.SMS_API_URL) {
    try {
      const res = await fetch(process.env.SMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${smsApiKey}`,
        },
        body: JSON.stringify({
          to: toPhone,
          from: smsSenderId,
          message,
        }),
      });

      if (res.ok) {
        console.log(`[sms] Successfully sent SMS OTP (${formattedCode}) to ${toPhone} via SMS Gateway`);
        return { sent: true, provider: 'custom' as const };
      }
    } catch (err) {
      console.error('[sms:custom] Failed to send SMS via API Gateway:', err);
    }
  }

  console.log(`[sms:dev] Verification code for ${toPhone} → ${formattedCode}`);
  return { sent: false, devMode: true as const, devCode: formattedCode };
}
