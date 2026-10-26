# Contentech — Enterprise Multilingual Translation SaaS

## Overview
Contentech is an enterprise-grade multilingual translation SaaS platform designed for "Quiet Confidence." It provides a comprehensive solution for managing multilingual translation workflows, offering features such as AI-powered document analysis and pre-translation, a sophisticated LLM routing system, a full-featured side-by-side translation editor, and robust content management with i18n support. The platform aims to streamline translation processes for businesses, focusing on efficiency, quality, and scalability for clients, linguists, and administrators.

## User Preferences
- Always say "Linguist" — NEVER "Freelancer"

## System Architecture
**Framework & Core Technologies:**
- Built with Next.js 15 App Router.
- Prisma v7 with `@prisma/adapter-pg` for ORM, connecting to PostgreSQL.
- NextAuth v5 (beta) for authentication (JWT strategy, Credentials provider).
- Styling with Tailwind CSS v4, custom brand colors, Radix UI primitives, `class-variance-authority`, and Lucide React for icons.
- **Brand & Design Language**: "Quiet Confidence" aesthetic (Stripe/DeepL-inspired), minimalist, spacious, data-rich. Inter font.
- **Color Palette**: Navy `#1E3A5F`, Teal `#4ECDC4`, Gold `#C9A227`, Background `#FAFBFC`.

**AI Routing & LLM Configuration System:**
- Enterprise-grade LLM routing system at `/admin/ai-config`.
- Manages AI providers (OpenAI, Anthropic, Google, Cohere, Moonshot) with encrypted credentials and connection testing.
- Defines `AiModel` entries with lifecycle statuses, quality/cost/latency tiers, capabilities, and tags.
- Routing engine (`lib/routing-engine.ts`) implements priority-based rule evaluation, scoring, fallback chains, and explainability.
- Configurable `LlmRoutingRule`s with JSON conditions (e.g., language pair, domain, client tier) and policies.
- Test console for simulating routing and visualizing rule matches.
- Monitors provider health, model lifecycles, and logs changes.

**Advanced CMS & Internationalization Architecture:**
- Locale URL routing (`/[locale]/`) via Next.js App Router for multilingual support.
- `PageMeta` DB model stores per-page, per-locale SEO metadata.
- `SiteConfig` values are designed for bilingual content, with admin interfaces supporting language-specific editing.
- Admin SEO tab provides an interface for managing metadata with character counters and live Google SERP previews.

**Key Features:**
- **Client Portal**: Dashboard, conversational order wizard (AI document analysis), project management, team management, billing, and settings.
- **Linguist Portal**: Dashboard, job feed, assignment management, earnings tracking, profile management, and notifications.
- **Side-by-side Translation Editor**: CAT editor with split source/target panels, glossary highlighting, auto-save, progress tracking, TM integration, comments, history, and RTL support.
- **Admin Panel**: Overview, project status, user management, and AI configuration.

**PDF Processing Pipeline:**
- Python 3.11 with PyMuPDF, pdfplumber, OCRmyPDF, and Pillow for extraction.
- `scripts/extract_pdf.py`: Extracts layout, text blocks, and tables; outputs `PdfStructured` JSON.
- `lib/pdf-pipeline.ts`: TypeScript wrappers for conversion to translation segments, layout HTML generation, layout-preserving PDF generation (Puppeteer), and DOCX output.
- `Document.structuredData`: Persists PyMuPDF extraction results.
- Supports 3 delivery formats: clean PDF, Word DOCX, and layout-preserving PDF.
- Preview endpoint `GET /api/jobs/[id]/preview` for in-browser HTML preview.

**API Routes (Document Processing & Translation):**
- **File Upload & Analysis**: `POST /api/upload/analyze` for PDF, DOCX, TXT processing; language and document type detection via AI.
- **Project & Job Creation**: `POST /api/projects` creates projects/jobs and initiates AI pre-translation.
- **Segment Management**: CRUD operations for translation segments and comments.
- **Job Submission**: `POST /api/jobs/[id]/submit` for submitting translations.
- **Translation Memory**: `GET /api/jobs/[id]/tm-matches` for retrieving matches.

**AI Pre-translation Pipeline:**
- Utilizes `lib/ai-translate.ts` for segment translation and document analysis.
- Leverages OpenAI-compatible APIs (Replit AI Integrations) with `gpt-5-nano`.
- Supports batch processing (3 segments per batch, concurrent within batch).
- **Document Terminology Pre-scan**: Before any LLM call is made, `buildDocTerminologyScan()` performs a zero-cost in-process scan over all segment texts. It extracts 1–4-word n-gram candidates, counts how many distinct segments each candidate appears in, filters to terms present in ≥2 segments, deduplicates sub-phrases dominated by longer phrases, and returns the top 30 by segment-frequency. These terms are injected into every segment's system prompt as a `DOCUMENT TERMINOLOGY SCAN` block — instructing the model to translate each repeated term consistently throughout the document. Requires no manual setup by the user; runs automatically on every job.
- **Sliding context window (±2 segments)**: Each segment is translated with its 2 preceding and 2 following segments as `[CONTEXT]` — improving register and terminology continuity. Table cells use same-table context; header/footer segments are translated independently.

**Notification & Communication System:**
- Five Prisma models manage notification templates, delivery, in-app notifications, user preferences, and notifications.
- Features 44 seeded templates for email and in-app notifications across 25 event keys.
- Service layer for rendering templates, sending emails (HubSpot-branded HTML, nodemailer), and in-app delivery.
- Frontend components include a `NotificationBell` and preference settings. Critical events bypass user preferences.

**Linguist Rates & Business Revenue Share:**
- `LinguistRate` table for per-word payouts and platform revenue share.
- `Job.businessShare` tracks platform revenue per job.
- Admin panel (`/admin/linguist-rates`, `/admin/finance`) for management and reporting.

**Linguist Studio (TMS Module):**
- Subscription-gated Translation Management System integrated into the Linguist Portal.
- API routes (`/api/studio/*`) handle workspaces, subscriptions, client/job CRUD, file uploads, AI draft generation, segment editing, TM, glossaries, and style guides.
- Frontend pages for promo, overview, clients, jobs, job editor, assets, TM, glossaries, and style guides.
- Uses TanStack Query v5 for data fetching.

**Localization Assets:**
- Supports project-scoped Translation Memory, Glossaries, and Style Guides.
- `GlossaryTerm.doNotTranslate` ensures terms are not translated.
- Import functionalities for TM (.tmx, .csv, .tsv, .xlsx), Glossary (.csv, .tsv, .xlsx), and Style Guides (various formats).
- AI Style Guide Generator (`POST /api/style-guides/generate`) using `gpt-5-nano`.

**WordPress Connector (AGENCY/ENTERPRISE plan gate):**
- **Prisma models**: `WordpressConnection`, `WordpressMapping`, `WordpressJob`, `WordpressJobLocale`.
- **Multilingual adapter layer** (`lib/wordpress-client.ts`):
  - `MultilingualAdapter` interface for `probe`, `listLanguages`, `listPostTypes`, `listPosts`, `getPost`, `createTranslation`.
  - Adapters for WPML and Polylang. Auto-detects active plugin.
- **Content extraction/rebuild**: `extractPostSegments()` to produce `WPSegment[]` and `rebuildPostPayload()` for inverse operation, preserving structure.
- **Delivery pipeline**: `deliverTranslationBackByJobId()` and `retranslateWordpressLocale()`.
- **API routes** under `/api/integrations/wordpress/` for connection, discovery, settings, mappings, posts, post-types, and jobs.
- **Delivery determinism**: Source snapshot (`sourceSnapshot`) at job creation time for content verification.
- **Menu item extraction**: Via `/wp/v2/menus` + `/wp/v2/menu-items` APIs.
- **Security**: HMAC-SHA256 webhook verification, SSRF guard on `siteUrl`.
- **UI**: Connection, Settings, Site Browser, and Jobs tabs in dashboard.

**AI Translation Business Context (Cento):**
- Optional `websiteUrl`, `industry`, `companyBio` fields on `Organization` and `ClientAccount` (Prisma schema).
- Edited via `/dashboard/organization` (BusinessContextCard, role-gated to CLIENT/ADMIN) and `/dashboard/clients` create/edit dialogs (with explainer copy describing why these data points improve draft quality).
- API: `PATCH /api/organization`, `POST/PATCH /api/client-accounts[/:id]`. Inputs are sanitized (control-char strip) and length-capped (URL ≤300, industry ≤120, bio ≤1500) server-side.
- Injected into LLM system prompt by `lib/ai-translate.ts` → `buildBizContextBlock` (rendered as an explicitly UNTRUSTED reference block that must not override DNT/glossary/style guide). Precedence: ClientAccount-level context wins when populated; otherwise falls back to Organization. Wired into project translation, retranslate, Contentful, and Studio draft routes.

**Stripe Billing Integration:**
- `lib/stripe.ts` — Singleton Stripe client (graceful null when key missing).
- `POST /api/billing/checkout` — Creates Stripe Checkout sessions for plan upgrades (subscription mode) and credit package purchases (payment mode). Auto-creates Stripe Customer per org and stores `stripeCustomerId`.
- `POST /api/billing/portal` — Opens Stripe Customer Portal for subscription self-service.
- `POST /api/webhooks/stripe` — Handles `checkout.session.completed` (credits or plan upgrade), `customer.subscription.updated`, and `customer.subscription.deleted` (downgrades org to STARTER). Set `STRIPE_WEBHOOK_SECRET` in Replit Secrets to enable signature verification.
- `Organization.stripeCustomerId` + `Organization.stripeSubscriptionId` added to Prisma schema.
- Billing page (`/dashboard/billing`) has live purchase buttons for plans and credit packages via `BillingActions.tsx` (client component). Shows post-checkout success/cancel banners. Includes "Manage Billing" portal button when a Stripe customer exists.

**WordPress Companion Plugin:**
- **Location**: `wordpress-plugin/contentech/` (self-contained PHP plugin).
- **Structure**: Includes API wrapper, settings, multilingual detection, editor sidebar (Gutenberg/Classic), admin column, and webhooks.
- **Functionality**: Thin API client and webhook emitter; does not write translated posts directly.
- **Distribution**: Dynamically packaged into a zip and streamed for download.

## Database Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Database** | PostgreSQL | Replit-managed (helium) | Primary relational data store |
| **Primary ORM** | Prisma Client JS | v7.4.2 | All main data models — users, jobs, projects, TM, glossary, notifications, billing |
| **Schema definition** | Prisma Schema | v7.4.2 | Declarative model definitions in `prisma/schema.prisma`; migrations via `prisma migrate` |
| **Adapter** | `@prisma/adapter-pg` | v7.4.2 | Connects Prisma to the `pg` driver |
| **Secondary ORM** | Drizzle ORM | v0.39.3 | Used for shared type-safe schemas in `shared/schema.ts` (e.g. insert/select types exposed to the frontend) |
| **Drizzle CLI** | drizzle-kit | v0.31.8 | Schema push and migration tooling for Drizzle-managed tables |
| **Schema validation** | drizzle-zod | v0.7.1 | Generates Zod schemas directly from Drizzle table definitions for API validation |
| **PostgreSQL driver** | pg (node-postgres) | v8.16.3 | Low-level PostgreSQL wire protocol driver used by both ORMs |
| **Connection** | `DATABASE_URL` env var | — | Single connection string; Replit injects it automatically |

**Key files:**
- `prisma/schema.prisma` — Prisma model definitions (source of truth for the DB schema)
- `lib/prisma.ts` — Singleton Prisma client instance
- `shared/schema.ts` — Drizzle table definitions + insert/select TypeScript types
- `drizzle.config.ts` — Drizzle CLI configuration pointing at `shared/schema.ts`
- `scripts/seed-*.ts` — Seeding scripts run automatically on every startup via `start.sh`

## External Dependencies
- **PostgreSQL**: Primary database.
- **Next.js**: Web framework.
- **Prisma ORM**: Database toolkit.
- **NextAuth.js**: Authentication library.
- **Tailwind CSS**: CSS framework.
- **Radix UI**: UI primitives.
- **Lucide React**: Icon library.
- **Google Fonts (Inter)**: Font delivery.
- **OpenAI-compatible AI APIs**: For LLM functionalities.
- **Anthropic, Google, Cohere, Moonshot**: Supported AI providers.
- **Nodemailer**: Email delivery.
- **HubSpot**: Branded email templates.
- **PyMuPDF (fitz)**: PDF text and layout extraction (Python).
- **pdfplumber**: PDF table detection (Python).
- **OCRmyPDF**: Scanned PDF OCR fallback (Python).
- **Puppeteer**: Headless Chrome for PDF rendering.
- **Mammoth.js**: DOCX parsing.
- **XLSX**: Spreadsheet parsing.
- **PDF-Parse**: PDF parsing.
- **docx**: DOCX export generation.