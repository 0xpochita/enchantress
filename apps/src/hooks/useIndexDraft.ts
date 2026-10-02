import { useMemo, useState } from "react";
import { type DraftCatalog, type DraftState, deriveDraft } from "@/utils/draft";

export type DraftStatus = "idle" | "submitted";

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function useIndexDraft(catalog: DraftCatalog) {
  const [state, setState] = useState<DraftState>({
    name: "",
    assetSymbols: [],
    weightMode: "equal",
    customPercents: {},
    amount: "",
    depositTokenId: catalog.defaultDepositTokenId,
  });
  const [status, setStatus] = useState<DraftStatus>("idle");
  const derived = useMemo(() => deriveDraft(catalog, state), [catalog, state]);
  const update = (patch: Partial<DraftState>) =>
    setState((current) => ({ ...current, ...patch }));
  const toggleAsset = (symbol: string) =>
    update({ assetSymbols: toggle(state.assetSymbols, symbol) });
  const setCustomPercent = (symbol: string, percent: number) =>
    update({ customPercents: { ...state.customPercents, [symbol]: percent } });

  return {
    ...state,
    ...derived,
    status,
    update,
    toggleAsset,
    setCustomPercent,
    submit: () => setStatus("submitted"),
  };
}

export type IndexDraft = ReturnType<typeof useIndexDraft>;
