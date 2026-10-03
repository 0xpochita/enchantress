const TRANSIENT_NAMES = new Set([
  "HttpRequestError",
  "TimeoutError",
  "SocketClosedError",
  "TransactionReceiptNotFoundError",
  "WaitForTransactionReceiptTimeoutError",
  "LimitExceededRpcError",
  "InternalRpcError",
  "ResourceUnavailableRpcError",
  "APIConnectionError",
  "APIConnectionTimeoutError",
  "RetryableStepError",
]);

const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

const KNOWN_FAILURES = new Set([
  "ExecutionStepError",
  "NoLiquidityError",
  "ExecutionRequestError",
  "UnknownMarketError",
]);

const MAX_CAUSE_DEPTH = 6;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;
const HTTP_MAX = 600;

export class ExecutionStepError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ExecutionStepError";
    this.code = code;
  }
}

export class RetryableStepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableStepError";
  }
}

function field(error: object, key: string): unknown {
  return key in error ? Reflect.get(error, key) : undefined;
}

function isTransientStatus(status: unknown): boolean {
  if (typeof status !== "number") return false;
  return (
    status === HTTP_TOO_MANY_REQUESTS ||
    (status >= HTTP_SERVER_ERROR && status < HTTP_MAX)
  );
}

function isTransientLink(error: object): boolean {
  const name = field(error, "name");
  const code = field(error, "code");
  return (
    (typeof name === "string" && TRANSIENT_NAMES.has(name)) ||
    (typeof code === "string" && TRANSIENT_CODES.has(code)) ||
    isTransientStatus(field(error, "status")) ||
    (name === "TypeError" && field(error, "message") === "fetch failed")
  );
}

export function isTransient(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (typeof current !== "object" || current === null) return false;
    if (isTransientLink(current)) return true;
    current = field(current, "cause");
  }
  return false;
}

export function retryNote(error: unknown): string {
  const name = error instanceof Error ? error.name : "unknown error";
  const detail =
    error instanceof RetryableStepError ? `: ${error.message}` : "";
  return `Temporary problem (${name}${detail}), retrying.`;
}

export function failureOf(error: unknown): { code: string; message: string } {
  if (error instanceof Error && KNOWN_FAILURES.has(error.name))
    return { code: error.name, message: error.message };
  return {
    code: "UNEXPECTED",
    message:
      "Something went wrong while executing. Your funds stay in your wallet.",
  };
}
