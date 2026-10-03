export interface BetaGateInput {
  email: string | null;
  allowlist: string[];
  spentTodayUsd: number;
  valueUsd: number;
  maxPerDayUsd: number;
}

export type BetaGateResult = { ok: true } | { ok: false; reason: string };

export function checkBetaGate(input: BetaGateInput): BetaGateResult {
  const email = input.email?.toLowerCase() ?? "";
  if (input.allowlist.length > 0 && !input.allowlist.includes(email))
    return { ok: false, reason: "Your account is not in the beta yet." };
  const remaining = input.maxPerDayUsd - input.spentTodayUsd;
  if (input.valueUsd > remaining)
    return {
      ok: false,
      reason: `Beta limit: you can deposit up to $${Math.max(0, remaining).toFixed(2)} more today.`,
    };
  return { ok: true };
}
