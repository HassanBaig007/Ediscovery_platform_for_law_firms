# Runtime Proof Snapshot - 2026-03-06

## Environment
- API base: `http://localhost:5000/api`
- Seed command status: `npx ts-node src/seed.ts` completed successfully
- Backend build status: `npm run build` succeeded
- Frontend build status: `npm run build` succeeded

## Health Check
```json
{
  "success": true,
  "message": "Server operational",
  "timestamp": "2026-03-06T04:26:39.801Z"
}
```

## Phase Verification Artifacts

### Phase 4 (`server/verify_phase4_latest.txt`)
- Case created
- Tag created
- Custodian created
- Document uploaded
- Review queue returned uploaded document id
- Coding persisted (`SUCCESS: Document coded correctly.`)

### Phase 5 (`server/verify_phase5_latest.txt`)
- Login succeeded
- Case created
- Advanced search succeeded
- Save search succeeded
- Get saved searches succeeded
- Export succeeded (CSV header snippet returned)
- Delete saved search succeeded

### Phase 6 (`server/verify_phase6_latest.txt`)
- Login succeeded
- Case and custodian created
- Non-privileged and privileged documents uploaded and coded
- Production created
- Non-privileged add succeeded
- Privileged add blocked (`Cannot add privileged documents to production`)
- Post-approval mutation blocked (`Production is locked and cannot be modified`)
- Export succeeded

## Live Analytics + Audit Snapshot
```json
{
  "totalCases": 35,
  "activeCases": 35,
  "totalDocuments": 109,
  "reviewedDocuments": 76,
  "auditRowsReturned": 5,
  "latestAuditAction": "DOCUMENT_CODED",
  "latestAuditEntityType": "Document",
  "latestAuditUser": "Bob Partner",
  "latestAuditTimestamp": "2026-03-06T04:26:54.828Z"
}
```

## Deduplication Proof Run (POST duplicate-check endpoint)
```json
{
  "caseId": "69aa57f65a0679a1b5ddefd3",
  "custodianId": "69aa57f65a0679a1b5ddefdd",
  "md5Hash": "90b528bf84f8a47dc0522a94ff600e0b",
  "preCheckDuplicate": false,
  "postCheckDuplicate": true,
  "postMasterDocId": "69aa57f65a0679a1b5ddefe5",
  "firstUploadIsDuplicate": false,
  "secondUploadIsDuplicate": true,
  "secondUploadMasterDocId": "69aa57f65a0679a1b5ddefe5"
}
```

## Route-Order Drift Found During Proof
- `GET /documents/check-duplicate` can be shadowed by `GET /documents/:id` because of route declaration order in `server/src/routes/document.routes.ts`.
- The POST compatibility endpoint (`POST /documents/check-duplicate`) works and was used for dedup proof.
