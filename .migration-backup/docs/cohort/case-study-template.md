# Sweet Tooth — Case Study Template (Demo Day)

Copy this file to `docs/cohort/case-study-[baker-name].md` when you have a real pilot baker.

---

## Title

**Sweet Tooth × [Baker Name], [City]** — AI WhatsApp front desk for home bakers

**One-liner:** We help [specific baker type] stop losing COD orders to unanswered WhatsApp messages.

---

## 1. The problem (before us)

**Who:** [Name], home baker in [area], [specialty]. [X] orders/week, mostly via WhatsApp/Instagram.

**Pain in their words:**

> "[Quote from interview about lost sales or repeated questions]"

**What they did before:**

- [ ] Manual WhatsApp replies  
- [ ] Instagram DMs only  
- [ ] HomeBakersPK listing (no automation)  
- [ ] Family member helps reply  
- [ ] Other: ___

**Cost of the problem:**

- Estimated [X] messages/day, [Y]% repeated  
- [Specific incident: e.g. missed Eid order, wrong price sent, 2hr reply delay]

---

## 2. Our wedge

| Decision | Choice | Why |
|----------|--------|-----|
| User | [e.g. Gulberg cake baker, 8 orders/week] | Desperate, reachable, high msg volume |
| Channel | WhatsApp first | Where customers already are |
| Job | Answer top 10 FAQs from **real menu** | Trust — never invent prices |
| Not building | Payments gateway, all-Pakistan marketplace | Too wide for 8 weeks |

---

## 3. What we shipped

**Live URLs:**

- Marketplace: [https://...]  
- API health: [https://.../api/healthz]  
- Repo: [https://github.com/comebck-pakistan/cohort-1-squad-indus]

**Features used by pilot baker:**

- [ ] WhatsApp auto-reply (Meta webhook)  
- [ ] In-app chat widget  
- [ ] RAG knowledge reindex (menu + policies)  
- [ ] Baker dashboard (orders, analytics)  
- [ ] COD checkout on marketplace  

**Screenshots / Loom timestamps:**

- [ ] Agent Hub config  
- [ ] WhatsApp conversation (blur phone numbers)  
- [ ] Order created from flow  

---

## 4. What happened with real users

| Metric | Target (cohort) | Actual |
|--------|-----------------|--------|
| Problem interviews | ≥5 | |
| Design partners / sign-ups | ≥10 | |
| Real MVP users | 10–25 | |
| User quotes | ≥3 | |
| Retention / WTP signal | ≥1 | |

**User quotes (with permission):**

1. > "[Quote]" — [First name], [role]  
2. > "[Quote]"  
3. > "[Quote]"  

**Retention / willingness to pay:**

- [e.g. Baker used it 5 days straight / said “I'd pay 500 PKR/month” / referred another baker]

---

## 5. Key product decisions & tradeoffs

**We cut:**

- Full auth → demo session for speed (plan: Clerk Week 6)  
- Instagram DMs → WhatsApp first  
- LLM for everything → rules + RAG for price safety  

**We kept:**

- COD-only checkout (matches market)  
- Eggless / delivery area memory  
- Escalation to human on complaints  

**What we'd do differently:**

- [Lesson 1]  
- [Lesson 2]  

---

## 6. Competition positioning

| Alternative | What they do | What Sweet Tooth does better |
|-------------|--------------|------------------------------|
| HomeBakersPK | Discovery + WhatsApp link | **Works the inbox**, grounded answers |
| Baked.pk | Curated marketplace + ops | **Baker owns** their agent + dashboard |
| Zlvox | WhatsApp storefront | **Intelligent replies**, not just a catalog link |

---

## 7. What's next (post Demo Day)

- [ ] JazzCash / Easypaisa (optional)  
- [ ] Multi-baker auth + onboarding  
- [ ] Urdu voice notes  
- [ ] Daily digest: “12 people asked eggless this week”  
- [ ] 50 bakers in one city  

---

## 8. Squad contributions

| Member | Role(s) | Shipped |
|--------|---------|---------|
| | PM / interviews | |
| | Backend / WhatsApp | |
| | Frontend / dashboard | |
| | Design / demo video | |

---

## Demo video script (2–3 min Loom)

1. **0:00–0:20** — Problem + baker quote  
2. **0:20–0:45** — WhatsApp message → auto-reply with real prices  
3. **0:45–1:30** — Baker dashboard: order + analytics + Agent Hub  
4. **1:30–2:00** — Buyer marketplace checkout COD  
5. **2:00–2:30** — What we learned + ask (pilot bakers)
