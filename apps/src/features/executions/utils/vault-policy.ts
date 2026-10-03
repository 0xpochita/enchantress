import type { Abi } from "viem";
import { erc20Abi } from "viem";
import { UNISWAP_MONAD, uniswapRouterAbi } from "../../chain/abis/uniswap.ts";
import { MONAD_TOKEN_LIST } from "../../chain/config/tokens.ts";
import { VENUE_CONFIGS } from "../../vaults/config/venues.ts";
import { venueCalls } from "../../vaults/services/vault-adapters.ts";
import type { PolicyCall } from "../../vaults/types.ts";

const MONAD_CHAIN_ID = "143";
const WALLET = "{{wallet.address}}";

type Operator = "eq" | "in";
type PolicyAbi = readonly Exclude<Abi[number], { type: "error" }>[];

interface TransactionCondition {
  field_source: "ethereum_transaction";
  field: "to" | "value" | "chain_id";
  operator: Operator;
  value: string | string[];
}

interface CalldataCondition {
  field_source: "ethereum_calldata";
  field: string;
  operator: Operator;
  value: string | string[];
  abi: PolicyAbi;
}

export type PolicyCondition = TransactionCondition | CalldataCondition;

export interface PolicyRule {
  name: string;
  method: "eth_sendTransaction";
  action: "ALLOW";
  conditions: PolicyCondition[];
}

const onMonadWithoutValue: PolicyCondition[] = [
  {
    field_source: "ethereum_transaction",
    field: "chain_id",
    operator: "eq",
    value: MONAD_CHAIN_ID,
  },
  {
    field_source: "ethereum_transaction",
    field: "value",
    operator: "eq",
    value: "0x0",
  },
];

function calldata(
  field: string,
  abi: PolicyAbi,
  value: string | string[],
): CalldataCondition {
  return {
    field_source: "ethereum_calldata",
    field,
    operator: Array.isArray(value) ? "in" : "eq",
    value,
    abi,
  };
}

function toAddresses(addresses: string[]): TransactionCondition {
  return {
    field_source: "ethereum_transaction",
    field: "to",
    operator: "in",
    value: addresses,
  };
}

function rule(name: string, conditions: PolicyCondition[]): PolicyRule {
  return {
    name,
    method: "eth_sendTransaction",
    action: "ALLOW",
    conditions: [...onMonadWithoutValue, ...conditions],
  };
}

export function vaultSpenders(): string[] {
  return VENUE_CONFIGS.flatMap((venue) => venueCalls(venue).callTargets());
}

interface VenueRule {
  call: PolicyCall;
  targets: string[];
}

function groupVenueCalls(): VenueRule[] {
  const groups = new Map<string, VenueRule>();
  for (const calls of VENUE_CONFIGS.map(venueCalls))
    for (const call of calls.policyCalls()) {
      const group = groups.get(call.rule) ?? { call, targets: [] };
      group.targets.push(...calls.callTargets());
      groups.set(call.rule, group);
    }
  return [...groups.values()];
}

function venueRule({ call, targets }: VenueRule): PolicyRule {
  return rule(call.rule, [
    toAddresses(targets),
    calldata("function_name", call.abi, call.functionName),
    ...call.selfFields.map((field) => calldata(field, call.abi, WALLET)),
  ]);
}

export function buildVaultPolicyRules(): PolicyRule[] {
  const tokens = MONAD_TOKEN_LIST.map((token) => token.address);
  const spenders = [...vaultSpenders(), UNISWAP_MONAD.swapRouter02];
  return [
    rule("Approve allowlisted spenders", [
      toAddresses(tokens),
      calldata("function_name", erc20Abi, "approve"),
      calldata("approve.spender", erc20Abi, spenders),
    ]),
    ...groupVenueCalls().map(venueRule),
    rule("Uniswap swap to self", [
      toAddresses([UNISWAP_MONAD.swapRouter02]),
      calldata("function_name", uniswapRouterAbi, "exactInputSingle"),
      calldata("exactInputSingle.params.recipient", uniswapRouterAbi, WALLET),
    ]),
  ];
}
