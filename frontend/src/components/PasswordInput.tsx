"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/icons";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  wrapperClassName?: string;
};

export function PasswordInput({
  className = "auth-input",
  wrapperClassName,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${wrapperClassName ?? ""}`.trim()}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-11`.trim()}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((show) => !show)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 transition hover:text-brand-700 focus:outline-none focus-visible:text-brand-700"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        <Icon name={visible ? "eye-off" : "eye"} className="h-5 w-5" />
      </button>
    </div>
  );
}
