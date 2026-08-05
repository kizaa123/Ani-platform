"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@/components/icons";
import { api } from "@/lib/api";
import { normalizePhoneForStorage } from "@/lib/phone";

interface PhoneVerificationChallengeProps {
  phone: string;
  country?: string;
  onVerified: () => void;
  /** Use before account exists (registration). */
  publicMode?: boolean;
}

export function PhoneVerificationChallenge({
  phone,
  country,
  onVerified,
  publicMode = false,
}: PhoneVerificationChallengeProps) {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const autoSentRef = useRef(false);
  const normalizedPhone = normalizePhoneForStorage(phone, country) || phone;

  const sendChallenge = async () => {
    setError("");
    setSending(true);
    try {
      const result = publicMode
        ? await api.auth.sendPhoneVerificationPublic(normalizedPhone, country ?? "")
        : await api.auth.sendPhoneVerification(normalizedPhone, country);
      setChallengeId(result.challengeId);
      setSent(true);
      setCode("");
      if (result.devMode && result.devCode) {
        setDevCode(result.devCode);
      } else {
        setDevCode(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send SMS code");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!autoSentRef.current && phone.trim()) {
      autoSentRef.current = true;
      sendChallenge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, country]);

  const verifyCode = async () => {
    if (!challengeId || code.length !== 4) return;
    setError("");
    setLoading(true);
    try {
      if (publicMode) {
        await api.auth.verifyPhoneChallengePublic({
          phone: normalizedPhone,
          challengeId,
          code,
          country: country ?? "",
        });
      } else {
        await api.auth.verifyPhoneChallenge({
          phone: normalizedPhone,
          challengeId,
          code,
          country,
        });
      }
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (raw: string) => {
    setCode(raw.replace(/\D/g, "").slice(0, 4));
  };

  const displayPhone = normalizedPhone
    ? normalizedPhone.slice(0, 4) + "****" + normalizedPhone.slice(-3)
    : "your number";

  return (
    <div className="space-y-5">
      <div className="auth-section">
        <div className="flex items-start gap-3">
          <Icon name="phone" className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
          <div>
            <h3 className="auth-section-title">Verify your phone number</h3>
            <p className="auth-hint mt-1">
              We{sending ? " are sending" : " sent"} a 4-digit code via SMS to{" "}
              <span className="font-semibold text-brand-900">{displayPhone}</span>.
              Enter it below to confirm your number.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="auth-error" role="alert">
          <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {devCode && (
        <div className="auth-info-box rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="status">
          <p className="font-semibold">Dev mode – SMS not configured</p>
          <p>
            Your verification code is:{" "}
            <span className="font-mono text-lg font-bold tracking-widest text-amber-900">
              {devCode}
            </span>
          </p>
          <p className="mt-2 text-xs text-amber-700">
            Configure Hubtel or Twilio in backend `.env` to send real SMS in production.
          </p>
        </div>
      )}

      {!sent ? (
        <button
          type="button"
          onClick={sendChallenge}
          disabled={sending || !phone.trim()}
          className="btn-primary w-full py-3 font-semibold disabled:opacity-50"
        >
          {sending ? "Sending SMS code..." : "Send SMS code"}
        </button>
      ) : (
        <>
          {!devCode && (
            <div className="auth-info-box text-brand-800" role="status">
              SMS code sent to{" "}
              <span className="font-semibold">{displayPhone}</span>. Check your
              messages and enter the code below.
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="phone-verification-code" className="auth-label">
              SMS verification code
            </label>
            <input
              id="phone-verification-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="0000"
              className="auth-input text-center text-2xl font-bold tracking-[0.35em]"
              autoFocus
            />
            <p className="auth-hint">Enter the 4-digit code from your SMS</p>
          </div>

          <button
            type="button"
            onClick={verifyCode}
            disabled={loading || code.length !== 4}
            className="btn-primary w-full py-3 font-semibold disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify phone number"}
          </button>

          <button
            type="button"
            onClick={sendChallenge}
            disabled={sending || loading}
            className="w-full text-sm font-semibold text-brand-700 hover:underline disabled:opacity-50"
          >
            {sending ? "Resending..." : "Resend SMS code"}
          </button>
        </>
      )}
    </div>
  );
}
