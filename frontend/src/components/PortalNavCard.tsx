import Link from "next/link";
import Image from "next/image";
import { Icon, type IconName } from "@/components/icons";

export type PortalNavCardProps = {
  href: string;
  title: string;
  desc: string;
  icon: IconName;
  image: string;
};

/** Image-backed navigation card — matches homepage role card styling. */
export function PortalNavCard({ href, title, desc, icon, image }: PortalNavCardProps) {
  return (
    <Link
      href={href}
      className="group card-elevated card-elevated-hover flex cursor-pointer flex-col overflow-hidden rounded-2xl"
    >
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/60 via-brand-900/20 to-transparent" />
        <div className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-brand-700 shadow-[0_1px_2px_rgba(27,67,50,0.06)] backdrop-blur-sm transition-colors group-hover:bg-brand-700 group-hover:text-white">
          <Icon name={icon} className="h-4 w-4" />
        </div>
      </div>
      <div className="flex flex-col gap-0.5 p-4 md:gap-2 md:p-5">
        <h3 className="font-bold text-brand-900 group-hover:text-brand-700">{title}</h3>
        <p className="text-sm leading-snug text-gray-500 md:leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}
