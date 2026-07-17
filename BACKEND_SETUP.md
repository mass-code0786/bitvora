# Bitvora backend foundation

This phase adds PostgreSQL identity and authentication only. Wallets, referrals payouts, ranks, salaries, and AI trading remain frontend demo data and are not imported into PostgreSQL.

## Local setup

1. Install dependencies with `npm install`.
2. Create an empty PostgreSQL database and user.
3. Copy `.env.example` to `.env`.
4. Set `DATABASE_URL`, for example `postgresql://bitvora:local-password@localhost:5432/bitvora?schema=public`.
5. Generate strong local values for `AUTH_SECRET` and `INTERNAL_JOB_SECRET` (at least 32 characters). Never commit them.
6. Keep `BUSINESS_TIMEZONE=Asia/Kolkata`.
7. Run `npm run db:generate`.
8. Apply the development migration with `npm run db:migrate -- --name init_backend_foundation`, or apply checked-in migrations with `npm run db:migrate:deploy`.
9. Explicitly seed development users with `npm run db:seed`.
10. Set `NEXT_PUBLIC_BACKEND_AUTH_ENABLED=true` only after the database is migrated and seeded, then run `npm run dev`.

The seed is idempotent and creates a three-user sponsor chain. Demo login: `demo@bitvora.local` / `BitvoraDemo!2026`. This credential is development-only and no seed runs automatically.

## Commands

- `npm test` — unit tests without PostgreSQL
- `npm run test:watch` — watch unit tests
- `npm run test:coverage` — coverage report
- `npm run typecheck` — TypeScript validation
- `npm run lint` — ESLint
- `npm run build` — production build
- `npm run db:studio` — Prisma Studio
- `npm run db:migrate:deploy` — apply migrations in a deployment

PostgreSQL integration tests should use a separate `TEST_DATABASE_URL`; they must never point at production. No destructive reset command is provided.

## NOWPayments deposits (local Step 7)

NOWPayments deposits do not require PostgreSQL. Provider/order records are kept server-side in the gitignored `.data/nowpayments-deposits.json`; the user-facing history remains in localStorage. Configure `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, and a public HTTPS `NEXT_PUBLIC_APP_URL`, then set `NOWPAYMENTS_DEPOSIT_ENABLED=true`. A localhost callback is not reachable by NOWPayments, so use an HTTPS development tunnel and set its origin as `NEXT_PUBLIC_APP_URL`. Manual status refresh remains available without an IPN callback.

The supported mappings are centralized as `USDT_BEP20 → usdtbsc` and `USDT_TRC20 → usdttrc20` and are checked against NOWPayments `/currencies`. Only provider status `finished` authorizes Spot Wallet credit. Partial payments require manual review; failed, refunded, and expired payments never credit.

For local UI testing only, set `NOWPAYMENTS_MOCK_MODE=true`. Mock mode is disabled in production, uses `MOCK_NP_` payment IDs and visibly fake addresses, and never represents received cryptocurrency.

## KYC storage (local development only)

KYC metadata is stored in `.data/kyc-records.json` and validated JPEG, PNG, or WEBP documents are stored in `.data/kyc-uploads/`. Both are gitignored and are never served from `public`. Files are available only through authenticated user-owned or protected admin streaming routes with private/no-store response headers. This local filesystem design is not production storage: replace it with encrypted private object storage, production authentication, access logging, retention controls, and key management before deployment.

Only an authoritative `APPROVED` KYC record passes `assertWithdrawalKycEligibility`. `NOT_SUBMITTED`, `PENDING`, and `REJECTED` return `KYC_REQUIRED_FOR_WITHDRAWAL` before a withdrawal record or wallet mutation can occur. KYC does not gate deposits, transfers, trading, referrals, ranks, rewards, or salary.

## Auth and demo coexistence

`NEXT_PUBLIC_BACKEND_AUTH_ENABLED=false` preserves the existing local demo registration, session, and financial state. With the flag set to `true`, the same form submits identity data to PostgreSQL and Auth.js, while existing financial hooks continue to read only their demo localStorage keys. Backend registration never reads or imports browser wallet data, and PostgreSQL users receive no wallets or balances in this phase.

Auth.js uses credentials and opaque database-backed sessions stored in the `Session` table. The session exposes the internal ID only to trusted server/session code and exposes the public `uid` for display. Backend routes should use `requireAuthenticatedUser()` instead of accepting a client-provided user ID.

Rate limiting, email verification delivery, password reset, audit logging, and production secret provisioning remain pending security work.
