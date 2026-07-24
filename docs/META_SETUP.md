# Meta WhatsApp + Instagram setup (personal Facebook account)

Sweet Tooth already has webhook routes and Agent Hub Embedded Signup. You only need a Meta app + a few env vars.

## Production URLs

| Item | Value |
|------|--------|
| Frontend | https://cohort-1-squad-indus-sweet-tooth.vercel.app |
| API | https://cohort-1-squad-indus-api-server-z3b.vercel.app |
| WhatsApp webhook | `https://cohort-1-squad-indus-api-server-z3b.vercel.app/api/webhooks/whatsapp` |
| Instagram webhook | `https://cohort-1-squad-indus-api-server-z3b.vercel.app/api/webhooks/instagram` |

## Production credentials (Sweet Tooth Agents)

| Item | Value |
|------|--------|
| App name | Sweet Tooth Agents |
| App ID | `895665413584722` |
| Config ID (WhatsApp Embedded Signup) | `2299988750804940` |
| Legacy General config (unused) | `1758743932221420` |
| Business portfolio | Sweet Tooth (`1795832991797584`) |
| Verify token | `st-meta-verify-c5eaadb0bb271ef8f1805079` |

App Secret is stored on Vercel as `META_APP_SECRET` (API project). Do not commit it.

Frontend env: `VITE_META_APP_ID`, `VITE_META_CONFIG_ID`  
API env: `META_APP_ID`, `META_APP_SECRET`, `META_CONFIG_ID`, `TOKEN_ENCRYPTION_KEY`, `WHATSAPP_VERIFY_TOKEN`, `META_WEBHOOK_VERIFY_TOKEN`

## 1. Create the Meta app

1. Open [developers.facebook.com](https://developers.facebook.com/) while logged into your personal Facebook.
2. **My Apps → Create App**.
3. Choose **Business** (or Other → Business) and name it e.g. `Sweet Tooth Agents`.
4. Add products:
   - **WhatsApp**
   - **Messenger** (needed for Instagram messaging)
   - **Instagram** (if shown as a separate product)

## 2. Copy IDs into Vercel (API project)

In Meta App → **Settings → Basic**:

| Env var | Where to find it |
|---------|------------------|
| `META_APP_ID` | App ID |
| `META_APP_SECRET` | App Secret (Show) |

In WhatsApp → **Configuration** / Embedded Signup (or App Dashboard → WhatsApp → API setup → Embedded Signup config):

| Env var | Where to find it |
|---------|------------------|
| `META_CONFIG_ID` | Embedded Signup configuration ID |

Also ensure these are set on the **API** Vercel project (already scaffolded by deploy):

| Env var | Purpose |
|---------|---------|
| `TOKEN_ENCRYPTION_KEY` | Base64 32-byte key — encrypts baker WA/IG tokens at rest |
| `WHATSAPP_VERIFY_TOKEN` | Meta webhook verify token (same string in Meta UI) |
| `META_WEBHOOK_VERIFY_TOKEN` | Optional alias — same value as above is fine |
| `META_APP_SECRET` | Validates `X-Hub-Signature-256` on webhooks |

Frontend needs (if Embedded Signup runs in browser):

| Env var | Purpose |
|---------|---------|
| `VITE_META_APP_ID` | Same as `META_APP_ID` |
| `VITE_META_CONFIG_ID` | WhatsApp Embedded Signup config ID |
| `VITE_META_IG_CONFIG_ID` | Instagram config ID (falls back to `VITE_META_CONFIG_ID` if unset) |

Redeploy API + frontend after adding App ID / Secret / Config ID.

Also in **Facebook Login for Business → Settings**, add:

- **Valid OAuth Redirect URIs:** `https://cohort-1-squad-indus-sweet-tooth.vercel.app/`
- **Allowed Domains for the JavaScript SDK:** `cohort-1-squad-indus-sweet-tooth.vercel.app`

(Press Enter after each value so Meta saves it as a chip, then **Save Changes**.)

## 3. Configure webhooks in Meta

### WhatsApp

1. WhatsApp → Configuration → Webhook → **Edit**.
2. Callback URL: WhatsApp webhook URL above.
3. Verify token: exactly the value of `WHATSAPP_VERIFY_TOKEN` / `META_WEBHOOK_VERIFY_TOKEN` on Vercel.
4. Subscribe to: `messages`.

### Instagram / Messenger

1. Messenger → Settings → Webhooks (or Instagram product webhooks).
2. Callback URL: Instagram webhook URL above.
3. Same verify token.
4. Subscribe to Instagram messaging fields (e.g. `messages`).

## 4. Connect a baker (Agent Hub)

1. Sign in to the bakery dashboard → **Agent Hub**.
2. Run **Connect WhatsApp** (Embedded Signup).
3. For Instagram: Professional IG account linked to a Facebook Page, then finish connection in Agent Hub (Page ID + IG account ID when prompted).

## 5. Test

1. Message the connected WhatsApp business number — agent should reply (plan must include WhatsApp).
2. Send a payment screenshot image on WhatsApp — it attaches to a pending order when the phone matches.
3. Voice notes get a short “please type” fallback (no transcription yet).

## 6. Fix “Sweet Tooth can't onboard customers at the moment”

This message is **not** a bug in Sweet Tooth. Meta blocks Embedded Signup until you finish **Tech Provider** onboarding.

Do this in order (Meta reviews take days):

### A. Start Tech Provider onboarding
1. Open [WhatsApp use case → Become Tech Provider](https://developers.facebook.com/apps/895665413584722/use_cases/customize/wa-tools/?product_route=whatsapp-business&business_id=1795832991797584&use_case_enum=WHATSAPP_BUSINESS_MESSAGING&selected_tab=wa-tools).
2. Click **Start onboarding**.
3. Choose **Independent Tech Provider** → **Start onboarding**.

### B. Business verification (required first)
1. Open [Business settings → Security Centre](https://business.facebook.com/settings/security/?business_id=1795832991797584) or **App Dashboard → Step 3. Business verification**.
2. Fill legal business name, address, phone, website.
3. Upload documents Meta asks for (company registration / utility bill / bank letter — Pakistan NTN/SECP papers often work).
4. Wait until status is **Verified** (not Unverified).

### C. App Review (Advanced Access)
1. In App Dashboard → **Review → App Review**.
2. Request Advanced Access for:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
3. Upload short screen recordings showing:
   - sending a WhatsApp message via your app
   - managing / creating a template (or your agent flow)
4. Submit and wait for approval.

### D. Access Verification
1. After App Review approval: **App settings → Basic → Access verification → Start verification**.
2. Explain that Sweet Tooth is a multi-bakery platform that connects bakers’ WhatsApp numbers and sends/receives messages on their behalf.
3. Submit.

### E. Retry Connect WhatsApp
When B–D are approved, go back to Agent Hub → **Connect WhatsApp Business**. The barrier screen should be gone.

Official guide: [Become a Tech Provider](https://developers.facebook.com/docs/whatsapp/solution-providers/get-started-for-tech-providers/)

## Notes

- A personal Facebook login can create and own the Meta app. Business Manager is optional for early testing.
- Instagram DMs require a **Professional** Instagram account linked to a Facebook Page.
- Platform fees for Sweet Tooth itself still use manual JazzCash/WhatsApp billing (`PLATFORM_WHATSAPP`), not Meta payments.
- Until Tech Provider is approved, bakers **cannot** finish Embedded Signup (Meta policy).
