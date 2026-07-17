# Production authority migration audit

No local/demo financial record is eligible for automatic import.

## Remove completely from runtime

- `lib/mock-data.ts`: sample identities, balances, transactions, referrals, notifications, ranks and salaries.
- `prisma/seed.ts`: development users and shared demo password.
- `lib/admin/admin-auth.server.ts`: fixed demo-admin credentials/cookies.
- Browser-generated financial IDs and React-side wallet/status mutations.
- NOWPayments mock IDs, fake addresses, simulation, and runtime mock configuration.
- Fake market-price and client-side AI session/settlement fallbacks.

## Replace with PostgreSQL

- User registry/current-user browser identity.
- Wallets, ledger, holds, transfers and adjustments.
- Referral/team, rank, rewards and salary stores.
- AI sessions, trades, settlements, eligibility and progress.
- Notifications, audit logs and operational settings.
- NOWPayments JSON/client history and KYC JSON metadata.
- Admin aggregation currently derived from browser stores.

## Replace with real API or private service

- Production NOWPayments adapter; mocks remain test-only.
- KYC files move to private S3-compatible storage with signed authorized access.
- Market data uses the configured provider; outages show unavailable.

## Keep as reviewed static configuration

- Coin catalog, logos, network mappings, business percentages, rank plan, rewards, salaries, AI ranges, wallet rules, Asia/Kolkata schedules, UI labels and status mappings.

## Keep as UI placeholder only

- Withdrawal payout processing may remain unavailable, but eligibility and balance checks are server-authoritative.

## Data strategy

Default to a clean database. Bootstrap an admin role only for an already registered `ADMIN_BOOTSTRAP_EMAIL`. Any legacy import must be explicit and validated and must exclude demo balances, deposits, profits, rewards, salaries, KYC files and trades.
