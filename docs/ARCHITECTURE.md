# System Architecture

## Overview

The Legal e-Discovery Platform is a multi-tier web application built around a standard MERN stack (MongoDB, Express, React, Node.js). The system digitises every stage of the litigation document review lifecycle — from evidence collection through privilege review to court-ready production.

```
┌─────────────────────────────────────────────────────┐
│                   Browser Client                    │
│         React 19 / Vite / TypeScript                │
│   Zustand · TanStack Query · Axios · Tailwind CSS   │
└──────────────────────┬──────────────────────────────┘
                       │  HTTPS / REST + JSON
┌──────────────────────▼──────────────────────────────┐
│               Express.js API Server                 │
│   Node.js v20 · Express 5 · TypeScript strict mode  │
│      JWT auth middleware · RBAC middleware           │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
┌──────────▼──────────┐  ┌─────────▼──────────────────┐
│   MongoDB (Mongoose)│  │   Local Filesystem          │
│   ediscovery_db     │  │   uploads/{caseId}/         │
│   9 collections     │  │   {custodianId}/{file}      │
└─────────────────────┘  └────────────────────────────┘
```

---

## Backend

### Entry Point

`server/src/server.ts` bootstraps the Express application in this order:

1. Environment validation (throws on missing secrets)
2. Database connection (`database.ts`)
3. Middleware chain: `express.json` → CORS → Morgan request logging
4. Route mounting
5. Global error handler

### Route Structure

All routes are mounted under `/api`:

| Prefix                        | Router file                      |
|-------------------------------|----------------------------------|
| `/api/auth`                   | `routes/authRoutes.ts`           |
| `/api/cases`                  | `routes/case.routes.ts`          |
| `/api/users`                  | `routes/user.routes.ts`          |
| `/api/notifications`          | `routes/notification.routes.ts`  |
| `/api/dashboard`              | `routes/dashboard.routes.ts`     |
| `/api` (case-scoped resources)| `routes/custodian.routes.ts` · `routes/document.routes.ts` · `routes/tag.routes.ts` · `routes/review.routes.ts` · `routes/production.routes.ts` · `routes/analytics.routes.ts` |

### Middleware Stack

```
Request
  └─ express.json parser
  └─ cors (origin from CORS_ORIGIN env)
  └─ morgan HTTP logger
  └─ protect(req, res, next)        ← verifies Bearer JWT, attaches req.user
  └─ authorize(...roles)            ← firm-level RBAC guard
  └─ checkCaseAccess                ← case-scoped team membership guard
  └─ isProductionLocked             ← prevents mutation of PRODUCED sets
  └─ Route handler
```

`protect` extracts the access token, verifies it with `JWT_ACCESS_SECRET`, loads the full user from MongoDB, and attaches it to `req.user` as `IUserDocument`. If the token is expired the client receives a 401 and is expected to call `POST /auth/refresh`.

### Authentication Flow

```
Login ──► accessToken (1 day) + refreshToken (7 days)
              │                        │
              │                        └──► POST /auth/refresh
    API calls (Authorization header)         └──► new accessToken
```

Tokens are signed with separate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` environment variables. The server throws `Error` at startup if either is absent.

Password reset uses a `crypto.randomBytes(32)` token stored hashed in the database with a 1-hour expiry. The plaintext token is never included in HTTP responses — it is delivered out-of-band (email).

### Audit Logging

Every significant action is written to the `AuditLog` collection via a fire-and-forget helper. Logged events include:

| Event                  | Trigger                              |
|------------------------|--------------------------------------|
| `DOCUMENT_UPLOADED`    | Successful file upload               |
| `DOCUMENT_VIEW`        | `GET /documents/:id` or review queue |
| `DOCUMENT_DOWNLOAD`    | File stream served                   |
| `DOCUMENT_CODED`       | Privilege/relevance coding submitted |
| `CASE_CREATED`         | New case persisted                   |
| `CASE_STATUS_CHANGED`  | Case status updated                  |
| `USER_CREATED`         | Admin registers new user             |
| `PRODUCTION_APPROVED`  | Partner approves set                 |
| `PRODUCTION_PRODUCED`  | Set marked as produced               |

The `getCodingHistory` endpoint reads from this log to return an immutable time-series for each document.

### File Storage

Uploaded files are buffered in memory by Multer and then written to:
```
uploads/
  {caseId}/
    {custodianId}/
      {md5Hash}.{ext}
```

Files are identified by their MD5 hash. Before writing, the hash is checked against the `Document` collection; if a match is found, only a metadata record is created pointing at the master document (`masterDocId`). This deduplication is exposed to the client via `GET /documents/check-duplicate`.

---

## Database

### MongoDB Collections

| Collection     | Purpose                                              |
|----------------|------------------------------------------------------|
| `users`        | Firm-level accounts with RBAC role and auth fields   |
| `cases`        | Matter metadata and embedded team array              |
| `custodians`   | People whose documents are under review              |
| `documents`    | Per-file records — metadata, coding decision, hash  |
| `issuetags`    | Case-scoped labels applied during review             |
| `productionsets`| Bates-numbered document packages                   |
| `auditlogs`    | Immutable record of every user action                |
| `notifications`| In-app user notification messages                   |
| `savedsearches`| Persisted search filter sets                         |

### Key Relationships

```
Case ──── contains ──── Custodian (many)
  │          │               │
  │          │           Document (many)
  │          │               │
  │      IssueTag (many)    AuditLog (many)
  │
  └──── Team Member (embedded array, userId + role)
  │
  └──── ProductionSet (many)
              │
          Document[] (refs with Bates numbers)
```

### Document Model — Key Fields

| Field              | Type     | Description                               |
|--------------------|----------|-------------------------------------------|
| `docNumber`        | string   | Sequential, auto-generated, case-scoped   |
| `md5Hash`          | string   | File fingerprint for deduplication        |
| `masterDocId`      | ObjectId | Set when document is a duplicate          |
| `privilegeStatus`  | enum     | NOT_PRIVILEGED, ATTORNEY_CLIENT, etc.     |
| `relevanceStatus`  | enum     | HIGHLY_RELEVANT, RELEVANT, etc.           |
| `reviewedAt`       | Date     | Timestamp of first coding decision        |
| `reviewedBy`       | ObjectId | User who submitted the coding             |
| `isConfidential`   | boolean  | Withheld-from-opposing-party flag         |

---

## Frontend

### Tech Stack

| Layer         | Library                  | Version |
|---------------|--------------------------|---------|
| Framework     | React                    | 19      |
| Build tool    | Vite                     | 7       |
| Routing       | React Router             | 7       |
| State         | Zustand                  | 5       |
| Server state  | TanStack Query           | 5       |
| HTTP          | Axios                    | 1.x     |
| UI primitives | Radix UI                 | latest  |
| Styling       | Tailwind CSS             | 3.4     |
| Animation     | Framer Motion            | 12      |
| Tables        | AG Grid Community        | 35      |
| Charts        | Recharts                 | 2.x     |

### State Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Zustand Stores                         │
│                                                          │
│   authStore ─── user, accessToken, isAuthenticated       │
│   caseStore ─── activeCaseId, cases[]                    │
│   searchStore ── activeFilters, savedSearchId            │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│              TanStack Query Cache                         │
│                                                          │
│   Server-derived data — cases, documents, productions    │
│   Per-query stale time and refetch configuration         │
└──────────────────────────────────────────────────────────┘
```

### Token Refresh

The axios instance in `services/api.ts` installs a **response interceptor** that catches 401 errors and calls `POST /auth/refresh`. Concurrent requests that arrive during the refresh are queued and replayed once the new token is available. If the refresh itself fails, the user is signed out.

### Routing

All application routes are wrapped with `<ProtectedRoute>`. Role-specific pages additionally check whether the authenticated user holds the required firm role before rendering.

```
/                    → redirect to /dashboard
/login               → public
/dashboard           → ProtectedRoute (all roles)
/cases               → ProtectedRoute (all roles)
/cases/:id/*         → ProtectedRoute + case membership
  /documents         → document list + advanced search
  /review            → review queue
  /productions       → production set management
  /analytics         → case analytics charts
/admin/users         → ProtectedRoute (ADMIN only)
```

---

## Security

| Control                | Implementation                                             |
|------------------------|------------------------------------------------------------|
| Authentication         | JWT HS256, short-lived access + rotate-on-use refresh      |
| Authorisation          | Firm-level RBAC + case-team scoping on every route         |
| Secrets                | All secrets from environment variables; startup throw if absent |
| Password storage       | bcrypt, salt rounds 10                                     |
| Password reset entropy | `crypto.randomBytes(32)`, token never in HTTP response     |
| CORS                   | Origin from `CORS_ORIGIN` env var                          |
| File validation        | MIME type and extension allowlist enforced by Multer       |
| PII in logs            | All `[DEBUG]` logs emitting email or user data were removed|
| Audit trail            | Immutable append-only `AuditLog` collection                |
| Bates integrity        | Sequence numbers never re-used or re-sequenced             |

---

## Deployment Topology

```
                  ┌────────────┐
                  │  Browser   │
                  └─────┬──────┘
                        │ HTTPS
               ┌────────▼────────┐
               │   Static CDN    │   ← Vite build output (dist/)
               │  (e.g. Netlify) │
               └────────┬────────┘
                        │ HTTPS
               ┌────────▼────────┐
               │  API Server     │   ← Node.js / Express
               │  (e.g. Render)  │
               └────┬────────┬───┘
                    │        │
          ┌─────────▼─┐  ┌───▼──────────────┐
          │  MongoDB  │  │  File Storage     │
          │  Atlas    │  │  (uploads/ dir or │
          └───────────┘  │   object storage) │
                         └──────────────────┘
```

The `netlify.toml` in `server/` is present for Netlify Functions deployment as an alternative to a persistent server.
