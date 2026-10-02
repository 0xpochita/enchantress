import Image from "next/image";

interface RotatingLogosProps {
  iconKeys: string[];
  size: number;
}

export function RotatingLogos({ iconKeys, size }: RotatingLogosProps) {
  return iconKeys.map((iconKey, index) => (
    <Image
      key={iconKey}
      src={`/crypto/${iconKey}.svg`}
      alt=""
      loading="eager"
      width={size}
      height={size}
      className={index === 0 ? "pipeline-logo is-active" : "pipeline-logo"}
    />
  ));
}
