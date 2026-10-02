export interface PrivyLinkedAccount {
  type: string;
  address?: string;
  id?: string | null;
  wallet_client_type?: string;
  chain_type?: string;
}

export interface PrivyAccountSummary {
  email: string | null;
  walletId: string | null;
  walletAddress: string | null;
}

function isEmbeddedEthereumWallet(account: PrivyLinkedAccount): boolean {
  return (
    account.type === "wallet" &&
    account.wallet_client_type === "privy" &&
    account.chain_type === "ethereum"
  );
}

export function summarizePrivyAccounts(
  accounts: PrivyLinkedAccount[],
): PrivyAccountSummary {
  const email = accounts.find((account) => account.type === "email");
  const wallet = accounts.find(isEmbeddedEthereumWallet);
  return {
    email: email?.address ?? null,
    walletId: wallet?.id ?? null,
    walletAddress: wallet?.address?.toLowerCase() ?? null,
  };
}

const TOKEN_ERROR_CODES = new Set([
  "ERR_JWT_EXPIRED",
  "ERR_JWT_INVALID",
  "ERR_JWT_CLAIM_VALIDATION_FAILED",
  "ERR_JWS_INVALID",
  "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
  "ERR_JOSE_ALG_NOT_ALLOWED",
  "ERR_JWKS_NO_MATCHING_KEY",
]);

export function isTokenRejection(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    TOKEN_ERROR_CODES.has(error.code)
  );
}

export function bearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}
