import { LogoMark } from "./LogoMark";

export function ThemedLogoMark() {
  return (
    <>
      <LogoMark tone="light" className="dark:hidden" />
      <LogoMark tone="dark" className="hidden dark:block" />
    </>
  );
}
