import Image from "next/image";

export function AuroraIntents() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Image
        src="/logo/aurora-logo.avif"
        alt=""
        width={14}
        height={15}
        className="translate-y-0.5 rounded-sm"
      />
      Aurora Intents
    </span>
  );
}
