/** Enable SMS OTP phone verification (Hubtel/Twilio). Off until business SMS is configured. */
export function isPhoneSmsVerificationEnabled(): boolean {
  return process.env.SMS_PHONE_VERIFICATION_ENABLED === 'true';
}
