# Contentech — Product & System Specification

**Version:** 1.0  
**Platform:** AI-first multilingual translation SaaS  
**AI Assistant:** Cento (conversational onboarding wizard)

---

## Table of Contents

1. [Business Overview](#1-business-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Features by Role](#3-features-by-role)
   - [3.3 Linguist Features](#33-linguist-features-linguist-workspace)
   - [3.4 Linguist Studio (TMS Module)](#34-linguist-studio-tms-module)
4. [Core Workflows](#4-core-workflows)
   - [4.7 Contentful Integration](#47-contentful-integration-select-entries--create-jobs--push-back)
   - [4.8 WordPress Integration](#48-wordpress-integration-connect--browse--translate--push-back)
5. [Data / Entities](#5-data--entities)
6. [Integrations & Extensibility](#6-integrations--extensibility)
7. [Industries & Use Cases](#7-industries--use-cases)
8. [KPIs & Reporting](#8-kpis--reporting)
9. [Security, Privacy & Compliance](#9-security-privacy--compliance)
10. [Future Enhancements](#10-future-enhancements)
11. [Implemented Features](#11-implemented-features)

---

<a id="1-business-overview"></a>

## 1. Business Overview

### What Contentech Does

Contentech is an enterprise-grade multilingual translation platform that combines an AI-generated first draft with optional human linguist review in a single, integrated workflow. Clients submit content, choose a workflow type and linguist sourcing strategy, and receive translations — all within one platform. Every stage (AI, human, delivery) is tracked, billed, and auditable.

The platform serves organizations that require consistent, high-quality translation at scale: from marketing teams publishing campaigns across 10 markets to regulated industries requiring certified human review of every segment.

### The Credit System

Credits are the internal unit of consumption. Every action that consumes compute or linguist time costs credits. Credits are allocated monthly by plan and reset on the billing cycle date.

#### Plans

| Plan         | Price       | Monthly Credits | Docs/Month | Translation Memories | Glossary Terms |
|--------------|-------------|-----------------|------------|----------------------|----------------|
| Free         | $0          | 100             | 5          | 1                    | 100            |
| Professional | $49/month   | 1,000           | Unlimited  | Unlimited            | Unlimited      |

- **Free plan requires BYOK** (Bring Your Own Key — the client supplies their own OpenAI API key).
- **Professional plan** may optionally use BYOK or the platform's hosted AI.
- Credit top-ups (purchased separately) carry over and are consumed before monthly allocation credits.

#### Credit Conversion Rates

| Workflow Stage      | Rate                                 |
|---------------------|--------------------------------------|
| AI Translation      | 1 credit per 5 words (`⌈words ÷ 5⌉`) |
| Human Revision      | 1 credit per 2 words (`⌈words ÷ 2⌉`) |
| Human Translation   | 2 credits per word (`words × 2`)     |

#### Internal Linguist Rule

When a job uses **internal linguists** (linguists the client has invited directly into their organization) and the workflow is either **Human Revision** or **Human Translation**, the human-stage credit charge is **zero**. The client pays their internal linguists directly; the platform does not intermediate payment. AI credits still apply.

### Linguist Sourcing Options

Clients choose one of three linguist pools per job:

1. **System Pool** — Verified linguists onboarded by the platform. Available immediately; platform handles matching.
2. **Preferred Linguists** — A client-curated shortlist drawn from the system pool. They get first-look on new jobs from that client.
3. **Internal Linguists** — Employees or contractors the client invites by email. They join under the client's organization and only see that client's jobs. No human credits are charged.

---

<a id="2-user-roles--permissions"></a>

## 2. User Roles & Permissions

### Role Hierarchy

```
Platform
└── Admin (platform operator)
    └── Organizations
        └── Owner       (full org control)
        └── Admin       (org management, no billing)
        └── Member      (project-level access only)
        └── Internal Linguist (limited to assigned tasks)

System Pool
└── Linguist (cross-org, platform-managed)
```

### Permission Matrix

| Permission                                | Admin | Org Owner | Org Admin | Member | Internal Linguist | System Linguist |
|-------------------------------------------|-------|-----------|-----------|--------|-------------------|-----------------|
| Create/disable organizations              | ✓     |           |           |        |                   |                 |
| Manage plans & pricing                    | ✓     |           |           |        |                   |                 |
| View all orgs & usage                     | ✓     |           |           |        |                   |                 |
| Manage system linguist pool               | ✓     |           |           |        |                   |                 |
| Edit platform CMS content                 | ✓     |           |           |        |                   |                 |
| View global job queue                     | ✓     |           |           |        |                   |                 |
| Create/manage org users                   | ✓     | ✓         | ✓         |        |                   |                 |
| Create/manage client accounts             | ✓     | ✓         | ✓         |        |                   |                 |
| Assign member to client accounts          | ✓     | ✓         | ✓         |        |                   |                 |
| Manage billing & subscription             | ✓     | ✓         |           |        |                   |                 |
| Create projects & jobs                    |       | ✓         | ✓         | ✓      |                   |                 |
| Manage TMs & glossaries                   |       | ✓         | ✓         | ✓      |                   |                 |
| Invite internal linguists                 |       | ✓         | ✓         |        |                   |                 |
| Manage preferred linguist list            |       | ✓         | ✓         |        |                   |                 |
| View credit ledger                        |       | ✓         | ✓         |        |                   |                 |
| Accept/reject linguist assignments        |       | ✓         | ✓         | ✓      |                   |                 |
| View own assigned tasks                   |       |           |           |        | ✓                 | ✓               |
| Edit target text in editor                |       |           |           |        | ✓                 | ✓               |
| Flag issues & suggest corrections         |       |           |           |        | ✓                 | ✓               |
| View personal earnings                    |       |           |           |        |                   | ✓               |
| Submit completed work                     |       |           |           |        | ✓                 | ✓               |

---

<a id="3-features-by-role"></a>

## 3. Features by Role

### 3.1 Admin Features

#### Organization Management
- View all registered organizations, their plan tier, credit balance, user count, and status.
- Create, suspend, or disable organizations.
- Impersonate an org owner for support purposes (audit-logged).
- View per-org usage breakdown: credits consumed, documents processed, active linguists.

#### Plans & Pricing Management
- Define plan names, prices, credit allocations, and feature limits (doc count, TM count, glossary term cap).
- Sync plan data with Stripe via the Stripe admin API: creating products, prices, and proration rules.
- **Propagation rule:** When a plan's price or feature set changes in the admin panel, the change must reflect immediately across all site-facing pages (pricing page, checkout, billing portal) without any hardcoded values.
- Configure free-tier restrictions (BYOK requirement, doc and glossary limits).

#### Credit Rules Configuration
- Set conversion rates for each workflow stage (AI, human revision, human translation).
- Configure the internal-linguist zero-charge rule and audit its application.
- Set per-org credit caps to prevent runaway usage.

#### User & Role Management
- View all users across all orgs with their roles, last login, and status.
- Promote, demote, or deactivate users.
- Assign or revoke admin-level access to specific users.

#### System Linguist Pool Management
- Onboard new linguists: collect profile data, certifications, language pairs, availability, and specializations.
- Verify linguist identity and credentials before activating their pool access.
- View per-linguist metrics: quality score (0–10), average turnaround time, job acceptance rate, revision rejection rate.
- Deactivate or remove linguists from the pool.
- Set linguist routing rules (e.g., prefer linguists with a specialization matching the job's industry tag).

#### Platform Content Management (CMS)
- Edit all site-facing content through an admin interface: homepage copy, pricing page content, FAQs, contact page, blog entries.
- All content is stored in the database (no hardcoded text in templates).
- Bilingual CMS support: each content block stores both English and Arabic variants (and can be extended to additional site languages).
- Pricing content (plan names, prices, feature bullets) is sourced from the plans table — not duplicated as static text.

#### Job Monitoring
- Global job queue with filters: status, SLA status, language pair, organization, workflow type.
- Flag and escalate jobs that have exceeded SLA thresholds.
- Re-assign stuck or abandoned jobs.
- View per-segment translation output and linguist edits.

#### Financial Reporting
- Revenue by period (MRR, ARR, one-time credit purchases).
- Credits consumed by org and by workflow stage.
- Margin proxy: estimate platform cost (AI API cost + linguist payouts) vs revenue.
- Export reports as CSV.

#### Security & Audit Logs
- Immutable log of all privileged actions: role changes, plan changes, org creation/deletion, impersonation events.
- Filter logs by actor, action type, org, and time range.

#### AI Provider & Model Control Center

The platform ships an admin-only control center at `/admin/ai-config` that lets platform administrators manage every LLM provider and model used for translation, route requests to the right model per language pair, and monitor AI infrastructure health — all without touching environment variables or code.

The control center is organized into six tabs:

**Provider Registry**
- Register any LLM provider the platform will use. Supported provider types: `openai`, `anthropic`, `google`, `azure`, `vertex`, `bedrock`, `cohere`, `moonshot`, `custom`.
- Per-provider fields: display name, provider type, base URL / custom endpoint, environment (dev / staging / production), region, rate limit (requests per minute), cost profile label, and free-text notes.
- **API key management**: Enter the API key through a masked input. Keys are encrypted immediately with AES-256-GCM before being stored in `ProviderSecret`. The raw key is never stored, never logged, and never returned to the UI after saving. The UI shows only a masked preview (e.g., `sk-…••••a1b2`).
- Activate or deactivate a provider without deleting it — inactive providers are excluded from routing automatically.
- Update an existing key: a dedicated "Update Key" action overwrites the stored ciphertext; the previous key is irrecoverably removed.

**Model Catalog**
- Register individual models under each provider. Per-model fields:
  - `displayName` — human-readable label shown in admin UI and audit logs.
  - `apiModelId` — the exact model string sent to the provider's API (e.g., `gpt-4o`, `claude-3-5-sonnet-20241022`).
  - `internalKey` — platform-level unique slug used in routing rules and code references.
  - Context window and output limit (token counts).
  - Lifecycle status: `draft` → `beta` → `approved` → `production` → `deprecated` → `retired` / `disabled`.
  - Quality tier: `standard` / `advanced` / `flagship`.
  - Latency tier: `fast` / `balanced` / `high-quality`.
  - Cost tier: `low` / `medium` / `premium`.
  - Domain tags: content categories this model performs well on (e.g., `legal`, `medical`, `marketing`).
  - Language group tags: language families the model is optimized for (e.g., `CJK`, `Arabic/RTL`, `European`).
  - Effective date, deprecation date, and retirement date for lifecycle scheduling.
  - Benchmark notes and admin-visible warnings.
- Mark one model as the organization default (fallback of last resort when no routing rule matches and no env-var override is configured).
- Filter catalog by status or provider; inline status changes promote or retire a model in one click.

**Routing Rules**
- Create named rules that map translation job attributes to a specific model selection. Each rule has:
  - **Priority** — integer; lower numbers take precedence. Rules are evaluated in ascending priority order.
  - **Conditions** (JSON) — a flexible predicate object expressing any combination of: source language, target language, language pair, language group, document type, workflow type, cost tier preference, latency tier preference, quality tier requirement, domain tag, and word count threshold.
  - **Primary model** — the model the routing engine will use when the rule matches and the primary model is available.
  - **Secondary fallback** — used if the primary model's provider is inactive or the API key is missing.
  - **Tertiary fallback** — used if both primary and secondary are unavailable.
  - **Policy** (JSON) — optional overrides injected into the API call for this rule (e.g., custom temperature, max tokens, system prompt prefix).
- Rules can be toggled on/off without deletion, and can be flagged as templates for reuse.
- Evaluation semantics: the engine walks rules in priority order, evaluates each condition set against the job's attributes, picks the first match, then resolves the fallback chain until it finds a model whose provider has a valid decrypted key. If no rule matches, the engine falls back to the catalog's default model, then to the `AI_INTEGRATIONS_OPENAI_API_KEY` environment variable.

**Routing Simulator (Test Console)**
- Simulate any translation request without running a real job or consuming credits.
- Inputs: source language, target language, language pair code, document type, workflow type, word count, quality preference, cost preference, latency preference, and domain tags.
- Output: the model the routing engine would select (display name, provider, status, tier ratings), the full fallback chain in order, any risk flags raised during resolution (e.g., "Primary model unavailable — using fallback"), and a list of any models that were blocked from selection and why.
- Useful for verifying that a new routing rule fires correctly for the intended language pairs before activating it in production.

**Health & Status**
- Summary dashboard: count of active providers, inactive providers, total models, and counts by lifecycle status (production, beta, deprecated, retired, disabled, draft).
- Per-provider health cards showing the last recorded health check result: `ok`, `degraded`, `failed`, or `timeout`.
- Health check history: latency in milliseconds per check, diagnostic payload, and timestamp.
- Run a manual health check against any provider / model combination and record the result.

**Audit Log**
- Append-only log of every action taken inside the AI Config control center: provider created/updated/deleted, model created/updated/status-changed, routing rule created/updated/enabled/disabled/deleted, API key stored/rotated.
- Each entry records: actor email, action name, target entity type, target entity ID, change summary, and timestamp.
- Filterable by actor and date range. Entries cannot be edited or deleted.

#### Integration Management
- View all active third-party integrations across all organizations (e.g., Contentful connections).
- Review integration health (last successful sync, error count).
- Define default integration configuration templates organizations can inherit.

---

### 3.2 Customer Features (Client Dashboard)

#### Project & Job Creation
- Upload documents (PDF, DOCX, PPTX, XLSX, TXT, SRT) or connect via an integration (e.g., Contentful).
- Select source language (auto-detected with manual override) and one or more target languages.
- Choose workflow type per job:
  - **AI Only** — AI translates, no human stage.
  - **AI + Human Revision** — AI generates first draft; a linguist post-edits for quality.
  - **Human Translation** — Linguist translates from scratch; AI is not used for the draft.
- Choose linguist source: system pool, preferred linguists, or internal linguists.
- Attach localization assets per project: one or more Translation Memories, Glossaries, and Style Guides. Only attached assets are injected into the AI prompt or shown to the linguist.
- Preview credit estimate before submitting. Estimate = AI credits (if applicable) + human credits (if applicable, and if not internal linguists).
- Jobs are created at the project level; a project can contain multiple documents and multiple target locales.

#### Translation Memory Management
- Create named TMs scoped to the organization.
- TM entries are written automatically when a segment is approved (source + target text pair).
- Import TM entries via TMX file upload.
- Export TM to TMX.
- Free plan: maximum 1 TM. Professional: unlimited.
- TMs can be attached to projects individually; only attached TMs contribute suggestions.

#### Glossary Management
- Create named glossaries with terms in source + target language.
- Each term supports flags:
  - **Do Not Translate (DNT)** — term is preserved verbatim in output.
  - **Keep Uppercase** — term is rendered in all caps in output.
- Import terms via CSV or Excel (.xlsx).
- Free plan: maximum 100 terms per glossary, 1 glossary. Professional: unlimited.
- Glossaries are attached per project.

#### Style Guide Management
- Create named style guides with AI-generated or manually written content covering: tone, formality, brand voice, terminology rules, grammar preferences, audience notes, formatting standards, industry context, and localization notes.
- AI generation accepts: industry, target country, tone, formality level, and target languages as inputs.
- Generated content is fully editable before saving.
- Style guides are attached per project.

#### Credit Dashboard
- Current credit balance (monthly allocation + top-up balance).
- Credits consumed in the current billing period (chart by day).
- Credits remaining and projected exhaustion date (based on recent burn rate).
- Full ledger: every credit debit and credit event with timestamp, job reference, amount, and type.
- Estimate tool: enter word count and workflow type to see cost before creating a job.

#### Project Details Page
- Progress tracker showing stages: Uploaded → AI Draft → Human Review → Delivered.
- Per-file and per-locale status.
- Downloadable deliverables (translated document in original format).
- Timeline: submitted date, AI completion date, linguist assignment date, expected delivery.
- Quality report: issue list with error types, severity, and linguist corrections.

#### Linguists Tab
- **Internal Linguists sub-tab:**
  - Invite linguists by email address. Invitees receive a branded email with an acceptance link.
  - Assign language pairs to each internal linguist (source + target language combinations).
  - View invitation status: pending / accepted / expired.
  - Deactivate or remove internal linguists.
  - **Zero human credits are charged** when internal linguists handle Human Revision or Human Translation jobs; a prominent confirmation message is shown at job creation.
- **Preferred Linguists sub-tab:**
  - Browse the system linguist pool filtered by language pair, specialization, quality score, and availability.
  - Add linguists to the preferred list; they receive priority assignment for new jobs.
  - Remove linguists from the preferred list.
- **All Linguists view:**
  - Filter by: Internal / Preferred / System Pool.
  - Filter by language pair.
  - Search by name.
  - View per-linguist stats: jobs completed for this org, average quality score, average turnaround.

#### Collaboration
- Comment threads on projects and on individual segments.
- Notification center: new assignments, linguist queries, delivery confirmations, credit warnings (e.g., less than 10% balance remaining).
- Approval workflow: client can mark a job as approved after delivery, which triggers TM write-back and closes the job.

#### Billing & Subscription
- Current plan, renewal date, and included credit allocation.
- Upgrade or downgrade plan (proration handled via Stripe).
- Invoice history with downloadable PDFs.
- BYOK settings: enter and manage OpenAI API key (encrypted at rest, required on Free plan).
- Credit top-up purchase: select a credit package and pay via Stripe.

#### Agency Client Accounts
Organizations that manage translation work on behalf of multiple end-clients (agencies, LSPs) can segment their localization assets by client account rather than sharing everything across the entire organization.

- Org Admins and Owners can create named **Client Accounts** from the Organization settings.
- Every TM, Glossary, and Style Guide can be tagged to one specific client account, or left as **shared** (visible to all members with access).
- When creating a new project through the wizard (Cento), the user selects a client account in the first step. The wizard then filters the available localization assets to only those belonging to that client account plus shared assets. The selected client account is stored on the resulting project record for reporting and future filtering.
- Client account badges appear on the TM list, Glossary list, and Style Guide list so users can quickly identify which assets belong to which client.
- Uploading a new TM, Glossary, or Style Guide presents a client account dropdown; selecting "Shared" makes the asset available to all members.

**Sentinel convention:** The query parameter `?clientAccountId=shared` returns only shared (null) assets. A specific ID returns assets for that client account plus shared. Omitting the parameter returns all org assets (used by admin views).

#### Member Client Account Permissions
Org Admins can optionally restrict individual members to a subset of client accounts, so a member only sees assets and data relevant to the clients they work on.

- Admins visit **Organization → Members** to view all org members and their current access configuration.
- Each member row shows their assigned client accounts as teal badges, or "Full Access" (grey) if no restriction is set.
- Clicking **Edit Access** opens a dialog with a checklist of all org client accounts. Saving replaces the member's assignments.
- Setting an empty selection restores full access — the member sees all org assets again.
- **Access logic at query time:** When a restricted member calls any loc-asset endpoint (TM, Glossary, Style Guides), the API reads their `MemberClientAccountAccess` rows for the org. If rows exist, the query adds `WHERE (clientAccountId IN (<allowedIds>) OR clientAccountId IS NULL)`. If no rows exist, the query is unrestricted (full access). This is applied on top of any `?clientAccountId=` URL parameter the caller may provide.

---

<a id="33-linguist-features-linguist-workspace"></a>

### 3.3 Linguist Features (Linguist Workspace)

#### Onboarding & Profile
- **System linguists** apply through a platform onboarding flow: language pairs, specializations, availability, rate preferences, sample translation submission.
- **Internal linguists** receive an email invitation link, accept it, set a password, and are immediately scoped to the inviting organization.
- Profile page: photo, bio, language pairs, specialization tags, availability toggle.

#### Job Feed & Assignments
- View available jobs in the system pool (filterable by language pair, document type, workflow type, urgency).
- Accept or decline job offers. Declined jobs go back into the pool.
- View all currently assigned tasks with deadlines and priority indicators.
- Job detail: source document metadata, word count, workflow type (revision vs translation), attached TM/glossary context.

#### Translation Editor
- Split-view: source segment on the left, editable target segment on the right.
- Segment-by-segment navigation; segments are locked/unlocked based on workflow stage.
- **AI draft display:** In revision mode, the AI-generated target is pre-populated; the linguist edits in place.
- **TM suggestions panel:** Shows fuzzy matches from attached TMs with match percentage and source reference.
- **Glossary panel:** Shows term matches detected in the current segment with the approved translation.
- **Style guide panel:** Displays style guidance relevant to the current language pair.
- Keyboard shortcuts for approve, skip, and flag actions.

#### Review & Issue Flagging
- For each segment, the linguist can:
  - Approve the AI draft as-is.
  - Edit the target text and approve.
  - Flag an issue with:
    - **Error type:** Mistranslation, Grammar, Terminology, Style, Omission, Addition, Punctuation, Formatting, Cultural adaptation.
    - **Severity:** Low, Medium, Critical.
    - **Proposed corrected text.**
    - **Comment/query** for the client.
- Issue list is visible to the client in the quality report.

#### Workflow Modes
- **Human Revision (post-edit):** AI draft is pre-filled; linguist edits and approves each segment.
- **Human Translation (from scratch):** Target field is blank; linguist types the translation directly.

#### Completion & Submission
- Mark job as complete when all segments are approved.
- System validates that no segments are left in an unresolved state.
- Client is notified on submission.

#### Personal Stats (System Linguists)
- Throughput: words processed per day/week/month.
- Quality score: weighted average of client ratings and auto-detected edit distance.
- Earnings: per-job breakdown, pending vs paid, payment history.
- Notifications: new assignment offers, approaching deadlines, client feedback.

---

<a id="34-linguist-studio-tms-module"></a>

### 3.4 Linguist Studio (TMS Module)

Linguist Studio is a subscription-gated Translation Management System (TMS) available exclusively to verified linguists. It enables linguists who operate as independent agencies or small LSPs to manage their own client base, run translation jobs, and maintain localization assets — all inside the same Contentech platform they use for their own assignments.

#### Subscription & Access

- Linguist Studio is a paid add-on for linguist accounts. Non-subscribers see a polished promo page at `/portal/studio` describing the module's features and a **Subscribe** call-to-action.
- Subscribing creates a `StudioWorkspace` record linked to the linguist's account with `subscriptionStatus = ACTIVE` and a one-month expiry.
- Once subscribed, the linguist is redirected automatically to the Studio overview dashboard.
- The sidebar section **LINGUIST STUDIO** is always visible; sub-items display a lock icon for non-subscribers and are non-navigable until the subscription is active.

#### Studio Overview

- Summary statistics: total clients, active jobs, completed jobs.
- Recent activity feed sourced from `StudioActivityLog`: client created, job created, file uploaded, segment saved, job status changed.
- Quick-action shortcuts: New Client, New Job.

#### Client Management

- Create, edit, and archive translation clients (companies or individuals the linguist works for).
- Per-client fields: Company Name, Contact Name, Contact Email, Status (ACTIVE / ARCHIVED).
- Client detail view: linked jobs list, associated assets (TM, glossaries, style guides).
- Archived clients are hidden from active lists but retained for historical job data.

#### Job Management

- Create a translation job linked to a client with: title, source language, target language, translation method, optional deadline, and notes.
- **Translation methods:**
  - `AI_DRAFT_HUMAN_REVISION` — AI generates a first draft; the linguist post-edits.
  - `HUMAN_ONLY` — Linguist translates from scratch; no AI draft.
  - `FULLY_HUMAN` — Same as Human Only but signals certified or supervised work.
- Job status lifecycle: `DRAFT` → `IN_PROGRESS` → `REVIEW` → `DELIVERED` → `CANCELLED`.
- File upload: attach source files to a job (stored in Object Storage). Supported formats: PDF, DOCX, TXT, and other common document types.
- Job detail page: client info, language pair, method, status management controls, file list, progress summary.

#### Segment Editor

- Full CAT (Computer-Assisted Translation) editor accessed from a job's detail page.
- Source and target segments displayed side by side.
- For `AI_DRAFT_HUMAN_REVISION` jobs: AI pre-translates all segments on first open; the linguist edits and approves each segment.
- For `HUMAN_ONLY` / `FULLY_HUMAN` jobs: target fields are blank; the linguist types translations directly.
- Auto-save: changes are persisted to `StudioSegmentTranslation` via `PATCH /api/studio/jobs/[id]/segments` on every save action.
- Progress bar shows percentage of segments with a non-empty translation.

#### Translation Memory (Studio TM)

- Create named TMs scoped to the Studio workspace.
- Each TM entry stores a source text, target text, source language, and target language.
- TM entries are surfaced as suggestions in the segment editor for fuzzy and exact matches.
- TMs can be shared across multiple jobs within the same workspace.

#### Glossaries

- Create named glossaries with source and target term pairs.
- Terms are surfaced in the segment editor when the source term is detected in the current segment.
- Supports Do Not Translate (DNT) and Keep Uppercase flags per term (same semantics as the client-side glossary).

#### Style Guides

- Create named style guides containing free-text guidance on tone, formality, brand voice, and other localization conventions.
- Style guides are displayed in the segment editor's context panel for reference during translation.

#### Localization Assets Overview

- A unified assets page at `/portal/studio/assets` providing a navigational hub to TMs, Glossaries, and Style Guides.
- Each section shows total counts and links to the dedicated management page.

---

<a id="4-core-workflows"></a>

## 4. Core Workflows

### 4.1 Standard Job Creation → AI Draft → Human Review → Delivery

1. **Client creates a project**, uploads a document, and selects source and target languages.
2. Client selects **workflow type**: AI + Human Revision.
3. Client selects **linguist source**: system pool (or preferred).
4. Client attaches localization assets (TM, glossary, style guide) if applicable.
5. System calculates a **credit estimate** and displays it to the client before submission.
6. Client confirms. System **debits AI credits** immediately (idempotent — debit is linked to a unique job ID to prevent double-charging on retries).
7. **AI translation runs**: the document is segmented; each segment is sent to the AI with injected TM context, glossary terms (DNT + UPPERCASE rules enforced), and style guide guidance.
8. AI draft is stored per segment. A **ledger entry** is written recording the debit.
9. System **matches a linguist** from the selected pool (language pair match, specialization match, availability). Preferred linguists are offered the job first; if none accept within the SLA window, the job falls to the system pool.
10. Linguist **accepts** the assignment. Human revision credits are debited (if not internal linguist). Another **ledger entry** is written.
11. Linguist reviews segments in the CAT editor: approves, edits, or flags issues.
12. Linguist **submits** the job as complete.
13. System rebuilds the target document in the original file format.
14. Client is **notified** of delivery. Deliverable is available for download.
15. Client **approves** the job. Approved source+target segment pairs are written to the attached TM.
16. Job status moves to **Delivered/Closed**.

### 4.2 Client Selects Internal Linguists — Zero Human Credit Confirmation

1. Client creates a job and selects **Internal** as the linguist source.
2. The UI displays a confirmation banner: *"Human revision and translation tasks assigned to your internal linguists are not charged credits. AI translation credits still apply."*
3. Client confirms and submits.
4. On job creation, the system checks `isInternalLinguist = true`. The human credit debit step is **skipped**. A zero-amount ledger entry is written for auditability.
5. The job is routed directly to the client's internal linguist pool for the assigned language pair.

### 4.3 Invite Internal Linguist → Accept → Join Org → Get Assignments

1. Org Admin navigates to **Linguists → Internal → Invite**.
2. Enters the linguist's email address and selects language pairs to assign.
3. System sends a branded invitation email containing a time-limited acceptance link.
4. Linguist clicks the link, sets a username and password, and lands in the Linguist Workspace scoped to that organization.
5. Linguist appears in the org's Internal Linguists list with status **Active**.
6. When a job for their language pair is submitted using the Internal source, the system routes the task to this linguist.
7. If an invitation is not accepted within 7 days, the link expires and can be resent by the admin.

### 4.4 Preferred Linguist Selection from System Pool

1. Org Admin navigates to **Linguists → System Pool**.
2. Filters by language pair, specialization, quality score.
3. Clicks **Add to Preferred** on a linguist's card.
4. The linguist is added to the org's preferred list.
5. When a new job uses the **Preferred** source, the system offers the job to all preferred linguists with matching language pairs first. If no preferred linguist accepts within the SLA window, the job falls back to the system pool automatically.

### 4.5 Credit Estimation, Deduction, and Ledger Entry

1. Client enters job parameters (word count, workflow type, linguist source).
2. System calculates:
   - **AI credits** = `⌈wordCount ÷ 5⌉` (always applied if AI stage is used).
   - **Human revision credits** = `⌈wordCount ÷ 2⌉` (applied if workflow = Human Revision and source ≠ Internal).
   - **Human translation credits** = `wordCount × 2` (applied if workflow = Human Translation and source ≠ Internal).
   - **Total estimate** = AI credits + human credits.
3. Estimate is displayed pre-submission.
4. On submission, a **pending debit** is created (status = `RESERVED`).
5. When each stage completes successfully, the reserved debit is **confirmed** (status = `CONFIRMED`). If the stage fails, the reserved amount is released back to the balance.
6. Each ledger entry records: job ID, stage type, word count, credit amount, timestamp, and status. Entries are **idempotent**: a unique constraint on (jobId, stageType) prevents double-debiting on retry.

### 4.6 Monthly Credit Reset on Plan Renewal

1. On the billing cycle renewal date, Stripe fires a `invoice.payment_succeeded` webhook.
2. The platform receives the webhook, identifies the organization, and sets `monthlyCreditsRemaining = plan.creditsPerCycle`.
3. Any unused monthly credits are **forfeited** (do not carry over).
4. Top-up credit balances are preserved.
5. A ledger entry is written recording the credit reset: type = `MONTHLY_RESET`, amount = plan's credit allocation.

<a id="47-contentful-integration-select-entries--create-jobs--push-back"></a>

### 4.7 Contentful Integration: Select Entries → Create Jobs → Push Back

1. Client connects their Contentful space (Personal Access Token + Space ID) via the integrations dashboard.
2. Client configures settings: source locale, target locales, delivery mode (Draft or Publish).
3. Client maps content types: selects which fields within each content type are translatable, and the default workflow type for that content type.
4. Client browses Contentful entries in the **Browse Content** tab, filtered by content type or search query.
5. Client selects one or more entries and clicks **Send to Translation**.
6. The platform creates a **ContentfulJob** per entry, with one **ContentfulJobLocale** record per target locale.
7. Client navigates to the **Jobs** tab and opens the job.
8. Client clicks **Run AI Translation**. The platform fetches the entry from Contentful, extracts text from each mapped field (including RichText node traversal), translates each segment, and stores the translated data per locale.
9. Once all locales reach **Ready** status, the client clicks **Push All to Contentful**.
10. The platform writes the translated field values into the entry's locale slots in Contentful.
11. Depending on the delivery mode, entries are saved as drafts or published immediately.
12. If the source entry is subsequently modified in Contentful, the platform receives a webhook event, compares a hash of the incoming fields against the stored source snapshot, and marks the job as **Out of Date** if a difference is detected.

<a id="48-ocr-quality-gate-for-scanned-pdfs"></a>

### 4.8 OCR Quality Gate for Scanned PDFs (Wizard → OCR Requests Queue)

1. Client uploads a PDF in the project wizard. The analyzer detects whether the file is a scanned image PDF (no embedded text layer) and runs the local OCR pipeline (OCRmyPDF / Tesseract) to extract text plus per-word confidence at 150 DPI.
2. The mean per-word Tesseract confidence is computed across every page and returned as `ocrConfidence` (0–1).
3. **High-confidence path (≥ 0.95):** the wizard proceeds normally — extracted text becomes wizard segments, layout HTML is preserved for high-fidelity delivery, and the user sees a "scanned PDF — text extracted via OCR, NN% confidence" note in the analysis summary.
4. **Low-confidence path (< 0.95):** the wizard short-circuits, persists the OCR'd PDF to private storage, and POSTs an **OcrRequest** record (status `NEEDS_VERIFICATION`) carrying the per-page text, per-page confidence, file URL, page count, word count, and source language. The user is told the file went to the **OCR Requests** queue and is offered a one-click button to open it.
5. A linguist (or the client) opens **Dashboard → OCR Requests → [request]**, sees per-page text in editable textareas with confidence badges, optionally compares against the Mistral OCR alternative for each page (collapsible), corrects mis-recognized characters, and clicks **Mark Verified**. Status flips to `VERIFIED`, `verifiedAt`/`verifiedById` are set, and the corrected text is now eligible to drive a translation project.
6. Member-level access uses the standard `MemberClientAccountAccess` join table — members only see OCR requests for the client accounts they have access to (plus any unscoped ones).
7. Plan-gating: OCR Requests are available on Professional, Agency, and Enterprise tiers (driven by the `ocr_requests` feature flag in `plan-features.ts`); Starter sees a locked sidebar entry. The OCR_PAGE credit rate (5 credits/page) is reserved for billing future verified-text translation jobs derived from OCR requests.

### 4.9 WordPress Integration: Connect → Browse → Translate → Push Back

1. Client (Agency or Enterprise plan) opens **Dashboard → Integrations → WordPress** and enters their site URL and a WordPress Application Password.
2. The platform probes the site's REST API, auto-detects the installed multilingual plugin (WPML or Polylang), reads site languages, and stores an encrypted credential record.
3. Client configures **Settings**: source language, target languages, delivery mode (Draft or Publish), and per-post-type field mappings (title, content, excerpt, ACF fields, Yoast SEO meta, slug, menus).
4. Client opens the **Site Browser**: a post-type sidebar on the left and a paginated posts table on the right. Each post row shows title, type, language badge, and per-target-language translation status (Missing / In Progress / Up to Date / Stale). Polylang sites add a language-filter dropdown that scopes the list to posts in a given language.
5. Client multi-selects posts, picks target languages, and clicks **Send to Translation**. The platform creates a Contentech Project with one Document per post and one Job per target language, using the existing credit-deduction and workflow pipeline.
6. When a Job completes (AI auto-deliver or linguist delivery), the platform rebuilds the translated content — walking Gutenberg block JSON, Classic HTML, ACF field trees, and Yoast meta — and pushes it to the WP site as a new post in the target language, properly linked to the original via the multilingual plugin's translation API.
7. The companion WP plugin sends a webhook (`post.updated`, `post.deleted`) to `/api/webhooks/wordpress` when a source post is edited after translation. The platform verifies the HMAC signature, then marks any corresponding job locales as **Out of Date**, mirroring the Contentful staleness flow.
8. If Polylang is detected and its REST API extension is not installed, a persistent red warning banner appears in both the Connect tab (connected state) and the Settings tab, linking to the Polylang REST API add-on download page.

---

<a id="5-data--entities"></a>

## 5. Data / Entities

### Core Entities

| Entity               | Key Fields                                                                                          | Relationships                                                        |
|----------------------|-----------------------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| **Organization**     | id, name, plan, creditBalance, monthlyCredits, byokKey (encrypted), status                          | has many Users, Projects, TMs, Glossaries, StyleGuides, Integrations |
| **User**             | id, email, name, hashedPassword, role (ADMIN / CLIENT / LINGUIST), organizationId                  | belongs to Organization; may have LinguistProfile                    |
| **LinguistProfile**  | id, userId, bio, languages (JSON array of pairs), specializations, qualityScore, availability       | belongs to User; linked to Assignments                               |
| **Invitation**       | id, email, organizationId, languagePairs, token, expiresAt, status                                  | belongs to Organization; resolves to User on acceptance              |
| **Project**          | id, organizationId, name, sourceLanguage, targetLanguages, status, attachedTmIds, attachedGlossaryIds, attachedStyleGuideIds | belongs to Organization; has many Documents, Jobs |
| **Document**         | id, projectId, originalFilename, fileUrl, fileType, wordCount, detectedLanguage, processingStatus  | belongs to Project; has many Segments                                |
| **Segment**          | id, documentId, segmentIndex, sourceText, translatedText, status, assignedLinguistId               | belongs to Document; has many Issues                                 |
| **Job**              | id, projectId, documentId, workflowType, linguistSource, status, creditsEstimated, creditsCharged  | belongs to Project; has many JobLocales, LinguistAssignments         |
| **JobLocale**        | id, jobId, targetLocale, status, deliveredAt                                                        | belongs to Job                                                       |
| **LinguistAssignment** | id, jobId, linguistProfileId, role (TRANSLATOR / REVIEWER), status, acceptedAt, submittedAt      | belongs to Job and LinguistProfile                                   |
| **TranslationMemory** | id, organizationId, name, languagePair                                                             | belongs to Organization; has many TMEntries                          |
| **TMEntry**          | id, tmId, sourceText, targetText, sourceLanguage, targetLanguage, usageCount, lastUsedAt           | belongs to TranslationMemory                                         |
| **Glossary**         | id, organizationId, name, sourceLanguage                                                            | belongs to Organization; has many GlossaryTerms                      |
| **GlossaryTerm**     | id, glossaryId, sourceTerm, targetTerm, doNotTranslate, keepUppercase                              | belongs to Glossary                                                  |
| **StyleGuide**       | id, organizationId, name, industry, tone, content (JSON sections)                                  | belongs to Organization                                              |
| **CreditLedger**     | id, organizationId, jobId, stage, creditAmount, type, status, createdAt                            | belongs to Organization; references Job                              |
| **Subscription**     | id, organizationId, stripeCustomerId, stripePriceId, status, currentPeriodEnd                      | belongs to Organization                                              |
| **Issue**            | id, segmentId, linguistAssignmentId, errorType, severity, proposedText, comment, resolvedAt        | belongs to Segment and LinguistAssignment                            |
| **AuditLog**         | id, actorId, actorRole, action, targetType, targetId, metadata (JSON), createdAt                   | cross-entity                                                         |
| **ContentfulConnection** | id, organizationId, spaceId, environmentId, encryptedToken, sourceLocale, targetLocales, deliveryMode | belongs to Organization                                       |
| **ContentfulMapping** | id, organizationId, contentTypeId, translatableFields, workflowType, excludeSlugs                 | belongs to Organization                                              |
| **ContentfulJob**    | id, organizationId, entryId, entryTitle, contentTypeId, sourceLocale, selectedFields, sourceSnapshot, wordCount, workflowType, status | belongs to Organization; has many ContentfulJobLocales |
| **ContentfulJobLocale** | id, contentfulJobId, targetLocale, status, translatedData, deliveredAt, error                  | belongs to ContentfulJob                                             |
| **WordpressConnection** | id, organizationId, siteUrl, encryptedAppPassword, multilingualPlugin (WPML \| Polylang), sourceLanguage, targetLanguages, deliveryMode (DRAFT \| PUBLISH), pluginVersion, siteProfile (JSON: languages, polylangRestApiMissing, …) | belongs to Organization; has many WordpressMappings, WordpressJobs |
| **WordpressMapping** | id, connectionId, postType, postTypeName, includeTitle, includeContent, includeExcerpt, includeAcf, includeYoast, includeSlug, includeMenus, targetStatus, workflowType | belongs to WordpressConnection; one row per post type |
| **WordpressJob**     | id, connectionId, wpPostId, postType, sourceLanguage, sourceSnapshot (JSON), status               | belongs to WordpressConnection; has many WordpressJobLocales         |
| **WordpressJobLocale** | id, wpJobId, targetLocale, status, wpTargetPostId, deliveredAt, error                           | belongs to WordpressJob; stores the WP post ID of the pushed translation |
| **ClientAccount**    | id, organizationId, name, createdAt                                                             | belongs to Organization; has many TMs, Glossaries, StyleGuides, MemberClientAccountAccess rows |
| **MemberClientAccountAccess** | id, userId, organizationId, clientAccountId, createdAt                            | join table; unique on (userId, clientAccountId); belongs to User, Organization, ClientAccount |
| **AiProvider**       | id, name, type, baseUrl, region, environment, status, rateLimitRpm, costProfile, notes          | has one ProviderSecret; has many AiModels and LlmHealthChecks                                |
| **ProviderSecret**   | id, providerId, encryptedKey, keyMasked, orgProjectId, rotatedAt, updatedBy                     | belongs to AiProvider (1:1); encryptedKey is AES-256-GCM ciphertext; never returned to UI   |
| **AiModel**          | id, providerId, displayName, apiModelId, internalKey, contextWindow, outputLimit, status, latencyTier, costTier, qualityTier, capabilities, domains, languageGroups, warnings, isDefault | belongs to AiProvider; may be referenced as primary/secondary/tertiary in LlmRoutingRule |
| **LlmRoutingRule**   | id, name, description, priority, enabled, conditions (JSON), primaryModelId, secondaryModelId, tertiaryModelId, policy (JSON), isTemplate | references up to three AiModels via the fallback chain; evaluated in ascending priority order per translation job |
| **LlmHealthCheck**   | id, providerId, modelId, status, latencyMs, diagnostics (JSON), checkedAt                       | belongs to AiProvider and optionally AiModel; append-only record of each health probe result |
| **LlmAuditLog**      | id, actorId, actorEmail, action, targetType, targetId, changeSummary, createdAt                 | append-only; records every change made inside the AI Config control center                   |
| **CreditRate**       | id, workflowType, creditsPerWord, updatedAt                                                     | platform singleton rows (one per workflow type); read by project creation to calculate deductions |
| **StudioWorkspace**  | id, linguistId, subscriptionStatus, subscriptionStartedAt, subscriptionExpiresAt                | belongs to User (linguist); root of all Studio data; one per linguist |
| **StudioClient**     | id, workspaceId, companyName, contactName, contactEmail, status (ACTIVE/ARCHIVED)               | belongs to StudioWorkspace; has many StudioJobs |
| **StudioJob**        | id, workspaceId, clientId, title, sourceLanguage, targetLanguage, translationMethod, status, deadline, notes, wordCount | belongs to StudioWorkspace and StudioClient; has many StudioJobFiles and StudioSegmentTranslations |
| **StudioJobFile**    | id, jobId, originalFilename, storageUrl, fileType, sizeBytes                                    | belongs to StudioJob; source document attached to a job |
| **StudioSegmentTranslation** | id, jobId, segmentIndex, sourceText, translatedText, updatedAt                         | belongs to StudioJob; one row per segment; upserted on every editor save |
| **StudioTm**         | id, workspaceId, name, sourceLanguage, targetLanguage, entries (JSON array of source+target pairs) | belongs to StudioWorkspace |
| **StudioGlossary**   | id, workspaceId, name, sourceLanguage, targetLanguage, terms (JSON array of term pairs with DNT/uppercase flags) | belongs to StudioWorkspace |
| **StudioStyleGuide** | id, workspaceId, name, content                                                                  | belongs to StudioWorkspace |
| **StudioActivityLog** | id, workspaceId, eventType, description, metadata (JSON), createdAt                            | belongs to StudioWorkspace; append-only activity feed for the overview page |
| **OcrRequest**       | id, organizationId, clientAccountId, createdById, sourceFilename, sourceFileUrl, sourceLanguage, pageCount, wordCount, status (NEEDS_VERIFICATION / IN_REVIEW / VERIFIED / FAILED), provider (tesseract / mistral+tesseract), avgConfidence (0..1), pages (JSON: per-page text + confidence + optional Mistral alternative), assignedLinguistId, notes, verifiedAt, verifiedById, linkedProjectId | belongs to Organization, optional ClientAccount, and User (createdBy); may reference a Project once translation is launched from the verified text |

### Key Relationships

- An **Organization** owns all data; no data leaks across org boundaries.
- **Projects** aggregate documents and jobs. Each job tracks its own workflow, linguist pool selection, and credit consumption.
- **CreditLedger** is append-only. Balance is derived by summing all entries for an org. No ledger entry is ever modified; corrections are made by adding a reversal entry.
- **TM write-back** occurs only when a client explicitly approves a delivered job. The source+target segment pair is added to all TMs attached to that project.

---

<a id="6-integrations--extensibility"></a>

## 6. Integrations & Extensibility

### Current Integrations

#### Contentful (CMS)
- **Protocol:** Contentful Management API (CMA) via Personal Access Token.
- **Capabilities:** Connect space, browse entries, map content type fields, create translation jobs, run AI translation, push translations back as draft or published entries.
- **RichText support:** The platform traverses Contentful RichText node trees, extracts translatable text nodes, translates them, and rebuilds the structure maintaining all marks, hyperlinks, and embedded assets.
- **Webhook support:** Contentful can send entry.publish events to `/api/webhooks/contentful`; the platform detects source content changes and marks previously-delivered jobs as Out of Date.

#### WordPress (CMS)
- **Protocol:** WordPress REST API v2 with Application Password authentication (Basic Auth over TLS). Credentials are encrypted at rest (AES-256-GCM).
- **Plan gating:** Available to Agency and Enterprise plan organizations only.
- **Multilingual plugin support:** Auto-detects WPML or Polylang on connection via capability probe. A swappable adapter layer (`MultilingualAdapter` interface with `WPMLAdapter` and `PolylangAdapter` implementations) means adding further plugins requires one new class, not endpoint rewrites.
- **Capabilities:** Connect site, auto-discover post types and site languages, configure per-post-type field mappings (title, content, excerpt, ACF, Yoast SEO meta, slug, menus), browse posts with per-language status badges, multi-select and bulk-send to translation, push translated content back as draft or published posts properly linked to their source via the multilingual plugin's translation API.
- **Content coverage:** Post title, post content (Gutenberg block JSON and Classic HTML preserved), excerpt, slug, ACF fields (string leaves only, recursively walked), Yoast SEO meta (title, description, OG fields), featured image alt text, taxonomy terms, and menu item labels.
- **Staleness detection:** The companion WordPress plugin sends signed webhooks (`post.updated`, `post.deleted`) to `/api/webhooks/wordpress`; the platform verifies the HMAC signature and marks affected job locales as Out of Date.
- **Polylang REST API warning:** If Polylang is installed but its REST API extension is missing, a red warning banner with a remediation link is shown in both the Connect tab (connected state) and the Settings tab.
- **Plugin version tracking:** The connected plugin version is displayed in the Settings tab; a dismissible update banner appears when a newer plugin version is available. Dismissal is persisted in localStorage and auto-clears when the plugin version bumps.

#### OpenAI (AI Translation Engine)
- **Protocol:** OpenAI Chat Completions API.
- **Model:** gpt-5-nano (reasoning model). `max_completion_tokens` must be set to at least 8,000 for complex generation tasks because reasoning tokens consume the budget first.
- **BYOK:** Free-plan organizations supply their own OpenAI API key; the key is encrypted at rest (AES-256-GCM keyed from a platform secret) and decrypted only during AI calls. Professional organizations use the platform's API key by default.

#### Stripe (Payments)
- **Protocol:** Stripe API + webhooks.
- **Capabilities:** Subscription management (create, upgrade, downgrade, cancel), invoice generation, one-time credit package purchases.
- **Webhook events handled:** `invoice.payment_succeeded` (credit reset), `customer.subscription.updated` (plan change), `customer.subscription.deleted` (cancellation).
- **Propagation rule:** Plan data (name, price, features) is stored in the platform database and synced from Stripe. All site-facing pages read from the database; no pricing is hardcoded.

### Extensibility Design

- Third-party CMS integrations follow a standard pattern: a `Connection` record (with encrypted credentials) + `Mapping` records (field configuration) + `Job` records (execution state). New integrations can be added by implementing this pattern without modifying core data models.
- The AI translation layer is abstracted behind a `translateSegment` function with a standard signature. The underlying model can be swapped or a different provider substituted without changing callers.
- Localization assets (TM, glossary, style guide) are injected via a `buildLocContext` function that accepts lists of asset IDs. No job or integration code needs to know the internal format of these assets.

---

<a id="7-industries--use-cases"></a>

## 7. Industries & Use Cases

### E-commerce & Retail
- **Typical content:** Product titles, descriptions, size guides, promotional copy, customer reviews, checkout strings.
- **Volume:** High — thousands of SKUs.
- **Recommended workflow:** AI Only for product descriptions; AI + Human Revision for hero copy and campaign landing pages where brand voice matters.
- **Key tools:** Glossary (product names, brand terms as DNT or UPPERCASE), TM (reuse approved product descriptions across markets).

### SaaS & Technology
- **Typical content:** UI strings, tooltips, error messages, release notes, API documentation, help articles.
- **Volume:** Medium, but frequent (every release cycle).
- **Recommended workflow:** AI Only for UI strings and error messages; AI + Human Revision for documentation and marketing pages.
- **Key tools:** Glossary (product feature names as DNT), TM (match UI strings across versions), Contentful integration for documentation sites.

### Customer Support & Help Centers
- **Typical content:** Knowledge base articles, FAQs, chatbot responses, policy pages.
- **Volume:** High initial volume; incremental updates ongoing.
- **Recommended workflow:** AI + Human Revision for public-facing articles; AI Only for internal agent notes.
- **Key tools:** TM (high reuse rate in help content), glossary (product-specific terms), Contentful or CMS integrations for automated sync.

### Marketing & Growth Teams
- **Typical content:** Ad copy, social media posts, email campaigns, blog posts, landing pages.
- **Volume:** Medium, high urgency.
- **Recommended workflow:** AI + Human Revision (brand voice must be preserved); Human Translation for high-stakes campaigns.
- **Key tools:** Style guide (tone, brand voice, formality rules per market), preferred linguists (culturally-specialized), Contentful integration.

### Legal & Compliance-Heavy Industries (Finance, Insurance)
- **Typical content:** Contracts, disclosures, terms and conditions, regulatory filings, compliance notices.
- **Volume:** Medium; low tolerance for error.
- **Recommended workflow:** Human Translation (no AI first draft) or AI + Human Revision with mandatory Critical Issue review before delivery.
- **Key tools:** Certified linguist matching (specialization = Legal/Finance), glossary (statutory terminology), full audit trail of every edit.

### Healthcare & Pharma
- **Typical content:** Patient information leaflets, clinical trial documentation, drug labels, consent forms, medical device instructions.
- **Volume:** Low to medium; extremely high accuracy requirement.
- **Recommended workflow:** Human Translation exclusively, or AI + Human Revision with a mandatory second-review stage.
- **Key tools:** Linguists with medical specialization, strict glossary enforcement (INN drug names as DNT), full edit history and issue log for regulatory submission.

### Media & Entertainment
- **Typical content:** Subtitles, scripts, dubbing scripts, synopses, press releases, streaming platform metadata.
- **Volume:** High per project; time-sensitive.
- **Recommended workflow:** AI + Human Revision for subtitles (time-coded accuracy); Human Translation for scripts where cultural nuance is paramount.
- **Key tools:** Character limit enforcement (subtitle timing), glossary (character names as DNT), preferred linguists with media specialization.

### Travel & Hospitality
- **Typical content:** Hotel descriptions, booking confirmation emails, itinerary content, destination guides, review responses.
- **Volume:** Very high; many languages.
- **Recommended workflow:** AI Only for templated content (booking confirmations, standard descriptions); AI + Human Revision for destination guides and premium property descriptions.
- **Key tools:** TM (high reuse in templated content), multi-locale Contentful integration for travel portals.

---

<a id="8-kpis--reporting"></a>

## 8. KPIs & Reporting

### Client-Facing KPIs

| KPI                          | Definition                                                                                      | Visibility |
|------------------------------|-------------------------------------------------------------------------------------------------|------------|
| **Time to First Draft**      | Time from job submission to AI draft completion                                                 | Per job    |
| **Time to Delivery**         | Time from job submission to linguist submission                                                 | Per job    |
| **Credits per Word**         | Total credits charged ÷ word count                                                              | Per job    |
| **Savings vs Full Human**    | Estimated cost of Human Translation − actual cost of AI+Revision workflow                      | Per org    |
| **Issue Density**            | Number of flagged issues ÷ word count                                                           | Per job    |
| **Critical Issue Rate**      | Number of Critical issues ÷ total issues                                                        | Per job    |
| **Credit Burn Rate**         | Credits consumed per day (rolling 30-day average)                                               | Org-level  |
| **Projected Exhaustion Date**| Days until balance reaches zero at current burn rate                                            | Org-level  |

### Linguist Performance KPIs

| KPI                          | Definition                                                                                      |
|------------------------------|-------------------------------------------------------------------------------------------------|
| **Quality Score**            | Weighted average of client ratings (1–10) for completed jobs                                   |
| **Edit Distance**            | Average Levenshtein distance between AI draft and linguist submission (lower = less editing needed from AI) |
| **Throughput**               | Words processed per day                                                                          |
| **Acceptance Rate**          | % of job offers accepted vs declined                                                             |
| **Average Turnaround**       | Average time from assignment acceptance to submission                                            |
| **Rejection Rate**           | % of submitted jobs sent back for revision by the client                                         |

### Admin / Platform KPIs

| KPI                          | Definition                                                                                      |
|------------------------------|-------------------------------------------------------------------------------------------------|
| **MRR / ARR**                | Monthly and annual recurring revenue from subscriptions                                         |
| **Credit Revenue**           | Revenue from one-time credit top-up purchases                                                   |
| **Platform Margin Proxy**    | Subscription + credit revenue − (AI API cost + linguist payouts)                                |
| **Active Organizations**     | Orgs with at least one job submitted in the last 30 days                                        |
| **SLA Compliance Rate**      | % of jobs delivered within the stated SLA window                                                |
| **Escalation Rate**          | % of jobs requiring admin intervention                                                          |

---

<a id="9-security-privacy--compliance"></a>

## 9. Security, Privacy & Compliance

### Authentication & Access Control
- All authentication is session-based using NextAuth v5. Sessions are signed and stored server-side.
- Role-based access control (RBAC) is enforced at the API route level on every request. There is no client-side-only access control.
- Admin access is restricted to a named allowlist of email addresses; no self-promotion to admin is possible.
- Organization isolation is enforced by filtering every database query on `organizationId` derived from the authenticated session. Cross-org data access is structurally impossible at the data layer.

### BYOK Key Management
- Client-supplied OpenAI API keys are encrypted at rest using AES-256-GCM.
- The encryption key is derived from a platform-level secret stored as an environment variable; it is never stored in the database.
- Decryption occurs only within the server-side AI translation function, never in the browser or in logs.

### Data Encryption
- All data is transmitted over TLS.
- Database credentials and third-party integration tokens (e.g., Contentful Personal Access Tokens) are encrypted at rest using the same AES-256-GCM scheme as BYOK keys.

### Audit Logging
- An immutable `AuditLog` table records all privileged actions: authentication events, role changes, plan changes, org creation/deletion, admin impersonation, and integration credential changes.
- Logs include: actor ID, actor role, action name, target entity type, target entity ID, metadata payload, and timestamp.
- Logs are append-only; no API or UI allows deletion or modification.

### Data Retention
- Delivered documents and segment data are retained for 12 months by default.
- Clients can request data deletion for their organization, which triggers a cascading delete of all org-owned data.
- Audit logs are retained for 36 months regardless of org deletion requests (legal hold).

### Compliance Posture
- **ISO 27001-aligned practices:** Access control, change management, audit logging, and incident response procedures are designed to align with ISO 27001 controls.
- **GDPR readiness:** All personal data (user profiles, linguist profiles) is org-scoped and deletable on request. No personal data is used for AI training.
- **Data residency:** Database and object storage are provisioned in a single region; data residency guarantees can be provided for enterprise contracts.

---

<a id="10-future-enhancements"></a>

## 10. Future Enhancements

### Intelligent Auto-Routing
- Automatically select the optimal workflow type and linguist source based on content type, industry tag, historical quality scores, and risk level (e.g., legal documents always route to Human Translation; marketing copy defaults to AI + Revision).
- Machine-learned routing weights based on past edit distance and issue density per content type.

### Automated Quality Scoring
- Post-delivery automatic quality estimation using an LLM-as-evaluator model to score translations on fluency, adequacy, and style adherence.
- Quality scores feed back into linguist performance metrics without requiring explicit client ratings.

### Advanced CMS Connectors
- Strapi, Sanity, Webflow, and HubSpot CMS integrations following the same connect → map → browse → translate → push pattern established with Contentful and WordPress.
- A connector SDK that allows enterprise clients to build custom integrations against the Contentech API.

### In-Context Preview
- Capture a screenshot of the client's web page and overlay the translated text in position.
- Allows linguists and clients to verify that translated text fits the UI layout (truncation, text expansion, RTL issues) before pushing to production.

### SSO / SAML for Enterprise
- SAML 2.0 and OIDC support so enterprise clients can use their existing identity providers (Okta, Azure AD, Google Workspace) for single sign-on.
- Just-in-time provisioning: new users are automatically created with the correct role when they log in via SSO for the first time.

### Credit Top-Ups & Enterprise Contracts
- Self-serve credit top-up packages (e.g., 500 credits, 2,000 credits, 10,000 credits) purchasable at any time via Stripe.
- Enterprise annual contracts with committed credit volumes, custom SLA terms, and dedicated account management.
- Volume discounts applied automatically above configurable word-count thresholds.

### Translation Quality Firewall
- Configurable quality threshold: if the post-delivery quality score falls below a set threshold, the job is automatically returned to the linguist for revision before the client can download.
- Critical issue gate: jobs containing any unresolved Critical-severity issues cannot be marked as delivered.

### Bilingual Document Export
- Export translated documents in bilingual format (source + target side by side) for client review, archiving, or submission to regulatory bodies.
- Formats: bilingual DOCX, XLIFF 1.2, XLIFF 2.0.

### API Access for Developers
- REST API for programmatic job submission, status polling, and deliverable retrieval.
- Webhook subscriptions so clients can receive real-time delivery notifications to their own systems.
- API key management in the client dashboard with scoped permissions (read-only vs read-write).

---

<a id="11-implemented-features"></a>

## 11. Implemented Features

This section tracks features that have been fully built and merged into the platform. Each entry references the original task and describes what was delivered.

### Task #1 — Agency Client Accounts

**Status:** Implemented

**What was built:**

- **`ClientAccount` data model** — new Prisma model with `id`, `organizationId`, `name`, `createdAt`; reverse relations on `Organization`, `TranslationMemory`, `Glossary`, and `StyleGuide`.
- **Client Accounts API** — `GET/POST /api/client-accounts` (list + create) and `GET/PATCH/DELETE /api/client-accounts/[id]` (read, update, delete). All routes verify org ownership; write operations restricted to ADMIN role.
- **Loc-asset API filtering** — `GET /api/tm`, `GET /api/glossary`, and `GET /api/style-guides` each support:
  - `?clientAccountId=shared` → returns only shared (null) assets.
  - `?clientAccountId=<id>` → returns assets for that account plus shared assets; org ownership of the ID is validated before use.
  - No parameter → returns all org assets (unfiltered).
- **Glossary page** — client account badge column; dropdown in upload and AI-generate dialogs.
- **Style Guides page** — client account badge column; dropdown in upload and AI-generate dialogs.
- **Translation Memory page** — client account badge on each TM card; dropdown in create TM dialog.
- **Wizard (Cento) integration** — Step 1 of the project creation wizard includes a client account selector. The wizard fetches only assets matching `?clientAccountId=<selected>` (or shared if none selected). The selected `clientAccountId` is included in the project creation payload and stored on the `Project` record.

**Key files:**
- `prisma/schema.prisma`
- `app/api/client-accounts/route.ts`
- `app/api/client-accounts/[id]/route.ts`
- `app/api/tm/route.ts`
- `app/api/glossary/route.ts`
- `app/api/style-guides/route.ts`
- `app/api/projects/route.ts`

---

### AI Provider & Model Control Center

**Status:** Implemented

**What was built:**

- **Data models** — four new Prisma models: `AiProvider` (registry of LLM providers), `ProviderSecret` (encrypted API key store, 1:1 with provider), `AiModel` (model catalog with full lifecycle and tiering metadata), `LlmRoutingRule` (named rules mapping job attributes to a primary + two fallback models), `LlmHealthCheck` (append-only health probe log), `LlmAuditLog` (append-only change log for all control-center actions), and `CreditRate` (per-workflow credit rate table read at job creation).
- **Admin UI at `/admin/ai-config`** — six-tab control center, admin-session-guarded:
  - **Provider Registry** — CRUD for providers; API key stored encrypted on save; masked preview shown; Update Key action to rotate a key without exposing the old one; one-click activate/deactivate.
  - **Model Catalog** — CRUD for models scoped to a provider; full lifecycle status management (draft → beta → approved → production → deprecated → retired/disabled); tier labeling (latency, cost, quality); domain and language-group tag arrays; inline status change; default-model designation.
  - **Routing Rules** — CRUD for named rules; priority ordering; JSON condition builder covering language pair, language group, workflow type, cost/latency/quality tier preference, document type, and word-count threshold; three-level fallback chain (primary → secondary → tertiary); per-rule policy overrides (JSON); enable/disable toggle; template flag.
  - **Routing Simulator (Test Console)** — fire a synthetic routing request against the live rules table; displays the selected model, full fallback chain, risk flags (e.g., key missing on primary provider), and any blocked models with reasons. No job is created; no credits are consumed.
  - **Health & Status** — summary counters for providers and models by status; per-provider health cards; manual health-check trigger; latency and diagnostic history.
  - **Audit Log** — filterable, read-only log of every change made inside the control center.
- **Routing engine (`lib/routing-engine.ts`)** — `simulateRouting(req)` walks `LlmRoutingRule` rows in priority order, evaluates each rule's condition JSON against the request, selects the first match, then resolves the fallback chain. Returns a `RoutingDecision` struct with the chosen model, full fallback list, and risk flags. Used by both the Routing Simulator tab and the live translation path.
- **Translation integration (`lib/ai-translate.ts`)** — `resolveModelConfig()` calls `simulateRouting()` for each job's language pair, decrypts the resolved provider's key via `lib/encrypt.ts`, and returns a `ModelConfig` struct (baseUrl, apiKey, modelId). `translateSegmentsForJob` resolves once per job and passes the config through to every per-segment API call.
- **API endpoints:**
  - `GET/POST /api/admin/ai-providers` — list and create providers (admin only).
  - `GET/PATCH/DELETE /api/admin/ai-providers/[id]` — read, update, delete a provider; PATCH also handles API key rotation via `encryptedKey` field.
  - `GET/POST /api/admin/ai-models` — list and create models.
  - `GET/PATCH/DELETE /api/admin/ai-models/[id]` — read, update, delete a model.
  - `GET/POST /api/admin/llm-rules` — list and create routing rules.
  - `GET/PATCH/DELETE /api/admin/llm-rules/[id]` — read, update, delete a rule.
  - `GET /api/admin/llm-health` — return health summary and per-provider/model check history.
  - `POST /api/admin/llm-health` — run a manual health check.
  - `POST /api/admin/llm-simulate` — run a routing simulation and return the decision (no side effects).
  - `GET /api/admin/llm-audit` — return the audit log with optional actor/date filters.
- **Credit deduction at project creation** — `POST /api/projects` now looks up the applicable `CreditRate` row by workflow type after creating jobs, calculates `wordCount × creditsPerWord × targetLanguageCount`, and decrements `Organization.creditBalance` atomically.
- **Webhook dispatch at project creation** — `POST /api/projects` fires `job.created` webhooks (fire-and-forget) for every job created in the request, using the same `fireWebhooks` utility used by the v1 API.

**Key files:**
- `prisma/schema.prisma`
- `lib/routing-engine.ts`
- `lib/ai-translate.ts`
- `lib/encrypt.ts`
- `components/admin/ai-config/LlmConfigPage.tsx`
- `app/admin/ai-config/page.tsx`
- `app/api/admin/ai-providers/route.ts`
- `app/api/admin/ai-providers/[id]/route.ts`
- `app/api/admin/ai-models/route.ts`
- `app/api/admin/ai-models/[id]/route.ts`
- `app/api/admin/llm-rules/route.ts`
- `app/api/admin/llm-rules/[id]/route.ts`
- `app/api/admin/llm-health/route.ts`
- `app/api/admin/llm-simulate/route.ts`
- `app/api/admin/llm-audit/route.ts`
- `app/api/projects/route.ts`

---

### WordPress Connector

**Status:** Implemented

**What was built:**

- **Data models** — four new Prisma models: `WordpressConnection` (per-org credential store with encrypted Application Password, detected multilingual plugin, source/target languages, delivery mode, plugin version, and a `siteProfile` JSON column for dynamic site metadata), `WordpressMapping` (per-post-type field mapping: title, content, excerpt, ACF, Yoast, slug, menus, target status, workflow type), `WordpressJob` (tracks a translation request for a single WP post, with source snapshot for staleness), and `WordpressJobLocale` (per-target-language status and WP target post ID after delivery).
- **WordPress REST client** (`lib/wordpress-client.ts`) — authenticated REST calls using Application Password Basic Auth, pagination, post CRUD, post type discovery, ACF field reads, Yoast meta reads, taxonomy/menu reads, and WPML/Polylang adapter implementations behind a `MultilingualAdapter` interface. `PolylangAdapter` includes `probeRestApiExtension()` to detect whether the Polylang REST API add-on is installed.
- **API endpoints:**
  - `POST /api/integrations/wordpress/connect` — validates credentials, auto-detects WPML/Polylang, probes Polylang REST API extension, stores encrypted connection record.
  - `GET /api/integrations/wordpress/discover` — probes site languages, post types, and Polylang REST API extension; updates `siteProfile` on the connection record.
  - `GET /api/integrations/wordpress/posts` — paginated post list with per-post language data; supports Polylang language filter.
  - `GET / POST /api/integrations/wordpress/mappings` — list and upsert per-post-type field mappings.
  - `PATCH /api/integrations/wordpress/settings` — update source language, target languages, and delivery mode.
  - `DELETE /api/integrations/wordpress/disconnect` — removes the connection record.
  - `POST /api/webhooks/wordpress` — receives `post.updated`/`post.deleted` events from the companion plugin; verifies HMAC signature; marks affected job locales as Out of Date.
  - `GET /api/cron/apikey-expiry` — cron job that sends milestone warning notifications (7d, 3d, 1d before expiry) for expiring API keys, including WordPress Application Passwords.
- **Dashboard UI** (`app/(dashboard)/dashboard/integrations/wordpress/page.tsx`) — three-tab interface gated behind Agency/Enterprise plans:
  - **Connect tab** — URL + Application Password input form; connected state shows site details, detected plugin, plugin version row, and a dismissible plugin-update banner. Red warning banner when Polylang REST API extension is missing.
  - **Settings tab** — source language, target languages, delivery mode, per-post-type field mapping accordion. Red warning banner echoed here so users see it immediately after connecting.
  - **Site Browser tab** — post-type sidebar, paginated posts table with title, language badge, and per-target-language status; language-filter dropdown for Polylang sites; multi-select with bulk Send to Translation action.
- **Plugin version tracking** — `pluginVersion` stored on the connection; displayed as a row in the Settings tab; dismissible update banner uses `PLUGIN_BANNER_DISMISSED_KEY` in localStorage, auto-clears when the plugin version bumps.
- **WordPress card** added to `app/(dashboard)/dashboard/integrations/page.tsx` with Agency/Enterprise lock.

**Key files:**
- `prisma/schema.prisma`
- `lib/wordpress-client.ts`
- `lib/wordpress-plugin-version.ts`
- `app/(dashboard)/dashboard/integrations/wordpress/page.tsx`
- `app/api/integrations/wordpress/connect/route.ts`
- `app/api/integrations/wordpress/discover/route.ts`
- `app/api/integrations/wordpress/posts/route.ts`
- `app/api/integrations/wordpress/mappings/route.ts`
- `app/api/integrations/wordpress/settings/route.ts`
- `app/api/integrations/wordpress/disconnect/route.ts`
- `app/api/webhooks/wordpress/route.ts`
- `app/api/cron/apikey-expiry/route.ts`
- `app/(dashboard)/dashboard/integrations/page.tsx`

---

### Task #2 — Member Client Account Permissions

**Status:** Active (in development)

**What will be built:**

- **`MemberClientAccountAccess` join model** — Prisma model with `id`, `userId`, `organizationId`, `clientAccountId`, `createdAt`; unique on `(userId, clientAccountId)`; reverse relations on `User`, `Organization`, and `ClientAccount`.
- **Org Members API** — `GET /api/org-members` returns all members of the caller's org with their assigned `clientAccountIds[]`. `PUT /api/org-members/[userId]/client-access` replaces a member's assignments; validated by org ownership of each client account ID; restricted to ADMIN role.
- **Automatic loc-asset filtering for restricted members** — At query time, `GET /api/tm`, `GET /api/glossary`, and `GET /api/style-guides` check the caller's `MemberClientAccountAccess` rows. If rows exist, a `WHERE (clientAccountId IN (...) OR clientAccountId IS NULL)` filter is appended on top of any existing filters. Members with no rows are unaffected (full access preserved).
- **Organization → Members page** — New page at `/dashboard/organization/members` listing all org members with their access badges (teal per account, grey "Full Access" if unrestricted). An "Edit Access" dialog lets admins check/uncheck client accounts and save. A "Members" link is added to the sidebar under Organization.

**Key files (planned):**
- `prisma/schema.prisma`
- `app/api/org-members/route.ts`
- `app/api/org-members/[userId]/client-access/route.ts`
- `app/api/tm/route.ts`
- `app/api/glossary/route.ts`
- `app/api/style-guides/route.ts`
- `app/(dashboard)/dashboard/organization/members/page.tsx`
- `components/dashboard/sidebar.tsx`

---

### Linguist Studio (TMS Module)

**Status:** Implemented

**What was built:**

- **Data models** — nine new Prisma models: `StudioWorkspace` (per-linguist TMS root; holds subscription status), `StudioClient` (clients managed by the linguist), `StudioJob` (translation jobs with method, status, language pair, and deadline), `StudioJobFile` (source files attached to a job), `StudioSegmentTranslation` (segment-level translations for the CAT editor), `StudioTm` (workspace-scoped translation memories), `StudioGlossary` (workspace-scoped glossaries with term pairs), `StudioStyleGuide` (workspace-scoped style guides), and `StudioActivityLog` (append-only event feed for the overview page).
- **Subscription gating** (`lib/studio.ts`) — `getOrCreateWorkspace()` fetches or lazily creates the workspace record; `isSubscribed()` checks `subscriptionStatus === ACTIVE` and expiry date. Every Studio API route calls both before returning data; non-subscribers receive HTTP 403.
- **API routes** (`/api/studio/*`):
  - `GET /api/studio/workspace` — returns current subscription status.
  - `POST /api/studio/subscribe` — activates a one-month subscription; idempotent.
  - `GET / POST /api/studio/clients` — list all clients / create a new client.
  - `GET / PATCH / DELETE /api/studio/clients/[id]` — read, update (name, contact, status), delete.
  - `GET / POST /api/studio/jobs` — list jobs (optional status filter) / create a new job.
  - `GET / PATCH / DELETE /api/studio/jobs/[id]` — read, update (status, deadline, notes), delete.
  - `POST /api/studio/jobs/[id]/upload` — upload a source file; stores metadata in `StudioJobFile`.
  - `POST /api/studio/jobs/[id]/draft` — run AI pre-translation on all segments; writes `StudioSegmentTranslation` rows.
  - `GET / PATCH /api/studio/jobs/[id]/segments` — fetch all segments / batch-update translated text; upserts on segmentIndex.
  - `GET / POST /api/studio/tm` — list TMs / create TM.
  - `DELETE /api/studio/tm/[id]` — delete TM.
  - `GET / POST /api/studio/glossaries` — list glossaries / create glossary.
  - `DELETE /api/studio/glossaries/[id]` — delete glossary.
  - `GET / POST /api/studio/style-guides` — list style guides / create style guide.
  - `DELETE /api/studio/style-guides/[id]` — delete style guide.
- **Promo page** (`/portal/studio`) — for non-subscribers: full product-marketing page with feature cards (Client Management, Job Workspace, CAT Editor, TM, Glossaries, Style Guides), a pricing/plan block, and a Subscribe button wired to `POST /api/studio/subscribe`. For subscribers: server-side redirect to `/portal/studio/overview`.
- **Overview page** (`/portal/studio/overview`) — three stat cards (Total Clients, Active Jobs, Completed Jobs) fetched in parallel; recent activity feed from `StudioActivityLog`; quick-action buttons.
- **Clients page** (`/portal/studio/clients`) — full list with Company Name, Contact, Status badge, and job count; New Client dialog (companyName, contactName, contactEmail); inline archive/restore and delete actions; client detail page linked from each row.
- **Jobs page** (`/portal/studio/jobs`) — filterable list by status (All, Active, Draft, Delivered); New Job dialog (title, client select, source language, target language, translation method, deadline, notes); job detail page with file upload and status management.
- **Segment editor** (`/portal/studio/jobs/[id]/edit`) — segment-by-segment CAT editor; auto-save on change via `PATCH /api/studio/jobs/[id]/segments`; AI Draft button triggers `POST /api/studio/jobs/[id]/draft` and refreshes all segments; progress bar showing translation completion percentage.
- **Assets pages** — `/portal/studio/assets` (overview hub with counts linking to sub-pages), `/portal/studio/tm` (TM list + create dialog), `/portal/studio/glossaries` (glossary list + create dialog), `/portal/studio/style-guides` (style guide list + create dialog).
- **Sidebar** (`components/dashboard/sidebar.tsx`) — **LINGUIST STUDIO** section added with sub-items: Overview, Clients, Jobs, Assets, TM, Glossaries, Style Guides. Subscription status is fetched server-side in `app/portal/layout.tsx` and passed as a prop; non-subscriber sub-items display a lock icon and are rendered as non-navigable spans.
- **TanStack Query setup** — Studio pages use TanStack Query v5. `QueryClient` and `apiRequest` helper live in `lib/queryClient.ts`. A `StudioQueryProvider` wraps the Studio route segment via `app/portal/studio/layout.tsx`. No other portal sections use TanStack Query.
- **Toast notifications** — `sonner` installed; `hooks/use-toast.ts` provides a `useToast()` hook matching the shadcn API (`{ toast({ title, description, variant }) }`). `<Toaster />` is mounted in the Studio layout.
- **Missing UI components** — `components/ui/select.tsx`, `components/ui/skeleton.tsx`, and `components/ui/dropdown-menu.tsx` added (Radix UI primitives).

**Key files:**
- `prisma/schema.prisma`
- `lib/studio.ts`
- `lib/queryClient.ts`
- `lib/languages.ts`
- `hooks/use-toast.ts`
- `components/studio/query-provider.tsx`
- `components/dashboard/sidebar.tsx`
- `app/portal/layout.tsx`
- `app/portal/studio/layout.tsx`
- `app/portal/studio/page.tsx` + `promo-client.tsx`
- `app/portal/studio/overview/page.tsx`
- `app/portal/studio/clients/page.tsx`
- `app/portal/studio/jobs/page.tsx`
- `app/portal/studio/jobs/[id]/page.tsx`
- `app/portal/studio/jobs/[id]/edit/page.tsx`
- `app/portal/studio/assets/page.tsx`
- `app/portal/studio/tm/page.tsx`
- `app/portal/studio/glossaries/page.tsx`
- `app/portal/studio/style-guides/page.tsx`
- `app/api/studio/workspace/route.ts`
- `app/api/studio/subscribe/route.ts`
- `app/api/studio/clients/route.ts`
- `app/api/studio/clients/[id]/route.ts`
- `app/api/studio/jobs/route.ts`
- `app/api/studio/jobs/[id]/route.ts`
- `app/api/studio/jobs/[id]/upload/route.ts`
- `app/api/studio/jobs/[id]/draft/route.ts`
- `app/api/studio/jobs/[id]/segments/route.ts`
- `app/api/studio/tm/route.ts`
- `app/api/studio/glossaries/route.ts`
- `app/api/studio/style-guides/route.ts`
- `components/ui/select.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/dropdown-menu.tsx`
