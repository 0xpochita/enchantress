import {
  type Abi,
  type Address,
  createPublicClient,
  custom,
  decodeFunctionData,
  encodeFunctionResult,
  isHex,
  type PublicClient,
} from "viem";
import { z } from "zod";

export interface StubCall {
  to: Address;
  functionName: string;
  args: readonly unknown[];
}

export type StubReads = (call: StubCall) => unknown;

const ethCallParams = z
  .tuple([z.object({ to: z.string(), data: z.string() })])
  .rest(z.unknown());

function answer(abis: Abi[], params: unknown, reads: StubReads) {
  const [{ to, data }] = ethCallParams.parse(params);
  if (!isHex(data) || !isHex(to)) throw new Error("Malformed eth_call");
  for (const abi of abis) {
    try {
      const { functionName, args } = decodeFunctionData({ abi, data });
      const result = reads({ to, functionName, args: args ?? [] });
      return encodeFunctionResult({ abi, functionName, result });
    } catch {}
  }
  throw new Error(`No stubbed read for ${to} ${data.slice(0, 10)}`);
}

export function stubClient(abis: Abi[], reads: StubReads): PublicClient {
  return createPublicClient({
    transport: custom({
      async request({ method, params }) {
        if (method === "eth_call") return answer(abis, params, reads);
        throw new Error(`Unexpected RPC method ${method}`);
      },
    }),
  });
}
