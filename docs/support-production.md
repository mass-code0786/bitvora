# Support production runbook

The Support chatbot is deterministic and uses PostgreSQL rules. It does not require any external chatbot service or API key.

```sh
npm ci
npx prisma migrate deploy
npm run support:seed-rules
npm run support:production-check
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 status
pm2 logs bitvora
```

Run `npm run support:query-diagnostics` only against a production-like database during a controlled performance window. It runs read-only query-plan diagnostics and does not print secrets.

After deployment, verify `/support` with two authenticated users and one administrator. Test English and Hinglish questions, personal values, unmatched-query capture, rule management, ticket attachments, and cross-user access denial.
