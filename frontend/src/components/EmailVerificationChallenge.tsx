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
  const [choices, setChoices] = useState<number[]>([]);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [devHint, setDevHint] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const sendChallenge = async () => {
    setError("");
    setSending(true);
    try {
      const result = await api.auth.sendEmailVerification(email);
      setChoices(result.choices);
      setChallengeId(result.challengeId);
      setSent(true);
      setDevHint(result.devHint ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification email");
    } finally {
      setSending(false);
    }
  };

  const verifyChoice = async (selectedIndex: number) => {
    if (!challengeId) return;
    setError("");
    setLoading(true);
    try {
      await api.auth.verifyEmailChallenge({
        email,
        challengeId,
        selectedIndex,
      });
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="auth-section">
        <div className="flex items-start gap-3">
          <Icon name="message" className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
          <div>
            <h3 className="auth-section-title">Verify your email</h3>
            <p className="auth-hint mt-1">
              We will email one code to <EmailText email={email} className="inline font-semibold text-brand-900" />.
              Three numbers appear below — select the exact number from your email.
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
          <p className="text-center text-sm text-gray-600">
            Check your inbox and tap the number we sent you.
          </p>
          {devHint && (
            <div className="auth-info-box text-brand-800">{devHint}</div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {choices.map((choice, index) => (
              <button
                key={`${choice}-${index}`}
                type="button"
                disabled={loading}
                onClick={() => verifyChoice(index)}
                className="rounded-2xl border-2 border-brand-200 bg-white px-3 py-5 text-2xl font-bold tracking-widest text-brand-900 shadow-sm transition hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50"
              >
                {choice}
              </button>
            ))}
          </div>
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
