---
name: SegmentIssue source field
description: How to distinguish human-flagged vs automated QA issues in SegmentIssue
---

## Rule
`SegmentIssue.source` distinguishes origin:
- `"human"` (default) — flagged manually by a reviewer in the editor
- `"quality-engine"` — written by `runQualityChecks()` in `lib/quality-engine.ts`

`reviewerId` is nullable; quality-engine rows always have `reviewerId = null`.

**Why:** The audit report and issues tab both read SegmentIssue. Without the source field, human and auto issues were indistinguishable, causing the reviewer issues tab to show auto-generated noise. The issues route now filters to `source: "human"` while the QA tab reads from `/api/jobs/[id]/quality-report`.

**How to apply:**
- `GET /api/jobs/[id]/issues` → add `where: { source: "human" }` (already done)
- `GET /api/jobs/[id]/quality-report` → filters `source: "quality-engine"`
- `runQualityChecks` → `deleteMany({ jobId, source: "quality-engine" })` before re-run (idempotent)
- Audit report reads all issues (both sources) — this is intentional for completeness
