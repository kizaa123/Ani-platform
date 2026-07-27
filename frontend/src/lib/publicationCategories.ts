import type { ResearchPublication, ResearchPublicationCategory } from "@/lib/types";

export type PublicationCategory = ResearchPublicationCategory;

export const PUBLICATION_CATEGORY_LABELS: Record<PublicationCategory, string> = {
  CROP_FARM: "Crop Farm Publisher",
  LIVESTOCK_FARM: "Livestock Publisher",
  OTHER: "Others",
};

export const PUBLICATION_CATEGORY_OPTIONS: { value: PublicationCategory; label: string }[] = [
  { value: "CROP_FARM", label: "Crop Farm" },
  { value: "LIVESTOCK_FARM", label: "Livestock Farm" },
  { value: "OTHER", label: "Others" },
];

export function groupPublicationsByCategory(
  publications: ResearchPublication[]
): Record<PublicationCategory, ResearchPublication[]> {
  const groups: Record<PublicationCategory, ResearchPublication[]> = {
    CROP_FARM: [],
    LIVESTOCK_FARM: [],
    OTHER: [],
  };
  for (const pub of publications) {
    const category = pub.category ?? "OTHER";
    groups[category].push(pub);
  }
  return groups;
}

export const PUBLICATION_CATEGORY_ORDER: PublicationCategory[] = [
  "CROP_FARM",
  "LIVESTOCK_FARM",
  "OTHER",
];
