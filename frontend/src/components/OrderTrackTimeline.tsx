"use client";

import { ORDER_TRACK_LABELS, ORDER_TRACK_STAGES, OrderTrackStage, nextTrackStage, trackStageIndex } from "@/lib/orderTrack";

interface OrderTrackTimelineProps {
  stage?: OrderTrackStage | null;
  compact?: boolean;
  className?: string;
}

export function OrderTrackTimeline({ stage, compact = false, className = "" }: OrderTrackTimelineProps) {
  const currentIndex = trackStageIndex(stage ?? "ORDER_RECEIVED");

  return (
    <div className={className}>
      {!compact && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Track order</p>
      )}
      <div className="flex items-start">
        {ORDER_TRACK_STAGES.map((step, index) => {
          const done = index <= currentIndex;
          const active = index === currentIndex;
          const isLast = index === ORDER_TRACK_STAGES.length - 1;

          return (
            <div key={step} className={`flex min-w-0 flex-1 items-start ${isLast ? "" : ""}`}>
              <div className="flex min-w-0 flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                      done
                        ? active
                          ? "border-brand-700 bg-brand-700 text-white"
                          : "border-green-600 bg-green-600 text-white"
                        : "border-gray-200 bg-white text-gray-400"
                    }`}
                  >
                    {done ? (active ? index + 1 : "✓") : index + 1}
                  </div>
                  {!isLast && (
                    <div
                      className={`mx-1 h-0.5 min-w-[8px] flex-1 rounded-full ${
                        index < currentIndex ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
                <p
                  className={`mt-2 px-0.5 text-center leading-tight ${
                    compact ? "text-[9px]" : "text-[10px] sm:text-xs"
                  } font-semibold ${
                    active ? "text-brand-800" : done ? "text-green-700" : "text-gray-400"
                  }`}
                >
                  {compact
                    ? ORDER_TRACK_LABELS[step].split(" ")[0]
                    : ORDER_TRACK_LABELS[step]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface OrderTrackControlsProps {
  stage?: OrderTrackStage | null;
  updating?: boolean;
  onAdvance: (nextStage: OrderTrackStage) => void;
}

export function OrderTrackControls({ stage, updating, onAdvance }: OrderTrackControlsProps) {
  const next = nextTrackStage(stage ?? "ORDER_RECEIVED");

  if (!next) {
    return (
      <p className="mt-3 text-center text-xs font-medium text-green-700">
        Order marked as delivered
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={updating}
      onClick={() => onAdvance(next)}
      className="btn-primary mt-3 w-full py-2.5 disabled:opacity-60"
    >
      {updating ? "Updating..." : `Mark as ${ORDER_TRACK_LABELS[next]}`}
    </button>
  );
}
