# Contentech SaaS Platform Development Prompt

## Role Definition

**Act as a Senior Full-Stack Developer and System Architect** with expertise in:
- Next.js 15 (App Router), TypeScript, React 19
- PostgreSQL with Prisma ORM
- Enterprise SaaS architecture
- AI/ML API integrations
- Real-time systems with WebSockets
- Payment processing (Stripe)
- Queue systems (BullMQ/Redis)

---

## Project Overview

Build **Contentech** — an enterprise-grade SaaS platform for multilingual content solutions. The platform serves as a hybrid translation ecosystem combining AI automation with human linguistic expertise.

**Critical Design Constraint:** The UI/UX must NOT look AI-generated. It must feel hand-crafted with a **Stripe/DeepL aesthetic** — "Quiet Confidence" through minimalist, spacious, and data-rich design.

---

## Section 1: Service Portfolio (Public Website)

### 1.1 AI Quality Assurance (MTPE 2.0) — "AI Quality Shield"

**Positioning:** The safety net for AI-generated translations.

**The Problem We Solve:**
- Companies use AI for translation speed but fear embarrassing errors, legal liabilities, and brand damage
- AI output requires human validation for accuracy, cultural appropriateness, and legal compliance

**The Service Offering:**
- Clients submit AI-generated text
- Human experts perform "Linguistic Risk Assessment"
- Verification of: Accuracy ✓ Cultural Appropriateness ✓ Legal Compliance ✓

**Business Model:** Value-based pricing (per hour/project by complexity & risk level), NOT per-word

**Page Requirements:**
- Hero section with compelling headline
- "Before/After" risk scenarios
- Pricing calculator based on risk tier
- Case study carousel
- CTA: "Get Your Free Risk Assessment"

---

### 1.2 AI Training Data Services

**Positioning:** Feeding the AI beast with human-verified data.

**The Market Opportunity:**
- LLMs require high-quality, human-verified training data
- Contentech has the asset AI companies lack: skilled linguist network

**Service Offerings:**
- **Data Annotation:** Labeling and categorization for ML datasets
- **RLHF (Reinforcement Learning from Human Feedback):** Ranking AI responses, correcting outputs
- **Code Comment Correction:** Technical documentation refinement
- **Dataset Validation:** Quality assurance for training data

**Why We Win:** Existing linguist network = ready-to-deploy workforce

**Page Requirements:**
- Technical specifications grid
- Data security certifications display
- Volume calculator
- B2B inquiry form

---

### 1.3 Contentech Human™ (Premium Human-Only Translation)

**Positioning:** "Zero AI Tolerance" — Where precision is non-negotiable.

**Target Markets:**
| Industry | Risk Factor | Our Value |
|----------|-------------|-----------|
| Legal & Patent | Single word error = millions in damages | Certified legal translators |
| Life Sciences | Mistranslation = health hazard | Medical translation specialists |
| High-End Marketing | AI fails at emotion, puns, cultural nuance | Transcreation experts |

**Key Differentiator:** Sell "Transcreation" (creative adaptation), not translation

**Page Requirements:**
- Premium visual design (gold accents)
- Industry-specific landing sections
- Certification badges
- "Request Specialist" form

---

### 1.4 Localization Engineering & Consulting

**Positioning:** Engineering-as-a-Service — Because AI can't build architecture.

**What AI Cannot Do:**
- Build software architecture for RTL languages
- Format dates/currencies correctly across locales
- Manage complex code repositories for i18n

**Service Offerings:**
- **Internationalization Audits:** Code readiness assessment
- **TMS Implementation:** Translation Management System setup
- **Complex File Format Handling:** Technical document processing
- **Consulting:** Strategic localization roadmap

**Page Requirements:**
- Technical capability matrix
- Technology stack integrations
- Case study deep-dives
- Engineering team credentials

---

### 1.5 AI Content Engine (Marketing Automation)

**Positioning:** End-to-end multilingual content generation.

**Capabilities:**
- AI-powered content creation in 100+ languages
- Marketing workflow automation
- MarTech stack integration
- Brand voice consistency enforcement

---

## Section 2: UI/UX Design System

### 2.1 Visual Identity

**Philosophy:** "Quiet Confidence" — Minimalist, spacious, data-rich

**Typography:**
```
Primary: Inter / Plus Jakarta Sans
Headings: 600-700 weight
Body: 400-500 weight
Strict hierarchy enforcement
```

**Color Palette:**
```
Primary: Deep Navy/Indigo (#1E3A5F) — Trust
Secondary: Soft Teal (#4ECDC4) — Success/Accent
Premium: Muted Gold (#C9A227) — Premium features
Neutrals: Slate grays with warm undertones
Background: Off-white (#FAFBFC)
```

### 2.2 Navigation Structure

**Mega Menu Requirements:**
- 4 service categories with icons
- Each item shows: Service Name, Motto (one-liner), Short Description
- Hover states with subtle animations
- Mobile: Slide-out drawer with accordion sections

**Menu Structure:**
```
Services ▼
├── AI Quality Shield — "Your AI Safety Net"
│   └── MTPE 2.0, Linguistic Risk Assessment
├── AI Training Data — "Fuel the AI Revolution"  
│   └── Data Annotation, RLHF, Dataset Validation
├── Contentech Human™ — "Zero AI Tolerance"
│   └── Legal, Life Sciences, Transcreation
└── Localization Engineering — "Beyond Translation"
    └── i18n Audits, TMS Management, Consulting
```

### 2.3 Layout Specifications

**Dashboard Layout:**
- Card-based modular design
- Consistent 24px grid system
- Responsive breakpoints: 640px / 768px / 1024px / 1280px

**Translation View:**
- Split-screen (Original | Translated)
- Synchronized scrolling
- Line-by-line comparison mode
- Diff highlighting

**Linguist Profile Cards:**
- Profile photo with verification badge
- Language pairs displayed
- Specialization tags
- Performance metrics (acceptance rate, avg turnaround)
- "Favorite" heart icon with animation
- "Invite to Team" button

---

## Section 3: SaaS Core Modules

### Module A: Conversational Order Wizard

**Purpose:** Chat-driven interface for order creation with intelligent context inference.

**User Flow:**

```
Step 1: Upload
└── User drags file (PDF/DOCX) into chat interface
└── Visual feedback: File preview card appears

Step 2: Intelligence Phase (AI Analysis)
└── Bot analyzes document automatically
└── Auto-detect response: 
    "I've analyzed your document. This appears to be a 
    **Legal Contract** in **English** (2,340 words)."
└── CONSTRAINT: Never ask for source language or document type

Step 3: Target Language Selection
└── Bot asks: "Which language(s) should we translate this into?"
└── Display: Language selector with flags + search
└── Support: Multiple target languages selection

Step 4: Workflow Selection
└── Bot asks: "How should we process this document?"
└── Options presented as interactive cards:
    ┌─────────────────────────────────────────────────┐
    │ 🔑 Use My Key (BYOK)                           │
    │ Connect your own API for unlimited translation  │
    └─────────────────────────────────────────────────┘
    ┌─────────────────────────────────────────────────┐
    │ 💳 Platform Credits                             │
    │ Use your credit balance: 450 credits available  │
    └─────────────────────────────────────────────────┘
    ┌─────────────────────────────────────────────────┐
    │ 👤 Human Only                                   │
    │ 100% human translation, zero AI involvement     │
    └─────────────────────────────────────────────────┘
    ┌─────────────────────────────────────────────────┐
    │ 🤖 AI + Human Review                            │
    │ AI translation with human quality verification  │
    └─────────────────────────────────────────────────┘

Step 5: API Configuration (If BYOK selected)
└── Modal popup appears:
    ┌─────────────────────────────────────────────────┐
    │ 🔧 Configure Your API                           │
    │                                                 │
    │ Provider: [OpenAI ▼] [Azure ▼] [DeepL ▼] [ModernMT ▼] │
    │                                                 │
    │ API Key: [••••••••••••••••]                     │
    │                                                 │
    │ Model: [gpt-4 ▼]                                │
    │                                                 │
    │ [✓] Save to Settings/Integrations               │
    │                                                 │
    │ [Cancel] [Connect & Continue]                   │
    └─────────────────────────────────────────────────┘
└── Save to: Settings > Integrations section

Step 6: Confirmation & Execution
└── Bot confirms: "Perfect! Starting translation to Arabic..."
└── Progress indicator with real-time status
└── Redirect to project dashboard when complete
```

**Technical Requirements:**
- WebSocket connection for real-time updates
- File upload with drag-and-drop (react-dropzone)
- Document analysis via AI (document type detection, word count, language detection)
- State persistence across browser refresh

---

### Module B: Hybrid Translation Engine

**BYOK (Bring Your Own Key) System:**

```typescript
interface APIProvider {
  id: string;
  name: 'OpenAI' | 'Azure' | 'DeepL' | 'ModernMT' | 'Google';
  models: string[];
  keyFormat: RegExp;
  endpoint: string;
}

interface UserAPIConfig {
  userId: string;
  provider: APIProvider['name'];
  apiKey: string; // Encrypted at rest
  model: string;
  createdAt: Date;
  lastUsed: Date;
}
```

**Platform Credits System:**

```typescript
interface CreditBalance {
  userId: string;
  balance: number;
  currency: 'credits';
  transactions: CreditTransaction[];
}

interface CreditTransaction {
  id: string;
  type: 'purchase' | 'usage' | 'refund' | 'bonus';
  amount: number;
  description: string;
  timestamp: Date;
  relatedProjectId?: string;
}
```

**Document Processing Pipeline:**

```
1. Upload → Validate file type/size
2. OCR Extraction → Azure Form Recognizer / Tesseract.js
3. Layout Analysis → Preserve structure, tables, formatting
4. Text Segmentation → Split into translatable units
5. Translation → Via selected engine (BYOK or Platform)
6. Layout Reconstruction → Rebuild document with translations
7. Quality Check → Optional human review trigger
8. Delivery → Download link + notification
```

**Layout Preservation Requirements:**
- Maintain exact positioning of text blocks
- Preserve tables, columns, and formatting
- Handle embedded images with text overlays
- Support RTL layout reconstruction

---

### Module C: Linguists Portal

**Terminology Enforcement:**
- NEVER use "Freelancer"
- ALWAYS use "Linguist" or "Team Member"

**Portal Access:**
- Dedicated login route: `/portal`
- Role-based dashboard
- Distinct branding from client portal

**Job Feed Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Available Jobs                          [Filter ▼] [Sort]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⭐ Preferred Job | 60:00 remaining                      │ │
│ │ Legal Contract | English → Arabic                      │ │
│ │ 2,340 words | Human Review | $85                       │ │
│ │ Client: TechCorp Inc. | Deadline: 48 hours             │ │
│ │ [View Details] [Accept] [Decline]                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Standard Job                                            │ │
│ │ Marketing Brochure | Spanish → English                 │ │
│ │ 1,200 words | MTPE | $45                               │ │
│ │ [View Details] [Accept] [Decline]                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Side-by-Side Editor:**

```
┌──────────────────────────────────────────────────────────────┐
│ Project: Legal_Contract_v2.docx    [Auto-save: ✓]            │
├─────────────────────────┬────────────────────────────────────┤
│      SOURCE (English)   │       TARGET (Arabic)              │
├─────────────────────────┼────────────────────────────────────┤
│                         │                                    │
│ The Parties agree to    │ توافق الأطراف على الشروط          │
│ the terms and conditions│ والأحكام الموضحة في هذا           │
│ set forth in this       │ ╔══════════════════════╗          │
│ Agreement.              │ ║ Glossary Term:       ║          │
│                         │ ║ "Agreement" = "اتفاقية"║          │
│ [Term highlighted]      │ ╚══════════════════════╝          │
│                         │                                    │
├─────────────────────────┴────────────────────────────────────┤
│ [📋 Glossary] [📝 TM Matches] [💬 Comments] [⏱ History]      │
│                                                              │
│ [◀ Previous] [Next ▶]     [Submit for Review] [Save Draft]  │
└──────────────────────────────────────────────────────────────┘
```

**Editor Features:**
- Track Changes with visual diff
- Glossary term highlighting (color-coded)
- Translation Memory suggestions panel
- Comment thread per segment
- Version history sidebar
- Keyboard shortcuts for efficiency

---

### Module D: Favorite Linguists & Smart Routing

**Feature Purpose:** Ensure consistency for returning clients by prioritizing trusted linguists.

#### Customer View: "My Team" Tab

```
┌─────────────────────────────────────────────────────────────┐
│ My Team                                     [+ Invite Linguist] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ FAVORITES (3)                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │   [Photo]   │ │   [Photo]   │ │   [Photo]   │           │
│ │ Sarah Ahmed │ │ Marcus Chen │ │ Elena Ruiz  │           │
│ │ ❤️ Favorited│ │ ❤️ Favorited│ │ ❤️ Favorited│           │
│ │ EN→AR, FR   │ │ ZH→EN, JA   │ │ ES→EN, PT   │           │
│ │ ⭐ 4.9/5    │ │ ⭐ 4.8/5    │ │ ⭐ 5.0/5    │           │
│ │ [Remove]    │ │ [Remove]    │ │ [Remove]    │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│ PREVIOUSLY WORKED WITH (5)                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │   [Photo]   │ │   [Photo]   │ │   [Photo]   │           │
│ │ John Smith  │ │ Yuki Tanaka │ │ ...         │           │
│ │ 🤍 Add      │ │ 🤍 Add      │ │             │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│ [View All Linguists]                                        │
└─────────────────────────────────────────────────────────────┘
```

**Invite Linguist Modal:**
```
┌─────────────────────────────────────────────────────────────┐
│ Invite Your Linguist                              [✕]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Bring your trusted translators to Contentech!              │
│                                                             │
│ Linguist Name:                                              │
│ [________________________________]                          │
│                                                             │
│ Email Address:                                              │
│ [________________________________]                          │
│                                                             │
│ Language Pairs:                                             │
│ [English ▼] → [Arabic ▼]  [+ Add Another]                  │
│                                                             │
│ Specialization:                                             │
│ [☑] Legal  [☑] Technical  [ ] Marketing  [ ] Medical       │
│                                                             │
│ Personal Note (optional):                                   │
│ [________________________________]                          │
│ [________________________________]                          │
│                                                             │
│ [Cancel]                        [Send Invitation]          │
└─────────────────────────────────────────────────────────────┘
```

#### Smart Routing Backend Logic

```typescript
interface SmartRoutingConfig {
  exclusiveWindowMinutes: 60;
  notificationChannels: ['email', 'in-app', 'push'];
  fallbackBehavior: 'public_pool';
}

interface RoutingJob {
  projectId: string;
  customerId: string;
  sourceLanguage: string;
  targetLanguage: string;
  specializations?: string[];
  createdAt: Date;
  status: 'pending_favorites' | 'public_pool' | 'accepted' | 'completed';
}

// Routing Algorithm Pseudocode
async function routeToLinguists(job: RoutingJob): Promise<void> {
  // Step 1: Find matching favorite linguists
  const favorites = await getFavoriteLinguists({
    customerId: job.customerId,
    targetLanguage: job.targetLanguage,
    sourceLanguage: job.sourceLanguage,
  });

  if (favorites.length > 0) {
    // Step 2: Create exclusive window
    job.status = 'pending_favorites';
    await notifyLinguists(favorites, {
      type: 'preferred_job',
      urgency: 'high',
      exclusiveUntil: addMinutes(new Date(), 60),
    });

    // Step 3: Queue the fallback
    await queueJob({
      queue: 'routing-fallback',
      data: { jobId: job.id },
      delay: 60 * 60 * 1000, // 60 minutes
    });
  } else {
    // No favorites - go directly to public pool
    await releaseToPublicPool(job);
  }
}

async function releaseToPublicPool(job: RoutingJob): Promise<void> {
  job.status = 'public_pool';
  const allMatchingLinguists = await findLinguistsByLanguagePair({
    sourceLanguage: job.sourceLanguage,
    targetLanguage: job.targetLanguage,
  });
  await notifyLinguists(allMatchingLinguists, { type: 'new_job' });
}
```

**Notification System:**
```typescript
interface LinguistNotification {
  id: string;
  linguistId: string;
  type: 'preferred_job' | 'new_job' | 'deadline_reminder' | 'payment';
  title: string;
  message: string;
  data: {
    projectId: string;
    exclusiveUntil?: Date;
  };
  channels: ('email' | 'in-app' | 'push')[];
  read: boolean;
  createdAt: Date;
}
```

---

### Module E: Global Admin Panel

**Access Route:** `/admin` (protected by admin role)

**Dashboard Overview:**
```
┌─────────────────────────────────────────────────────────────┐
│ Admin Dashboard                          [Admin: John Doe ▼] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │ 👥 1,234 │ │ 📝 892   │ │ 💰 $45K  │ │ ⭐ 4.8   │       │
│ │ Users    │ │ Active   │ │ MRR      │ │ Avg Rat- │       │
│ │ +12%     │ │ Projects │ │ +8%      │ │ ing      │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│ [User Management] [Linguists] [Routing Monitor] [Finance]  │
└─────────────────────────────────────────────────────────────┘
```

**User Management:**
```
┌─────────────────────────────────────────────────────────────┐
│ User Management                              [+ Add User]   │
├─────────────────────────────────────────────────────────────┤
│ Search: [________________] [Role ▼] [Status ▼] [Export]    │
├─────────────────────────────────────────────────────────────┤
│ User         │ Org          │ Tier      │ Credits │ Status │
├─────────────────────────────────────────────────────────────┤
│ jane@acme.co │ Acme Corp    │ Pro       │ 450     │ Active │
│ bob@tech.io  │ TechStart    │ Starter   │ 0       │ Active │
│ sarah@lg.com │ LG Group     │ Enterprise│ ∞       │ Active │
└─────────────────────────────────────────────────────────────┘
```

**Linguist Management:**
```
┌─────────────────────────────────────────────────────────────┐
│ Linguist Management                        [+ Invite Linguist] │
├─────────────────────────────────────────────────────────────┤
│ Name        │ Languages  │ Status    │ Accept Rate │ Rating │
├─────────────────────────────────────────────────────────────┤
│ Sarah Ahmed │ EN→AR,FR   │ ✓ Verified│ 94%         │ 4.9    │
│ Marcus Chen │ ZH→EN,JA   │ ⏳ Pending│ 87%         │ 4.8    │
│ Elena Ruiz  │ ES→EN,PT   │ ✓ Verified│ 91%         │ 5.0    │
└─────────────────────────────────────────────────────────────┘
```

**Routing Monitor:**
```
┌─────────────────────────────────────────────────────────────┐
│ Routing Monitor (Live)                      [Refresh: ON]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Jobs in Exclusive Window: 12                               │
│ Jobs in Public Pool: 34                                    │
│ Average Time to Accept: 23 minutes                         │
│                                                             │
│ RECENT ROUTING LOGS                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ #4521 | EN→AR | Acme Corp | Released to pool (timeout) │ │
│ │        Exclusive: 60 min | No favorites available       │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ #4520 | ES→EN | TechInc | Accepted by favorite         │ │
│ │        Exclusive: 12 min | Sarah Ahmed                  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Finance Dashboard:**
```
┌─────────────────────────────────────────────────────────────┐
│ Finance Dashboard                          [Export Report]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ REVENUE                     EXPENSES                       │
│ ┌────────────────────┐     ┌────────────────────┐         │
│ │ Subscriptions: $25K│     │ API Costs: $8K     │         │
│ │ Credits: $15K      │     │ Payouts: $18K      │         │
│ │ Services: $5K      │     │ Operations: $2K    │         │
│ └────────────────────┘     └────────────────────┘         │
│                                                             │
│ PENDING PAYOUTS                                             │
│ Linguist       │ Amount  │ Period        │ [Approve]       │
│ Sarah Ahmed    │ $1,250  │ Mar 1-15      │ [✓] [Export]    │
│ Marcus Chen    │ $890    │ Mar 1-15      │ [✓] [Export]    │
└─────────────────────────────────────────────────────────────┘
```

---

### Module F: Translation Memory & Glossary Hub

**Purpose:** Reduce cost, improve consistency, increase retention

**Database Schema:**

```typescript
interface TranslationMemory {
  id: string;
  organizationId: string;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  entries: TMEntry[];
  createdAt: Date;
  updatedAt: Date;
}

interface TMEntry {
  id: string;
  tmId: string;
  sourceText: string;
  targetText: string;
  context?: string;
  createdBy: 'human' | 'ai';
  confidence: number;
  usageCount: number;
  lastUsed: Date;
  createdAt: Date;
}

interface Glossary {
  id: string;
  organizationId: string;
  name: string;
  languages: string[]; // Supported languages
  terms: GlossaryTerm[];
  createdAt: Date;
  updatedAt: Date;
}

interface GlossaryTerm {
  id: string;
  glossaryId: string;
  term: string;
  translations: {
    [languageCode: string]: string;
  };
  definition?: string;
  notes?: string;
  caseSensitive: boolean;
  doNotTranslate: boolean;
  createdAt: Date;
}
```

**Client Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│ TM & Glossary Hub                      [+ Import] [+ Create]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ TRANSLATION MEMORIES                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Legal TM (EN→AR)     │ 2,450 entries │ Last updated: 2d │ │
│ │ Marketing TM (EN→ES) │ 1,200 entries │ Last updated: 5d │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ GLOSSARIES                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Brand Terms        │ 85 terms  │ EN, AR, ES, FR, ZH    │ │
│ │ Product Names      │ 34 terms  │ EN, AR                │ │
│ │ Legal Terminology  │ 156 terms │ EN, AR, FR            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [View All] [Import TMX] [Import CSV] [Export All]          │
└─────────────────────────────────────────────────────────────┘
```

**Glossary Editor:**

```
┌─────────────────────────────────────────────────────────────┐
│ Glossary: Brand Terms                              [Edit]   │
├─────────────────────────────────────────────────────────────┤
│ Term         │ English      │ Arabic      │ Spanish       │
├─────────────────────────────────────────────────────────────┤
│ Contentech   │ Contentech   │ كونتينتك    │ Contentech    │
│ MTPE         │ MTPE         │ MTPE        │ MTPE          │
│ [Add Term]                                                  │
└─────────────────────────────────────────────────────────────┘
```

**Linguist Editor Integration:**
- Glossary terms highlighted in yellow
- Hover tooltip shows approved translation
- Click to insert approved term
- Warning if non-approved term used

**AI Governance:**
```typescript
interface AITranslationConfig {
  projectId: string;
  tmIds: string[]; // TMs to use for fuzzy matching
  glossaryIds: string[]; // Glossaries to enforce
  tmThreshold: number; // Minimum match percentage (default: 75%)
  enforceGlossary: boolean; // Override AI output with glossary terms
}

// AI prompt enhancement
function enhancePrompt(sourceText: string, config: AITranslationConfig): string {
  const glossaryTerms = getRelevantGlossaryTerms(sourceText, config.glossaryIds);
  const tmMatches = findTMMatches(sourceText, config.tmIds, config.tmThreshold);
  
  return `
    Translate the following text.
    
    CRITICAL GLOSSARY TERMS (use exactly as specified):
    ${glossaryTerms.map(t => `"${t.term}" → "${t.translation}"`).join('\n')}
    
    SIMILAR TRANSLATIONS FOR REFERENCE:
    ${tmMatches.map(m => `"${m.source}" → "${m.target}" (${m.match}% match)`).join('\n')}
    
    Text to translate:
    ${sourceText}
  `;
}
```

---

### Module G: Users, Roles, and Teams

**Organization Structure:**

```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: 'starter' | 'professional' | 'enterprise';
  credits: number;
  creditsUsed: number;
  billingEmail: string;
  stripeCustomerId?: string;
  createdAt: Date;
  settings: OrganizationSettings;
}

interface OrganizationSettings {
  defaultSourceLanguage: string;
  allowedTargetLanguages: string[];
  preferredLinguists: string[];
  notifications: NotificationSettings;
  branding?: {
    logo?: string;
    primaryColor?: string;
  };
}

interface Team {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  members: TeamMember[];
  createdAt: Date;
}

interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: 'admin' | 'project_manager' | 'linguist';
  joinedAt: Date;
  invitedBy: string;
}

interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  organizationId: string;
  teams: string[];
  role: 'admin' | 'project_manager' | 'linguist';
  emailVerified: boolean;
  createdAt: Date;
  lastLogin: Date;
  preferences: UserPreferences;
}

// Linguist-specific profile
interface LinguistProfile {
  userId: string;
  bio: string;
  languages: LanguagePair[];
  specializations: string[];
  certifications: Certification[];
  availability: 'available' | 'limited' | 'unavailable';
  acceptanceRate: number;
  averageRating: number;
  totalProjects: number;
  hourlyRate?: number;
  perWordRate?: number;
  verified: boolean;
  verifiedAt?: Date;
}

interface LanguagePair {
  sourceLanguage: string;
  targetLanguage: string;
  proficiency: 'native' | 'fluent' | 'professional';
}
```

**RBAC Permission Matrix:**

| Permission | Admin | Project Manager | Linguist |
|------------|-------|-----------------|----------|
| View all projects | ✓ | ✗ | ✗ |
| Create projects | ✓ | ✓ | ✗ |
| View own projects | ✓ | ✓ | ✓ |
| Edit organization settings | ✓ | ✗ | ✗ |
| Invite team members | ✓ | ✓ | ✗ |
| Manage billing | ✓ | ✗ | ✗ |
| Access linguist portal | ✗ | ✗ | ✓ |
| Accept/reject jobs | ✗ | ✗ | ✓ |
| Submit translations | ✗ | ✗ | ✓ |
| View TM/Glossary | ✓ | ✓ | Assigned only |
| Edit TM/Glossary | ✓ | ✓ | ✗ |

**Team Management Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│ Team Settings                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ORGANIZATION: Acme Corp                                     │
│ Plan: Professional ($49/mo)            [Upgrade Plan]       │
│                                                             │
│ TEAMS                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Marketing Team (3 members)                   [Edit]     │ │
│ │ Legal Team (2 members)                        [Edit]     │ │
│ │ [+ Create New Team]                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ MEMBERS                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Jane Doe    │ jane@acme.com    │ Admin    │ [Remove]    │ │
│ │ Bob Smith   │ bob@acme.com     │ PM       │ [Remove]    │ │
│ │ Sarah Ahmed │ sarah@ling.com   │ Linguist │ [Remove]    │ │
│ │ [+ Invite Member]                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Section 4: Database Schema

### Core Tables

```sql
-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  tier VARCHAR(20) DEFAULT 'starter',
  credits INTEGER DEFAULT 0,
  stripe_customer_id VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR(20) DEFAULT 'project_manager',
  email_verified BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Team Members (Join Table)
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  team_id UUID REFERENCES teams(id) NOT NULL,
  role VARCHAR(20) NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- Linguist Profiles
CREATE TABLE linguist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  bio TEXT,
  availability VARCHAR(20) DEFAULT 'available',
  acceptance_rate DECIMAL(5,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_projects INTEGER DEFAULT 0,
  hourly_rate DECIMAL(10,2),
  per_word_rate DECIMAL(10,4),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  specializations TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Language Pairs for Linguists
CREATE TABLE linguist_language_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linguist_profile_id UUID REFERENCES linguist_profiles(id) NOT NULL,
  source_language VARCHAR(10) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  proficiency VARCHAR(20) DEFAULT 'professional',
  UNIQUE(linguist_profile_id, source_language, target_language)
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  source_language VARCHAR(10) NOT NULL,
  target_languages TEXT[] NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  workflow_type VARCHAR(20) NOT NULL, -- 'byok', 'credits', 'human_only', 'ai_review'
  word_count INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  original_file_url TEXT NOT NULL,
  translated_file_url TEXT,
  file_type VARCHAR(20) NOT NULL,
  word_count INTEGER DEFAULT 0,
  processing_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Translation Segments
CREATE TABLE translation_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) NOT NULL,
  segment_index INTEGER NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  assigned_linguist_id UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(document_id, segment_index)
);

-- Jobs (for Linguist Portal)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  linguist_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'available', -- 'available', 'exclusive', 'accepted', 'in_progress', 'completed', 'cancelled'
  exclusive_until TIMESTAMP,
  source_language VARCHAR(10) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  word_count INTEGER NOT NULL,
  payout_amount DECIMAL(10,2),
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Favorite Linguists (Join Table)
CREATE TABLE user_favorite_linguists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id) NOT NULL,
  linguist_id UUID REFERENCES users(id) NOT NULL,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, linguist_id)
);

-- Translation Memories
CREATE TABLE translation_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name VARCHAR(100) NOT NULL,
  source_language VARCHAR(10) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  entry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TM Entries
CREATE TABLE tm_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tm_id UUID REFERENCES translation_memories(id) NOT NULL,
  source_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  context TEXT,
  created_by VARCHAR(20) DEFAULT 'human',
  confidence DECIMAL(5,2) DEFAULT 1.0,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Glossaries
CREATE TABLE glossaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name VARCHAR(100) NOT NULL,
  languages TEXT[] NOT NULL,
  term_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Glossary Terms
CREATE TABLE glossary_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  glossary_id UUID REFERENCES glossaries(id) NOT NULL,
  term VARCHAR(255) NOT NULL,
  translations JSONB NOT NULL, -- {"en": "term", "ar": "مصطلح", "es": "término"}
  definition TEXT,
  notes TEXT,
  case_sensitive BOOLEAN DEFAULT FALSE,
  do_not_translate BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API Configurations (BYOK)
CREATE TABLE api_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'openai', 'azure', 'deepl', 'modernmt'
  api_key_encrypted TEXT NOT NULL,
  model VARCHAR(100),
  endpoint VARCHAR(255),
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Credit Transactions
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus'
  amount INTEGER NOT NULL,
  description TEXT,
  related_project_id UUID REFERENCES projects(id),
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Routing Logs (Admin)
CREATE TABLE routing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'exclusive_release', 'pool_release', 'accepted'
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX idx_projects_organization ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_jobs_linguist ON jobs(linguist_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_exclusive ON jobs(exclusive_until) WHERE status = 'exclusive';
CREATE INDEX idx_tm_entries_source ON tm_entries(source_text);
CREATE INDEX idx_tm_entries_tm ON tm_entries(tm_id);
CREATE INDEX idx_glossary_terms_term ON glossary_terms(term);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_favorite_linguists_customer ON user_favorite_linguists(customer_id);
CREATE INDEX idx_favorite_linguists_linguist ON user_favorite_linguists(linguist_id);
```

---

## Section 5: API Endpoints

### Authentication
```
POST   /api/auth/register          - Register new user/org
POST   /api/auth/login             - User login
POST   /api/auth/logout            - User logout
POST   /api/auth/refresh           - Refresh tokens
POST   /api/auth/forgot-password   - Request password reset
POST   /api/auth/reset-password    - Reset password
GET    /api/auth/me                - Get current user
```

### Organizations
```
GET    /api/organizations/:id              - Get organization
PATCH  /api/organizations/:id              - Update organization
GET    /api/organizations/:id/usage        - Get usage statistics
GET    /api/organizations/:id/billing      - Get billing info
```

### Projects
```
GET    /api/projects                       - List projects (filtered by user role)
POST   /api/projects                       - Create new project
GET    /api/projects/:id                   - Get project details
PATCH  /api/projects/:id                   - Update project
DELETE /api/projects/:id                   - Delete project
POST   /api/projects/:id/documents         - Upload document
GET    /api/projects/:id/documents         - List documents
GET    /api/projects/:id/download          - Download translated files
```

### Translation Engine
```
POST   /api/translate/analyze              - Analyze document (detect language, type, word count)
POST   /api/translate/process              - Start translation
GET    /api/translate/status/:jobId        - Check translation status
POST   /api/translate/byok                 - Translate using user's API key
POST   /api/translate/credits              - Translate using platform credits
```

### Conversational Wizard
```
WebSocket /api/wizard                      - WebSocket connection for chat wizard
POST   /api/wizard/upload                  - Upload file for analysis
POST   /api/wizard/confirm                 - Confirm and start translation
```

### Linguist Portal
```
GET    /api/linguist/jobs                  - List available jobs
POST   /api/linguist/jobs/:id/accept       - Accept a job
POST   /api/linguist/jobs/:id/decline      - Decline a job
GET    /api/linguist/jobs/:id              - Get job details
GET    /api/linguist/jobs/:id/segments     - Get segments for editing
PATCH  /api/linguist/segments/:id          - Update segment translation
POST   /api/linguist/jobs/:id/submit       - Submit completed work
GET    /api/linguist/profile               - Get linguist profile
PATCH  /api/linguist/profile               - Update linguist profile
GET    /api/linguist/earnings              - Get earnings summary
```

### Favorites & Team
```
GET    /api/team/favorites                 - List favorite linguists
POST   /api/team/favorites                 - Add favorite linguist
DELETE /api/team/favorites/:id             - Remove favorite
GET    /api/team/history                   - List previously worked linguists
POST   /api/team/invite                    - Invite new linguist
GET    /api/team/members                   - List team members
POST   /api/team/members                   - Add team member
DELETE /api/team/members/:id               - Remove team member
```

### Translation Memory
```
GET    /api/tm                             - List translation memories
POST   /api/tm                             - Create TM
GET    /api/tm/:id                         - Get TM details
DELETE /api/tm/:id                         - Delete TM
POST   /api/tm/:id/import                  - Import TMX file
GET    /api/tm/:id/export                  - Export as TMX
POST   /api/tm/:id/entries                 - Add entry
GET    /api/tm/:id/entries                 - List entries
PATCH  /api/tm/entries/:id                 - Update entry
DELETE /api/tm/entries/:id                 - Delete entry
POST   /api/tm/lookup                      - Lookup matches for text
```

### Glossary
```
GET    /api/glossaries                     - List glossaries
POST   /api/glossaries                     - Create glossary
GET    /api/glossaries/:id                 - Get glossary details
DELETE /api/glossaries/:id                 - Delete glossary
POST   /api/glossaries/:id/import          - Import CSV file
GET    /api/glossaries/:id/export          - Export as CSV
POST   /api/glossaries/:id/terms           - Add term
GET    /api/glossaries/:id/terms           - List terms
PATCH  /api/glossaries/terms/:id           - Update term
DELETE /api/glossaries/terms/:id           - Delete term
POST   /api/glossaries/lookup              - Lookup terms in text
```

### API Configuration (BYOK)
```
GET    /api/integrations                   - List user's API configs
POST   /api/integrations                   - Add API configuration
PATCH  /api/integrations/:id               - Update configuration
DELETE /api/integrations/:id               - Delete configuration
POST   /api/integrations/:id/test          - Test API connection
```

### Credits & Billing
```
GET    /api/credits/balance                - Get credit balance
GET    /api/credits/transactions           - List transactions
POST   /api/credits/purchase               - Purchase credits
GET    /api/billing/invoices               - List invoices
GET    /api/billing/subscription           - Get subscription details
POST   /api/billing/subscription           - Create/update subscription
DELETE /api/billing/subscription           - Cancel subscription
```

### Admin
```
GET    /api/admin/users                    - List all users
GET    /api/admin/users/:id                - Get user details
PATCH  /api/admin/users/:id                - Update user
DELETE /api/admin/users/:id                - Delete user
GET    /api/admin/linguists                - List all linguists
POST   /api/admin/linguists/:id/verify     - Verify linguist
GET    /api/admin/routing                  - Get routing logs
GET    /api/admin/routing/stats            - Routing statistics
GET    /api/admin/finance                  - Financial dashboard
GET    /api/admin/finance/payouts          - List pending payouts
POST   /api/admin/finance/payouts/:id      - Process payout
GET    /api/admin/analytics                - Platform analytics
```

### Notifications
```
GET    /api/notifications                  - List notifications
PATCH  /api/notifications/:id/read         - Mark as read
POST   /api/notifications/read-all         - Mark all as read
```

---

## Section 6: Pricing Implementation

### Tier Configuration

```typescript
interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number;
  features: TierFeature[];
  limits: TierLimits;
}

interface TierFeature {
  key: string;
  name: string;
  included: boolean;
  limit?: number;
}

interface TierLimits {
  documentsPerMonth: number | 'unlimited';
  teamMembers: number | 'unlimited';
  tmStorage: number; // MB
  glossaryTerms: number;
  prioritySupport: boolean;
  dedicatedManager: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 0,
    features: [
      { key: 'byok', name: 'BYOK Translation', included: true },
      { key: 'credits', name: 'Platform Credits', included: false },
      { key: 'favorites', name: 'Favorite Linguists', included: false },
      { key: 'tm', name: 'Translation Memory', included: true, limit: 1 },
      { key: 'glossary', name: 'Glossary', included: true, limit: 100 },
      { key: 'support', name: 'Support', included: true },
      { key: 'priority_support', name: 'Priority Support', included: false },
    ],
    limits: {
      documentsPerMonth: 10,
      teamMembers: 1,
      tmStorage: 10,
      glossaryTerms: 100,
      prioritySupport: false,
      dedicatedManager: false,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 49,
    features: [
      { key: 'byok', name: 'BYOK Translation', included: true },
      { key: 'credits', name: 'Platform Credits', included: true, limit: 500 },
      { key: 'favorites', name: 'Favorite Linguists', included: true },
      { key: 'tm', name: 'Translation Memory', included: true, limit: 5 },
      { key: 'glossary', name: 'Glossary', included: true, limit: 1000 },
      { key: 'support', name: 'Support', included: true },
      { key: 'priority_support', name: 'Priority Support', included: true },
    ],
    limits: {
      documentsPerMonth: 'unlimited',
      teamMembers: 10,
      tmStorage: 100,
      glossaryTerms: 1000,
      prioritySupport: true,
      dedicatedManager: false,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0, // Custom pricing
    features: [
      { key: 'byok', name: 'BYOK Translation', included: true },
      { key: 'credits', name: 'Platform Credits', included: true, limit: 'custom' },
      { key: 'favorites', name: 'Favorite Linguists', included: true },
      { key: 'tm', name: 'Translation Memory', included: true, limit: 'unlimited' },
      { key: 'glossary', name: 'Glossary', included: true, limit: 'unlimited' },
      { key: 'support', name: '24/7 Support', included: true },
      { key: 'priority_support', name: 'Priority Support', included: true },
      { key: 'dedicated_manager', name: 'Dedicated Account Manager', included: true },
      { key: 'custom_sla', name: 'Custom SLA', included: true },
      { key: 'sso', name: 'SSO/SAML', included: true },
      { key: 'api_access', name: 'API Access', included: true },
    ],
    limits: {
      documentsPerMonth: 'unlimited',
      teamMembers: 'unlimited',
      tmStorage: 'unlimited',
      glossaryTerms: 'unlimited',
      prioritySupport: true,
      dedicatedManager: true,
    },
  },
];
```

### Credit Pricing

```typescript
const CREDIT_PACKS = [
  { credits: 500, price: 29, bonus: 0 },
  { credits: 1500, price: 79, bonus: 150 }, // 10% bonus
  { credits: 5000, price: 249, bonus: 750 }, // 15% bonus
  { credits: 15000, price: 699, bonus: 3000 }, // 20% bonus
];

// Credit consumption rates
const CREDIT_RATES = {
  ai_translation: 1, // per 100 words
  human_review: 3, // per 100 words (adds to AI cost)
  human_only: 8, // per 100 words
  tm_match_discount: 0.5, // 50% discount for TM matches
};
```

---

## Section 7: Technical Implementation Notes

### Queue System (Job Routing)

```typescript
// Using BullMQ for job queues
import { Queue, Worker } from 'bullmq';

// Queue for routing fallback
const routingQueue = new Queue('routing-fallback', {
  connection: redis,
});

// Worker to handle expired exclusive windows
const routingWorker = new Worker(
  'routing-fallback',
  async (job) => {
    const { jobId } = job.data;
    const jobRecord = await getJob(jobId);
    
    if (jobRecord.status === 'exclusive') {
      // No linguist accepted within 60 mins
      await releaseToPublicPool(jobId);
      await logRoutingAction(jobId, 'pool_release', {
        reason: 'exclusive_window_expired',
      });
    }
  },
  { connection: redis }
);
```

### Real-time Notifications

```typescript
// WebSocket server for real-time updates
import { Server } from 'socket.io';

io.on('connection', (socket) => {
  socket.on('join', ({ userId, role }) => {
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);
  });
});

// Notify linguists of new job
function notifyLinguists(linguistIds: string[], job: Job) {
  linguistIds.forEach((id) => {
    io.to(`user:${id}`).emit('new_job', {
      jobId: job.id,
      type: job.isPreferred ? 'preferred' : 'standard',
      exclusiveUntil: job.exclusiveUntil,
    });
  });
}
```

### Document Processing

```typescript
// PDF/DOCX processing pipeline
import { PDFExtract } from 'pdf.js-extract';
import mammoth from 'mammoth';

async function processDocument(file: Buffer, type: string): Promise<ProcessedDocument> {
  let segments: Segment[] = [];
  
  if (type === 'pdf') {
    const pdfExtract = new PDFExtract();
    const data = await pdfExtract.extractBuffer(file);
    segments = extractSegmentsFromPDF(data);
  } else if (type === 'docx') {
    const result = await mammoth.extractRawText({ buffer: file });
    segments = extractSegmentsFromText(result.value);
  }
  
  return {
    segments,
    wordCount: segments.reduce((sum, s) => sum + countWords(s.text), 0),
    layout: extractLayout(file, type),
  };
}
```

---

## Section 8: Deliverables Checklist

### Frontend
- [ ] Landing page with 4 service sections (mega menu)
- [ ] Authentication flows (login, register, password reset)
- [ ] Dashboard with project overview
- [ ] Conversational Order Wizard (chat interface)
- [ ] Document upload with drag-and-drop
- [ ] Translation view (split-screen editor)
- [ ] "My Team" / Favorites management
- [ ] Translation Memory management interface
- [ ] Glossary management interface
- [ ] Team settings and member management
- [ ] Billing and subscription management
- [ ] Notification center

### Linguist Portal
- [ ] Dedicated login flow
- [ ] Job feed with filters
- [ ] Side-by-side translation editor
- [ ] Track Changes functionality
- [ ] Glossary term highlighting
- [ ] TM suggestions panel
- [ ] Comment system
- [ ] Profile management
- [ ] Earnings dashboard

### Admin Panel
- [ ] User management
- [ ] Linguist verification workflow
- [ ] Routing monitor (live)
- [ ] Financial dashboard
- [ ] Payout management
- [ ] Platform analytics

### Backend
- [ ] Authentication API (JWT)
- [ ] RBAC middleware
- [ ] Project CRUD operations
- [ ] Document processing pipeline
- [ ] Translation engine integration
- [ ] BYOK API handling
- [ ] Credits system
- [ ] Smart routing algorithm
- [ ] Queue system (BullMQ)
- [ ] WebSocket notifications
- [ ] TM/Glossary lookup API
- [ ] Stripe integration
- [ ] Admin endpoints

### Database
- [ ] PostgreSQL schema setup
- [ ] Prisma models
- [ ] Migrations
- [ ] Seed data for testing

---

## Section 9: Success Criteria

1. **Performance**: Page load < 2s, API response < 200ms
2. **Scalability**: Support 10,000 concurrent users
3. **Reliability**: 99.9% uptime for translation services
4. **Security**: SOC 2 Type II compliant, encrypted API keys
5. **UX**: Lighthouse score > 90, WCAG 2.1 AA compliant
6. **Design**: Pass "AI-generated" visual test with target users

---

**Build this platform with production-ready code, not prototypes. Every component should feel intentional and polished.**
