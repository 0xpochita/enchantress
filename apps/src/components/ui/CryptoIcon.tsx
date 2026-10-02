import Image from "next/image";

interface CryptoIconProps {
  iconKey: string;
  label: string;
  size?: number;
  badgeIconKey?: string;
}

const BADGE_RATIO = 0.45;
const DARK_MARK_ICONS = new Set(["near", "apt"]);

function toneClass(iconKey: string): string {
  return DARK_MARK_ICONS.has(iconKey) ? "invert" : "";
}

export function CryptoIcon({
  iconKey,
  label,
  size = 24,
  badgeIconKey,
}: CryptoIconProps) {
  const badgeSize = Math.round(size * BADGE_RATIO);
  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src={`/crypto/${iconKey}.svg`}
        alt={label}
        width={size}
        height={size}
        className={`size-full object-contain ${toneClass(iconKey)}`}
      />
      {badgeIconKey && (
        <Image
          src={`/crypto/${badgeIconKey}.svg`}
          alt=""
          width={badgeSize}
          height={badgeSize}
          className={`absolute -right-0.5 -bottom-0.5 rounded-full bg-surface object-contain ring-2 ring-surface ${toneClass(badgeIconKey)}`}
        />
      )}
    </span>
  );
}
