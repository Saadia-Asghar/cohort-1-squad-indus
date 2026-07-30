# Sweet Tooth launch runbook

Use this checklist before inviting any paying baker. Every item should have an owner and a date.

## Before beta invitations

- [ ] Deploy a production Clerk instance. Replace `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` with production keys, add the final frontend domain to Clerk, and turn off development mode.
- [ ] Confirm API production values: `DATABASE_URL`, a 32+ character `JWT_SECRET`, `FRONTEND_URL`, and `TOKEN_ENCRYPTION_KEY` when Meta accounts are connected.
- [ ] Configure a Neon backup/restore policy and perform one restore drill on a non-production database.
- [ ] Add a custom domain, then update `FRONTEND_URL`, Clerk allowed origins/redirects, and Meta webhook URLs.
- [ ] Create Meta Business and a test WhatsApp Business number. Do not advertise the WhatsApp/Instagram agent as live until inbound and outbound webhook tests pass.
- [ ] Set a production error alert and an uptime check for `/api/healthz`.

## Required release tests

Run these in a separate test account. Never use a real customer's payment or personal data.

1. Native and Google sign-up -> onboarding -> dashboard -> logout.
2. Create/edit/hide a product; verify the shared menu shows the right price, dietary labels, lead time, and availability.
3. Add a manual order; confirm its customer totals, dashboard status, and analytics update.
4. Upload a deliberately clear and a deliberately unreadable receipt; verify OCR never automatically marks an order paid.
5. Send menu, dietary, delivery, unavailable-product, unrelated, and prompt-injection questions. The agent must answer only verified bakery facts or escalate.
6. Connect the test WhatsApp/Instagram accounts and verify webhook signature validation, inbound message, reply, opt-out, and failure handling.
7. Restore the backup database to staging and verify a baker can log in and read their own data only.

## Repeatable checks

```powershell
pnpm --filter @workspace/api-server run test:agent-safety
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/sweet-tooth run typecheck
pnpm --filter @workspace/sweet-tooth run build
```

## Launch rule

Launch a small closed beta first: 5 bakers, then 20. Do not charge for channel automation until the connected channel passes the tests above. Keep a manual-order fallback for every channel.
