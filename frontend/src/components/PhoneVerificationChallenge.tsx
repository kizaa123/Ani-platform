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
  const [devMode, setDevMode] = useState(false);
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
      setDevMode(Boolean(result.devMode));
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

  const displayPhone = devMode
    ? "your phone number"
    : normalizedPhone
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
              {devMode ? (
                <>Enter the 4-digit verification code to confirm your phone number.</>
              ) : (
                <>
                  We{sending ? " are sending" : " sent"} a 4-digit code via SMS to{" "}
                  <span className="font-semibold text-brand-900">{displayPhone}</span>.
                  Enter it below to confirm your number.
                </>
              )}
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

      {devMode && sent && (
        <div
          className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4 shadow-sm"
          role="status"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <Icon name="settings" className="h-4 w-4" />
            </span>
            <div className="min-w-0 text-sm text-brand-900">
              <p className="font-semibold">Local testing mode</p>
              <p className="mt-1 leading-relaxed text-brand-800/90">
                SMS is simulated in this environment. Open your backend server console to find
                the verification code, then enter it below.
              </p>
            </div>
          </div>
        </div>
      )}

      {!sent ? (
        <button
          type="button"
          onClick={sendChallenge}
          disabled={sending || !phone.trim()}
          className="btn-primary w-full py-3 font-semibold disabled:opacity-50"
        >
          {sending ? "Preparing verification..." : devMode ? "Continue" : "Send SMS code"}
        </button>
      ) : (
        <>
          {!devMode && (
            <div className="auth-info-box text-brand-800" role="status">
              SMS code sent to{" "}
              <span className="font-semibold">{displayPhone}</span>. Check your messages and
              enter the code below.
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
            <p className="auth-hint">
              {devMode
                ? "Enter the 4-digit code shown in your backend server logs"
                : "Enter the 4-digit code from your SMS"}
            </p>
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
            {sending ? "Refreshing..." : devMode ? "Generate a new code" : "Resend SMS code"}
          </button>
        </>
      )}
    </div>
  );
}
