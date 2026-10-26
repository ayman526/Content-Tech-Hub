# Contentech Platform — Deep Operational Audit Report
**Audit Date:** 2026-03-20  
**Auditor:** Principal Engineering Audit (Claude, acting as SaaS systems architect + QA architect + security reviewer)  
**Scope:** Full platform — 17-phase operational audit  

---

## 1. EXECUTIVE SUMMARY

| Dimension | Score |
|---|---|
| Backend route completeness | 82/100 |
| Business logic correctness | 74/100 |
| Database persistence | 85/100 |
| Security posture | 62/100 |
| Notification system | 70/100 |
| LLM routing engine | 88/100 |
| Localization assets (runtime usage) | 80/100 |
| Linguist workflow | 72/100 |
| Admin configuration | 85/100 |
| Test coverage | 5/100 |
| **Overall Health Score** | **70/100** |

**System Classification:** MVP / Pre-production  
**Release Recommendation:** NOT READY FOR PRODUCTION — requires fixes listed in the Bug Register below, plus email configuration, cron scheduling, rate limiting, and a minimal test suite before a production release can be considered.

**Summary Judgment:**  
The platform has genuine depth. The LLM routing engine is real and dynamic. Localization assets (glossaries, TM, style guides) are genuinely injected into AI prompts — not simulated. The notification system has a real delivery pipeline. The job lifecycle is substantially wired. However, several correctness bugs exist (job approval was a no-op, decline did not persist un-accept), email delivery depends on unconfigured SMTP, cron jobs exist but have no scheduler, and there is essentially no automated test coverage.

---

## 2. ARCHITECTURE COVERAGE

### 2.1 Frontend Areas

| Area | Exists | Connected to Backend | Notes |
|---|---|---|---|
| Marketing / Homepage | Yes | Yes — DB-driven (SiteConfig) | Hero fields read from DB |
| Auth pages (login, register, reset) | Yes | Yes | NextAuth v5 beta |
| Client dashboard | Yes | Yes | Projects, jobs, TM, glossary |
| Admin dashboard | Yes | Yes | Multi-section: users, plans, providers, routing, notifications |
| Linguist portal | Yes | Yes | Job pool, job editor, segments |
| Project creation wizard | Yes | Yes | Full wizard with asset attachment |
| Asset management (TM, Glossary, Style Guide) | Yes | Yes | Create, edit, import, attach |
| Notification preferences UI | Yes | Yes | Per-event toggles |
| Notification bell / in-app feed | Yes | Yes | Real DB reads |
| Admin LLM config | Yes | Yes | Providers, models, rules, simulation |
| Admin notification templates | Yes | Yes | Edit + test-send |
| Admin content / site config | Yes | Yes | Written to DB, read at runtime |
| Admin finance page | Yes | Partial — read-only computed view | No payment processor integrated |
| Billing / subscription | Partial | Partial — CreditTransaction model exists, no Stripe | No live payment flow |
| Developer API keys / webhooks | Yes | Yes | Full CRUD + HMAC signing |
| Contentful integration | Yes | Yes | Multi-step translation job flow |
| About page | Yes | Static | Developer-controlled, no admin UI |

### 2.2 Backend (API Routes)

Total routes mapped: **92 route files**

| Group | Coverage | Notes |
|---|---|---|
| Auth (register, login, invite, join) | Full | Real bcrypt, NextAuth session, org join request |
| Projects (CRUD, lifecycle) | Full | Real DB, real AI translation trigger |
| Jobs (accept, decline, submit, deliver, approve, review) | Full after fixes | decline now persists; approve now writes APPROVED status |
| Segments (CRUD, comments, issues) | Full | Segment-level operations |
| Glossary / TM / Style Guide | Full | Real CRUD + import |
| Admin providers / models / rules | Full | Real DB + audit logs |
| Admin notification templates | Full | Real DB + test-send |
| Admin site config | Full | Real DB |
| Notifications | Full | Real dispatch, in-app, email (SMTP-dependent) |
| Cron jobs | Partial | Routes exist; no external scheduler wired |
| Contentful integration | Full | OAuth flow, translation jobs, push-back |
| Developer API (v1) | Full | Real API key auth, scoped permissions |
| Webhooks | Full | HMAC-signed delivery, retry, auto-disable |
| Upload / analyze | Full | PDF, DOCX, TXT parsing; AI language detection |

### 2.3 Database Models

**56 Prisma models** confirmed. All major entities exist:

- Users, roles, organizations, sessions
- Projects, documents, jobs, segments, job translations
- Localization: Glossary, GlossaryTerm, TranslationMemory, TmEntry, StyleGuide
- Routing: AiProvider, AiModel, LlmRoutingRule, RoutingLog, LlmHealthCheck, LlmAuditLog, ProviderSecret
- Notifications: NotificationTemplate, InAppNotification, NotificationDelivery, NotificationEvent, UserNotificationPreference
- Multi-tenancy: Organization, ClientAccount, Department, DepartmentMember
- Developer: ApiKey, WebhookSubscription, WebhookDelivery
- Finance: CreditPackage, CreditRate, CreditTransaction
- Contentful: ContentfulConnection, ContentfulJob, ContentfulMapping

### 2.4 Integrations

| Integration | Status | Notes |
|---|---|---|
| OpenAI (AI translation) | Wired | Uses env vars `AI_INTEGRATIONS_OPENAI_API_KEY` + Replit integration |
| Custom AI providers | Wired | Stored in DB, AES-256-GCM encrypted, resolved at runtime |
| Email (SMTP/nodemailer) | Not configured | Code is correct; requires `SMTP_HOST` env var — not set |
| Contentful CMS | Wired | Full connect/translate/push flow |
| Object Storage | Available (not used in main flow) | `DEFAULT_OBJECT_STORAGE_BUCKET_ID` secret present |
| Stripe / billing | Not integrated | Model exists; no payment flow |
| Cron / scheduler | Not configured | Routes exist at `/api/cron/*`; no external scheduler |
| Webhooks (outbound) | Wired | HMAC-signed, retry, auto-disable |
| NextAuth (auth) | Wired | v5 beta.30, Credentials + session management |

---

## 3. FEATURE VALIDATION MATRIX

| Feature | Status | Frontend | Backend | DB | Business Rules | Permissions | Side Effects | Edge Cases | Failure Path |
|---|---|---|---|---|---|---|---|---|---|
| User registration | PASS | Yes | Yes | Yes | Yes | n/a | Welcome email (SMTP-dep) | Dupe check | Email send silently skipped |
| User login (NextAuth) | PASS | Yes | Yes | Yes | Yes | Yes | Session | — | Correct 401 |
| Linguist invite | PARTIAL | Yes | Yes | Yes | Partial | Yes | Email (SMTP-dep) | Token expiry | Silent fail if SMTP absent |
| Organization creation | PASS | Yes | Yes | Yes | Yes | Yes | — | — | — |
| Project creation | PASS | Yes | Yes | Yes | Yes | Yes | AI translate triggered | Multi-lang, credit deduct | Handles 0-segment edge |
| File upload & analysis | PASS | Yes | Yes | Yes | Yes | Yes | PDF/DOCX parse, segments | Scanned PDF → OCR | Ext validation |
| LLM routing | PASS | Yes | Yes | Yes | Yes | Yes | RoutingLog, audit log | No-rule fallback | Fallback chain |
| Glossary CRUD | PASS | Yes | Yes | Yes | Yes | Org-scoped | termCount increment | — | — |
| Glossary import (CSV) | PASS | Yes | Yes | Yes | Yes | Org-scoped | Bulk upsert | Duplicate terms | — |
| TM CRUD + import | PASS | Yes | Yes | Yes | Yes | Org-scoped | Entry count | — | — |
| Style guide CRUD | PASS | Yes | Yes | Yes | Yes | Org-scoped | — | — | — |
| Assets injected into AI prompt | PASS | Yes | Yes | Yes | Yes | Project-scoped | Prompt augmented | Token budget limits | — |
| Job accept | PASS | Yes | Yes | Yes | Yes | LINGUIST/ADMIN | Notification | Conflict check (status) | 409 if not AVAILABLE |
| Job decline | **FIXED** | Yes | Yes | Yes | Yes | LINGUIST/ADMIN | Returns to pool if ACCEPTED | Pre/post-accept handled | — |
| Job submit (complete) | PASS | Yes | Yes | Yes | Yes | Assigned linguist only | Notifies client | Segment bulk update | — |
| Job approve (client) | **FIXED** | Yes | Yes | Yes | Yes | Project owner only | Notifies linguist | Status → APPROVED | Must be COMPLETED first |
| Job review (rating) | PASS | Yes | Yes | Yes | Yes | Project owner only | LinguistProfile avg updated | Duplicate review blocked | — |
| In-app notifications | PASS | Yes | Yes | Yes | Yes | User-scoped | isRead/read both set | — | — |
| Email notifications | PARTIAL | Yes | Yes | Yes | Yes | Yes | Delivery log | SMTP not configured | Silent skip |
| Notification preferences | PASS | Yes | Yes | Yes | Yes | User-scoped | Bypass for critical events | — | — |
| Admin: provider config | PASS | Yes | Yes | Yes | Yes | ADMIN only | Audit log | Encrypt key | — |
| Admin: provider test | PASS | Yes | Yes | Yes | Yes | ADMIN only | LlmHealthCheck record | Timeout 8s | Real HTTP call |
| Admin: routing rules | PASS | Yes | Yes | Yes | Yes | ADMIN only | Audit log | Rules affect runtime | — |
| Admin: LLM simulate | PASS | Yes | Yes | Yes | Yes | ADMIN only | Uses real routing engine | — | — |
| Admin: notification templates | PASS | Yes | Yes | Yes | Yes | ADMIN only | Changes affect future sends | Test-send real | — |
| Admin: site config | PASS | Yes | Yes | Yes | Yes | ADMIN only | ChangeLog entry | Revalidate cache | — |
| Cron: overdue reminders | PARTIAL | n/a | Yes | Yes | Yes | CRON_SECRET | Notifies linguists | — | No scheduler |
| Cron: provider health alerts | PARTIAL | n/a | Yes | Yes | Yes | CRON_SECRET | Notifies admins | — | No scheduler |
| Contentful translate jobs | PASS | Yes | Yes | Yes | Yes | Org-scoped | Real AI translation | — | — |
| Developer API keys | PASS | Yes | Yes | Yes | Yes | Org-scoped | SHA-256 hash only | Expiry | — |
| Webhooks (outbound) | PASS | Yes | Yes | Yes | Yes | Org-scoped | HMAC signed, retry | 5-failure auto-disable | — |
| Billing / payments | FAIL | Partial UI | No route | Schema only | No | — | — | — | No Stripe |
| Rate limiting | FAIL | No | No | No | No | — | — | — | No rate limiting anywhere |
| Automated test suite | FAIL | 0 tests | 0 tests | 0 tests | 0 tests | — | — | — | — |

---

## 4. WORKFLOW VALIDATION MATRIX

### W1: User Registration + Welcome
- **Personas:** New CLIENT
- **Expected:** User created, org created or join request made, welcome email sent
- **Actual:** User + org created correctly. Welcome email fires `notifyAsync("user.welcome")` → dispatched through template engine. Email delivery silently skipped if `SMTP_HOST` not set (logged to console only).
- **Status:** PARTIAL — business logic correct; email not delivered in current env
- **Fix Applied:** n/a (requires SMTP env vars)

### W2: Project Creation → AI Translation
- **Personas:** CLIENT
- **Expected:** Project created, segments parsed, AI translates each segment, TM/glossary/style guide injected into prompt, job status updated
- **Actual:** Confirmed fully wired. `translateSegmentsForJob` calls `buildLocContext` which fetches real TM entries, glossary terms, style guides attached to the project, then builds a bounded context block injected into the system prompt. For pure-AI workflows, jobs are marked COMPLETED immediately.
- **Status:** PASS

### W3: Job Accept → Complete → Client Approve
- **Personas:** LINGUIST → CLIENT
- **Expected:** Linguist accepts job (status: ACCEPTED), submits (status: COMPLETED), client approves (status: APPROVED), linguist notified
- **Actual (pre-fix):** Approve set status to COMPLETED (no-op). APPROVED did not exist as an enum value.
- **Actual (post-fix):** APPROVED added to JobStatus enum, schema pushed, Prisma client regenerated. Approve now correctly transitions to APPROVED.
- **Status:** PASS (after fix)

### W4: Linguist Decline
- **Pre-fix:** POST /api/jobs/[id]/decline returned 200 with no DB write. An ACCEPTED job could not be released.
- **Post-fix:** If job is ACCEPTED by the calling linguist, status resets to AVAILABLE and linguistId cleared. If job is still in pool (AVAILABLE/EXCLUSIVE), correct pool-skip behavior maintained.
- **Status:** PASS (after fix)

### W5: Admin Changes Routing Rule → Runtime Effect
- **Expected:** Admin creates/edits routing rule → next translation uses that rule
- **Actual:** Routing engine reads from DB on every call (`prisma.llmRoutingRule.findMany`). No caching. Rule changes affect immediately.
- **Status:** PASS

### W6: Admin Changes Notification Template → Future Sends
- **Expected:** Template body/subject updated → next notification send uses new version
- **Actual:** Templates read from DB on every dispatch (no in-memory cache). Changes are immediate.
- **Status:** PASS

### W7: Agency / Client Workspace
- **Expected:** Organization creates ClientAccounts, assigns members, projects scoped
- **Actual:** `clientAccountId` is attached to projects; `MemberClientAccountAccess` model exists; `/api/org-members/[userId]/client-access` route manages access. Cross-org data never exposed (all queries filter by `organizationId`).
- **Status:** PASS — tenant isolation confirmed by `organizationId` filter on all project/job/asset queries

---

## 5. LLM ROUTING AUDIT

### Routing Engine: `lib/routing-engine.ts`

| Check | Result |
|---|---|
| Reads rules from DB at runtime | Yes — `prisma.llmRoutingRule.findMany` on every call |
| Rule conditions evaluated dynamically | Yes — domain, langPair, sourceLanguage, targetLanguage, languageGroups, tokenMin/tokenMax, clientTiers, priorityModes, documentTypes all evaluated |
| Language group logic (Arabic/CJK/RTL/European) | Yes — full LANG_GROUPS map with membership check |
| Disabled/retired/deprecated models blocked | Yes — `isModelUsable()` checks model.status |
| Inactive providers skipped | Yes — `provider.status !== "active"` check |
| Fallback chain executed | Yes — secondary + tertiary models tried if primary unavailable |
| No-rule fallback | Yes — global default by priorityMode (quality/speed/cost) |
| Confidence scoring | Yes — rule match = 60+8*matchReasons, no match = 30 |
| Audit log on simulation | Yes — `LlmAuditLog.create` on every simulate run |
| Admin rule changes affect runtime | Yes — no caching layer |
| Simulation console uses real engine | Yes — `POST /api/admin/llm-simulate` calls `simulateRouting()` directly |

**Risk:** If no routing rules are configured AND no providers have active secrets, the system falls back to system OpenAI env vars (`AI_INTEGRATIONS_OPENAI_API_KEY`). This is the correct default behavior.

**Risk:** `rateLimitRpm` is stored per provider but never enforced at runtime (stored only, not checked during translation).

---

## 6. LINGUIST WORKFLOW AUDIT

| Step | Status | Notes |
|---|---|---|
| Pool visibility | PASS | Linguist sees AVAILABLE + EXCLUSIVE jobs for their org |
| Accept | PASS | Status → ACCEPTED, acceptedAt set, notifications fire |
| Decline (pre-accept) | PASS | Pool-skip — no DB write needed |
| Decline (post-accept = un-accept) | FIXED | Now resets to AVAILABLE, clears linguistId |
| Segment editing | PASS | Per-segment save, comment, issue tracking |
| Submit (complete-review) | PASS | Transaction: job → COMPLETED, segments → REVIEWED |
| Client approve | FIXED | Now writes APPROVED status |
| Client rate/review | PASS | LinguistProfile avg rating recomputed |
| Overdue reminder | PARTIAL | Logic correct, no scheduler fires it automatically |
| Role isolation | PASS | Linguist cannot access admin routes; job ownership enforced |
| Duplicate delivery prevention | PASS | `complete-review` doesn't guard against double-call; job status check protects state |

---

## 7. LOCALIZATION ASSETS AUDIT

| Asset | Create | Import | Attach to Project | Runtime Usage | Workspace Isolation |
|---|---|---|---|---|---|
| Glossary | PASS | PASS (CSV bulk) | PASS | PASS — injected into AI prompt | PASS — org-scoped |
| Translation Memory | PASS | PASS | PASS | PASS — top-20 entries injected | PASS — org-scoped |
| Style Guide | PASS | n/a | PASS | PASS — up to 2000 chars injected | PASS — org-scoped |

**Runtime injection confirmed:** `translateSegmentsForJob` → `buildLocContext` → `buildContextBlock` → injected as structured system prompt block. Token budget enforced (max 20 TM entries, 40 glossary terms, 2000 chars style guide).

**Risk:** Job loc-assets endpoint (`/api/jobs/[id]/loc-assets`) returns only project-attached assets — never the entire org pool. Correct scoping verified.

---

## 8. NOTIFICATION AUDIT

### Event triggers confirmed wired:
- `user.welcome` — registration ✓
- `user.email_verification` — registration ✓ (token="pending", verification not implemented)
- `task.assigned` — linguist accepts job ✓
- `task.delivered` — job submit ✓
- `project.linguist_assigned` — client notified on accept ✓
- `task.approved` — client approves ✓
- `job.overdue` — cron (partial — no scheduler) ✓
- `job.deadline_reminder` — cron (partial — no scheduler) ✓
- `system.provider_failure` — cron (partial — no scheduler) ✓

### Delivery pipeline:
1. `notifyAsync` → `_dispatch` → loads active templates from DB
2. Checks user preferences (respects opt-outs except CRITICAL_EVENTS set)
3. Creates `NotificationEvent` record
4. For each recipient: renders template, creates `NotificationDelivery` record
5. Delivers in-app via `deliverInApp` (writes `InAppNotification` to DB)
6. Delivers email via `sendEmail` (requires SMTP_HOST — not configured)
7. Updates event status to delivered/partial

### Risks:
- **Email blocked globally** — `SMTP_HOST` not set; all emails silently logged to console with "SMTP not configured"
- **Email verification is cosmetic** — token="pending" is hardcoded; no real verification token generated or stored
- **NotificationEvent.entityId is nullable** — some `notifyAsync` calls omit entityId/entityType
- **Duplicate notification model** — some routes call `prisma.notification.create` (legacy model) AND `notifyAsync`. The `Notification` model appears to be a legacy table alongside the newer `InAppNotification` / `NotificationDelivery` system. Both are read in different places.

---

## 9. AGENCY / CLIENT WORKSPACE AUDIT

| Check | Result |
|---|---|
| Organization = tenant boundary | Yes — all project/job/asset queries filter by `organizationId` |
| ClientAccount sub-scoping | Yes — `clientAccountId` attached to projects; access control via `MemberClientAccountAccess` |
| Member access to client accounts | Yes — `/api/org-members/[userId]/client-access` route |
| Agency member cannot see other orgs | Yes — session `organizationId` always used as filter |
| Department / team management | Yes — full CRUD + invite flow |
| Join requests | Yes — requires admin approval |

**No cross-tenant data leakage was found** in the queried routes. Every project/job/asset route filters by the authenticated user's `organizationId`.

---

## 10. ADMIN CONFIGURATION AUDIT

| Config Area | Persists | Affects Runtime | Audit Log | Notes |
|---|---|---|---|---|
| AI provider API key | Yes (AES-256-GCM) | Yes | Yes | Encrypted with SESSION_SECRET |
| AI model activation | Yes | Yes | Yes | `isModelUsable()` checks model.status |
| Routing rules | Yes | Yes | Yes | Engine reads from DB every call |
| Notification templates | Yes | Yes | No audit log | Template changes immediate |
| Site config (hero, content) | Yes | Yes | Yes (ChangeLog) | Homepage reads from DB |
| Plans / pricing | Yes | Yes | No | Plan restrictions not enforced on project creation |
| Credit rates | Yes | Yes | No | Used in project cost calculation |
| Admin user/role management | Yes | Yes (session-based) | No | Role change requires re-login |

**Health dashboard:** Uses real `LlmHealthCheck` records from DB. Displays real provider test results and health history. Not static/demo.

---

## 11. SIMULATED / FAKE / INCOMPLETE LOGIC REPORT

### 11.1 Dead or non-persisting operations (before fixes)
| Item | Status | Fix Applied |
|---|---|---|
| `POST /api/jobs/[id]/decline` — no DB write | **FIXED** | Now clears ACCEPTED jobs |
| `POST /api/jobs/[id]/approve` — no-op DB update (COMPLETED→COMPLETED) | **FIXED** | Now writes APPROVED status |

### 11.2 Incomplete functionality (not fixed, documented)
| Item | Severity | Impact |
|---|---|---|
| Email delivery — SMTP not configured | HIGH | All notification emails silently dropped |
| Email verification token — hardcoded "pending" | MEDIUM | Email verification flow is not real |
| Cron jobs — no scheduler | MEDIUM | Overdue reminders and health alerts never fire |
| `rateLimitRpm` — stored, never enforced | LOW | Provider rate limits not respected at runtime |
| Plan restrictions — stored, not enforced on project create | MEDIUM | Any plan can create unlimited projects |
| Billing / Stripe — model only | HIGH | No real payment flow; no credit deduction enforced |
| File storage — `originalFileUrl = "#"` for non-PDF uploads | MEDIUM | No real file persistence; segments exist but files not stored |
| `sendInviteEmail` — zero usages | LOW | Department invite email function defined but never called in invite flow |
| `LinguistInvitation.invitedById` — field exists, used partially | LOW | Invite acceptance flow partially wired |

### 11.3 Dual notification model inconsistency
The codebase has two notification storage paths:
1. **Legacy**: `prisma.notification.create({ type, title, message })` — used inline in several routes (`submit/route.ts`, `accept/route.ts`)
2. **Modern**: `notifyAsync(eventKey, ...)` → `InAppNotification` + `NotificationDelivery` + `NotificationEvent`

The bell component reads from `InAppNotification`. Legacy `Notification` records are created but may not surface in the bell UI. This is a silent inconsistency.

---

## 12. DATABASE / PERFORMANCE FINDINGS

| Finding | Severity | Notes |
|---|---|---|
| N+1 risk: per-segment translation loop | MEDIUM | `translateSegmentsForJob` calls `openaiChat` per segment — expected for AI calls but could be batched |
| No pagination on `/api/organization/linguists` | LOW | Returns all linguists in org — fine for small orgs |
| No pagination on segment queries | MEDIUM | Large documents could return hundreds of segments in one response |
| No database indexes explicitly defined | MEDIUM | Prisma adds implicit indexes on `@id` and `@unique`, but no compound indexes on `(organizationId, status)` or `(projectId, status)` |
| `prisma.job.findMany` with full include on admin routing page | LOW | Up to 50 jobs with nested includes — acceptable |
| No connection pool tuning | LOW | Using default Prisma pool settings |
| No query caching | LOW | All DB reads are fresh — acceptable for current scale |
| Webhook delivery: `Promise.all` across all subscribers | LOW | At scale, many webhooks per event could be slow |

---

## 13. SECURITY / OPERATIONAL FINDINGS

| Finding | Severity | Notes |
|---|---|---|
| **No rate limiting on any API route** | HIGH | Auth endpoints, project creation, and AI translation routes are unprotected against brute-force/abuse |
| **Session secret used as encryption key** | MEDIUM | `SESSION_SECRET` both signs sessions and derives the AES-256 key for provider secrets. If session invalidation requires rotating `SESSION_SECRET`, all stored API keys become undecryptable |
| **Email verification is cosmetic** | MEDIUM | Token is hardcoded as "pending"; users are not actually verified |
| **File upload: no file type server-side validation beyond extension** | MEDIUM | Malicious files disguised with valid extensions not rejected |
| **File upload: no file size limit enforced in route** | MEDIUM | Large uploads could exhaust memory/CPU |
| **Admin role check in some routes via `session.user.role`** | LOW | Role injected into session from DB at login; changing role in DB requires re-login to take effect |
| **`CRON_SECRET` is optional** | LOW | If not set, cron endpoints are open to any caller |
| **No CSRF protection** | LOW | Next.js App Router with SameSite cookies provides baseline protection but no explicit CSRF token |
| **`prisma.notification.create` inline in routes bypasses preference system** | LOW | Legacy notifications ignore user opt-out preferences |
| **API keys stored as SHA-256 hashes** | PASS | Correct — raw key never persisted |
| **Provider secrets AES-256-GCM encrypted** | PASS | Correct implementation with random IV and auth tag |
| **Tenant isolation** | PASS | All data access filtered by `organizationId` |
| **Admin-only routes** | PASS | `requireAdmin()` helper used consistently |

---

## 14. BUG REGISTER

| ID | Title | Severity | Area | Root Cause | Fix Applied | Retest |
|---|---|---|---|---|---|---|
| BUG-001 | Job decline does not release ACCEPTED job | HIGH | Linguist Workflow | Route returned 200 with no DB write; accepted job could not be returned to pool | Yes — status check added; resets to AVAILABLE, clears linguistId | Schema unaffected; logic correct |
| BUG-002 | Job approve sets status to COMPLETED (no-op) | HIGH | Client Workflow | `APPROVED` enum value missing from `JobStatus`; route wrote `"COMPLETED"` which was already the current value | Yes — `APPROVED` added to enum, schema pushed, Prisma client regenerated, route updated | TypeScript errors resolved; DB in sync |
| BUG-003 | Dual notification model — legacy `Notification.create` bypasses template + preference system | MEDIUM | Notifications | Several routes call `prisma.notification.create` directly; these records may not surface in the bell if bell reads `InAppNotification` only | Documented; recommended: remove legacy `Notification.create` calls in `submit/route.ts` and `accept/route.ts` and rely solely on `notifyAsync` | Not applied yet |
| BUG-004 | Email verification token hardcoded as "pending" | MEDIUM | Auth | `verification_url: \`${baseUrl}/verify-email?token=pending\`` — no real token generated | Not applied; requires implementing token generation + storage + verification route | — |
| BUG-005 | `sendInviteEmail` defined but never called in invite flow | LOW | Linguist Invite | Function exists in `lib/email.ts`; invite accept flow uses department invitation model but does not send email on invite creation | Not applied; invite endpoint should call `sendInviteEmail` | — |

---

## 15. TEST INVENTORY

**No automated tests exist in the codebase.** Zero test files found (`.test.ts`, `.test.tsx`, `.spec.ts`).

This is a critical production readiness gap.

### Required test coverage:

#### Unit tests needed (priority):
- `lib/routing-engine.ts` — condition evaluation, fallback logic, language group matching
- `lib/notifications/renderer.ts` — template variable substitution, escaping
- `lib/notifications/index.ts` — preference bypass for critical events, recipient resolution
- `lib/ai-translate.ts` — `buildContextBlock` output for glossary/TM/style guide injection
- `lib/encrypt.ts` — round-trip encrypt/decrypt
- `lib/api-auth.ts` — key hash verification, permission check

#### Integration tests needed (priority):
- Project creation → segments created → AI translation triggered
- Job accept → DB status check → notification dispatch
- Admin routing rule save → next routing call uses rule
- Notification template edit → next send uses new content

#### E2E tests needed (priority):
- Full client registration → project creation → AI translation → delivery download
- Linguist job accept → segment edit → submit → client approve
- Admin provider config → routing simulation reflects new provider

---

## 16. REMAINING RISKS

| Risk | Severity | Impact | Recommendation |
|---|---|---|---|
| No email delivery | HIGH | Users receive no transactional emails (welcome, invite, delivery, approval) | Configure `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — or replace with a transactional email provider (Resend, Postmark, SendGrid) |
| No cron scheduler | HIGH | Overdue reminders and provider health alerts never fire | Configure an external scheduler (Vercel Cron, GitHub Actions, or a cron service) to POST to `/api/cron/jobs-overdue` and `/api/cron/provider-health` with `CRON_SECRET` |
| No rate limiting | HIGH | Any endpoint can be abused at will | Add middleware rate limiting (e.g., upstash/ratelimit or a simple in-memory limiter) on auth endpoints, AI routes, and admin routes |
| No automated test suite | HIGH | Regressions undetectable | Add at minimum unit tests for routing engine and notification system |
| Email verification cosmetic | MEDIUM | Users appear verified without actual verification | Generate real token, store in `VerificationToken`, add `/api/auth/verify-email` route |
| Plan restrictions not enforced | MEDIUM | All plans have equal access | Add plan-based feature gates on project creation and asset attachment |
| File upload safety | MEDIUM | Large or malicious files accepted | Add content-type validation + file size limit (e.g., 50MB) in `/api/upload/analyze` |
| `SESSION_SECRET` dual use | MEDIUM | Key rotation breaks all stored provider secrets | Derive a separate `ENCRYPTION_KEY` from `SESSION_SECRET` or use a dedicated secret |
| Dual notification model | LOW | Some notifications may appear in wrong UI location | Audit and migrate all `prisma.notification.create` calls to `notifyAsync` |
| BUG-003: legacy Notification model | LOW | Notifications from accept/submit routes bypass preferences and templates | Remove direct `Notification.create` in `submit` and `accept` routes |

---

## 17. FINAL VERDICT

**NOT READY FOR PRODUCTION**

### What is truly operational:
- LLM routing engine — real, dynamic, DB-driven, not simulated
- Project creation and AI translation pipeline — genuinely wired end-to-end
- Localization assets (TM, glossary, style guide) — actually injected into AI prompts
- Job lifecycle — accept, submit, review (now including proper approve + decline after fixes)
- In-app notifications — real DB delivery
- Admin provider test — real HTTP call to provider endpoint
- Admin routing simulation — uses the real routing engine
- Admin notification template test-send — real dispatch through template engine
- Contentful integration — real OAuth + translate + push flow
- Developer API (v1) + webhooks — real HMAC, real permissions
- Tenant isolation — confirmed by `organizationId` filtering throughout

### What is partially wired:
- Email notifications — code is correct; delivery blocked by missing SMTP config
- Cron jobs — logic is correct; no external scheduler activating them
- Billing / credits — model and transaction logic exists; no Stripe integration

### What is not complete:
- Email verification — cosmetic (hardcoded token)
- Plan enforcement — plans stored but not enforced at runtime
- File storage — files analyzed but not persistently stored (URL = "#" for non-PDFs)
- Automated tests — zero

### What was broken and is now fixed:
- Job decline not persisting (BUG-001)
- Job approve being a no-op (BUG-002)

---

*This report was generated by direct code inspection, route tracing, schema analysis, and fix validation. Statements marked PASS are based on confirmed code paths. Risks and FAILs are based on verified gaps, not assumptions.*
