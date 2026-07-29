export const verificationTagSelect = {
  id: true,
  tagType: true,
  createdAt: true,
} as const;

type VerificationTagRow = {
  id: string;
  tagType: string;
  createdAt: Date;
};

export function formatVerificationTags(tags: VerificationTagRow[]) {
  return tags.map((tag) => ({
    id: tag.id,
    tagType: tag.tagType,
    createdAt: tag.createdAt.toISOString(),
  }));
}
