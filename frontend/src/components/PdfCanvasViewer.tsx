"use client";

import { useEffect, useRef, useState } from "react";
import { SpinnerLabel } from "@/components/LoadingPrimitives";

/**
 * Canvas-based PDF renderer for browsers without a native inline PDF viewer
 * (Android Chrome has none; iOS Safari cannot scroll PDFs inside iframes).
 * Uses PDF.js loaded on demand from a CDN, so no build-time dependency.
 */

const PDFJS_VERSION = "3.11.174";
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

/* Minimal typings for the parts of PDF.js we use */
type PdfPageViewport = { width: number; height: number };
type PdfPage = {
  getViewport: (opts: { scale: number }) => PdfPageViewport;
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfPageViewport;
  }) => { promise: Promise<void> };
};
type PdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
};
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { url: string }) => { promise: Promise<PdfDocument> };
};

let pdfjsPromise: Promise<PdfJsLib> | null = null;

function loadPdfJs(): Promise<PdfJsLib> {
  const existing = (window as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib;
  if (existing) return Promise.resolve(existing);

  if (!pdfjsPromise) {
    pdfjsPromise = new Promise<PdfJsLib>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PDFJS_URL;
      script.async = true;
      script.onload = () => {
        const lib = (window as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib;
        if (!lib) {
          pdfjsPromise = null;
          reject(new Error("PDF renderer failed to initialise."));
          return;
        }
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        resolve(lib);
      };
      script.onerror = () => {
        pdfjsPromise = null;
        reject(new Error("Could not load the PDF renderer. Check your internet connection and try again."));
      };
      document.head.appendChild(script);
    });
  }
  return pdfjsPromise;
}

/**
 * True when the browser cannot be trusted to render a PDF inside an iframe:
 * all iOS/Android devices, plus any browser reporting pdfViewerEnabled === false.
 */
export function needsCanvasPdfRenderer(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ masquerades as macOS but is touch-capable
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  if (isIOS || isAndroid) return true;
  const nav = navigator as Navigator & { pdfViewerEnabled?: boolean };
  return nav.pdfViewerEnabled === false;
}

export function PdfCanvasViewer({ url, title }: { url: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let doc: PdfDocument | null = null;
    container.innerHTML = "";
    setError("");
    setProgress(null);

    (async () => {
      const pdfjs = await loadPdfJs();
      doc = await pdfjs.getDocument({ url }).promise;
      if (cancelled) return;

      const total = doc.numPages;
      setProgress({ done: 0, total });

      const containerWidth = container.clientWidth || window.innerWidth;
      // Cap DPR to keep canvas memory sane on long documents
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      for (let n = 1; n <= total; n++) {
        if (cancelled) return;
        const page = await doc.getPage(n);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / baseViewport.width;
        const viewport = page.getViewport({ scale: scale * dpr });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.className = "mb-3 block rounded-sm bg-white shadow-md";
        container.appendChild(canvas);

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not prepare the page for display.");
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setProgress({ done: n, total });
      }
    })().catch((e) => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : "Could not display the PDF.");
      }
    });

    return () => {
      cancelled = true;
      if (doc) {
        doc.destroy().catch(() => undefined);
      }
    };
  }, [url]);

  const stillRendering = !error && (!progress || progress.done < progress.total);

  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain" aria-label={title}>
      {error ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : (
        <>
          {stillRendering && (
            <div className="flex items-center justify-center py-6">
              <SpinnerLabel
                label={
                  progress
                    ? `Preparing page ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
                    : "Preparing document…"
                }
              />
            </div>
          )}
          <div ref={containerRef} className="mx-auto w-full max-w-3xl px-2 py-3" />
        </>
      )}
    </div>
  );
}
