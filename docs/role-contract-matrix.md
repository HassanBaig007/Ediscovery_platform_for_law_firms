# Role and Contract Matrix (Wave 1 Baseline)

This matrix is the current source of truth for role-aware route behavior and minimum response contract shape for the hardening track.

## API Routes

| Route | Current behavior (after hardening) | Intended scope | Required response shape |
| --- | --- | --- | --- |
| `POST /api/cases/:caseId/documents/upload` | `protect + requireCaseRole(LEAD, PARALEGAL)` | Case team LEAD/PARALEGAL, ADMIN/PARTNER bypass | `{ message, documents[] }` |
| `GET /api/cases/:caseId/documents` | `protect + requireCaseAccess` | Case team member or ADMIN/PARTNER | `{ documents[], page, pages, total }` |
| `GET /api/documents/:id` | `protect + requireCaseAccess` | Case team member or ADMIN/PARTNER | `Document` |
| `GET /api/documents/:id/download` | `protect + requireCaseAccess` | Case team member or ADMIN/PARTNER | File stream / attachment |
| `DELETE /api/documents/:id` | `protect + requireCaseRole(LEAD, PARALEGAL)` | Case LEAD/PARALEGAL, ADMIN/PARTNER bypass | `{ success, message }` |
| `POST /api/documents/search` | `protect + requireCaseAccess` (case resolved from body `caseId`) | Case team member or ADMIN/PARTNER | `{ documents[], page, pages, total }` |
| `POST /api/documents/export` | `protect + requireCaseAccess` (case resolved from body `caseId`) | Case team member or ADMIN/PARTNER | CSV attachment |
| `GET/POST /api/documents/check-duplicate` | `protect + requireCaseAccess` (case resolved from query/body) | Case team member or ADMIN/PARTNER | `{ isDuplicate, masterDocId, masterDocument }` |
| `POST /api/cases/:caseId/productions` | `protect + requireCaseRole(LEAD, PARALEGAL)` | Case LEAD/PARALEGAL, ADMIN/PARTNER bypass | `Production` |
| `GET /api/cases/:caseId/productions` | `protect + requireCaseAccess` | Case team member or ADMIN/PARTNER | `Production[]` |
| `GET /api/productions/:id` | `protect + requireCaseAccess` | Case team member or ADMIN/PARTNER | `Production` |
| `POST /api/productions/:id/documents` | `protect + requireCaseRole(LEAD, PARALEGAL)` | Case LEAD/PARALEGAL, ADMIN/PARTNER bypass | `Production` |
| `DELETE /api/productions/:id/documents/:documentId` | `protect + requireCaseRole(LEAD, PARALEGAL)` | Case LEAD/PARALEGAL, ADMIN/PARTNER bypass | `Production` |
| `PUT /api/productions/:id/submit` | `protect + requireCaseRole(LEAD, PARALEGAL)` | Case LEAD/PARALEGAL, ADMIN/PARTNER bypass | `Production` |
| `PUT /api/productions/:id/approve` | `protect + requireCaseAccess` + controller global role check | ADMIN/PARTNER only | `Production` |
| `PUT /api/productions/:id/produce` | `protect + requireCaseAccess` + controller global role check | ADMIN/PARTNER only | `Production` |
| `GET /api/productions/:id/export` | `protect + requireCaseAccess` | Case team member or ADMIN/PARTNER | CSV attachment |
| `DELETE /api/productions/:id` | `protect + requireCaseRole(LEAD, PARALEGAL)` | Case LEAD/PARALEGAL, ADMIN/PARTNER bypass | `{ message }` |
| `GET /api/cases/:caseId/tags` | `protect + requireCaseAccess` | Case team member or ADMIN/PARTNER | `IssueTag[]` |
| `POST /api/cases/:caseId/tags` | `protect + requireCaseRole(LEAD)` | Case LEAD, ADMIN/PARTNER bypass | `IssueTag` |
| `PUT/DELETE /api/cases/:caseId/tags/:id` | `protect + requireCaseRole(LEAD)` | Case LEAD, ADMIN/PARTNER bypass | `IssueTag` or `{ message }` |
| `POST /api/documents/:id/tags` | `protect + requireCaseAccess` | Case team member or ADMIN/PARTNER | `Document` |
| `DELETE /api/documents/:id/tags/:tagId` | `protect + requireCaseAccess` | Case team member or ADMIN/PARTNER | `Document` |
| `GET /api/cases/:caseId/custodians` | `protect + requireCaseAccess` | Case team member or ADMIN/PARTNER | `Custodian[]` |
| `POST /api/cases/:caseId/custodians` | `protect + requireCaseRole(LEAD, PARALEGAL)` | Case LEAD/PARALEGAL, ADMIN/PARTNER bypass | `Custodian` |
| `PUT/DELETE /api/custodians/:id` | `protect + requireCaseRole(LEAD, PARALEGAL)` | Case LEAD/PARALEGAL, ADMIN/PARTNER bypass | `Custodian` or `{ message }` |
| `POST /api/cases/:caseId/custodians/import` | `protect + requireCaseRole(LEAD, PARALEGAL)` | Case LEAD/PARALEGAL, ADMIN/PARTNER bypass | `{ success, created, skippedCount, skipped[] }` |
| `GET /api/analytics/analytics` | `protect + authorize(ADMIN, PARTNER)` | ADMIN/PARTNER only | Platform analytics aggregate object |
| `GET /api/analytics/cases/:caseId/analytics` | `protect` | Any authenticated user (future case check recommended) | Case analytics object |
| `GET /api/analytics/cases/:caseId/analytics/team` | `protect + requireCaseAccess + authorize(ADMIN, PARTNER)` | ADMIN/PARTNER only | Team performance list |
| `GET /api/analytics/cases/:caseId/analytics/progress` | `protect + requireCaseAccess` | Case team member or ADMIN/PARTNER | Daily progress list |

## Frontend Page Intent (Wave 1)

| Page route | Intended role/page scope | Backend contract dependency |
| --- | --- | --- |
| `/cases/:id/documents` and `/cases/:id/search` | Case team + elevated global | Document list/search/export contracts above |
| `/cases/:id/custodians` | LEAD/PARALEGAL create-mutating, team read | Custodian CRUD + CSV import contract |
| `/cases/:id/tags` | LEAD mutate, team read/apply | Tag CRUD + document tagging contracts |
| `/cases/:id/productions` | LEAD/PARALEGAL manage draft lifecycle; ADMIN/PARTNER approve/produce | Production lifecycle contracts |
| `/analytics` and team performance views | ADMIN/PARTNER platform/team reporting | Analytics route scope and payload shapes |

