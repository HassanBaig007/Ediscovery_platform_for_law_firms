# Project Review 2

Details of work done to be written here

1. Case data model was finalized with unique case numbers, party metadata, status lifecycle fields, and embedded team assignments.
2. Team membership subdocuments capture user reference, case role, and assignment timestamp to preserve assignment history context.
3. Case schema applies JSON normalization to expose id consistently and hide persistence internals from client payloads.
4. Case creation flow automatically inserts creator as LEAD, guaranteeing initial ownership and eliminating orphan case records.
5. Case retrieval endpoint supports pagination controls for page and limit to handle increasing matter volumes.
6. Case retrieval supports status filtering, search by case, client, and case number, plus sort controls for operational triage workflows.
7. Case list responses return status distribution counters (total, active, closed, archived) for dashboard-style quick insight.
8. Role-aware scoping ensures associates and paralegals only receive cases where they are explicitly assigned on team.user.
9. Synthetic data suppression filters were integrated into case queries to keep production-quality views focused on real datasets.
10. Case by-id retrieval enforces team membership or elevated role checks before payload access is granted.
11. Case update logic enforces admin-or-lead permissions to prevent unauthorized matter metadata changes.
12. Case deletion was implemented as soft-delete via ARCHIVED status to preserve historical traceability.
13. Team member addition endpoint includes authorization checks for lead/admin governance over staffing changes.
14. Duplicate team assignment protection blocks adding the same user to a case team more than once.
15. Team member removal flow includes business-rule enforcement preventing removal of the final LEAD on a case.
16. Available-user discovery endpoint returns active users not already on the target case team, simplifying assignment UX.
17. Team-add operations trigger internal notifications to newly assigned users for immediate awareness of case onboarding.
18. Custodian model was introduced with case linkage and indexed email lookups for efficient per-case personnel management.
19. Custodian creation validates parent-case existence to prevent detached custodial records.
20. Custodian creation enforces per-case email uniqueness to avoid identity ambiguity during ingestion and review.
21. Custodian update flow checks for intra-case email conflicts before persisting changes.
22. Custodian deletion is blocked when documents remain assigned, preserving referential integrity in evidence ownership.
23. Issue-tag model was established with case scoping, optional descriptions, and color metadata for visual taxonomy.
24. Compound uniqueness on caseId plus tagName prevents duplicate tag labels within a single case taxonomy.
25. Tag CRUD endpoints were implemented for case-level taxonomy curation across create, read, update, and delete operations.
26. Document tag assignment endpoint prevents duplicate tag attachment to a document record.
27. Tag deletion includes cleanup behavior that pulls deleted tag references from all affected documents.
28. Notification model and API were implemented with user scoping, unread tracking, metadata payloads, and pagination-ready queries.
29. Notification operations include mark-one-read, mark-all-read, single delete, and batch delete to support inbox hygiene workflows.
30. Internal createNotification helper was added for controller-level system events without exposing a public notification-creation endpoint.
31. Dashboard statistics endpoint computes active cases, total documents, and pending review with role-aware dataset scoping.
32. Recent activity endpoint assembles upload and review timeline entries from case-accessible document activity.
33. Case overview endpoint computes per-case reviewed-document progress percentages for at-a-glance portfolio monitoring.
34. Analytics route group was implemented for platform, per-case, team-performance, and daily-progress datasets.
35. Analytics controller uses server-side MongoDB aggregations to produce chart-ready outputs rather than client-side heavy computation.
36. Audit log persistence model was established to capture user, action, entity type, details, and source IP metadata.
37. Audit log listing endpoint supports filterable, paginated retrieval with populated user identity fields for admin traceability.
38. Frontend case store centralizes case CRUD, pagination, filtering, and team management actions in a single Zustand module.
39. Core operational pages were integrated for Cases, Case Detail, Case Settings, Custodians, and Tags with navigation and modal workflows.
40. Platform operational UI was expanded with dashboard, notifications, analytics, audit logs, and role-aware sidebar sections for day-to-day legal operations.
