# Automatic withdrawals

Automatic withdrawals are disabled by default. Do not enable them until the schema migration, read-only audit, dry-run reconciliation, hot-wallet checks, and a limited-value test withdrawal have passed.

When the isolated payout worker has no healthy signer heartbeat, valid new requests use immutable `ADMIN_FALLBACK` mode and remain `PENDING_ADMIN_REVIEW`. They are never adopted automatically if a signer is configured later. An authorized administrator must record a valid transaction hash to approve them, or provide a reason to reject and refund them.

PM2 omits both withdrawal workers unless `WITHDRAWAL_AUTOMATION_ENABLED=true` and the selected worker signer configuration is complete. With no configured signer, deploy the web application normally; valid requests go directly to admin fallback and no blockchain payout job is created.

Each successfully created request consumes `WITHDRAWAL_DAILY:<userId>:<user-local-date>`. The unique database key enforces one request per persisted user-timezone calendar day across concurrent devices. Validation failures create no key.

## Process boundary

The web process receives only public chain configuration. It validates and checksum-normalizes the destination, applies KYC and operational limits, atomically debits the existing Spot wallet, and creates the authoritative withdrawal, debit ledger, and durable payout job.

Only `bitvora-withdrawal-worker` and `bitvora-withdrawal-confirmation-worker` receive signer configuration. Never put signer values in `.env.local`, the Next.js service environment, a `NEXT_PUBLIC_*` variable, the database, source control, or PM2 ecosystem source.

## Signer provisioning

The supported production signer is an encrypted Ethers V6 JSON keystore stored outside the repository with owner-read-only filesystem permissions. Generate the wallet and keystore offline using an organization-approved wallet tool; do not paste a key into a shell history or deployment ticket. Transfer only the encrypted JSON file to the worker host, set `WITHDRAWAL_KEYSTORE_PATH` to that external path, and inject `WITHDRAWAL_KEYSTORE_PASSWORD` from the deployment secret manager into the worker process only.

`WITHDRAWAL_SIGNER_TYPE=ENV_PRIVATE_KEY` is a temporary, explicitly unsafe fallback for isolated testing. `WITHDRAWAL_SIGNER_TYPE=KMS` is reserved for a deployment-specific KMS adapter and fails closed until that adapter is configured.

Use a dedicated limited-balance hot wallet. Refill it through a separate, controlled operations procedure. Never attach an unrestricted treasury key.

## Safe rollout

1. Deploy with `WITHDRAWAL_AUTOMATION_ENABLED=false` and do not start the withdrawal workers.
2. Run `npx prisma migrate deploy` and `npx prisma generate`.
3. Run `npm run withdrawal:reconcile -- --dry-run`.
4. Run `npm run withdrawal:audit -- --user=<USER_ID_OR_EMAIL>` for test users.
5. In a worker-only environment, run `npm run withdrawal:hot-wallet-status`.
6. Verify chain ID 56, the checksummed production USDT contract, 18 token decimals, gas reserve, token balance, configured limits, RPC health, and required confirmations.
7. Fund only the dedicated hot wallet with a limited test amount.
8. Set `WITHDRAWAL_AUTOMATION_ENABLED=true` only for the two worker processes and start them.
9. Submit one limited-value withdrawal, verify its debit ledger, nonce, transaction hash, confirmations, and completed status with the audit command.
10. Keep low limits initially and monitor structured `withdrawal_*` events.

If any broadcast is uncertain, leave the withdrawal in `MANUAL_REVIEW`. Investigate the signed transaction hash and chain nonce; never force a second transfer.
