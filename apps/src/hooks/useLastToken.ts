"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "enchantress-last-token";

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useLastToken(defaultTokenId: string, tokenIds: string[]) {
  const [tokenId, setTokenId] = useState(defaultTokenId);
  const known = tokenIds.join(",");
  useEffect(() => {
    const stored = readStored();
    if (stored && known.split(",").includes(stored)) setTokenId(stored);
  }, [known]);
  const select = (id: string) => {
    setTokenId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  };
  return [tokenId, select] as const;
}
