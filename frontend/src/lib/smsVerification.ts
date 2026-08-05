/** Match backend SMS_PHONE_VERIFICATION_ENABLED — flip both when business SMS is ready. */
export const SMS_PHONE_VERIFICATION_ENABLED =
  process.env.NEXT_PUBLIC_SMS_PHONE_VERIFICATION_ENABLED === "true";
