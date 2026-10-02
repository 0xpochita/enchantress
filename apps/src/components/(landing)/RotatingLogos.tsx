import Image from "next/image";
import { iconSrc } from "@/utils/icon-src";

interface RotatingLogosProps {
  iconKeys: string[];
  size: number;
}

export function RotatingLogos({ iconKeys, size }: RotatingLogosProps) {
  return iconKeys.map((iconKey, position) => (
    <Image
      key={iconKey}
      src={iconSrc(iconKey)}
      alt=""
      loading="eager"
      width={size}
      height={size}
      className={position === 0 ? "pipeline-logo is-active" : "pipeline-logo"}
    />
  ));
}
