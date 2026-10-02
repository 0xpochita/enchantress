# Authorization signatures (manual signing)

Source: https://docs.privy.io/api-reference/authorization-signatures.md, https://docs.privy.io/controls/authorization-keys/using-owners/sign/utility-functions.md

Prefer SDK auto-signing (`authorization_context`). Use this file only for KMS signing, client-signs/server-sends flows, or raw REST.

## When a signature is required

- `PATCH /v1/wallets/<id>`, `PATCH|DELETE /v1/policies/<id>` when `owner_id` is set.
- `POST /v1/wallets/<id>/rpc` when the wallet has an owner (signed by owner or by a signer allowed by its policy).
- `PATCH|DELETE /v1/key_quorums/<id>`: threshold of the existing quorum.
- GET requests never need one.

Header: `privy-authorization-signature: <sig>` (multiple quorum signatures comma-separated). Requests also use basic auth `appId:appSecret` and the `privy-app-id` header.

## Payload

```ts
import {type WalletApiRequestSignatureInput} from '@privy-io/node';

const input: WalletApiRequestSignatureInput = {
  version: 1,
  url: `https://api.privy.io/v1/wallets/${walletId}/rpc`, // no trailing slash
  method: 'POST',
  headers: {'privy-app-id': process.env.PRIVY_APP_ID!}, // only privy-* headers; add idempotency/expiry only if sent
  body: {method: 'personal_sign', params: {message: 'Hello from Privy!', encoding: 'utf-8'}}
};
```

## Server utilities (`@privy-io/node`)

```ts
import {formatRequestForAuthorizationSignature, generateAuthorizationSignature} from '@privy-io/node';

const bytes = formatRequestForAuthorizationSignature(input); // canonical bytes, e.g. send to KMS
const signature = generateAuthorizationSignature({
  input,
  authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY! // base64 private key
});
```

KMS through the SDK instead: `authorization_context: {sign_functions: [async (payload: Uint8Array) => base64P256Sig]}`. The payload is already canonical.

## Client signs a server-formatted payload (recommended client flow)

1. Server: `formatRequestForAuthorizationSignature(input)` -> base64 -> client.
2. Client (React):
   ```tsx
   import {useAuthorizationSignature} from '@privy-io/react-auth';
   const {generateAuthorizationSignature} = useAuthorizationSignature();
   const payloadBytes = Uint8Array.from(atob(payloadBase64), (c) => c.charCodeAt(0));
   const {signature} = await generateAuthorizationSignature(payloadBytes);
   ```
   (Uses the logged-in user's signing key.)
3. Server sends the request with the signature:
   ```ts
   await privy.wallets().rpc(walletId, {
     method: 'personal_sign',
     params: {message: 'Hello from Privy!', encoding: 'utf-8'},
     authorization_context: {signatures: [signature]}
   });
   ```

For user-owned wallets driven from the React SDK itself (useSendTransaction etc.), no manual signing is needed. The SDK fetches an ephemeral user signing key automatically.

Direct (no SDK) implementation: https://docs.privy.io/controls/authorization-keys/using-owners/sign/direct-implementation.md
