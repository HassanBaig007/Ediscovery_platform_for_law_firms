# Auditable Workflow Integrity in a Full-Stack eDiscovery Platform: Implementation-Accurate IEEE Systems Manuscript

**Abstract-**This paper delivers a comprehensive, implementation-grounded systems study of an eDiscovery platform designed for legal document ingestion, coding review, and production governance. The analysis is intentionally evidence-driven: every major claim is anchored to source code, route/controller/schema behavior, current runtime verification artifacts, and reproducibility checks executed during this study window (March 2026). The platform uses a React-Vite frontend and an Express-MongoDB backend with shared TypeScript domain contracts. Verified strengths include deterministic case-scoped MD5 deduplication, coding history reconstruction through audit events, privilege-based production exclusion, and production mutation locks beyond DRAFT state. The study also identifies high-impact governance gaps, including uneven case-scoped authorization enforcement, route-order drift affecting one duplicate-check endpoint variant, and selected policy/implementation mismatches. Scripted phase validations (`verify_phase4_latest.txt`, `verify_phase5_latest.txt`, `verify_phase6_latest.txt`) and a dedicated runtime proof artifact (`runtime-proof-2026-03-06.md`) confirm end-to-end behavior for review, search/export, and production controls under seeded synthetic data. The manuscript positions the project as a practical systems-engineering contribution focused on defensibility, traceability, and reproducibility rather than machine-learning novelty.

**Index Terms-**eDiscovery, legal workflow systems, workflow integrity, auditability, role-based access control, production-state machine, reproducibility, full-stack engineering.

## I. INTRODUCTION
Legal discovery operations require systems that are correct under policy, not merely feature-complete. In this domain, defects in authorization, traceability, or production handling can invalidate legal workflows even when the user interface appears functional. Consequently, a rigorous systems paper must describe not only architecture and APIs but also enforcement boundaries, verified behavior, and known drift.

This manuscript analyzes an eDiscovery platform implemented in the `ediscovery-platform` workspace. The system supports case/team workflows, custodian management, document upload and deduplication, coding review, advanced search with saved filters, production set lifecycle operations, analytics, notifications, and audit logs.

From a research-method perspective, the goal is not to claim the system is flawless. The goal is to establish a defensible truth boundary: what is definitely implemented and reproducible today, what is partially implemented, and what remains an explicit hardening item. This distinction is central for publication quality in engineering domains where practical correctness matters more than purely theoretical novelty.

The paper contributes in five ways.
1. It provides a code-accurate architecture and data-model characterization across backend, frontend, and shared contracts.
2. It formalizes workflow correctness properties (ingestion lineage, review sequencing, production-state invariants) and tests their implementation status.
3. It reports fresh runtime proofs generated from phase verification scripts and ad hoc API checks.
4. It distinguishes verified controls from governance-critical gaps, reducing over-claim risk.
5. It supplies an explicit reproducibility protocol suitable for engineering publication and independent reruns.

## II. PROBLEM DEFINITION AND SYSTEM REQUIREMENTS
### A. Operational Problem
The platform addresses litigation document operations where teams must reliably answer:
1. Which documents were collected and by whom.
2. Whether duplicates were handled without losing lineage.
3. What coding decisions were made and by which reviewer.
4. Which documents were allowed into production and under what constraints.
5. Whether production artifacts preserve stable identifiers and auditability.

### B. Requirement Classes
To evaluate the implementation with publication-grade rigor, requirements are grouped into four classes.

1. Functional Workflow Requirements
- FR1: Case and team management must support role-aware collaboration.
- FR2: Upload workflows must persist metadata and binary references.
- FR3: Review workflows must support queue retrieval and coding persistence.
- FR4: Production workflows must support controlled state transitions and export.

2. Integrity Requirements
- IR1: Duplicate ingestion must preserve lineage links to master content.
- IR2: Coding decisions must be reconstructable from append-only records.
- IR3: Privileged documents must be blocked from production inclusion.
- IR4: Production sets outside DRAFT must reject mutation.

3. Governance Requirements
- GR1: Protected routes must enforce authentication.
- GR2: Role constraints should align with documented policy matrices.
- GR3: Case-scoped access should prevent cross-case document exposure.

4. Reproducibility Requirements
- RR1: System should compile in current environment.
- RR2: Verification scripts should execute deterministically with seeded credentials.
- RR3: Claims should be traceable to code and runtime artifacts.

### C. Evaluation Questions
The study is organized around six evaluation questions.
1. EQ1: Does the platform implement end-to-end legal workflow stages from ingestion through production export?
2. EQ2: Are lineage-critical operations (deduplication and Bates assignment) implemented with stable identifiers?
3. EQ3: Can coding decisions and reviewer actions be reconstructed through audit artifacts?
4. EQ4: Are policy controls for privilege and production lock behavior enforced at runtime?
5. EQ5: Are route-level and controller-level authorization constraints aligned with documented role policy?
6. EQ6: Can an independent engineer reproduce outcomes using seed/build/verify commands?

These evaluation questions map directly to the claim matrix in Section IX.

## III. EVIDENCE METHODOLOGY
### A. Evidence Sources
This manuscript uses a layered evidence model.

1. Source-Code Evidence
- Route topology and middleware chains from `server/src/routes/*.ts` and `server/src/server.ts`.
- Controller semantics from `server/src/controllers/*.ts`.
- Schema/index behavior from `server/src/models/*.ts`.
- Frontend orchestration from `client/src/pages/*.tsx`, `client/src/services/api.ts`, and Zustand/context layers.

2. Documentation Evidence
- Architecture/API/roles/setup docs in `docs/`.
- Research scaffolding in `docs/research/`.

3. Runtime Evidence
- Fresh script outputs:
  - `server/verify_phase4_latest.txt`
  - `server/verify_phase5_latest.txt`
  - `server/verify_phase6_latest.txt`
- Live proof snapshot:
  - `docs/research/runtime-proof-2026-03-06.md`

4. Build Reproducibility Evidence
- Successful backend compile via `npm --prefix .../server run build`.
- Successful frontend compile via `npm --prefix .../client run build`.

### B. Freshness and Timestamp Control
To avoid stale-assertion risk, runtime artifacts cited in this manuscript were regenerated in the same analysis window and captured in `docs/research/runtime-proof-2026-03-06.md`. This includes:
1. Health endpoint response timestamp.
2. Re-run outputs of phase 4, 5, and 6 verification scripts.
3. Live analytics and audit snapshots after script execution.
4. A separate deduplication proof run with before/after checks.

This design reduces the common publication problem where documentation is up to date but runtime evidence is outdated.

### C. Claim Validation Policy
Claims in this paper are marked by evidence class.
1. Code Verified: direct implementation exists and was inspected.
2. Runtime Verified: behavior observed in fresh logs or runtime snapshots.
3. Drift Observed: documentation and implementation diverge, or behavior conflicts with intended policy.

Only Code Verified and Runtime Verified statements are treated as positive claims.

## IV. SYSTEM ARCHITECTURE
### A. Technology Composition
The system is a typed, multi-tier web architecture.

| Layer | Concrete Stack | Evidence |
|---|---|---|
| Client | React 19, Vite 7, TypeScript, Zustand, TanStack Query, Axios, AG Grid, Recharts | `client/package.json`, `client/src/App.tsx`, `client/src/services/api.ts` |
| API | Node.js + Express 5 + TypeScript | `server/package.json`, `server/src/server.ts` |
| Data | MongoDB via Mongoose | `server/src/models/*.ts` |
| File storage | Local filesystem under `uploads/{caseId}/{custodianId}` | `server/src/services/file.service.ts` |
| Shared contracts | Domain enums/interfaces used by both sides | `shared/types.ts` |

### B. Request Processing Pipeline
In `server/src/server.ts`, requests flow through:
1. `helmet()`
2. `cors(...)`
3. `express.json()`
4. Domain routers mounted at `/api/*`
5. `notFoundHandler`
6. `errorHandler`

Authentication and authorization checks are route-specific via `protect`, `adminOnly`, and `authorize` middleware in `authMiddleware.ts`.

### C. Client Session Continuity
The Axios interceptor in `client/src/services/api.ts` implements queued retry semantics.
1. Access token attached on requests.
2. On 401, refresh request issued via `/auth/refresh`.
3. Concurrent failed requests are queued and replayed on successful refresh.
4. Refresh failure triggers logout.

This is a robust pattern for avoiding thundering-herd refresh races in SPA clients.

### D. Cross-Layer Contract Coupling
The platform exhibits strong contract coupling between backend and frontend in three areas.
1. Shared status enums and role literals are reflected in review, production, and analytics pages.
2. Frontend upload pre-check workflow aligns with backend duplicate-check API shape.
3. Analytics page expects nested structures (`overview`, `reviewProgress`, `documentStats`, `timeline`) that match controller output.

At the same time, coupling also reveals drift quickly. For example, if one endpoint variant fails (as seen in GET duplicate-check route order conflict), UI behavior can silently degrade by falling back to permissive defaults.

## V. DATA MODEL, INDEXING, AND CONTRACTS
### A. Collection Inventory
The backend defines nine domain collections.
1. `User`
2. `Case`
3. `Custodian`
4. `Document`
5. `IssueTag`
6. `Production`
7. `AuditLog`
8. `Notification`
9. `SavedSearch`

### B. High-Impact Schema Constraints
1. `Document` has unique `{ caseId, docNumber }` and indexed `md5Hash`.
2. `Production` enforces unique `{ caseId, setName }`.
3. `IssueTag` enforces unique `{ caseId, tagName }`.
4. `User.email` is unique and indexed.

### C. Governance-Meaningful Enums
`shared/types.ts` defines key enums.
1. User roles: `ADMIN`, `PARTNER`, `ASSOCIATE`, `PARALEGAL`.
2. Case roles: `LEAD`, `REVIEWER`, `PARALEGAL`.
3. Privilege statuses: `NOT_PRIVILEGED`, `ATTORNEY_CLIENT`, `WORK_PRODUCT`, `NEEDS_REVIEW`.
4. Production states: `DRAFT`, `IN_REVIEW`, `APPROVED`, `PRODUCED`.

These enums are the common vocabulary linking UI forms, API validation, and persistence.

## VI. WORKFLOW REALIZATION AND CORRECTNESS
### A. Case and Team Lifecycle
Implemented endpoints support creation, listing, retrieval, update, archival, and team operations. Controller logic includes critical checks such as preventing deletion of the last `LEAD` in a case.

### B. Ingestion and Dedup Pipeline
The upload controller (`document.controller.ts`) enforces:
1. Case and custodian consistency.
2. MD5 calculation per incoming file.
3. Case-scoped duplicate lookup.
4. New document creation with `isDuplicate` and `masterDocId` lineage fields as applicable.
5. Per-file audit logging.

Runtime proof confirms dedup semantics.
1. Pre-upload duplicate check returned `false`.
2. Post-upload duplicate check returned `true`.
3. Second upload in same case was marked `isDuplicate: true` and linked to first record.

These exact outputs are recorded in `docs/research/runtime-proof-2026-03-06.md`.

### C. Search and Export Semantics
`search.controller.ts` implements composable filtering over custodians, privilege/relevance labels, tags, notes presence, file-name regex, duplicate inclusion, and date range. Export reuses the search query builder and writes CSV fields consistent with review workflows.

Two implementation details are publication-relevant.
1. Duplicate filtering defaults to excluding duplicates unless explicitly enabled, reducing accidental double-counting in legal exports.
2. Export has a hard cap (`limit(5000)`), which is a practical guardrail but also a scalability boundary that should be stated in methods sections when discussing completeness of exported result sets.

### D. Review Queue and Coding
Review semantics are implemented in `review.controller.ts`.
1. Queue selects unreviewed documents by missing `coding.reviewedAt`.
2. Queue sort uses ascending `docNumber` (FIFO-like behavior).
3. Coding endpoint updates fields and records reviewer identity/timestamps.
4. Coding response includes `nextDocument` prefetch to reduce client round trips.
5. Coding history endpoint rehydrates timeline from audit records.

### E. Production Governance
`production.controller.ts` implements legal-production controls.
1. Documents can be added/removed only when set status is DRAFT.
2. Privileged documents are rejected from production adds.
3. Bates numbers are generated sequentially as `{setName}-{000001...}`.
4. Removing documents does not resequence existing Bates identifiers.
5. Production locking middleware blocks mutation when status is non-DRAFT.

Phase 6 runtime artifact confirms these controls with explicit success/failure messages.

## VII. SECURITY, AUTHORIZATION, AND TRACEABILITY
### A. Verified Security Controls
1. JWT with separate access and refresh secrets and TTLs.
2. bcrypt hashing in model pre-save hook.
3. CORS and Helmet middleware.
4. Upload size limits (50 MB) and extension filtering.
5. Password reset anti-enumeration response behavior.
6. Structured audit log writes for workflow actions.

### B. Observed Governance and Security Drift
The following gaps are directly observed in current implementation.

**Table I - Governance-Critical Drift Matrix**

| ID | Area | Observed Behavior | Risk |
|---|---|---|---|
| G1 | Case creation gating | `POST /cases` requires auth but no role guard | Any authenticated role can create cases |
| G2 | Custodian route role checks | Route-level `authorize(...)` is commented out | Broader mutation surface than policy intent |
| G3 | Review route role checks | Queue and coding use only `protect` | Reviewer-role boundaries not enforced at route level |
| G4 | Document access scoping | `GET /documents/:id` and download do not verify case membership | Potential cross-case read/download by authenticated users |
| G5 | Case-role middleware model | `authorize` checks global user role only | Case roles like `LEAD` are not natively enforced by middleware |
| G6 | Production transition strictness | `approveProduction` does not enforce prior `IN_REVIEW` | State progression can skip expected review stage |
| G7 | Password reset token storage | Token stored directly, not hashed | Token-at-rest hardening gap |
| G8 | Admin password-change path | Controller hashes password before save and model pre-save hashes again | Risk of double-hash and credential mismatch |
| G9 | Duplicate-check GET endpoint | `GET /documents/check-duplicate` can be shadowed by `GET /documents/:id` route order | GET variant unreliable despite documentation support |

G9 was confirmed during this study: a direct GET duplicate check returned `Cast to ObjectId failed ... value "check-duplicate"`, while the POST variant succeeded.

### C. Auditability Posture
Audit logs are append-only from application perspective and include actor, action, entity, details, and timestamp fields. Runtime snapshot confirmed retrievable `DOCUMENT_CODED` events and recent actor metadata.

A key methodological note is that append-only at application level is not identical to immutable at database governance level. The current manuscript therefore claims reconstructability of workflow actions, not cryptographic immutability. This wording is intentionally conservative.

## VIII. REPRODUCIBILITY PROTOCOL AND RESULTS
### A. Reproducibility Steps (Executed)
This study executed the following sequence.
1. Seed baseline data: `npx ts-node src/seed.ts`.
2. Start backend API and validate `/api/health`.
3. Run verification scripts:
  - `node scripts/verify_phase4_js.js > verify_phase4_latest.txt`
  - `npx ts-node scripts/verify_phase5.ts > verify_phase5_latest.txt`
  - `npx ts-node scripts/verify_phase6.ts > verify_phase6_latest.txt`
4. Compile backend and frontend for build reproducibility.
5. Run additional ad hoc runtime proofs (analytics snapshot, audit snapshot, dedup-specific run).

### B. Build Results
1. Backend build succeeded and emitted compiled artifacts in `server/dist`.
2. Frontend build succeeded and emitted `client/dist/index.html` and bundled assets.
3. Frontend bundle warning indicated a large chunk (approximately 1.8 MB minified), which is an optimization concern but not a build failure.

### C. Runtime Availability Results
Runtime availability was validated through a direct health check returning:
1. `success: true`
2. `message: Server operational`
3. Timestamp in UTC (`2026-03-06T04:26:39.801Z` in captured snapshot)

This confirms that all runtime proofs in this manuscript were executed against an operational API instance.

### D. Scripted Verification Results

**Table II - Script Result Summary**

| Script Artifact | Scope | Outcome |
|---|---|---|
| `verify_phase4_latest.txt` | Upload, queue retrieval, coding | Success |
| `verify_phase5_latest.txt` | Search, saved search CRUD, export | Success |
| `verify_phase6_latest.txt` | Production privilege gate, lock, export | Success |

Observed runtime messages include:
1. `SUCCESS: Document coded correctly.`
2. `Export successful.`
3. `SUCCESS: Privileged document addition blocked: Cannot add privileged documents to production`
4. `SUCCESS: Modification blocked: Production is locked and cannot be modified`

### E. Runtime Snapshot Results
Live snapshot from `runtime-proof-2026-03-06.md` reported:
1. `totalCases: 35`
2. `totalDocuments: 109`
3. `reviewedDocuments: 76`
4. `latestAuditAction: DOCUMENT_CODED`

These values confirm operational API connectivity and non-empty audit activity at analysis time.

The snapshot also demonstrates that scripted runs are not isolated toy events: they occur in a live stateful environment with accumulated cases/documents and active audit history.

### F. Dedup-Specific Proof Results
Ad hoc dedup proof captured:
1. `preCheckDuplicate: false`
2. `postCheckDuplicate: true`
3. `secondUploadIsDuplicate: true`
4. `secondUploadMasterDocId` equals first upload id

This result gives runtime confirmation of IR1 (lineage-preserving dedup) for the POST duplicate-check endpoint path.

### G. Negative-Test Result (GET Duplicate-Check Drift)
During ad hoc verification, direct GET duplicate-check calls returned a cast error because route declaration order allows `/documents/:id` to intercept `/documents/check-duplicate`. This is a valuable negative test because:
1. It confirms drift is not hypothetical.
2. It demonstrates why both positive and negative proof paths are needed for publication-grade accuracy.
3. It directly informs remediation priorities.

## IX. CLAIM-TO-PROOF MATRIX

**Table III - Core Claims and Proof Status**

| Claim ID | Claim | Status | Primary Proof |
|---|---|---|---|
| C1 | Case-scoped dedup with lineage linking is implemented | Runtime Verified | `runtime-proof-2026-03-06.md`, `document.controller.ts` |
| C2 | Review queue returns unreviewed documents and coding persists | Runtime Verified | `verify_phase4_latest.txt`, `review.controller.ts` |
| C3 | Saved search lifecycle and export work end-to-end | Runtime Verified | `verify_phase5_latest.txt`, `search.controller.ts` |
| C4 | Privileged docs are blocked from production | Runtime Verified | `verify_phase6_latest.txt`, `production.controller.ts` |
| C5 | Non-DRAFT production mutation is blocked | Runtime Verified | `verify_phase6_latest.txt`, `checkProductionLock` middleware |
| C6 | Audit records can reconstruct coding activity | Runtime Verified | runtime audit snapshot + `getCodingHistory` |
| C7 | Strict dual-layer role enforcement is uniformly implemented | Drift Observed | route/controller mismatch evidence (G1-G5) |
| C8 | Duplicate-check endpoint parity for GET and POST | Drift Observed | GET route-order conflict (G9), POST success |

This matrix is intended to prevent overstatement and preserve publication integrity.

## X. THREATS TO VALIDITY
### A. Dataset Validity
The verification corpus is synthetic and seeded. It supports reproducibility and control testing but not real-world legal corpus complexity, multilingual edge cases, or true enterprise data distributions.

### B. Performance Validity
No load-test or latency benchmark campaign was executed in this manuscript. Runtime proofs are functional, not scalability-oriented.

Another performance-adjacent threat is that document numbering in upload flow is generated through last-document lookup and sequential processing assumptions. This is acceptable for current scope but can become a contention point in high-concurrency deployments.

### C. Policy Validity
Documented policy matrices exceed current middleware/controller enforcement consistency in some areas. Claims in this paper account for that by flagging drift explicitly.

### D. Environment Validity
Observations were taken in local development conditions with local file storage and local build flows. Cloud deployment behavior, object-storage integration, and multi-instance consistency were not re-evaluated here.

## XI. RELATED WORK POSITIONING
This platform is best positioned in engineering systems literature focusing on auditable workflow execution rather than ranking-model novelty. Relative to many prototype papers that emphasize UI breadth without policy traceability, this system provides substantial operational controls in dedup lineage, coding audit events, and production gating.

The appropriate claim boundary is therefore:
1. Strong: workflow orchestration and integrity primitives.
2. Moderate: reproducibility under scripted synthetic runs.
3. Weak/Deferred: formal access-control completeness, benchmark-scale performance, ML-augmented prioritization.

This framing aligns with practical systems venues where operational correctness and reproducibility are primary evaluation axes.

## XII. HARDENING ROADMAP FOR PUBLICATION READINESS
Based on observed drift, the following roadmap is prioritized.

1. Authorization hardening
- Enforce case membership and role checks for all case-scoped document/review/custodian routes.
- Implement dedicated case-role middleware instead of overloading global role checks.

2. Route-contract hardening
- Reorder `document.routes.ts` so static route `/documents/check-duplicate` precedes `/documents/:id`.
- Add contract tests for both GET and POST duplicate-check variants.

3. Credential-path hardening
- Store hashed reset tokens.
- Remove potential double-hash path in admin password update flow.

4. State-machine hardening
- Enforce explicit `DRAFT -> IN_REVIEW -> APPROVED -> PRODUCED` transition guards.

5. Documentation alignment
- Resolve config naming drift (`MONGO_URI` vs `MONGODB_URI`).
- Align setup docs with existing seed script and current bootstrap behavior.

6. Empirical extension
- Add load and latency benchmarks.
- Add fault-injection tests for storage and DB failure paths.

7. Verification harness hardening
- Add explicit negative tests for route shadowing and unauthorized cross-case access attempts.
- Persist machine-readable verification results (JSON) in addition to text logs to support automated evidence extraction.
- Add a CI job that regenerates key proof artifacts and fails on contract regression.

## XIII. CONCLUSION
This manuscript provides an implementation-accurate, proof-oriented systems analysis of a full-stack eDiscovery platform. The codebase demonstrates credible workflow integrity foundations: deterministic deduplication with lineage, review coding persistence with audit traces, and production controls that block privileged inclusion and post-approval mutation.

The study also surfaces critical boundary conditions: policy enforcement is not yet uniformly implemented across all route surfaces, and one duplicate-check endpoint variant is affected by route-order drift. By explicitly distinguishing verified behavior from observed drift, the paper offers a defensible claim set suitable for rigorous engineering publication.

In summary, the platform is a strong systems baseline for legal workflow tooling, with clear next steps to reach stricter governance completeness and benchmark-grade validation.

## APPENDIX A. ENDPOINT AND MIDDLEWARE INVENTORY (IMPLEMENTATION VIEW)

| Group | Endpoint Pattern | Method(s) | Primary Middleware (as wired) |
|---|---|---|---|
| Auth | `/api/auth/register` | POST | `protect`, `adminOnly` |
| Auth | `/api/auth/login` | POST | None |
| Auth | `/api/auth/me` | GET | `protect` |
| Auth | `/api/auth/refresh` | POST | None |
| Auth | `/api/auth/forgot-password` | POST | None |
| Auth | `/api/auth/reset-password` | POST | None |
| Auth | `/api/auth/profile` | PUT | `protect` |
| Auth | `/api/auth/password` | PUT | `protect` |
| Cases | `/api/cases` | POST, GET | `protect` |
| Cases | `/api/cases/:id` | GET, PUT, DELETE | `protect` (+ `adminOnly` on DELETE) |
| Cases | `/api/cases/:id/team` | POST | `protect` |
| Cases | `/api/cases/:id/team/:userId` | DELETE | `protect` |
| Cases | `/api/cases/:id/available-users` | GET | `protect` |
| Search | `/api/cases/:caseId/saved-searches` | POST, GET | `protect` |
| Custodian | `/api/cases/:caseId/custodians` | GET, POST | `protect` |
| Custodian | `/api/custodians/:id` | PUT, DELETE | `protect` |
| Documents | `/api/cases/:caseId/documents/upload` | POST | `protect`, `authorize(ADMIN,PARTNER,PARALEGAL)`, `upload.array` |
| Documents | `/api/cases/:caseId/documents` | GET | `protect` |
| Documents | `/api/documents/:id/download` | GET | `protect` |
| Documents | `/api/documents/:id` | GET | `protect` |
| Documents | `/api/documents/check-duplicate` | GET, POST | `protect` |
| Documents | `/api/documents/search` | POST | `protect` |
| Documents | `/api/documents/export` | POST | `protect` |
| Search | `/api/saved-searches/:id` | DELETE | `protect` |
| Tags | `/api/cases/:caseId/tags` | GET, POST | `protect` |
| Tags | `/api/cases/:caseId/tags/:id` | PUT, DELETE | `protect`, `authorize(PARTNER,LEAD)` |
| Tags | `/api/documents/:id/tags` | POST | `protect` |
| Tags | `/api/documents/:id/tags/:tagId` | DELETE | `protect` |
| Review | `/api/cases/:caseId/review/queue` | GET | `protect` |
| Review | `/api/documents/:id/code` | POST | `protect` |
| Review | `/api/documents/:id/coding-history` | GET | `protect` |
| Production | `/api/cases/:caseId/productions` | POST, GET | `protect` |
| Production | `/api/productions/:id` | GET | `protect` |
| Production | `/api/productions/:id/documents` | POST | `protect`, `checkProductionLock` |
| Production | `/api/productions/:id/documents/:documentId` | DELETE | `protect`, `checkProductionLock` |
| Production | `/api/productions/:id/submit` | PUT | `protect` |
| Production | `/api/productions/:id/approve` | PUT | `protect` |
| Production | `/api/productions/:id/produce` | PUT | `protect` |
| Production | `/api/productions/:id/export` | GET | `protect` |
| Production | `/api/productions/:id` | DELETE | `protect` |
| Analytics | `/api/analytics` | GET | `protect` |
| Analytics | `/api/cases/:caseId/analytics` | GET | `protect` |
| Analytics | `/api/cases/:caseId/analytics/team` | GET | `protect` |
| Analytics | `/api/cases/:caseId/analytics/progress` | GET | `protect` |
| Dashboard | `/api/dashboard/stats` | GET | `protect` |
| Dashboard | `/api/dashboard/activity` | GET | `protect` |
| Dashboard | `/api/dashboard/overview` | GET | `protect` |
| Notifications | `/api/notifications` | GET | `protect` |
| Notifications | `/api/notifications/:id/read` | PATCH | `protect` |
| Notifications | `/api/notifications/read-all` | PATCH | `protect` |
| Notifications | `/api/notifications/:id` | DELETE | `protect` |
| Notifications | `/api/notifications/delete-batch` | POST | `protect` |
| Users | `/api/users` | GET | `protect`, `authorize(ADMIN)` |
| Users | `/api/users/role/:role` | GET | `protect` |
| Users | `/api/users/:id` | GET, PUT, DELETE | `protect` (+ `authorize(ADMIN)` for PUT/DELETE) |
| Users | `/api/users/:id/deactivate` | PATCH | `protect`, `authorize(ADMIN)` |
| Users | `/api/users/:id/activate` | PATCH | `protect`, `authorize(ADMIN)` |
| Users | `/api/users/:id/password` | PATCH | `protect` |
| Audit Logs | `/api/audit-logs` | GET | `protect`, `authorize(ADMIN,PARTNER)` |
| Health | `/api/health` | GET | None |

## APPENDIX B. CLAIM-SAFE REPRODUCIBILITY CHECKLIST
1. Ensure backend `.env` contains valid JWT secrets and DB URI.
2. Run seed script and verify default partner credentials.
3. Start backend and verify `/api/health`.
4. Execute phase verification scripts and inspect output files.
5. Run build commands for backend and frontend.
6. Optionally execute runtime proof snapshot steps in `runtime-proof-2026-03-06.md`.
7. Restrict publication claims to behaviors that are Code Verified or Runtime Verified.

## APPENDIX C. VERBATIM PROOF EXCERPTS
The following excerpts are copied from runtime artifacts generated during this analysis window.

### C.1 Phase 4 Excerpt
From `server/verify_phase4_latest.txt`:

```text
Queue returned: 69aa57895a0679a1b5ddef0e
Coding Result: { success: true, message: 'Coding saved', nextDocument: null }
SUCCESS: Document coded correctly.
```

Interpretation:
1. Queue delivery and coding persistence both succeeded.
2. Next-document prefetch behavior is explicit (`nextDocument: null` when queue exhausted).

### C.2 Phase 5 Excerpt
From `server/verify_phase5_latest.txt`:

```text
Search successful. Found 0 documents.
Search saved: Test Search 1772771212219
Retrieved 1 saved searches.
Export successful.
Verified deletion.
```

Interpretation:
1. Search endpoint operational.
2. Saved-search lifecycle (create, list, delete) completed.
3. Export endpoint returned valid CSV.

### C.3 Phase 6 Excerpt
From `server/verify_phase6_latest.txt`:

```text
SUCCESS: Privileged document addition blocked: Cannot add privileged documents to production
SUCCESS: Modification blocked: Production is locked and cannot be modified
Export successful.
```

Interpretation:
1. Production privilege gate is active.
2. Post-approval lock control is active.
3. Production metadata export succeeded after state transitions.

### C.4 Dedup Proof JSON Excerpt
From `docs/research/runtime-proof-2026-03-06.md`:

```json
{
  "preCheckDuplicate": false,
  "postCheckDuplicate": true,
  "firstUploadIsDuplicate": false,
  "secondUploadIsDuplicate": true
}
```

Interpretation:
1. Duplicate state changes exactly as expected before and after first upload.
2. Second upload is correctly recognized as duplicate and linked.

### C.5 Route Drift Excerpt
From ad hoc GET duplicate-check attempt:

```text
Cast to ObjectId failed for value "check-duplicate" (type string) at path "_id" for model "Document"
```

Interpretation:
1. GET route ordering currently causes endpoint shadowing.
2. POST variant remains functional and was used for dedup runtime proof.

## APPENDIX D. REPRESENTATIVE CODE SNIPPETS (IMPLEMENTATION EVIDENCE)
The snippets below are extracted from the current codebase and included to provide direct implementation evidence. Surrounding lines may be omitted for brevity, but the shown logic is source-accurate.

### D.1 Case-Scoped Deduplication in Upload Flow
From `server/src/controllers/document.controller.ts`:

```ts
for (const file of files) {
  // 1. Calculate MD5
  const md5Hash = calculateMD5(file.buffer);

  // 2. Check for duplicate in THIS CASE
  const existingDoc = await Document.findOne({ caseId, md5Hash });

  let newDoc;

  if (existingDoc) {
    // DUPLICATE
    const docNumber = await getNextDocNumber(caseId);

    newDoc = await Document.create({
      caseId,
      custodianId,
      docNumber,
      filename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      filePath: existingDoc.filePath,
      md5Hash,
      extractedText: existingDoc.extractedText,
      uploadedBy,
      isDuplicate: true,
      masterDocId: existingDoc._id,
    });
  } else {
    // NEW FILE
    const extractedText = await extractTextFromBuffer(file.buffer, file.mimetype);
    const savedFile = await saveFile(file, caseId, custodianId);
    const docNumber = await getNextDocNumber(caseId);

    newDoc = await Document.create({
      caseId,
      custodianId,
      docNumber,
      filename: savedFile.originalName,
      fileType: savedFile.mimeType,
      fileSize: savedFile.size,
      filePath: savedFile.filePath,
      md5Hash,
      extractedText,
      uploadedBy,
      isDuplicate: false
    });
  }
}
```

### D.2 Duplicate Check Compatibility Logic (GET Query or POST Body)
From `server/src/controllers/document.controller.ts`:

```ts
const query = req.query as { caseId?: string; md5Hash?: string };
const body = (req.body ?? {}) as { caseId?: string; md5Hash?: string };

// Accept both GET query params and POST JSON body for compatibility.
const caseId = query.caseId ?? body.caseId;
const md5Hash = query.md5Hash ?? body.md5Hash;

if (!caseId || !md5Hash) {
  res.status(400).json({ message: 'caseId and md5Hash are required' });
  return;
}
```

### D.3 Route-Order Drift Behind GET Duplicate Check
From `server/src/routes/document.routes.ts`:

```ts
// GET /api/documents/:id
router.get('/documents/:id',
  protect,
  getDocumentById
);

// GET /api/documents/check-duplicate?caseId=X&md5Hash=Y
router.get('/documents/check-duplicate',
  protect,
  checkDuplicate
);
```

### D.4 Production Privilege Gate
From `server/src/controllers/production.controller.ts`:

```ts
const docs = await Document.find({ _id: { $in: documentIds as string[] } });

const privilegedDocs = docs.filter(doc =>
  doc.coding?.privilegeStatus !== 'NOT_PRIVILEGED'
);

if (privilegedDocs.length > 0) {
  res.status(400).json({
    message: 'Cannot add privileged documents to production',
    privilegedDocIds: privilegedDocs.map(d => d._id)
  });
  return;
}
```

### D.5 Production Mutation Lock Middleware
From `server/src/middleware/authMiddleware.ts`:

```ts
const production = await Production.findById(productionId);

if (production && production.status !== 'DRAFT') {
  res.status(403).json({ message: 'Production is locked and cannot be modified' });
  return;
}
```

### D.6 Frontend Token Refresh Queue
From `client/src/services/api.ts`:

```ts
if (error.response?.status === 401 && !originalRequest._retry) {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    })
      .then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  }

  originalRequest._retry = true;
  isRefreshing = true;
  const refreshToken = useAuthStore.getState().refreshToken;

  if (!refreshToken) {
    useAuthStore.getState().logout();
    return Promise.reject(error);
  }

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
      { refreshToken }
    );
    const { accessToken } = response.data.data;

    useAuthStore.getState().setToken(accessToken, refreshToken);
    processQueue(null, accessToken);

    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    return api(originalRequest);
  } catch (refreshError) {
    processQueue(refreshError, null);
    useAuthStore.getState().logout();
    return Promise.reject(refreshError);
  } finally {
    isRefreshing = false;
  }
}
```

## APPENDIX E. PRACTICAL SUBMISSION NOTES (IEEE/ENGINEERING VENUES)
1. Keep all positive claims tied to Table III statuses.
2. Include Table I drift matrix in the final submission rather than hiding limitations.
3. Add one architecture figure and one workflow-state figure when converting to camera-ready format.
4. If reviewer asks for stronger empirical rigor, propose a follow-on benchmark appendix rather than inflating current claims.
5. Use `runtime-proof-2026-03-06.md` as supplementary reproducibility material.

## REFERENCES
[1] eDiscovery Platform Team, "System Architecture," `docs/ARCHITECTURE.md`, 2026.

[2] eDiscovery Platform Team, "REST API Reference," `docs/API.md`, 2026.

[3] eDiscovery Platform Team, "Role-Based Access Control Reference," `docs/ROLES.md`, 2026.

[4] eDiscovery Platform Team, "Developer Setup Guide," `docs/SETUP.md`, 2026.

[5] eDiscovery Platform Team, "Evidence Matrix," `docs/research/evidence-matrix.md`, 2026.

[6] eDiscovery Platform Team, "Architecture Truth Table," `docs/research/architecture-truth-table.md`, 2026.

[7] eDiscovery Platform Team, "Evaluation Protocol," `docs/research/evaluation-protocol.md`, 2026.

[8] Runtime Proof Artifact, `docs/research/runtime-proof-2026-03-06.md`, 2026.

[9] Backend Entry and Route Mounting, `server/src/server.ts`.

[10] Authentication and Authorization Middleware, `server/src/middleware/authMiddleware.ts`.

[11] Upload Middleware, `server/src/middleware/upload.middleware.ts`.

[12] Document Controller, `server/src/controllers/document.controller.ts`.

[13] Search Controller, `server/src/controllers/search.controller.ts`.

[14] Review Controller, `server/src/controllers/review.controller.ts`.

[15] Production Controller, `server/src/controllers/production.controller.ts`.

[16] Analytics Controller, `server/src/controllers/analytics.controller.ts`.

[17] Data Models, `server/src/models/*.ts`.

[18] Shared Type Contracts, `shared/types.ts`.

[19] Frontend Routing and Session Handling, `client/src/App.tsx`, `client/src/services/api.ts`.

[20] Verification Logs, `server/verify_phase4_latest.txt`, `server/verify_phase5_latest.txt`, `server/verify_phase6_latest.txt`.
