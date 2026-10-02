import "server-only";
import { InvalidAuthTokenError } from "@privy-io/node";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { type UserRow, users } from "@/lib/db/schema";
import type { Account } from "../types/account";
import {
  bearerToken,
  isTokenRejection,
  summarizePrivyAccounts,
} from "../utils/privy-user";
import { privyServer } from "./privy-server";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

async function verifiedUserDid(request: Request): Promise<string> {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) throw new UnauthorizedError();
  try {
    const claims = await privyServer().utils().auth().verifyAccessToken(token);
    return claims.user_id;
  } catch (error) {
    if (error instanceof InvalidAuthTokenError || isTokenRejection(error))
      throw new UnauthorizedError();
    throw error;
  }
}

async function syncUser(privyDid: string): Promise<UserRow> {
  const privyUser = await privyServer().users()._get(privyDid);
  const summary = summarizePrivyAccounts(privyUser.linked_accounts);
  const [row] = await db()
    .insert(users)
    .values({ privyDid, ...summary })
    .onConflictDoUpdate({
      target: users.privyDid,
      set: { ...summary, updatedAt: new Date() },
    })
    .returning();
  return row;
}

export async function requireUser(request: Request): Promise<UserRow> {
  const privyDid = await verifiedUserDid(request);
  const [existing] = await db()
    .select()
    .from(users)
    .where(eq(users.privyDid, privyDid))
    .limit(1);
  if (existing?.walletId) return existing;
  return syncUser(privyDid);
}

export function toAccount(user: UserRow): Account {
  return {
    id: user.id,
    email: user.email,
    walletAddress: user.walletAddress,
    isDelegated: user.delegatedAt !== null,
  };
}
