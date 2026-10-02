import { useEffect, useState } from "react";

const COPIED_MS = 1500;

export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false);
  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);
  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
  };
  return { isCopied, copy };
}
