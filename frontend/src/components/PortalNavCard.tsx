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
      className="group flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
    >
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/60 via-brand-900/20 to-transparent" />
        <div className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-brand-700 shadow-sm backdrop-blur-sm transition-colors group-hover:bg-brand-700 group-hover:text-white">
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>
      <div className="flex flex-col gap-2 p-5">
        <h3 className="font-bold text-brand-900 group-hover:text-brand-700">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
      </div>
    </Link>
  );
}
