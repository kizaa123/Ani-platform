"use client";

import { useRef } from "react";
import { Icon, type IconName } from "@/components/icons";

type FileUploadZoneProps = {
  label: string;
  accept: string;
  icon: Extract<IconName, "file" | "image">;
  disabled?: boolean;
  uploading?: boolean;
  onFileSelect: (file: File) => void;
  fileName?: string;
  previewUrl?: string;
  hint?: string;
};

export function FileUploadZone({
  label,
  accept,
  icon,
  disabled = false,
  uploading = false,
  onFileSelect,
  fileName,
  previewUrl,
  hint,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSelection = Boolean(fileName || previewUrl);
  const isImage = icon === "image";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div>
      <label className="auth-label">{label}</label>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        disabled={disabled || uploading}
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className={`group relative w-full overflow-hidden rounded-xl border-2 border-dashed transition ${
          hasSelection
            ? "border-brand-300 bg-brand-50/50 hover:border-brand-400"
            : "border-brand-200 bg-white hover:border-brand-400 hover:bg-brand-50/30"
        } ${disabled || uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        {isImage && previewUrl ? (
          <div className="relative aspect-[3/4] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Cover preview" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
              <span className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-brand-800">
                {uploading ? "Uploading..." : "Replace cover"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center px-4 py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 transition group-hover:bg-brand-200">
              <Icon name={icon} className="h-6 w-6" />
            </div>
            {uploading ? (
              <p className="text-sm font-medium text-brand-700">Uploading...</p>
            ) : hasSelection ? (
              <>
                <p className="text-sm font-semibold text-brand-800">
                  {isImage ? "Replace cover" : "Replace document"}
                </p>
                {fileName && (
                  <p className="mt-1 max-w-full truncate text-xs text-brand-600">{fileName}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-brand-800">
                  Click to upload
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {hint ?? (isImage ? "PNG, JPG or WebP" : "PDF, EPUB, Word or text")}
                </p>
              </>
            )}
          </div>
        )}
      </button>
      {isImage && !previewUrl && fileName && (
        <p className="mt-1.5 truncate text-xs text-brand-600">{fileName}</p>
      )}
      {!isImage && fileName && !uploading && (
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-green-700">
          <Icon name="check-circle" className="h-3.5 w-3.5 shrink-0" />
          {fileName}
        </p>
      )}
    </div>
  );
}
