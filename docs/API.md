# REST API Reference

Base URL: `http://localhost:5000/api`

All protected endpoints require an `Authorization: Bearer <accessToken>` header.  
Successful responses wrap data in `{ success: true, data: ... }`.  
Error responses return `{ success: false, message: "..." }`.

---

## Authentication

### POST /auth/register
Create a new user account. **Requires Admin authentication.**

**Request body**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@lawfirm.com",
  "password": "SecurePass123!"
}
```
Role is assigned separately via `PUT /users/:id` after creation. Defaults to `ASSOCIATE`.

**Response 201**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "jane@lawfirm.com", "role": "ASSOCIATE" },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

---

### POST /auth/login

**Request body**
```json
{ "email": "jane@lawfirm.com", "password": "SecurePass123!" }
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "firstName": "Jane", "role": "ASSOCIATE", "isActive": true },
    "accessToken": "<1-day jwt>",
    "refreshToken": "<7-day jwt>"
  }
}
```

---

### POST /auth/refresh

Exchange a valid refresh token for a new access token.

**Request body**
```json
{ "refreshToken": "<jwt>" }
```

**Response 200**
```json
{ "success": true, "data": { "accessToken": "<new jwt>" } }
```

---

### GET /auth/me
Returns the authenticated user's profile. **Protected.**

---

### POST /auth/forgot-password

Generates a password reset token stored server-side (1-hour expiry). In production, the token is delivered by email. The response always returns success to prevent email enumeration.

**Request body**
```json
{ "email": "jane@lawfirm.com" }
```

---

### POST /auth/reset-password

**Request body**
```json
{ "token": "<reset token>", "password": "NewSecurePass456!" }
```

---

## Cases

All case endpoints require authentication. Partner and Admin users see all cases. Associates and Paralegals see only cases they are assigned to.

### POST /cases
Create a new case. The creator is automatically added as team `LEAD`.

**Request body**
```json
{
  "caseNumber": "2025-CV-001",
  "caseName": "TechCorp v. InnovateLLC",
  "clientName": "TechCorp Inc.",
  "opposingParty": "InnovateLLC",
  "description": "Commercial contract dispute — breach of IP licensing agreement.",
  "status": "ACTIVE"
}
```

**Response 201** — Returns the full case with populated team member details.

---

### GET /cases
List cases accessible to the authenticated user.

**Query parameters**

| Parameter | Type   | Description                         |
|-----------|--------|-------------------------------------|
| status    | string | Filter by `ACTIVE`, `CLOSED`, or `ARCHIVED` |
| page      | number | Page number (default: 1)            |
| limit     | number | Items per page (default: 20)        |

---

### GET /cases/:id
Fetch a single case by ID. Returns 403 if the user is not on the team (unless Admin/Partner).

---

### PUT /cases/:id
Update case metadata. Only the team `LEAD` or an Admin may update.

**Updatable fields:** `caseName`, `clientName`, `description`, `status`

---

### DELETE /cases/:id
Soft-deletes the case by setting `status = ARCHIVED`. **Admin only.**

---

### POST /cases/:id/team
Add a user to the case team. Requires `LEAD` or Admin.

**Request body**
```json
{ "userId": "<userId>", "role": "REVIEWER" }
```
Valid team roles: `LEAD`, `REVIEWER`, `PARALEGAL`

---

### DELETE /cases/:id/team/:userId
Remove a user from the team. The last `LEAD` cannot be removed.

---

### GET /cases/:id/available-users
Returns users not currently assigned to this case — used to populate the team assignment dropdown.

---

## Custodians

### GET /cases/:caseId/custodians
List all custodians for a case.

### POST /cases/:caseId/custodians
Create a custodian. Email must be unique within the case.

**Request body**
```json
{
  "name": "Robert Chen",
  "email": "rchen@techcorp.com",
  "department": "Engineering",
  "title": "VP of Engineering"
}
```

### PUT /custodians/:id
Update custodian metadata. Email uniqueness within the case is re-validated.

### DELETE /custodians/:id
Delete a custodian. Returns 400 if documents are still assigned to this custodian.

---

## Documents

### POST /cases/:caseId/documents/upload
Bulk-upload documents. Accepts `multipart/form-data`. **Requires Admin, Partner, or Paralegal role.**

**Form fields**

| Field        | Type   | Description                        |
|--------------|--------|------------------------------------|
| files        | file[] | One or more files (max 50 MB each) |
| custodianId  | string | ID of the custodian owning these documents |

**Supported file types:** `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.msg`, `.eml`, `.txt`

**Response 201**
```json
{
  "success": true,
  "data": [
    { "filename": "contract.pdf", "docNumber": "DOC-000001", "isDuplicate": false },
    { "filename": "contract.pdf", "docNumber": "DOC-000002", "isDuplicate": true, "masterDocId": "..." }
  ]
}
```

---

### GET /cases/:caseId/documents
List documents for a case with optional filtering.

**Query parameters**

| Parameter   | Type   | Description                     |
|-------------|--------|---------------------------------|
| custodianId | string | Filter by custodian             |
| search      | string | Filename keyword (regex)        |
| page        | number | Page number (default: 1)        |
| limit       | number | Items per page (default: 50)    |

File paths are excluded from the response for security.

---

### GET /documents/:id
Fetch a full document record with populated tags and custodian. Logs a `DOCUMENT_VIEW` audit event.

---

### GET /documents/:id/download
Stream the physical file to the client. Sets `Content-Disposition: attachment`. Logs a `DOCUMENT_DOWNLOAD` audit event.

---

### DELETE /documents/:id
Delete a document record. If no other records reference the same stored file, the physical file is deleted as well. Logs a `DOCUMENT_DELETE` audit event.

Allowed roles: `ADMIN`, `PARTNER`, `PARALEGAL`.

---

### GET /documents/check-duplicate?caseId=X&md5Hash=Y
Check whether a file with the given MD5 hash already exists in a case before uploading.

### POST /documents/check-duplicate
Compatibility variant for clients that send JSON body instead of query params.

**Request body**
```json
{ "caseId": "...", "md5Hash": "..." }
```

**Response 200**
```json
{
  "isDuplicate": true,
  "masterDocId": "...",
  "masterDocument": { "id": "...", "docNumber": "DOC-000003", "filename": "brief.pdf" }
}
```

---

### POST /documents/search
Advanced multi-parameter document search.

**Request body**
```json
{
  "caseId": "...",
  "custodianIds": ["...", "..."],
  "dateRange": { "from": "2023-01-01", "to": "2024-12-31" },
  "privilegeStatuses": ["ATTORNEY_CLIENT", "WORK_PRODUCT"],
  "relevanceStatuses": ["HIGHLY_RELEVANT"],
  "issueTagIds": ["..."],
  "hasNotes": true,
  "filenameQuery": "contract",
  "isDuplicate": false,
  "sortBy": "date",
  "sortOrder": "desc",
  "page": 1,
  "limit": 50
}
```

All filter fields are optional. Active filters combine with AND logic.

---

### POST /documents/export
Same filter body as `/documents/search`. Returns a CSV file download containing matching document metadata. Limited to a high-volume safety cap in the controller.

---

## Saved Searches

### POST /cases/:caseId/saved-searches
Save a named set of search filters for the authenticated user.

**Request body**
```json
{ "searchName": "Privileged Engineering Docs", "filters": { ...same shape as POST /documents/search... } }
```

### GET /cases/:caseId/saved-searches
List saved searches created by the authenticated user within this case.

### DELETE /saved-searches/:id
Delete a saved search. Only the creating user can delete their own searches.

---

## Issue Tags

### GET /cases/:caseId/tags
List all tags for a case in alphabetical order.

### POST /cases/:caseId/tags
Create a new tag. Tag names must be unique within the case.

**Request body**
```json
{ "tagName": "Hot Docs", "tagDescription": "Key evidence documents", "color": "#EF4444" }
```

### PUT /cases/:caseId/tags/:id
Update a tag. **Requires Partner or Lead role.**

### DELETE /cases/:caseId/tags/:id
Delete a tag and remove all references to it from documents. **Requires Partner or Lead role.**

### POST /documents/:id/tags
Add a tag to a document.

**Request body**
```json
{ "tagId": "..." }
```

### DELETE /documents/:id/tags/:tagId
Remove a tag from a document.

---

## Review Queue

### GET /cases/:caseId/review/queue
Returns the next unreviewed document (FIFO by `docNumber`) with populated tags and custodian. Returns `null` when the queue is empty. Logs a `DOCUMENT_VIEW` audit event.

**Query parameters**

| Parameter | Type   | Description                                |
|-----------|--------|--------------------------------------------|
| skipIds   | string | Comma-separated document IDs to skip       |

---

### POST /documents/:id/code
Submit a privilege and relevance coding decision. The response includes the next queued document so the client can pre-load it without an extra round-trip.

**Request body**
```json
{
  "privilegeStatus": "ATTORNEY_CLIENT",
  "relevanceStatus": "HIGHLY_RELEVANT",
  "notes": "Direct communication between in-house counsel and CEO re: patent strategy.",
  "isConfidential": true,
  "issueTagIds": ["...", "..."]
}
```

Valid `privilegeStatus` values: `NOT_PRIVILEGED`, `ATTORNEY_CLIENT`, `WORK_PRODUCT`, `NEEDS_REVIEW`  
Valid `relevanceStatus` values: `HIGHLY_RELEVANT`, `RELEVANT`, `MARGINAL`, `NOT_RELEVANT`

**Response 200**
```json
{
  "coded": { ...updated document... },
  "next": { ...next document or null... }
}
```

---

### GET /documents/:id/coding-history
Returns the full time-series coding history for a document queried from the audit log, with each entry showing user, timestamp, and decision details.

---

## Production Sets

### POST /cases/:caseId/productions
Create a new production set in `DRAFT` status. **Lead, Partner, or Admin.**

**Request body**
```json
{ "setName": "PROD-001", "description": "First rolling production" }
```

### GET /cases/:caseId/productions
List all production sets for a case, sorted by creation date descending.

### GET /productions/:id
Fetch a single production set with populated document details.

### POST /productions/:id/documents
Add documents to a `DRAFT` production set. Privileged documents are rejected.

**Request body**
```json
{ "documentIds": ["...", "..."] }
```

Bates numbers are assigned sequentially in the format `{setName}-000001`.

### DELETE /productions/:id/documents/:documentId
Remove a document from a `DRAFT` production set. Bates numbers of remaining documents are **not** re-sequenced — they remain immutable once assigned.

### PUT /productions/:id/approve
Advance the production status from `IN_REVIEW` to `APPROVED`. **Partner or Admin only.**

### PUT /productions/:id/produce
Advance from `APPROVED` to `PRODUCED`, stamping `producedAt`. **Partner or Admin only.**

### GET /productions/:id/export
Download the production metadata as a CSV file containing Bates number, doc number, filename, custodian, date, privilege, and relevance for each document.

---

## Analytics

All analytics endpoints require authentication.

### GET /analytics
Returns platform-wide dashboard analytics used by the global analytics page.

**Response 200**
```json
{
  "overview": {
    "totalCases": 12,
    "activeCases": 8,
    "totalDocuments": 45678,
    "reviewedDocuments": 32456,
    "totalUsers": 24,
    "activeUsers": 18
  },
  "reviewProgress": {
    "byCase": [{ "name": "Case A", "total": 1200, "reviewed": 850, "percentage": 70.8 }],
    "dailyReviews": [450, 520, 480, 610, 590, 720, 680],
    "weeklyTrend": [3200, 3400, 3100, 3800, 3600, 4200, 3900]
  },
  "userActivity": {
    "topReviewers": [{ "name": "Reviewer A", "reviews": 1247, "hours": 86.5, "accuracy": 96.2 }]
  },
  "documentStats": {
    "byType": [{ "type": "PDF", "count": 23456, "percentage": 51.4 }],
    "byCustodian": [{ "name": "Custodian A", "count": 12500 }],
    "codingStats": {
      "relevance": { "relevant": 18500, "notRelevant": 13956 },
      "privilege": { "privileged": 2345, "notPrivileged": 30111 },
      "confidential": { "yes": 8900, "no": 23556 }
    }
  },
  "timeline": {
    "uploads": [1200, 1500, 1100, 1800, 1600, 2000, 1700],
    "reviews": [450, 520, 480, 610, 590, 720, 680]
  }
}
```

Case-scoped analytics endpoints:

### GET /cases/:caseId/analytics
Returns document totals (total, reviewed, pending), review progress percentage, and aggregated privilege and relevance breakdowns.

**Response 200**
```json
{
  "totalDocuments": 1200,
  "reviewedDocuments": 843,
  "pendingDocuments": 357,
  "reviewProgress": 70.25,
  "relevanceBreakdown": { "HIGHLY_RELEVANT": 120, "RELEVANT": 340, "MARGINAL": 200, "NOT_RELEVANT": 183 },
  "privilegeBreakdown": { "NOT_PRIVILEGED": 700, "ATTORNEY_CLIENT": 88, "WORK_PRODUCT": 35, "NEEDS_REVIEW": 20 }
}
```

### GET /cases/:caseId/analytics/team
Returns per-reviewer metrics: documents reviewed and average time per document in minutes.

### GET /cases/:caseId/analytics/progress
Returns daily upload and review counts grouped by date for the last 30 days (configurable).

---

## Dashboard

### GET /dashboard/stats
Returns platform-level summary statistics. Admins see all cases; other roles see only their assigned cases.

**Response 200**
```json
{ "activeCases": 12, "totalDocuments": 45000, "pendingReview": 8200 }
```

### GET /dashboard/activity
Returns a paginated list of recent document upload and review events with case names.

### GET /dashboard/overview
Returns a list of active cases with document counts and per-case review progress percentages.

---

## Notifications

### GET /notifications
Returns paginated notifications for the authenticated user.

**Query parameters**

| Parameter  | Type    | Description                              |
|------------|---------|------------------------------------------|
| unreadOnly | boolean | If `true`, returns only unread items     |
| page       | number  | Page number (default: 1)                 |

**Response 200** also includes `unreadCount`.

### PATCH /notifications/:id/read
Mark a single notification as read.

### PATCH /notifications/read-all
Mark all of the authenticated user's notifications as read.

### DELETE /notifications/:id
Delete a single notification. Ownership is verified.

### POST /notifications/delete-batch
Delete multiple notifications by ID array.

**Request body**
```json
{ "ids": ["...", "..."] }
```

---

## Users (Admin)

### GET /users
List all users with optional role filter and pagination. **Admin only.**

### GET /users/role/:role
List active users by role. Used to populate team assignment dropdowns.

### GET /users/:id
Fetch a single user by ID. **Admin only.**

### PUT /users/:id
Update user profile fields or role. **Admin only.**

**Updatable fields:** `firstName`, `lastName`, `role`, `isActive`

### PATCH /users/:id/deactivate
Deactivate a user account. Cannot deactivate your own account. **Admin only.**

### PATCH /users/:id/activate
Reactivate a deactivated user account. **Admin only.**

### PATCH /users/:id/password
Change a user's password. Users may change their own password; Admins may change any user's.

**Request body**
```json
{ "currentPassword": "OldPass123!", "newPassword": "NewPass456!" }
```

### DELETE /users/:id
Permanently delete a user record. **Admin only.**

---

## Health Check

### GET /api/health
Returns server and timestamp. No authentication required.

**Response 200**
```json
{ "success": true, "message": "Server operational", "timestamp": "2026-03-06T08:00:00.000Z" }
```
