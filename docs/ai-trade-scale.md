# AI trade scale runbook

The durable execution path is PostgreSQL + BullMQ/Redis. `TradeSessionRun` fixes the official session timestamps and result source once. The orchestrator keyset-paginates eligible users in batches; creation and settlement workers run independent serializable transactions with row locks. PostgreSQL `DECIMAL(24,8)` and `Prisma.Decimal` are authoritative for AI trade accounting.

Default operating limits are enqueue batch 500, creation concurrency 20, settlement concurrency 20, and 8 exponential-backoff attempts. Tune them only against the PostgreSQL pool, Redis memory, VPS CPU, and measured query latency. The target SLA is 99% settlement within 30 seconds and 100% completed or safely retrying within 120 seconds.

## Deployment

1. Back up PostgreSQL and deploy `20260722210000_ai_trade_scale_hardening`.
2. Verify the wallet backfill count and totals before enabling sessions.
3. Verify Redis persistence (AOF or managed equivalent), memory policy, and queue connectivity.
4. Stop the retired `bitvora-ai-auto-trade-worker` process.
5. Start the five processes in `ecosystem.config.js`, then verify each remains online across a restart.
6. Run the three audit commands for a canary session.
7. Run a production-like 20,000-user test against an isolated PostgreSQL/Redis environment, including worker/Redis/database failure injection. Capture p50/p95/p99 duration, settlement SLA, DB CPU, connections, locks, Redis memory, and queue lag.
8. Run `EXPLAIN (ANALYZE, BUFFERS)` for eligible-user keyset selection, pending trades, jobs, ledger, and outbox queries on the test dataset.

Do not release if an audit mismatch exists, any worker is unstable, the 120-second settlement bound is exceeded, or crash recovery creates a duplicate. Failed/dead jobs keep a session in `PARTIAL_FAILURE`; they never allow `COMPLETED`.

## Commands

```text
npm run ai-trade:session-audit -- --session=<run-id>
npm run ai-trade:reconcile -- --session=<run-id>
npm run ai-trade:settlement-audit -- --session=<run-id>
npm run ai-trade:load-test
```

The included 20,000-user test proves deterministic decimal calculations and aggregate invariants in-process. It is not a substitute for the isolated PostgreSQL/Redis failure-injection test required by the release gate.
