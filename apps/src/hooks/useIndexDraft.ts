import { useMemo, useState } from "react";
import { useSubmitFlow } from "@/hooks/useSubmitFlow";
import { type DraftCatalog, type DraftState, deriveDraft } from "@/utils/draft";

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function initialState(catalog: DraftCatalog): DraftState {
  return {
    name: "",
    assetSymbols: [],
    weightMode: "equal",
    customPercents: {},
    amount: "",
    depositTokenId: catalog.defaultDepositTokenId,
  };
}

export function useIndexDraft(catalog: DraftCatalog) {
  const [state, setState] = useState<DraftState>(() => initialState(catalog));
  const derived = useMemo(() => deriveDraft(catalog, state), [catalog, state]);
  const flow = useSubmitFlow(() => setState(initialState(catalog)));
  const update = (patch: Partial<DraftState>) =>
    setState((current) => ({ ...current, ...patch }));
  const toggleAsset = (symbol: string) =>
    update({ assetSymbols: toggle(state.assetSymbols, symbol) });
  const setCustomPercent = (symbol: string, percent: number) =>
    update({ customPercents: { ...state.customPercents, [symbol]: percent } });

  return {
    ...state,
    ...derived,
    ...flow,
    update,
    toggleAsset,
    setCustomPercent,
  };
}

export type IndexDraft = ReturnType<typeof useIndexDraft>;
