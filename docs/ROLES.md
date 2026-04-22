# Role-Based Access Control Reference

The platform enforces two overlapping layers of access control: a **firm-level role** attached to every user account, and a **case-scoped role** assigned when a user is added to a case team. Both must be satisfied for any protected operation.

---

## Firm-Level Roles

Every user has exactly one firm role. This controls access to global platform features.

| Role       | Description                                                           |
|------------|-----------------------------------------------------------------------|
| `ADMIN`    | Full platform access. Manages users, all cases, and system settings.  |
| `PARTNER`  | Senior legal staff. Full access to assigned cases; can approve and produce production sets. |
| `ASSOCIATE`| Attorney. Can review documents and manage cases they are assigned to.  |
| `PARALEGAL`| Legal support. Can upload documents and assist in review on assigned cases. |

---

## Case-Scoped Team Roles

When a user is added to a case (`POST /cases/:id/team`), they are assigned a team role for that case in addition to their firm role.

| Team Role   | Description                                            |
|-------------|--------------------------------------------------------|
| `LEAD`      | Case lead. Can manage team membership, update case metadata, and manage tags. |
| `REVIEWER`  | Performs privilege and relevance coding review.        |
| `PARALEGAL` | Uploads documents and assists with organisation. Mirrors the firm-level paralegal function but scoped to this case. |

A user must appear in a case's team array to access any of that case's resources (documents, productions, analytics, etc.). Admins and Partners bypass this check — they can access any case.

---

## Permission Matrix

### Global Permissions (firm role only)

| Action                        | ADMIN | PARTNER | ASSOCIATE | PARALEGAL |
|-------------------------------|:-----:|:-------:|:---------:|:---------:|
| Register new users            | ✅    | ❌      | ❌        | ❌        |
| View all users                | ✅    | ❌      | ❌        | ❌        |
| Update / deactivate users     | ✅    | ❌      | ❌        | ❌        |
| View all cases                | ✅    | ✅      | ❌ *      | ❌ *      |
| Create a case                 | ✅    | ✅      | ✅        | ❌        |

\* Associates and Paralegals see only cases they are team members of.

---

### Case-Level Permissions

These require both case membership **and** the appropriate firm or team role.

| Action                              | Admin | Partner | Lead | Reviewer | Paralegal |
|-------------------------------------|:-----:|:-------:|:----:|:--------:|:---------:|
| View case                           | ✅    | ✅      | ✅   | ✅       | ✅        |
| Update case metadata                | ✅    | ✅      | ✅   | ❌       | ❌        |
| Archive/delete case                 | ✅    | ❌      | ❌   | ❌       | ❌        |
| Add/remove team members             | ✅    | ✅      | ✅   | ❌       | ❌        |
| Upload documents                    | ✅    | ✅      | ✅   | ❌       | ✅        |
| View documents                      | ✅    | ✅      | ✅   | ✅       | ✅        |
| Download documents                  | ✅    | ✅      | ✅   | ✅       | ✅        |
| Code documents (review queue)       | ✅    | ✅      | ✅   | ✅       | ❌        |
| Create/update issue tags            | ✅    | ✅      | ✅   | ❌       | ❌        |
| Delete issue tags                   | ✅    | ✅      | ✅   | ❌       | ❌        |
| Create production set               | ✅    | ✅      | ✅   | ❌       | ❌        |
| Add/remove documents in draft set   | ✅    | ✅      | ✅   | ❌       | ❌        |
| Approve production set              | ✅    | ✅      | ❌   | ❌       | ❌        |
| Mark production as produced         | ✅    | ✅      | ❌   | ❌       | ❌        |
| View analytics                      | ✅    | ✅      | ✅   | ✅       | ✅        |

---

## Production Set State Machine

Production sets follow a strict one-way status progression. Each transition requires escalating authority.

```
DRAFT
  │  (add/remove documents, assign Bates numbers)
  │  Any team Lead, Partner, Admin
  ▼
IN_REVIEW
  │  (under Partner review)
  │  Partner or Admin
  ▼
APPROVED
  │  (documents finalised — no further mutation allowed)
  │  Partner or Admin
  ▼
PRODUCED
     (timestamped, delivered to opposing counsel)
```

The `isProductionLocked` middleware blocks all mutation requests on any set that has reached `PRODUCED` status.

Bates numbers are assigned at the time a document is added to a `DRAFT` set and are **never re-sequenced** — even if documents are subsequently removed — to preserve chain-of-custody integrity.

---

## Privilege Status Values

| Value              | Meaning                                                        |
|--------------------|----------------------------------------------------------------|
| `NOT_PRIVILEGED`   | Document has no privilege claim; can be produced              |
| `ATTORNEY_CLIENT`  | Protected by attorney-client privilege; withheld              |
| `WORK_PRODUCT`     | Protected work product doctrine; withheld                     |
| `NEEDS_REVIEW`     | Privilege determination is deferred; requires senior review   |

Documents with any status other than `NOT_PRIVILEGED` are blocked from being added to a production set.

---

## Relevance Status Values

| Value              | Meaning                                                   |
|--------------------|-----------------------------------------------------------|
| `HIGHLY_RELEVANT`  | Directly on point to a key issue in the matter           |
| `RELEVANT`         | Has probative value                                       |
| `MARGINAL`         | Tangentially related                                      |
| `NOT_RELEVANT`     | No bearing on any issue in the matter                     |

---

## Audit Trail

All role-governed actions are written to the `AuditLog` collection. Each entry records:

- `userId` — the user who performed the action
- `action` — the event type (e.g. `DOCUMENT_CODED`, `PRODUCTION_APPROVED`)
- `entityType` — the Mongoose model involved
- `entityId` — the ObjectId of the affected document, case, or production set
- `details` — action-specific JSON payload (e.g. privilege and relevance values)
- `createdAt` — UTC timestamp

Audit log entries are never modified or deleted. They form the authoritative record for chain-of-custody and legal defensibility.
