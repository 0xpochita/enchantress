import { useMemo, useState } from "react";
import { useCreateIndex } from "@/features/indexes";
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
    venueIds: {},
    weightMode: "equal",
    customPercents: {},
    amount: "",
    depositTokenId: catalog.defaultDepositTokenId,
  };
}

export function useIndexDraft(catalog: DraftCatalog) {
  const [state, setState] = useState<DraftState>(() => initialState(catalog));
  const derived = useMemo(() => deriveDraft(catalog, state), [catalog, state]);
  const flow = useCreateIndex({
    recipe: derived.recipe,
    originTokenId: state.depositTokenId,
    amount: state.amount,
    onReset: () => setState(initialState(catalog)),
  });
  const update = (patch: Partial<DraftState>) =>
    setState((current) => ({ ...current, ...patch }));
  const toggleAsset = (symbol: string) => {
    const { [symbol]: _dropped, ...venueIds } = state.venueIds;
    update({ assetSymbols: toggle(state.assetSymbols, symbol), venueIds });
  };
  const pickVenue = (symbol: string, venueId: string) =>
    update({
      assetSymbols: state.assetSymbols.includes(symbol)
        ? state.assetSymbols
        : [...state.assetSymbols, symbol],
      venueIds: { ...state.venueIds, [symbol]: venueId },
    });
  const setCustomPercent = (symbol: string, percent: number) =>
    update({ customPercents: { ...state.customPercents, [symbol]: percent } });

  return {
    ...state,
    ...derived,
    flow,
    update,
    toggleAsset,
    pickVenue,
    setCustomPercent,
  };
}

export type IndexDraft = ReturnType<typeof useIndexDraft>;
