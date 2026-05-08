Project progress diary
Review No: 5
Date of Review: 24-April-2026
Name of the College: Nitte Meenakshi Institute of Technology
Title of the Project: "Legal e-Discovery Platform: Digital Transformation of Litigation Document Review"
Name of the organization: Nitte Meenakshi Institute of Technology
Name of the Student: Hassan Baig
USN: 1NT24MC032
Name of the Internal Guide: Dr. Vishwanath C R
Name of the External Guide: Vidya NK

From – 06-Mar-2026 To – 24-Apr-2026

---

Details of work done:

1. Comprehensive manual role-based workflow testing was conducted across all user roles (ADMIN, PARTNER, ASSOCIATE, PARALEGAL) following the documented workflows in ROLES_AND_WORKFLOWS.md, producing a structured issue catalog with severity classifications.

2. ASSOCIATE dashboard was verified to correctly display a personalised time-of-day greeting with the user's first name, a role badge, and role-scoped quick actions (My Cases, Search Documents, Review Queue) while correctly suppressing Create Case and Upload Documents actions that exceed the role's permission boundary.

3. PARTNER dashboard was verified to display correctly with role-appropriate quick actions including My Cases, Analytics, and Audit Logs, and the cases overview section renders per-case progress bars sourced from live backend data.

4. Review page architecture was confirmed to use a ReviewContext provider pattern that wraps a split-layout interface combining the DocumentViewer, CodingPanel, and RedactionPanel components, with panel collapse and tab-switching between coding and redaction modes implemented via animated transitions.

5. Document download from the review interface was verified to function correctly, streaming the file through the protected backend endpoint and triggering a browser download with the correct filename and content headers.

6. Production set creation was verified end-to-end: a PARTNER user successfully created a production set with DRAFT status, added documents from the available document list, observed Bates numbers assigned sequentially (e.g., PROD-001-000001 through PROD-001-000006), submitted for review transitioning status to IN_REVIEW, approved the set transitioning to APPROVED, and marked as produced transitioning to PRODUCED.

7. Production CSV export was verified to download successfully and to contain structured columns including Bates Number, Document ID, Doc Number, Filename, File Type, File Size (Bytes), Custodian, Document Date, Privilege Status, and Relevance Status, confirming the export pipeline is functional.

8. Production set detail view was verified to display the set name, status badge, document count, creation timestamp, description, and a per-document Bates manifest listing Bates number against filename for all documents in the set.

9. A critical gap was identified in the review queue: the Review page loads a hardcoded document automatically rather than dynamically fetching the next unreviewed document from the case queue, and no "Start Review" entry-point button exists on the case detail page, blocking the ASSOCIATE primary workflow.

10. Document coding persistence was identified as unverified: the CodingPanel UI renders privilege status, relevance status, confidentiality flag, and notes fields correctly, but no success or error feedback is surfaced after clicking Save & Next, leaving it unclear whether coding decisions are written to the database.

11. The Documents tab on the Case Detail page was found to render an empty or non-functional state for the ASSOCIATE role, preventing associates from viewing the document list, verifying applied coding, or monitoring review progress after completing review sessions.

12. The Documents tab for the PARTNER role was found to render a button grid (Open Data Grid, Processing Status, Chain of Custody, Quality Control, Production Sets) rather than a unified document table, and the Open Data Grid action incorrectly routes to the search interface instead of a filterable document list.

13. Privilege-based filtering in the Add Documents modal of the production workflow was identified as absent: the modal presents a flat document list without privilege status, relevance status, or custodian filters, requiring manual document selection without automated safeguards against adding privileged material.

14. Custodian assignment was identified as not persisting from the document upload flow to the document metadata: documents uploaded with a custodian selection show no custodian in the production Add Documents modal, and the production CSV export reflects hardcoded seeded custodian names rather than the custodians assigned during ingestion.

15. User identity resolution in the production detail view was identified as incomplete: the Created By and Approved By fields display raw MongoDB ObjectId strings rather than resolved user names, degrading the audit readability of the production record.

16. Production edit-lock enforcement after the PRODUCED status transition was identified as unverified: the UI surfaces a download button on produced sets but provides no visible disabled state on add or remove document controls, and backend enforcement of the lock could not be confirmed through the UI alone.

17. A seeded-data suppression filter was implemented in the dashboard activity feed to exclude synthetic test documents matching a known filename pattern, ensuring the Recent Activity section reflects only genuine user-generated document events rather than seed data noise.

18. Role-aware dataset scoping on the dashboard statistics endpoint was confirmed to be implemented: ADMIN and PARTNER users receive platform-wide counts while ASSOCIATE and PARALEGAL users receive counts scoped to their assigned cases, providing personally relevant workload metrics.

19. The DocumentTable component was confirmed to use AG Grid with community modules registered, providing column-level filtering, sorting, and pagination at 20 rows per page, with action columns for view, download, and role-gated delete operations.

20. The CaseDetail page was confirmed to implement role-aware permission flags (canManageCase, canUploadToCase, canReviewCase, canManageTeam) derived from the user's global role and their case-scoped role, controlling which action buttons are rendered per tab.

21. The ReviewContext provider was confirmed to manage document loading state, error state, and current document reference, with the Review page consuming these values to conditionally render loading skeletons, an empty-queue empty state, or the full split-layout review interface.

22. The BatesNumberingModal component was confirmed to support configurable prefix, suffix, start number, and digit-padding fields with a live format preview, and to call the production Bates endpoint via the useBatesNumbering hook with success and error handling.

23. A comprehensive manual testing issues document (MANUAL_TESTING_ISSUES_REVIEW.md) was produced cataloguing 8 critical issues, 5 high-priority issues, and 3 medium-priority issues with root cause analysis, impact assessment, and a phased remediation roadmap covering four phases across an estimated six-week resolution timeline.

24. The ROLES_AND_WORKFLOWS.md reference document was established to define the two-tier RBAC model (global user roles and case-scoped roles), the permission matrix for all four global roles, and the expected behaviour for each role across all core platform workflows.

25. The production status state machine was confirmed to implement all four transitions (DRAFT → IN_REVIEW → APPROVED → PRODUCED) with the markAsProduced endpoint wired to the PUT /productions/:id/produce route, and the approval gate enforcing Partner or Admin role at the business logic layer in addition to route-level middleware.

26. The frontend authentication flow was confirmed to use an isRefreshing semaphore with a request queue to deduplicate concurrent token refresh attempts at access token expiry boundaries, preventing parallel refresh races that would invalidate each other.

27. The ProtectedRoute component was confirmed to block unauthenticated navigation and redirect to the login route, and the Zustand auth store was confirmed to persist authentication state across page reloads without requiring custom storage implementation.

28. The application shell was confirmed to use a MainLayout with a role-aware sidebar that conditionally renders navigation sections (Analytics, Audit Logs, User Management) based on the authenticated user's global role, providing appropriate navigation scope per role.

29. The enhanced routes module was confirmed to expose collaborative review, redaction, production, security, and health route groups, with all routes protected by the JWT authentication middleware and role-specific guards applied at the route level.

30. A phased remediation plan was defined with Phase 1 targeting the review queue dynamic loading, coding persistence, unified documents tab, and document viewer integration; Phase 2 targeting custodian assignment persistence, production add-documents filters, export metadata completeness, review audit trail, and user name resolution; Phase 3 targeting toast notification coverage, documents tab navigation consistency, production edit-lock UI enforcement, and review queue entry-point UX; and Phase 4 targeting end-to-end workflow validation across all roles with a fresh database.

---

………………………………
Signature of Internal Guide
with date

………………………………
Signature of External Guide
with date

………………………………
Signature of H.O.D with
date
