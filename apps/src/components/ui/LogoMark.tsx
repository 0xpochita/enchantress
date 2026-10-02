import Image from "next/image";

const MARK_HEIGHT = 22;

const MARKS = {
  dark: { src: "/logo/mark-dark.png", width: 24 },
  light: { src: "/logo/mark-light.png", width: 26 },
};

interface LogoMarkProps {
  tone: keyof typeof MARKS;
  className?: string;
}

export function LogoMark({ tone, className }: LogoMarkProps) {
  const mark = MARKS[tone];
  return (
    <Image
      src={mark.src}
      alt=""
      width={mark.width}
      height={MARK_HEIGHT}
      priority
      className={className}
    />
  );
}
