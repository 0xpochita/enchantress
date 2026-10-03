import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { generateP256KeyPair, PrivyClient } from "@privy-io/node";
import { buildVaultPolicyRules } from "../src/features/executions/utils/vault-policy.ts";

const ENV_FILE = ".env";
const KEYS = [
  "PRIVY_AUTHORIZATION_PRIVATE_KEY",
  "NEXT_PUBLIC_PRIVY_SIGNER_QUORUM_ID",
  "NEXT_PUBLIC_PRIVY_VAULT_POLICY_ID",
];

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const existing = KEYS.filter((key) => process.env[key]);
if (existing.length > 0) {
  throw new Error(
    `Already configured in ${ENV_FILE}: ${existing.join(", ")}. Remove them first to rotate.`,
  );
}

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;
if (!appId || !appSecret)
  throw new Error("NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET are required");

const privy = new PrivyClient({ appId, appSecret });
const keyPair = await generateP256KeyPair();

const quorum = await privy.keyQuorums().create({
  public_keys: [keyPair.publicKey],
  authorization_threshold: 1,
  display_name: "Enchantress vault signer",
});

const policy = await privy.policies().create({
  version: "1.0",
  name: "Enchantress vault deposits on Monad",
  chain_type: "ethereum",
  owner_id: quorum.id,
  rules: buildVaultPolicyRules(),
});

const envText = readFileSync(ENV_FILE, "utf8");
const prefix = envText.endsWith("\n") ? "" : "\n";
appendFileSync(
  ENV_FILE,
  `${prefix}\nPRIVY_AUTHORIZATION_PRIVATE_KEY=${keyPair.privateKey}\nNEXT_PUBLIC_PRIVY_SIGNER_QUORUM_ID=${quorum.id}\nNEXT_PUBLIC_PRIVY_VAULT_POLICY_ID=${policy.id}\n`,
);

process.stdout.write(
  `Created key quorum ${quorum.id} and policy ${policy.id} (${policy.rules.length} rules). Values appended to ${ENV_FILE}. Restart the dev server.\n`,
);
