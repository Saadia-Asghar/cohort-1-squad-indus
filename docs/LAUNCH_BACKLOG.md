# Launch learning loop

Sweet Tooth is ready to collect launch signals without sending customer messages, payment details, or bakery contact data to an analytics vendor.

## Required free-tool setup

1. **PostHog** — create one project, then set these values on the **frontend Vercel project** for Production and Preview:
   - `VITE_POSTHOG_KEY` — PostHog project API key (public browser identifier, not a secret)
   - `VITE_POSTHOG_HOST=https://us.i.posthog.com`
2. **Tally** — create a short feedback form, then set `VITE_TALLY_FEEDBACK_URL` on the frontend Vercel project for Production and Preview.
3. Redeploy the frontend after each Vercel environment-variable change.

Do not use a `VITE_` variable for database URLs, API secrets, webhook tokens, passwords, Cloudinary secrets, Meta access tokens, or Firebase admin credentials.

## What to measure

### Activation definition

A baker is activated when they complete all three within seven days:

1. create at least three menu products;
2. configure the agent greeting and availability; and
3. share their menu link or QR code.

### Weekly dashboard

- New bakery registrations and successful sign-ins.
- Activation rate and time to activation.
- First menu item and third menu item created.
- Agent configuration saved and menu links shared.
- Feedback-form opens and submitted feedback (review Tally directly).
- Reliability: failed registration/login requests and errors.

Avoid tracking raw chat content, customer names, email addresses, phone numbers, receipts, payments, delivery addresses, passwords, or order notes.

## Feedback form questions

Use a short form: bakery name (optional), role, what were you trying to do, what stopped you, how likely are you to recommend Sweet Tooth (0–10), and permission to contact them. Make free-text optional and do not ask for payment screenshots or customer data.

## Prioritized backlog process

Review signals once each week. For every item, record: evidence, affected bakers, expected impact on activation/revenue, engineering effort, owner, and decision. Prioritize with **Impact × Confidence ÷ Effort**.

### P0 — before inviting a wider beta

- Ensure every dashboard-changing API call verifies the logged-in baker owns the resource.
- Run registration, login, menu publish, order update, agent configuration, receipt upload, and logout smoke tests on production.
- Add an incident contact and publish accurate Privacy and Terms pages before collecting real customer data.
- Validate the WhatsApp test number and webhook signature before claiming automation is live.

### P1 — first 20 baker learning cycle

- Add a server-side audit trail for status changes and receipt decisions.
- Add rate limits for authentication, agent endpoints, and public order creation.
- Deliver an in-product activation checklist based on actual completion events.
- Add a weekly bakery success report: orders, repeat buyers, response time, and failed payment reviews.

### P2 — only after P0/P1 evidence supports it

- Instagram inbox automation after Meta approval and a test account.
- Paid-plan enforcement and billing reconciliation.
- A/B test onboarding copy and trial packaging.
- Customer-facing marketplace discovery is **out of scope**. Sweet Tooth is a baker workspace: shared menu + WhatsApp/Instagram, not a Daraz-style mall.

## Tool decision

- Keep **Vercel** as hosting and deployment.
- Use **PostHog** as the single source for product analytics, funnels, and adoption signals.
- Use **Tally** for qualitative feedback.
- Do not add **Plausible** yet; it overlaps with PostHog while adding another script, dashboard, and cost. Reconsider only if the marketing team needs a separate privacy-first website-traffic dashboard.
