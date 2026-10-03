import { type Address, erc20Abi, type Log, parseEventLogs } from "viem";
import { erc4626Abi } from "../../chain/abis/erc4626.ts";

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function receivedAmount(
  logs: Log[],
  token: Address,
  recipient: Address,
): bigint {
  return parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs })
    .filter(
      (log) =>
        sameAddress(log.address, token) && sameAddress(log.args.to, recipient),
    )
    .reduce((sum, log) => sum + log.args.value, 0n);
}

export function mintedShares(
  logs: Log[],
  vault: Address,
  owner: Address,
): bigint {
  return parseEventLogs({ abi: erc4626Abi, eventName: "Deposit", logs })
    .filter(
      (log) =>
        sameAddress(log.address, vault) && sameAddress(log.args.owner, owner),
    )
    .reduce((sum, log) => sum + log.args.shares, 0n);
}
