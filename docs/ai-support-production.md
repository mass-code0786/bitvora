# AI Support production runbook

Configure `.env.production` from `.env.example` without committing secrets. Build and verify before starting the process:

```sh
npm ci
npx prisma migrate deploy
npm run support:production-check
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 status
pm2 logs bitvora
```

Run `npm run support:query-diagnostics` only against a production-like database during a controlled performance window. It performs read-only `EXPLAIN ANALYZE` queries with diagnostic identifiers and prints query plans; it does not print secrets.

The PM2 configuration does not start or restart automatically during development. After deployment, verify `/support` with two authenticated test users and one administrator, exercise a real OpenAI stream, stop generation, reconnect SSE, upload each allowed attachment type, and confirm cross-user IDs return 404.
