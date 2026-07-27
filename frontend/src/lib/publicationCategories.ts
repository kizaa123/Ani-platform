import type { ResearchPublication } from "@/lib/types";

export type PublicationCategory = "crop" | "animal" | "other";

export const PUBLICATION_CATEGORY_LABELS: Record<PublicationCategory, string> = {
  crop: "Crop Farming",
  animal: "Animal Farming",
  other: "Other",
};

const ANIMAL_KEYWORDS = [
  "livestock",
  "cattle",
  "poultry",
  "goat",
  "goats",
  "sheep",
  "pig",
  "pigs",
  "swine",
  "chicken",
  "chickens",
  "turkey",
  "egg",
  "eggs",
  "meat",
  "dairy",
  "animal",
  "fish",
  "tilapia",
  "catfish",
  "snail",
  "snails",
  "rabbit",
  "rabbits",
  "grasscutter",
  "bee",
  "bees",
  "broiler",
  "layer",
  "guinea fowl",
];

const CROP_KEYWORDS = [
  "crop",
  "crops",
  "maize",
  "cocoa",
  "tomato",
  "tomatoes",
  "rice",
  "cassava",
  "yam",
  "plantain",
  "cocoyam",
  "pepper",
  "onion",
  "vegetable",
  "vegetables",
  "fruit",
  "fruits",
  "mango",
  "pineapple",
  "groundnut",
  "cowpea",
  "soybean",
  "beans",
  "wheat",
  "millet",
  "sorghum",
  "ginger",
  "turmeric",
  "coffee",
  "oil palm",
  "palm",
  "cereal",
  "legume",
  "horticulture",
  "agronomy",
];

export function categorizePublicationByTitle(title: string): PublicationCategory {
  const lower = title.toLowerCase();
  if (ANIMAL_KEYWORDS.some((keyword) => lower.includes(keyword))) return "animal";
  if (CROP_KEYWORDS.some((keyword) => lower.includes(keyword))) return "crop";
  return "other";
}

export function groupPublicationsByCategory(
  publications: ResearchPublication[]
): Record<PublicationCategory, ResearchPublication[]> {
  const groups: Record<PublicationCategory, ResearchPublication[]> = {
    crop: [],
    animal: [],
    other: [],
  };
  for (const pub of publications) {
    groups[categorizePublicationByTitle(pub.title)].push(pub);
  }
  return groups;
}

export const PUBLICATION_CATEGORY_ORDER: PublicationCategory[] = ["crop", "animal", "other"];
