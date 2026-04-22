# Evaluation Protocol (Synthetic Data, Systems Paper)

## 1. Objective
Evaluate the implemented platform as a workflow integrity system for eDiscovery, not as an ML relevance model.

## 2. Core Claims Under Test
1. Deduplication prevents redundant storage records while preserving document lineage.
2. Privilege gate blocks non-producible documents from production sets.
3. Production lock prevents post-review mutation after state transition.
4. Audit logging captures review and access actions needed for traceability.
5. End-to-end workflow (create case -> upload -> review -> production -> export) is reproducible.

## 3. Environment and Setup
1. Backend compile: `cd server && npm run build`
2. Seed baseline users/data: `npx ts-node src/seed.ts`
3. Frontend compile: `cd ../client && npm run build`
4. Start server in separate terminal: `cd ../server && npm run dev`

## 4. Data Strategy
- Use seeded baseline (`server/src/seed.ts`) plus per-run timestamped test cases.
- Use synthetic text files for deterministic privileged and non-privileged scenarios.
- Avoid PII or real legal documents in this phase.

## 5. Experiment Matrix

### E1: Deduplication Contract
- Procedure:
  1. Compute MD5 and call duplicate-check endpoint.
  2. Upload original, then upload same file content again.
- Metrics:
  - duplicate detection rate
  - duplicate metadata linkage rate (`masterDocId` present)
- Evidence hooks:
  - `server/src/controllers/document.controller.ts:63`
  - `server/src/controllers/document.controller.ts:261`

### E2: Review and Audit Traceability
- Procedure:
  1. Fetch queue document.
  2. Submit coding.
  3. Fetch coding history.
- Metrics:
  - coding submission success rate
  - history completeness per coded document
- Evidence hooks:
  - `server/src/controllers/review.controller.ts:47`
  - `server/src/controllers/review.controller.ts:91`
  - `server/src/controllers/review.controller.ts:23`

### E3: Privilege Enforcement in Production
- Procedure:
  1. Create production set.
  2. Add non-privileged doc (expect success).
  3. Add privileged doc (expect rejection).
- Metrics:
  - privileged document block rate
  - false-allow rate
- Evidence hooks:
  - `server/src/controllers/production.controller.ts:57`
  - `server/src/controllers/production.controller.ts:61`

### E4: Production Lock Integrity
- Procedure:
  1. Submit and approve production.
  2. Attempt add/remove mutation.
- Metrics:
  - lock enforcement rate on non-DRAFT states
- Evidence hooks:
  - `server/src/middleware/authMiddleware.ts:82`
  - `server/src/controllers/production.controller.ts:49`

### E5: Analytics Contract Validity
- Procedure:
  1. Call `/api/analytics?range=7d`.
  2. Validate required JSON structure for dashboard consumption.
- Metrics:
  - response schema completeness
  - endpoint latency (p50/p95)
- Evidence hooks:
  - `server/src/controllers/analytics.controller.ts:91`
  - `client/src/pages/AnalyticsPage.tsx:87`

## 6. Output Artifacts to Save Per Run
- `verify_phase4_latest.txt`
- `verify_phase5_latest.txt`
- `verify_phase6_latest.txt`
- `analytics_contract_snapshot.json`
- Build logs for server/client

## 7. Threats to Validity (Must Report)
1. Synthetic dataset may not reflect real legal corpus complexity.
2. Case-scoped RBAC coverage is uneven in some routes.
3. Accuracy metrics in analytics are operational proxies, not legal ground-truth quality.
4. Performance depends on local environment and non-production deployment topology.

## 8. Minimum Acceptance Thresholds (Submission Gate)
- All three phase verification scripts complete without fatal API contract errors.
- E3 privileged-block rate: 100 percent on scripted privileged samples.
- E4 lock enforcement: 100 percent on scripted mutation attempts after non-DRAFT transition.
- E5 analytics endpoint returns full dashboard schema with no missing top-level keys.
