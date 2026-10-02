"use client";

import { usePathname } from "next/navigation";

const BASE =
  "pointer-events-none fixed bottom-0 -z-10 hidden bg-[url(/background/bg-1.webp)] bg-contain bg-left-bottom bg-no-repeat mix-blend-multiply invert lg:block dark:mix-blend-screen";
const FADED =
  "h-[70vh] w-[30vw] opacity-20 mask-r-from-20% mask-r-to-80% dark:opacity-45";
const FULL = "h-[52vh] w-[24vw] opacity-15 dark:opacity-35";
const FULL_DECOR_ROUTES = ["/aggregators"];

export function AppDecor() {
  const pathname = usePathname();
  const isFull = FULL_DECOR_ROUTES.some((route) => pathname.startsWith(route));
  const decor = `${BASE} ${isFull ? FULL : FADED}`;
  return (
    <>
      <div aria-hidden className={`${decor} -left-[4vw]`} />
      <div aria-hidden className={`${decor} -right-[4vw] -scale-x-100`} />
    </>
  );
}
