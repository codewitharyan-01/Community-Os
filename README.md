# COMMUNITY OS

**Everything your community needs. One intelligent place.**

A production-style **Residential Community Management Operating System** — a multi-tenant SaaS
platform for housing societies, gated communities, RWAs and property managers. This repository is a
fully functional **local demo**: every major flow works against a real local SQLite database. No
fake buttons.

```text
Simple for residents · Powerful for admins · Controlled for security
Transparent for the community · Intelligent with AI · Compliant by design
```

---

## Quick start

```bash
npm install          # installs deps + generates the Prisma client
npx prisma migrate dev   # creates ./prisma/community-os.db (SQLite)
npm run seed         # seeds realistic demo data (deterministic)
npm run dev          # development server → http://localhost:3000
npm run demo         # production-mode demo (build + start) — fastest page loads
```

Other commands:

```bash
npm run build        # production build (lint + typecheck + compile)
npm start            # run the production build
npm run lint         # eslint
npm run db:reset     # drop + recreate + reseed the database
npm run icons        # regenerate PWA icons (pure Node, no image deps)
```

---

## Demo accounts

One-click buttons on the sign-in page (`/login`) pre-fill credentials.

| Role             | Email                     | Password        | Lands on     |
| ---------------- | ------------------------- | --------------- | ------------ |
| Resident (Owner) | `resident@demo.local`     | `demo123`       | `/resident`  |
| Community Admin  | `admin@demo.local`        | `admin123`      | `/admin`     |
| Treasurer        | `accountant@demo.local`   | `accountant123` | `/admin`     |
| Security Guard   | `security@demo.local`     | `security123`   | `/security`  |
| Vendor           | `vendor@demo.local`       | `vendor123`     | `/work`      |
| Maintenance Staff| `staff@demo.local`        | `staff123`      | `/work`      |

Bonus seeds: `secretary@demo.local` / `sec12345`, `committee@demo.local` / `committee123`,
`super@demo.local` / `super123` (platform super admin), plus a second community
(*Sunrise Apartments*, Surat) that demonstrates tenant isolation.

---

## What actually works (demo script)

**One-tap login.** The landing page and sign-in screen have instant
`/api/demo-login/<role>` buttons — tap a persona and you're straight in, no form.
Sessions persist for 30 days.

**Resident — Aryan Patel (A-402)**

1. Sign in → sees outstanding dues on the home card.
2. **Pay now** → mock gateway modal (UPI/Card/NetBanking) → processing → success with receipt.
   Invoice flips `PENDING → PAID`, a ledger entry is posted, a notification + mock email are
   generated, and the payment is **idempotent** (double-pay impossible).
3. **Report an issue** (photo upload supported) → committee is notified; track the full
   `Submitted → Under review → Assigned → In progress → Resolved → Verified` timeline.
4. Community feed: post, upvote, comment, report content; vote in polls (one per resident);
   RSVP + volunteer for events; structured channels; unified calendar.
5. Invite a visitor → QR pass (`VIS-XXXXXX`) → gate scans/types the code → resident is notified.
6. Parking: vehicles, slots, privacy-first vehicle lookup (masked owner, audit-logged lookup,
   "Notify owner" in-app request).
7. Book facilities with live availability checks, monthly limits and cancellation.
8. Profile: family, vehicles, privacy controls, data-export request, PWA install.

**Admin — Meera Shah**

1. Command center: collections, outstanding, collection rate, SLA breaches, expiring contracts,
   **Community Health Score**, **AI insights**, today's brief, recent audit trail.
2. Finance: billing runs (period + charge rules → invoices for all in-scope units → resident
   notifications), invoices (void), expense approvals (`pending → approved → paid` → ledger),
   budget vs actual, vendor commitments.
3. Issues queue with a **priority score** (severity + votes + age + boost), assignment to
   staff/vendors, status transitions, maintenance tasks board.
4. Community: announcements (pin/notify), **moderation queue** (hide / lock / remove / dismiss —
   every action audit-logged), polls with live results, events.
5. Security: visitor log, vehicle registry, incidents, **emergency broadcast** (red banner across
   every portal until resolved).
6. Vendors (contract expiry alerts), Assets + **preventive maintenance** (auto-generates service
   tasks), Documents vault (visibility-scoped uploads), Reports (7 CSV exports + print layout),
   AI copilot, Audit log, Settings + **Developer tools → Reset demo database** (dev only).

**Security gate — Jagdish Singh:** check-in by pass code, walk-ins, delivery log, check-out,
vehicle lookup, incident reporting, SOS broadcast.

**Vendor/Staff:** assigned tasks with status updates, invoice status, contract info.

**Live updates.** The notification bell polls `/api/notifications` every 20s and portals
gently refresh server data (visibility-aware) — new events appear without a manual reload.

**Admin can manage everything.** Full CRUD across residents (edit/deactivate/delete),
team members (add any role, change roles, deactivate), buildings (bulk-generate floors × units),
facilities, vendors, domestic staff, documents (visibility + delete), events (edit/cancel with
registrant notifications), polls (delete), posts (edit/remove), maintenance tasks (edit/delete),
assets (add/edit/mark-serviced), plus a **broadcast composer** (audience + priority) and
community config (billing defaults).

**Role controls.** In Settings → Portal access, the admin can disable any non-core portal
(e.g. switch off the Security Guard desk) — enforcement is server-side, live sessions are
revoked instantly, and one-tap logins bounce with an explanation. Core resident roles and the
primary admin can't be disabled (no lockouts).

**AI:** a deterministic, data-grounded assistant (`lib/ai.ts`) — no API key needed. It answers
from scoped, permission-checked queries (dues, complaint status, events, parking, visitors;
overdue list, expense summaries, expiring contracts, attention brief). Swap in a real LLM at the
single `ask*` seam. Insights (`lib/insights.ts`) detect recurring issues, collection drops, budget
overruns and expiring contracts from live data. Understands English **and Hindi/Hinglish**
("मेरा बिल कितना है?", "shikayat ka status kya hai?").

---

## Tech stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Framework  | Next.js 15 (App Router, Server Actions, RSC) · TypeScript      |
| Styling    | Tailwind CSS · hand-rolled minimal black/white design system   |
| Motion     | Framer Motion (subtle, reduced-motion aware)                   |
| Database   | SQLite via Prisma ORM (`./prisma/community-os.db`)             |
| Auth       | DB-backed sessions, httpOnly cookies, bcrypt hashes, rate-limit|
| Charts     | Recharts                                                       |
| PWA        | Manifest + service worker (prod-only) + procedural icons       |
| Validation | Zod on every server action                                     |
| Icons      | lucide-react · Inter variable font (self-hosted)               |

---

## Architecture

```text
UI (RSC + client islands)
  ↓
Server Actions (app/actions/*)  — zod-validated, session-checked
  ↓
Service layer (lib/auth, lib/permissions, lib/audit, lib/notifications, lib/ai, lib/providers)
  ↓
Prisma ORM
  ↓
SQLite  →  swap for PostgreSQL/Supabase later without touching product code
```

**Multi-tenancy.** Every domain row carries `communityId`; all queries filter by the session
user's community. Server-side authorization is mandatory — the frontend never decides roles.

**Property hierarchy.** `Organization → Community → Building → Unit (floor) → Household →
Residents (Membership: owner/tenant/family) → Vehicles → Parking slots`. One flat, many people;
one person, many roles.

**RBAC.** Centralized capability map (`lib/permissions.ts`): 14 roles → capability sets. Pages and
actions ask `can(role, "finance.approve")`, never `role === "TREASURER"`.

**Provider abstractions** (`lib/providers.ts`) — mock-first, production-ready seams:
`PaymentProvider` (MockGateway → Razorpay/Stripe), `EmailProvider` (outbox → SMTP),
plus planned `SMS/Push/Storage/AI` interfaces. Optional integrations are **all off by default**;
empty env vars never crash the app.

**Financial integrity.** Idempotent payments (unique idempotency key), no physical deletes —
invoices use `PENDING / PAID / OVERDUE / VOIDED`, every sensitive action writes an append-only
`AuditLog` entry, and mock emails land in a visible outbox (Settings → Email preview).

**Privacy by design.** Masked names in vehicle lookup (`A*** P****`), no phone exposure,
per-user privacy settings with consent records, visibility-scoped documents, permission-scoped
global search.

---

## Folder structure

```text
prisma/            schema.prisma (30+ models) · migrations · seed.ts
lib/               db, auth, permissions, audit, notifications, providers,
                   ai (assistant + health score), insights, validators, utils, constants
app/
  page.tsx         landing page
  login/           demo login
  (resident)/      resident portal (home, payments, community, services, profile)
  (admin)/admin/   admin portal (overview, residents, finance, issues, community,
                   security, facilities, vendors, assets, documents, reports,
                   ai, audit, settings)
  security/        gate desk
  work/            vendor + staff portal
  demo/investor/   investor dashboard (live aggregates)
  actions/         server actions (auth, payments, issues, community, services,
                   admin, gate, channels, search, account, ai, dev)
  api/             files (scoped uploads), reports (CSV), preventive-maintenance
components/        ui kit · charts · feature components (payments, issues, community,
                   visitors, parking, facilities, admin, security, ai, pwa)
public/            manifest.webmanifest · sw.js · icons · fonts · offline.html
scripts/           generate-icons.mjs (pure-Node PNG encoder)
```

---

## PWA

Chrome → **Install app** (in the account menu or Profile page). The service worker caches static
assets, serves an offline shell for navigations, and **never** caches API data — financial actions
require a connection by design.

---

## Environment variables

`.env.example` mirrors `.env`. Only `DATABASE_URL` is required; everything else is optional and
the app runs fully without it.

```env
DATABASE_URL="file:./community-os.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
AI_API_KEY=""            # optional: plug a real LLM into lib/ai.ts
SMTP_HOST/PORT/USER/PASSWORD=""   # optional: swap MockEmailProvider
PAYMENT_PROVIDER_KEY/SECRET=""    # optional: swap MockPaymentProvider
```

---

## Demo-mode notes & honest limits

- Payments are **simulated** (MockGateway). Money never moves. Receipts are demo artifacts.
- Emails land in the in-app outbox, not real inboxes.
- Seeded documents have no physical files; real uploads (issues, documents) are stored in
  `./uploads` and served through a permission-checked route.
- "Reset demo database" is available only in development mode.
- The demo implements compliance-ready architecture (consent records, audit trail, scoped
  visibility, idempotent ledger). **Production deployment requires jurisdiction-specific legal
  review** (DPDP, society/co-operative acts, GST, payment regulations) — this demo does not claim
  legal compliance.

## Future-ready seams

Real payment gateway · SMTP/Gmail · SMS/WhatsApp Business · PostgreSQL/Supabase · S3 storage ·
LLM API · push notifications · maps · multi-currency/localization (en-IN wired, hi/gu stubs) ·
realtime (replace refresh-based updates with WebSockets).

---

© 2026 Community OS — local demo build. Original identity; inspired by the craft of Apple, Linear,
Stripe and Notion, but copying none.
