import { Icon } from "@/components/icons";
import { assetUrl } from "@/lib/assetUrl";

type PublicationCoverImageProps = {
  coverImage?: string | null;
  title?: string;
  className?: string;
  aspectClass?: string;
};

export function PublicationCoverImage({
  coverImage,
  title,
  className = "",
  aspectClass = "aspect-[3/4]",
}: PublicationCoverImageProps) {
  const src = coverImage ? assetUrl(coverImage) : null;

  return (
    <div
      className={`relative w-full overflow-hidden bg-brand-50 ${aspectClass} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={title ? `${title} cover` : "Publication cover"} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
          <Icon name="book" className="h-12 w-12 text-brand-300" />
        </div>
      )}
    </div>
  );
}
