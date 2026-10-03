import type { Abi } from "viem";
import { erc20Abi } from "viem";
import { aavePoolAbi } from "../../chain/abis/aave.ts";
import { erc4626Abi } from "../../chain/abis/erc4626.ts";
import { UNISWAP_MONAD, uniswapRouterAbi } from "../../chain/abis/uniswap.ts";
import { MONAD_TOKEN_LIST } from "../../chain/config/tokens.ts";
import { VENUE_CONFIGS } from "../../vaults/config/venues.ts";

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
  return VENUE_CONFIGS.flatMap((venue) =>
    venue.kind === "aave-pool" ? [venue.pool] : Object.values(venue.vaults),
  );
}

export function buildVaultPolicyRules(): PolicyRule[] {
  const tokens = MONAD_TOKEN_LIST.map((token) => token.address);
  const pools = VENUE_CONFIGS.flatMap((v) =>
    v.kind === "aave-pool" ? [v.pool] : [],
  );
  const vaults = VENUE_CONFIGS.flatMap((v) =>
    v.kind === "erc4626" ? Object.values(v.vaults) : [],
  );
  const spenders = [...vaultSpenders(), UNISWAP_MONAD.swapRouter02];
  return [
    rule("Approve allowlisted spenders", [
      toAddresses(tokens),
      calldata("function_name", erc20Abi, "approve"),
      calldata("approve.spender", erc20Abi, spenders),
    ]),
    rule("Aave supply to self", [
      toAddresses(pools),
      calldata("function_name", aavePoolAbi, "supply"),
      calldata("supply.onBehalfOf", aavePoolAbi, WALLET),
    ]),
    rule("Aave withdraw to self", [
      toAddresses(pools),
      calldata("function_name", aavePoolAbi, "withdraw"),
      calldata("withdraw.to", aavePoolAbi, WALLET),
    ]),
    rule("Vault deposit to self", [
      toAddresses(vaults),
      calldata("function_name", erc4626Abi, "deposit"),
      calldata("deposit.receiver", erc4626Abi, WALLET),
    ]),
    rule("Vault redeem to self", [
      toAddresses(vaults),
      calldata("function_name", erc4626Abi, "redeem"),
      calldata("redeem.receiver", erc4626Abi, WALLET),
      calldata("redeem.owner", erc4626Abi, WALLET),
    ]),
    rule("Uniswap swap to self", [
      toAddresses([UNISWAP_MONAD.swapRouter02]),
      calldata("function_name", uniswapRouterAbi, "exactInputSingle"),
      calldata("exactInputSingle.params.recipient", uniswapRouterAbi, WALLET),
    ]),
  ];
}
