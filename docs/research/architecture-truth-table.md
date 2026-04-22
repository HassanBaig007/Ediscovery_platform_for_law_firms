# Architecture Truth Table

| Capability | Documentation Claim | Implementation Evidence | Current Truth | Impact on Paper Claim |
|---|---|---|---|---|
| Duplicate check endpoint | MD5 duplicate check available before upload | `docs/API.md`, `server/src/routes/document.routes.ts:37`, `server/src/routes/document.routes.ts:44`, `server/src/controllers/document.controller.ts:261` | Verified and normalized | Strong systems claim is supportable. |
| Upload field contract | Upload accepts multi-file field `files` | `server/src/routes/document.routes.ts:14`, `client/src/pages/UploadPage.tsx:214` | Verified and aligned | Eliminates a major reproducibility blocker in ingestion scripts/UI. |
| Global analytics endpoint | Analytics page calls platform endpoint | `client/src/pages/AnalyticsPage.tsx:87`, `server/src/routes/analytics.routes.ts:16`, `server/src/controllers/analytics.controller.ts:91` | Implemented in this pass | Dashboard reproducibility and paper figures can now share one source. |
| Registration policy | User registration is admin-controlled | `server/src/routes/authRoutes.ts:8`, `server/src/middleware/authMiddleware.ts:34` | Verified | Security/governance claim is supportable. |
| Review queue behavior | Next unreviewed document is returned for coding | `server/src/controllers/review.controller.ts:47`, `server/src/controllers/review.controller.ts:91`, `client/src/context/ReviewContext.tsx:83` | Verified | Supports workflow efficiency discussion, not ranking novelty. |
| Privileged doc production block | Privileged docs cannot enter production | `server/src/controllers/production.controller.ts:57`, `server/src/controllers/production.controller.ts:61` | Verified | Strong legal workflow safeguard claim is supportable. |
| Production mutation lock | Non-DRAFT productions are immutable to add/remove ops | `server/src/middleware/authMiddleware.ts:82`, `server/src/controllers/production.controller.ts:49`, `server/src/controllers/production.controller.ts:111` | Verified | Supports integrity/state-machine argument. |
| Bates sequence handling | Bates numbers are not re-sequenced after removals | `server/src/controllers/production.controller.ts:69`, `server/src/controllers/production.controller.ts:119`, `server/src/models/Production.ts:33` | Verified | Supports chain-of-custody narrative. |
| Case-scoped RBAC everywhere | Dual-layer role checks globally enforced | `server/src/middleware/authMiddleware.ts:60`, `server/src/routes/custodian.routes.ts:17`, `server/src/routes/tag.routes.ts:20` | Partially contradicted | Must be framed as "mixed enforcement" with explicit limitations. |
| Health check path | API health route exposed | `server/src/server.ts`, `docs/API.md:599` | Verified after doc correction | Minor but important reproducibility detail. |

## Immediate Publication Guidance
- Use only rows marked `Verified` as headline claims.
- Treat `Partially contradicted` rows as threats-to-validity unless fixed.
- Keep one explicit subsection in the paper: "Policy Enforcement Coverage and Gaps".
