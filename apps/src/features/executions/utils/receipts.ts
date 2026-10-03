import { type Address, erc20Abi, type Log, parseEventLogs } from "viem";

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
