# Salary income operations

Salary cycles run at 00:00 on the 1st and 16th in `SALARY_TIME_ZONE` (default `Asia/Kolkata`). Timestamps are stored in UTC. The scheduler checks once per minute and catches up only during the 24 hours following a scheduled cycle.

Required infrastructure:

- PostgreSQL through `DATABASE_URL`, with migration `20260722230000_salary_income_engine` deployed.
- Redis through `REDIS_URL`.
- PM2 processes `bitvora-salary-scheduler`, `bitvora-salary-worker`, and the existing `bitvora-outbox-worker`.

Operational sequence:

1. Run `npm run salary:dry-run -- --date=YYYY-MM-DD` and review ranks, skips, and expected payout.
2. Start or reload the PM2 ecosystem.
3. Audit a cycle with `npm run salary:audit -- --cycle=SALARY:YYYY-MM-DD`.
4. Repair missing eligible payments idempotently with `npm run salary:reconcile -- --cycle=SALARY:YYYY-MM-DD`.

Do not create old historical cycles automatically. `salary:run-current` only creates a cycle when the current official date is the 1st or 16th and remains inside the 24-hour catch-up window.
