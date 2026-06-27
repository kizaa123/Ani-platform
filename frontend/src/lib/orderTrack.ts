export const ORDER_TRACK_STAGES = ["ORDER_RECEIVED", "PROCESSING", "DELIVERED"] as const;

export type OrderTrackStage = (typeof ORDER_TRACK_STAGES)[number];

export const ORDER_TRACK_LABELS: Record<OrderTrackStage, string> = {
  ORDER_RECEIVED: "Order received",
  PROCESSING: "Processing",
  DELIVERED: "Delivered",
};

export function trackStageIndex(stage?: string | null): number {
  if (!stage) return 0;
  const idx = ORDER_TRACK_STAGES.indexOf(stage as OrderTrackStage);
  return idx >= 0 ? idx : 0;
}

export function nextTrackStage(stage?: OrderTrackStage | null): OrderTrackStage | null {
  const idx = trackStageIndex(stage);
  return idx < ORDER_TRACK_STAGES.length - 1 ? ORDER_TRACK_STAGES[idx + 1] : null;
}
