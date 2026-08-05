"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { LogoIcon } from "@/components/Logo";

export function useCancelRegistration() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return async () => {
    if (user) {
      await logout();
    }
    router.push("/");
  };
}

export function RegistrationTopBar() {
  const handleCancel = useCancelRegistration();

  return (
    <header className="sticky top-0 z-50 border-b border-brand-200 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 transition-opacity hover:opacity-85">
          <LogoIcon className="h-8 w-auto shrink-0 sm:h-11 lg:h-14" theme="dark" />
          <span className="text-sm font-extrabold leading-tight tracking-tight text-gray-900 sm:text-base lg:text-lg">
            Agricess Network International
          </span>
        </Link>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-50 sm:px-4 sm:py-2 sm:text-sm"
        >
          Cancel registration
        </button>
      </div>
    </header>
  );
}
