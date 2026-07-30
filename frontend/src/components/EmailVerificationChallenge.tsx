"use client";

import { useState } from "react";
import { EmailText } from "@/components/EmailText";
import { Icon } from "@/components/icons";
import { api } from "@/lib/api";

interface EmailVerificationChallengeProps {
  email: string;
  onVerified: () => void;
}

export function EmailVerificationChallenge({ email, onVerified }: EmailVerificationChallengeProps) {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [devHint, setDevHint] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [emailSentToInbox, setEmailSentToInbox] = useState(false);

  const sendChallenge = async () => {
    setError("");
    setSending(true);
    try {
      const result = await api.auth.sendEmailVerification(email);
      setChallengeId(result.challengeId);
      setSent(true);
      setEmailSentToInbox(!result.devMode);
      setDevHint(result.devHint ?? null);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification email");
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (!challengeId || code.length !== 6) return;
    setError("");
    setLoading(true);
    try {
      await api.auth.verifyEmailChallenge({
        email,
        challengeId,
        code,
      });
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (raw: string) => {
    setCode(raw.replace(/\D/g, "").slice(0, 6));
  };

  return (
    <div className="space-y-5">
      <div className="auth-section">
        <div className="flex items-start gap-3">
          <Icon name="message" className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
          <div>
            <h3 className="auth-section-title">Verify your email</h3>
            <p className="auth-hint mt-1">
              We will send a 6-digit code to{" "}
              <EmailText email={email} className="inline font-semibold text-brand-900" />.
              Enter the code from your inbox below.
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

      {!sent ? (
        <button
          type="button"
          onClick={sendChallenge}
          disabled={sending}
          className="btn-primary w-full py-3 font-semibold disabled:opacity-50"
        >
          {sending ? "Sending code..." : "Send verification code"}
        </button>
      ) : (
        <>
          {emailSentToInbox ? (
            <div className="auth-info-box text-brand-800" role="status">
              Verification code sent. Check your inbox at{" "}
              <EmailText email={email} className="inline font-semibold" /> and enter it below.
            </div>
          ) : devHint ? (
            <div className="auth-info-box text-brand-800">{devHint}</div>
          ) : null}

          <div className="auth-field">
            <label htmlFor="email-verification-code" className="auth-label">
              Verification code
            </label>
            <input
              id="email-verification-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="000000"
              className="auth-input text-center text-2xl font-bold tracking-[0.35em]"
            />
            <p className="auth-hint">Enter the 6-digit code from your email</p>
          </div>

          <button
            type="button"
            onClick={verifyCode}
            disabled={loading || code.length !== 6}
            className="btn-primary w-full py-3 font-semibold disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify email"}
          </button>

          <button
            type="button"
            onClick={sendChallenge}
            disabled={sending || loading}
            className="w-full text-sm font-semibold text-brand-700 hover:underline disabled:opacity-50"
          >
            {sending ? "Resending..." : "Resend code"}
          </button>
        </>
      )}
    </div>
  );
}
