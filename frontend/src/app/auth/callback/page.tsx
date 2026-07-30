"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { PlatformBrandTitle } from "@/components/PlatformBrandTitle";
import { Icon } from "@/components/icons";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const needsProfile = searchParams.get("needsProfile") === "true";
    const needsEmailVerification = searchParams.get("needsEmailVerification") === "true";

    if (!accessToken || !refreshToken) {
      setError("Google sign-in did not return valid session tokens.");
      return;
    }

    api.setTokens(accessToken, refreshToken);

    const target =
      needsProfile || needsEmailVerification ? "/complete-profile" : "/dashboard";
    window.location.href = target;
  }, [searchParams]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="auth-error w-full">
          <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
        <a href="/register" className="auth-switch-link font-semibold">
          Back to registration
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <PlatformBrandTitle theme="dark" size="compact" />
      <p className="text-sm text-gray-600">Finishing Google sign-in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center px-6 text-sm text-gray-600">
          Finishing Google sign-in...
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
