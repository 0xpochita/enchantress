import Image from "next/image";
import { iconSrc } from "@/utils/icon-src";

const ART_SIZE = 320;

interface HalftoneArtProps {
  iconKey: string;
  className: string;
}

export function HalftoneArt({ iconKey, className }: HalftoneArtProps) {
  return (
    <div aria-hidden className={`pointer-events-none absolute ${className}`}>
      <Image
        src={iconSrc(iconKey)}
        alt=""
        width={ART_SIZE}
        height={ART_SIZE}
        className="size-full object-contain opacity-20 grayscale transition-opacity duration-200 ease-out group-hover:opacity-30 dark:opacity-25"
      />
      <div className="absolute inset-0 bg-[radial-gradient(var(--canvas)_1.2px,transparent_1.4px)] bg-size-[5px_5px] mask-radial-from-30% mask-radial-to-75%" />
    </div>
  );
}
