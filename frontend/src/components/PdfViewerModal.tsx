"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { SpinnerLabel } from "@/components/LoadingPrimitives";

type PdfViewerModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  loadUrl: () => Promise<string>;
  /** When true, shows a download button and enables the PDF toolbar. Defaults to false (view-only). */
  allowDownload?: boolean;
  downloadFilename?: string;
};

export function PdfViewerModal({
  title,
  open,
  onClose,
  loadUrl,
  allowDownload = false,
  downloadFilename,
}: PdfViewerModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const close = useCallback(() => {
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setError("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    loadUrl()
      .then((blobUrl) => {
        if (!cancelled) setUrl(blobUrl);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load PDF");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, loadUrl]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const downloadPdf = () => {
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      downloadFilename ??
      `${title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "document"}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-brand-900">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-800 bg-brand-900 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-brand-200">
            {allowDownload ? "View or download" : "In-platform viewer only"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {allowDownload && url && !loading && !error && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-brand-100 hover:bg-brand-800"
              onClick={downloadPdf}
            >
              <Icon name="download" className="h-4 w-4" />
              Download
            </button>
          )}
          <button
            type="button"
            className="rounded-lg p-2 text-brand-100 hover:bg-brand-800"
            onClick={close}
            aria-label="Close PDF viewer"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-brand-950">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <SpinnerLabel label="Loading PDF…" />
          </div>
        )}
        {error && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-red-200">{error}</p>
            <button type="button" className="btn-outline" onClick={close}>
              Close
            </button>
          </div>
        )}
        {url && !loading && !error && (
          <iframe
            title={title}
            src={`${url}#toolbar=${allowDownload ? 1 : 0}&navpanes=0`}
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}
