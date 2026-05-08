# eDiscovery Platform - Roles and Workflows Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Role Hierarchy](#role-hierarchy)
3. [Global User Roles](#global-user-roles)
4. [Case-Scoped Roles](#case-scoped-roles)
5. [Permission Matrix](#permission-matrix)
6. [Core Workflows](#core-workflows)
7. [Role Interactions](#role-interactions)
8. [Access Control Implementation](#access-control-implementation)

---

## System Overview

The eDiscovery platform implements a **two-tier role-based access control (RBAC) system**:

1. **Global User Roles** - System-wide permissions assigned to users
2. **Case-Scoped Roles** - Per-case permissions assigned to team members

This dual-role system allows flexible access control where users can have different responsibilities across different cases while maintaining consistent system-level permissions.

---

## Role Hierarchy

### Global User Roles
```
ADMIN (Highest Authority)
  └── PARTNER (Case Creation & Management)
      └── ASSOCIATE (Document Review)
          └── PARALEGAL (Document Upload & Support)
```

### Case-Scoped Roles
```
LEAD (Case Manager)
  └── REVIEWER (Document Reviewer)
      └── PARALEGAL (Support Staff)
```

---

## Global User Roles

### 1. ADMIN (Administrator)
**System-Wide Authority**

#### Capabilities
- **Full System Access**: Complete control over all features and data
- **User Management**: Create, edit, delete, and manage all user accounts
- **Audit & Compliance**: Access to all audit logs and system reports
- **System Configuration**: Manage system settings and configurations
- **Case Management**: Create, edit, and manage all cases
- **Production Approval**: Approve and finalize production sets
- **Elevated Access**: Automatic elevated permissions on all cases

#### Key Permissions
- Create/edit/delete users
- Access all cases regardless of team membership
- View complete audit trails
- Approve productions
- System-wide search and reporting
- Manage system settings

#### Typical Use Cases
- System administration and maintenance
- User account management
- Compliance and audit oversight
- Emergency case access
- System configuration

---

### 2. PARTNER
**Senior Legal Professional**

#### Capabilities
- **Case Creation**: Create new cases and become automatic LEAD
- **Team Management**: Assign team members to cases
- **Production Approval**: Review and approve production sets
- **Document Review**: Full document review capabilities
- **Elevated Access**: Enhanced permissions across cases
- **Strategic Oversight**: Monitor case progress and metrics

#### Key Permissions
- Create new cases
- Manage case teams
- Approve productions
- Review and code documents
- Upload documents
- Manage custodians
- Access dashboard analytics

#### Typical Use Cases
- Creating new cases for clients
- Assembling case teams
- Reviewing critical documents
- Approving document productions
- Strategic case oversight

---

### 3. ASSOCIATE
**Legal Professional - Document Review Focus**

#### Capabilities
- **Document Review**: Primary responsibility is reviewing and coding documents
- **Case Participation**: Participate in cases as team member
- **Coding & Tagging**: Apply privilege, relevance, and issue tags
- **Search & Analysis**: Search documents and analyze results
- **Limited Management**: Cannot create cases or manage teams

#### Key Permissions
- Review and code documents
- Apply privilege and relevance designations
- Add issue tags
- Search documents
- View case details
- Participate in assigned cases

#### Typical Use Cases
- First-pass document review
- Privilege review
- Relevance coding
- Issue identification
- Document analysis

---

### 4. PARALEGAL
**Legal Support Professional**

#### Capabilities
- **Document Upload**: Primary responsibility for document ingestion
- **Custodian Management**: Manage custodian information
- **Case Support**: Support case teams with administrative tasks
- **Production Preparation**: Assist in preparing production sets
- **Limited Review**: Can participate in document review if assigned

#### Key Permissions
- Upload documents to cases
- Manage custodians
- Create production sets (DRAFT status)
- Add documents to productions
- View case information
- Participate in assigned cases

#### Typical Use Cases
- Uploading client documents
- Managing custodian data
- Preparing production sets
- Supporting case teams
- Document organization

---

## Case-Scoped Roles

### 1. LEAD (Lead Counsel)
**Case Manager**

#### Capabilities
- **Case Management**: Full control over assigned case
- **Team Management**: Add/remove team members, assign roles
- **Document Management**: Upload, organize, and manage documents
- **Production Management**: Create, manage, and submit productions
- **Strategic Decisions**: Make key case decisions
- **Quality Control**: Review team work and ensure quality

#### Key Permissions
- Edit case details
- Manage case team
- Upload documents
- Create and manage productions
- Assign reviewers
- View all case analytics
- Manage custodians and tags

#### Assignment
- Automatically assigned to case creator (PARTNER/ADMIN)
- Can be explicitly assigned by ADMIN/PARTNER

---

### 2. REVIEWER
**Document Reviewer**

#### Capabilities
- **Document Review Only**: Focused on reviewing and coding documents
- **No Management**: Cannot manage case, team, or productions
- **Coding Authority**: Apply privilege, relevance, and tags
- **Queue-Based Work**: Work through assigned review queue

#### Key Permissions
- Review documents
- Code documents (privilege, relevance)
- Add issue tags
- View case documents
- Search within case

#### Assignment
- Explicitly assigned by LEAD or ADMIN/PARTNER
- Typically ASSOCIATE global role users

---

### 3. PARALEGAL (Case-Level)
**Case Support Staff**

#### Capabilities
- **Document Upload**: Upload documents to case
- **Custodian Management**: Manage case custodians
- **Production Support**: Assist with production preparation
- **Limited Access**: Cannot review or manage case

#### Key Permissions
- Upload documents
- Manage custodians
- View case information
- Add documents to productions

#### Assignment
- Explicitly assigned by LEAD or ADMIN/PARTNER
- Typically PARALEGAL global role users

---

## Permission Matrix

### Feature Access by Global Role

| Feature | ADMIN | PARTNER | ASSOCIATE | PARALEGAL |
|---------|-------|---------|-----------|-----------|
| Create Cases | ✅ | ✅ | ❌ | ❌ |
| View All Cases | ✅ | ✅ | ❌ | ❌ |
| Upload Documents | ✅ | ✅ | ❌ | ✅ |
| Review Documents | ✅ | ✅ | ✅ | ❌* |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Approve Productions | ✅ | ✅ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ |
| Manage Custodians | ✅ | ✅ | ❌ | ✅ |
| Create Productions | ✅ | ✅ | ❌ | ✅** |

*Can review if assigned as REVIEWER on case  
**Can create DRAFT productions only

### Feature Access by Case Role

| Feature | LEAD | REVIEWER | PARALEGAL |
|---------|------|----------|-----------|
| Edit Case Details | ✅ | ❌ | ❌ |
| Manage Team | ✅ | ❌ | ❌ |
| Upload Documents | ✅ | ❌ | ✅ |
| Review Documents | ✅ | ✅ | ❌ |
| Create Productions | ✅ | ❌ | ✅ |
| Manage Custodians | ✅ | ❌ | ✅ |
| View Analytics | ✅ | ✅ | ❌ |

---

## Core Workflows

### Workflow 1: Case Creation and Setup

**Participants**: PARTNER/ADMIN (as LEAD), PARALEGAL

**Steps**:
1. **PARTNER** creates new case
   - Enters case details (number, name, client, opposing party)
   - Automatically assigned as LEAD on case
   
2. **LEAD** assembles case team
   - Adds ASSOCIATES as REVIEWERS
   - Adds PARALEGALS for document support
   - Assigns specific case roles to each member

3. **PARALEGAL** sets up case infrastructure
   - Creates custodian records
   - Prepares for document upload
   - Sets up issue tags (if needed)

**Result**: Case is ready for document ingestion

---

### Workflow 2: Document Ingestion

**Participants**: PARALEGAL, LEAD

**Steps**:
1. **PARALEGAL** uploads documents
   - Selects files for upload
   - Assigns to custodians
   - Monitors upload progress

2. **System** processes documents
   - Extracts metadata
   - Generates thumbnails
   - Indexes content for search
   - Updates ingestion status

3. **LEAD** verifies upload
   - Reviews document count
   - Checks for errors
   - Confirms readiness for review

**Result**: Documents are ready for review

---

### Workflow 3: Document Review

**Participants**: REVIEWER (ASSOCIATE), LEAD

**Steps**:
1. **LEAD** assigns review queue
   - Determines review strategy
   - Assigns documents to reviewers
   - Sets review priorities

2. **REVIEWER** reviews documents
   - Opens document from queue
   - Reads and analyzes content
   - Applies coding:
     - **Privilege Status**: NOT_PRIVILEGED, ATTORNEY_CLIENT, WORK_PRODUCT, NEEDS_REVIEW
     - **Relevance Status**: HIGHLY_RELEVANT, RELEVANT, NOT_RELEVANT, MARGINAL
     - **Issue Tags**: Applies relevant tags
   - Adds notes if needed
   - Moves to next document

3. **System** tracks progress
   - Records all coding decisions
   - Logs to audit trail
   - Updates review statistics
   - Notifies LEAD of completion

4. **LEAD** monitors progress
   - Reviews statistics
   - Checks quality
   - Addresses questions

**Result**: Documents are coded and ready for production

---

### Workflow 4: Production Creation

**Participants**: LEAD/PARALEGAL, PARTNER/ADMIN

**Steps**:
1. **LEAD or PARALEGAL** creates production set
   - Names the production
   - Sets description
   - Status: DRAFT

2. **LEAD or PARALEGAL** adds documents
   - Searches for responsive documents
   - Filters by coding (e.g., RELEVANT, NOT_PRIVILEGED)
   - Adds documents to production set

3. **LEAD or PARALEGAL** applies Bates numbering
   - Sets prefix (e.g., "ACME")
   - Sets starting number
   - System assigns sequential numbers
   - Status: IN_REVIEW

4. **PARTNER or ADMIN** reviews production
   - Reviews document list
   - Verifies Bates numbering
   - Checks for privilege issues
   - Approves or rejects

5. **PARTNER or ADMIN** finalizes production
   - Marks as APPROVED
   - Exports documents
   - Status: PRODUCED
   - Production is locked (no further changes)

**Result**: Documents are produced to opposing party

---

### Workflow 5: Privilege Review

**Participants**: REVIEWER (ASSOCIATE), LEAD, PARTNER

**Steps**:
1. **REVIEWER** identifies potential privilege
   - Reviews document
   - Marks as NEEDS_REVIEW if uncertain
   - Marks as ATTORNEY_CLIENT or WORK_PRODUCT if clear

2. **LEAD** reviews flagged documents
   - Reviews NEEDS_REVIEW documents
   - Makes privilege determination
   - Updates coding

3. **PARTNER** reviews critical privilege decisions
   - Reviews high-risk documents
   - Makes final privilege calls
   - Approves privilege log

**Result**: Privilege determinations are finalized

---

### Workflow 6: Search and Analysis

**Participants**: All roles (based on permissions)

**Steps**:
1. **User** performs search
   - Enters search terms
   - Applies filters (custodian, date range, coding)
   - Executes search

2. **System** returns results
   - Displays matching documents
   - Shows snippets with highlights
   - Provides result count

3. **User** analyzes results
   - Reviews documents
   - Refines search if needed
   - Exports results or adds to production

**Result**: Relevant documents are identified

---

## Role Interactions

### Interaction 1: PARTNER → PARALEGAL
**Context**: Case Setup and Document Upload

- **PARTNER** creates case and assigns **PARALEGAL** to team
- **PARTNER** provides document sources to **PARALEGAL**
- **PARALEGAL** uploads documents and notifies **PARTNER**
- **PARTNER** verifies upload and approves for review

---

### Interaction 2: LEAD → REVIEWER
**Context**: Document Review Assignment

- **LEAD** assigns documents to **REVIEWER** queue
- **REVIEWER** reviews and codes documents
- **REVIEWER** flags questions for **LEAD**
- **LEAD** provides guidance and resolves issues
- **LEAD** monitors **REVIEWER** progress and quality

---

### Interaction 3: REVIEWER → LEAD → PARTNER
**Context**: Privilege Escalation

- **REVIEWER** encounters potential privilege issue
- **REVIEWER** marks document as NEEDS_REVIEW
- **LEAD** reviews and makes initial determination
- If complex, **LEAD** escalates to **PARTNER**
- **PARTNER** makes final privilege decision
- Decision flows back to **REVIEWER** for awareness

---

### Interaction 4: PARALEGAL → LEAD → PARTNER
**Context**: Production Workflow

- **PARALEGAL** creates production set (DRAFT)
- **PARALEGAL** adds documents based on **LEAD** criteria
- **LEAD** reviews production set
- **LEAD** applies Bates numbering (IN_REVIEW)
- **LEAD** submits to **PARTNER** for approval
- **PARTNER** reviews and approves (APPROVED)
- **PARTNER** finalizes production (PRODUCED)

---

### Interaction 5: ADMIN → All Roles
**Context**: System Administration

- **ADMIN** creates user accounts for all roles
- **ADMIN** monitors system health and performance
- **ADMIN** reviews audit logs for compliance
- **ADMIN** provides emergency access to cases
- **ADMIN** manages system-wide settings

---

## Access Control Implementation

### Backend Enforcement

#### Authentication Middleware (`authMiddleware.ts`)
```typescript
// Protects all routes - requires valid JWT token
protect()

// Restricts to ADMIN only
adminOnly()

// Restricts to specific global roles
authorize('ADMIN', 'PARTNER')
```

#### Case-Level Access Control
- Checks team membership in case.team array
- Verifies case role (LEAD, REVIEWER, PARALEGAL)
- Elevates access for ADMIN/PARTNER global roles
- Enforces role-specific permissions

### Frontend Enforcement

#### Role Hook (`useRole.ts`)
```typescript
const {
  isAdmin,           // Is ADMIN
  isPartner,         // Is PARTNER or ADMIN
  isAssociate,       // Is ASSOCIATE
  isParalegal,       // Is PARALEGAL
  hasFullAccess,     // Is ADMIN or PARTNER
  canUpload,         // Can upload documents
  canReview,         // Can review documents
  canCreateCase,     // Can create cases
  getCaseRole,       // Get case-specific role
  isLead            // Is LEAD on case
} = useRole();
```

#### UI Conditional Rendering
- Buttons/features hidden based on permissions
- Pages protected by role checks
- Forms disabled for unauthorized users
- Navigation menu filtered by role

### API Endpoint Protection

#### Case Management
- `POST /api/cases` - ADMIN, PARTNER only
- `PUT /api/cases/:id` - LEAD, ADMIN, PARTNER
- `GET /api/cases` - All authenticated users (filtered by access)
- `DELETE /api/cases/:id` - ADMIN only

#### Document Management
- `POST /api/cases/:caseId/documents` - LEAD, PARALEGAL, ADMIN, PARTNER
- `GET /api/documents/:id` - Team members only
- `PUT /api/documents/:id/coding` - REVIEWER, LEAD, ADMIN, PARTNER
- `DELETE /api/documents/:id` - LEAD, ADMIN only

#### Production Management
- `POST /api/cases/:caseId/productions` - LEAD, PARALEGAL, ADMIN, PARTNER
- `PUT /api/productions/:id/approve` - PARTNER, ADMIN only
- `POST /api/productions/:id/bates` - LEAD, ADMIN, PARTNER
- `GET /api/productions/:id/export` - LEAD, ADMIN, PARTNER

#### User Management
- `POST /api/users` - ADMIN only
- `PUT /api/users/:id` - ADMIN only
- `DELETE /api/users/:id` - ADMIN only
- `GET /api/users/me` - All authenticated users

---

## Complete User Journeys

### Journey 1: PARTNER - New Case to Production

1. **Login** to platform
2. **Dashboard** - View active cases and metrics
3. **Create Case** - Enter case details
4. **Assemble Team** - Add ASSOCIATES and PARALEGALS
5. **Assign Roles** - Set case roles for team members
6. **Monitor Upload** - PARALEGAL uploads documents
7. **Verify Documents** - Check document count and quality
8. **Assign Review** - LEAD assigns review queue
9. **Monitor Progress** - Track review completion
10. **Review Production** - PARALEGAL creates production set
11. **Approve Production** - Review and approve documents
12. **Finalize** - Mark production as PRODUCED
13. **Export** - Download production files

---

### Journey 2: ASSOCIATE - Document Review

1. **Login** to platform
2. **Dashboard** - View assigned cases
3. **Select Case** - Open case from list
4. **Review Queue** - Access next document in queue
5. **Read Document** - Review content
6. **Apply Coding**:
   - Set privilege status
   - Set relevance status
   - Add issue tags
   - Add notes
7. **Save** - Record coding decisions
8. **Next Document** - Move to next in queue
9. **Repeat** - Continue until queue complete
10. **Flag Issues** - Mark complex documents for LEAD review

---

### Journey 3: PARALEGAL - Document Upload

1. **Login** to platform
2. **Dashboard** - View assigned cases
3. **Select Case** - Open case from list
4. **Navigate to Upload** - Go to document upload page
5. **Select Files** - Choose documents to upload
6. **Assign Custodian** - Select custodian for documents
7. **Upload** - Start upload process
8. **Monitor Progress** - Watch upload status
9. **Verify** - Confirm successful upload
10. **Notify LEAD** - Inform team of completion

---

### Journey 4: ADMIN - User Management

1. **Login** to platform
2. **Dashboard** - View system overview
3. **Navigate to Users** - Go to user management
4. **Create User** - Add new user account
5. **Set Role** - Assign global role (PARTNER, ASSOCIATE, PARALEGAL)
6. **Set Permissions** - Configure access
7. **Save** - Create user account
8. **Monitor Activity** - Review audit logs
9. **Manage Cases** - Access any case as needed
10. **System Maintenance** - Configure system settings

---

## Key Design Principles

### 1. Principle of Least Privilege
Users are granted only the minimum permissions necessary to perform their job functions.

### 2. Defense in Depth
Access control is enforced at multiple layers:
- API endpoint protection
- Database query filtering
- UI conditional rendering
- Frontend route guards

### 3. Audit Trail
All actions are logged for compliance and accountability:
- Document coding changes
- Production approvals
- User actions
- System events

### 4. Role Separation
Clear separation between:
- System administration (ADMIN)
- Case management (PARTNER/LEAD)
- Document review (ASSOCIATE/REVIEWER)
- Support functions (PARALEGAL)

### 5. Flexible Team Structure
Case-scoped roles allow users to have different responsibilities across different cases while maintaining consistent system-level permissions.

---

## Summary

The eDiscovery platform implements a sophisticated two-tier RBAC system that balances flexibility with security. Global roles provide system-wide permissions, while case-scoped roles enable fine-grained access control for specific cases. This design supports complex legal workflows while maintaining strict audit trails and compliance requirements.

The role interactions create a collaborative environment where:
- **PARTNERS** provide strategic oversight and final approvals
- **ASSOCIATES** focus on document review and analysis
- **PARALEGALS** handle document management and support tasks
- **ADMINS** ensure system integrity and compliance

Each role has clearly defined responsibilities, permissions, and workflows that work together to make the eDiscovery process efficient, secure, and compliant.


---

## Test Credentials

The system includes seeded test accounts for each role. Use these credentials to test different workflows:

### Test User Accounts

| Role | Email | Password | Name | Purpose |
|------|-------|----------|------|---------|
| **ADMIN** | admin@seed.local | Admin123! | Asha Admin | System administration and full access testing |
| **PARTNER** | partner@seed.local | Partner123! | Priya Partner | Case creation and production approval testing |
| **ASSOCIATE** | associate@seed.local | Associate123! | Ibrahim Associate | Document review testing |
| **PARALEGAL** | paralegal@seed.local | Paralegal123! | Noor Paralegal | Document upload and custodian management testing |
| **REVIEWER 1** | reviewer1@seed.local | Reviewer123! | Maya Reviewer | Additional reviewer for team testing |
| **REVIEWER 2** | reviewer2@seed.local | Reviewer123! | Arjun Reviewer | Additional reviewer for team testing |

---

## Manual Testing Guide

### Prerequisites

1. **Start the application**:
   ```bash
   # Terminal 1 - Start backend server
   cd ediscovery-platform/server
   npm run dev
   
   # Terminal 2 - Start frontend client
   cd ediscovery-platform/client
   npm run dev
   ```

2. **Seed test data** (if not already seeded):
   ```bash
   cd ediscovery-platform/server
   npm run seed
   ```

3. **Access the application**:
   - Open browser to `http://localhost:5173` (or the port shown in terminal)

---

### Test Scenario 1: Complete Case Lifecycle (All Roles)

**Objective**: Test the full workflow from case creation to production

**Duration**: 30-45 minutes

#### Step 1: PARTNER - Create Case and Assemble Team

1. **Login as PARTNER**
   - Email: `partner@seed.local`
   - Password: `Partner123!`

2. **Verify Dashboard Access**
   - ✅ Should see "Good [morning/afternoon/evening], Priya"
   - ✅ Should see "Partner" badge
   - ✅ Should see "Create Case" button
   - ✅ Should see quick actions: My Cases, Analytics, Audit Logs

3. **Create New Case**
   - Click "Create Case" or navigate to Cases page
   - Click "+ New Case" button
   - Fill in case details:
     - Case Number: `TEST-2026-001`
     - Case Name: `Test Case - Manual Workflow`
     - Client Name: `Test Client Corp`
     - Opposing Party: `Test Opposing LLC`
     - Description: `Manual testing of complete workflow`
   - Click "Create Case"
   - ✅ Should see success message
   - ✅ Should be redirected to case detail page
   - ✅ Should see yourself listed as LEAD in team

4. **Add Team Members**
   - On case detail page, find "Team" section
   - Click "Add Team Member"
   - Add ASSOCIATE as REVIEWER:
     - Select: Ibrahim Associate
     - Role: REVIEWER
     - Click "Add"
   - Add PARALEGAL:
     - Select: Noor Paralegal
     - Role: PARALEGAL
     - Click "Add"
   - ✅ Should see 3 team members total (you as LEAD, associate as REVIEWER, paralegal as PARALEGAL)

5. **Logout**
   - Click profile menu → Logout

---

#### Step 2: PARALEGAL - Upload Documents

1. **Login as PARALEGAL**
   - Email: `paralegal@seed.local`
   - Password: `Paralegal123!`

2. **Verify Dashboard Access**
   - ✅ Should see "Good [morning/afternoon/evening], Noor"
   - ✅ Should see "Paralegal" badge
   - ✅ Should see quick actions: My Cases, Upload Documents, Custodians
   - ✅ Should NOT see "Create Case" button

3. **Navigate to Test Case**
   - Go to Cases page
   - Find and click "Test Case - Manual Workflow"
   - ✅ Should see case details
   - ✅ Should see yourself in team as PARALEGAL

4. **Create Custodian**
   - Navigate to "Custodians" tab
   - Click "Add Custodian"
   - Fill in details:
     - Name: `John Smith`
     - Email: `john.smith@testclient.com`
     - Department: `Engineering`
     - Title: `Senior Engineer`
   - Click "Save"
   - ✅ Should see custodian in list

5. **Upload Documents**
   - Navigate to "Documents" tab
   - Click "Upload Documents"
   - Select custodian: John Smith
   - Choose files to upload (PDF, DOCX, TXT, etc.)
   - Click "Upload"
   - ✅ Should see upload progress
   - ✅ Should see documents appear in list after processing
   - ✅ Note: Upload at least 5-10 documents for meaningful review testing

6. **Verify Upload**
   - Check document count
   - Verify custodian assignment
   - Check file types and sizes
   - ✅ All documents should show "Pending Review" status

7. **Logout**

---

#### Step 3: ASSOCIATE - Review Documents

1. **Login as ASSOCIATE**
   - Email: `associate@seed.local`
   - Password: `Associate123!`

2. **Verify Dashboard Access**
   - ✅ Should see "Good [morning/afternoon/evening], Ibrahim"
   - ✅ Should see "Associate" badge
   - ✅ Should see quick actions: My Cases, Search Documents, Review Queue
   - ✅ Should NOT see "Create Case" or "Upload Documents"

3. **Navigate to Review Queue**
   - Go to Cases page
   - Click "Test Case - Manual Workflow"
   - Navigate to "Review" tab
   - Click "Start Review" or "Review Queue"
   - ✅ Should see first document loaded

4. **Review First Document**
   - Read document content
   - Apply coding:
     - **Privilege Status**: Select "NOT_PRIVILEGED"
     - **Relevance Status**: Select "HIGHLY_RELEVANT"
     - **Confidential**: Check if sensitive
     - **Notes**: Add "Test review - relevant to case"
   - Click "Save & Next"
   - ✅ Should see next document automatically loaded

5. **Review Second Document**
   - Apply different coding:
     - **Privilege Status**: Select "NEEDS_REVIEW"
     - **Relevance Status**: Select "RELEVANT"
     - **Notes**: Add "Potential privilege - needs LEAD review"
   - Click "Save & Next"

6. **Review Third Document**
   - Apply coding:
     - **Privilege Status**: Select "ATTORNEY_CLIENT"
     - **Relevance Status**: Select "HIGHLY_RELEVANT"
     - **Notes**: Add "Attorney-client communication - privileged"
   - Click "Save & Next"

7. **Review Remaining Documents**
   - Continue reviewing with varied coding
   - Mix of:
     - NOT_PRIVILEGED / HIGHLY_RELEVANT (production candidates)
     - NOT_PRIVILEGED / NOT_RELEVANT (non-responsive)
     - ATTORNEY_CLIENT / HIGHLY_RELEVANT (privileged)
     - NEEDS_REVIEW / RELEVANT (for escalation)

8. **Verify Review Progress**
   - Navigate back to case Documents tab
   - ✅ Should see reviewed documents with coding applied
   - ✅ Should see review progress statistics updated

9. **Logout**

---

#### Step 4: PARTNER - Review Privilege Flags

1. **Login as PARTNER**
   - Email: `partner@seed.local`
   - Password: `Partner123!`

2. **Navigate to Test Case**
   - Go to Cases → "Test Case - Manual Workflow"
   - Navigate to Documents tab

3. **Filter for Privilege Review**
   - Apply filter: Privilege Status = "NEEDS_REVIEW"
   - ✅ Should see documents flagged by ASSOCIATE

4. **Review Flagged Documents**
   - Click on document marked "NEEDS_REVIEW"
   - Review content
   - Update coding:
     - Change Privilege Status to "ATTORNEY_CLIENT" or "NOT_PRIVILEGED"
     - Add notes explaining decision
   - Save changes
   - ✅ Should see updated coding

5. **Keep Logged In** (for next step)

---

#### Step 5: PARTNER - Create and Approve Production

1. **Still Logged in as PARTNER**

2. **Navigate to Productions Tab**
   - In test case, click "Productions" tab
   - Click "Create Production Set"

3. **Create Production Set**
   - Fill in details:
     - Set Name: `PROD-001`
     - Description: `First production set - test workflow`
   - Click "Create"
   - ✅ Should see production set created with DRAFT status

4. **Add Documents to Production**
   - Click "Add Documents"
   - Apply filters:
     - Privilege Status: "NOT_PRIVILEGED"
     - Relevance Status: "HIGHLY_RELEVANT" or "RELEVANT"
   - Select documents from filtered list
   - Click "Add Selected"
   - ✅ Should see documents added to production
   - ✅ Should see Bates numbers assigned (e.g., PROD-001-000001)

5. **Submit for Review**
   - Click "Submit for Review"
   - ✅ Status should change to "IN_REVIEW"

6. **Approve Production**
   - Click "Approve Production"
   - Confirm approval
   - ✅ Status should change to "APPROVED"

7. **Mark as Produced**
   - Click "Mark as Produced"
   - Confirm
   - ✅ Status should change to "PRODUCED"
   - ✅ Production should now be locked (no further edits)

8. **Export Production**
   - Click "Export" or "Download"
   - ✅ Should download CSV file with production metadata
   - ✅ Verify CSV contains Bates numbers, document details, coding

9. **Logout**

---

### Test Scenario 2: Role-Based Access Control

**Objective**: Verify that each role can only access features they're authorized for

**Duration**: 15-20 minutes

#### Test 2.1: PARALEGAL Restrictions

1. **Login as PARALEGAL**
   - Email: `paralegal@seed.local`
   - Password: `Paralegal123!`

2. **Verify Restrictions**
   - ✅ Should NOT see "Create Case" button
   - ✅ Should NOT see "User Management" in menu
   - ✅ Should NOT see "Audit Logs" in menu
   - ✅ Should NOT be able to approve productions
   - ✅ Should NOT be able to review/code documents (unless assigned as REVIEWER)

3. **Verify Allowed Actions**
   - ✅ CAN upload documents
   - ✅ CAN manage custodians
   - ✅ CAN create production sets (DRAFT only)
   - ✅ CAN view assigned cases

4. **Logout**

---

#### Test 2.2: ASSOCIATE Restrictions

1. **Login as ASSOCIATE**
   - Email: `associate@seed.local`
   - Password: `Associate123!`

2. **Verify Restrictions**
   - ✅ Should NOT see "Create Case" button
   - ✅ Should NOT see "Upload Documents" option
   - ✅ Should NOT see "User Management"
   - ✅ Should NOT be able to approve productions
   - ✅ Should NOT be able to manage team members

3. **Verify Allowed Actions**
   - ✅ CAN review and code documents
   - ✅ CAN search documents
   - ✅ CAN view assigned cases
   - ✅ CAN add issue tags

4. **Logout**

---

#### Test 2.3: PARTNER Privileges

1. **Login as PARTNER**
   - Email: `partner@seed.local`
   - Password: `Partner123!`

2. **Verify Privileges**
   - ✅ CAN create cases
   - ✅ CAN manage team members
   - ✅ CAN approve productions
   - ✅ CAN review documents
   - ✅ CAN upload documents
   - ✅ CAN access analytics
   - ✅ Should NOT see "User Management" (ADMIN only)

3. **Logout**

---

#### Test 2.4: ADMIN Full Access

1. **Login as ADMIN**
   - Email: `admin@seed.local`
   - Password: `Admin123!`

2. **Verify Full Access**
   - ✅ CAN access all features
   - ✅ CAN see "User Management"
   - ✅ CAN see "Audit Logs"
   - ✅ CAN access all cases (even if not team member)
   - ✅ CAN create/edit/delete users
   - ✅ CAN approve productions
   - ✅ CAN perform all actions

3. **Test User Management**
   - Navigate to Admin → Users
   - ✅ Should see list of all users
   - Click "Create User"
   - Fill in details:
     - Email: `testuser@seed.local`
     - First Name: `Test`
     - Last Name: `User`
     - Role: `ASSOCIATE`
     - Password: `Test123!`
   - Click "Create"
   - ✅ Should see new user in list

4. **Test Audit Logs**
   - Navigate to Admin → Audit Logs
   - ✅ Should see log of all system actions
   - ✅ Should see document reviews, case creations, logins, etc.

5. **Logout**

---

### Test Scenario 3: Case Team Collaboration

**Objective**: Test how multiple users collaborate on a single case

**Duration**: 20-30 minutes

#### Step 1: Setup (PARTNER)

1. **Login as PARTNER**
2. **Create new case**: `TEST-2026-002 - Team Collaboration Test`
3. **Add team members**:
   - Maya Reviewer (reviewer1@seed.local) as REVIEWER
   - Arjun Reviewer (reviewer2@seed.local) as REVIEWER
   - Noor Paralegal (paralegal@seed.local) as PARALEGAL
4. **Logout**

#### Step 2: Document Upload (PARALEGAL)

1. **Login as PARALEGAL**
2. **Upload 10+ documents** to the new case
3. **Logout**

#### Step 3: Parallel Review (REVIEWER 1)

1. **Login as REVIEWER 1**
   - Email: `reviewer1@seed.local`
   - Password: `Reviewer123!`
2. **Review first 5 documents**
   - Apply varied coding
3. **Logout**

#### Step 4: Parallel Review (REVIEWER 2)

1. **Login as REVIEWER 2**
   - Email: `reviewer2@seed.local`
   - Password: `Reviewer123!`
2. **Review next 5 documents**
   - Apply varied coding
3. **Logout**

#### Step 5: Verify Collaboration (PARTNER)

1. **Login as PARTNER**
2. **Navigate to case**
3. **Check Documents tab**
   - ✅ Should see documents reviewed by both reviewers
   - ✅ Should see reviewer names in "Reviewed By" column
   - ✅ Should see review timestamps
4. **Check Analytics/Progress**
   - ✅ Should see combined review progress
   - ✅ Should see statistics from both reviewers

---

### Test Scenario 4: Search and Filtering

**Objective**: Test document search and filtering capabilities

**Duration**: 10-15 minutes

1. **Login as any role with review access** (ASSOCIATE, PARTNER, or ADMIN)

2. **Navigate to a case with documents**

3. **Test Basic Search**
   - Enter keyword in search box
   - ✅ Should see matching documents
   - ✅ Should see search term highlighted

4. **Test Privilege Filter**
   - Filter by: Privilege Status = "ATTORNEY_CLIENT"
   - ✅ Should see only privileged documents

5. **Test Relevance Filter**
   - Filter by: Relevance Status = "HIGHLY_RELEVANT"
   - ✅ Should see only highly relevant documents

6. **Test Combined Filters**
   - Filter by:
     - Privilege Status = "NOT_PRIVILEGED"
     - Relevance Status = "HIGHLY_RELEVANT" or "RELEVANT"
   - ✅ Should see production-ready documents

7. **Test Custodian Filter**
   - Filter by specific custodian
   - ✅ Should see only documents from that custodian

8. **Test Date Range Filter**
   - Set date range
   - ✅ Should see documents within date range

---

### Test Scenario 5: Production Workflow Edge Cases

**Objective**: Test production set validation and restrictions

**Duration**: 15-20 minutes

#### Test 5.1: Privileged Document Protection

1. **Login as PARTNER**
2. **Create production set**
3. **Try to add privileged document**
   - Select document with Privilege Status = "ATTORNEY_CLIENT"
   - Try to add to production
   - ✅ Should see error: "Cannot add privileged documents to production"

#### Test 5.2: Production Locking

1. **Create production set** (DRAFT)
2. **Add documents**
3. **Submit for review** (IN_REVIEW)
4. **Try to add more documents**
   - ✅ Should see error: "Cannot modify non-draft production"
5. **Approve production** (APPROVED)
6. **Try to remove documents**
   - ✅ Should see error: "Production is locked"

#### Test 5.3: Bates Number Immutability

1. **Create production set**
2. **Add 5 documents** (Bates: 000001-000005)
3. **Remove document 000003**
4. **Add new document**
   - ✅ New document should get 000006 (not 000003)
   - ✅ Bates numbers are never reused

---

### Test Scenario 6: Audit Trail Verification

**Objective**: Verify all actions are logged

**Duration**: 10 minutes

1. **Login as ADMIN**
2. **Navigate to Audit Logs**
3. **Verify logged actions**:
   - ✅ User logins
   - ✅ Case creations
   - ✅ Document uploads
   - ✅ Document coding changes
   - ✅ Production approvals
   - ✅ Team member additions
4. **Filter by action type**
   - ✅ Should be able to filter by CREATE, UPDATE, DELETE, etc.
5. **Filter by user**
   - ✅ Should be able to see actions by specific user
6. **Filter by entity type**
   - ✅ Should be able to filter by document, case, production, etc.

---

## Testing Checklist

### Authentication & Authorization
- [ ] All test accounts can login successfully
- [ ] Invalid credentials are rejected
- [ ] Users can logout successfully
- [ ] Session persists across page refreshes
- [ ] Expired tokens redirect to login

### Role-Based Access Control
- [ ] ADMIN can access all features
- [ ] PARTNER can create cases and approve productions
- [ ] ASSOCIATE can review documents but not upload
- [ ] PARALEGAL can upload but not review
- [ ] Unauthorized actions show proper error messages

### Case Management
- [ ] PARTNER/ADMIN can create cases
- [ ] Case creator becomes LEAD automatically
- [ ] LEAD can add/remove team members
- [ ] Team members can access assigned cases
- [ ] Non-team members cannot access cases (except ADMIN/PARTNER)

### Document Management
- [ ] PARALEGAL can upload documents
- [ ] Documents are assigned to custodians
- [ ] Upload progress is displayed
- [ ] Documents appear in case after processing
- [ ] File types are validated

### Document Review
- [ ] REVIEWER can access review queue
- [ ] Coding is saved correctly
- [ ] Next document loads automatically
- [ ] Review progress is tracked
- [ ] Reviewed documents show reviewer name and timestamp

### Production Management
- [ ] Production sets can be created
- [ ] Documents can be added to DRAFT productions
- [ ] Bates numbers are assigned sequentially
- [ ] Privileged documents are blocked
- [ ] Productions can be submitted for review
- [ ] PARTNER/ADMIN can approve productions
- [ ] Approved productions are locked
- [ ] Production metadata can be exported

### Search & Filtering
- [ ] Keyword search works
- [ ] Privilege filter works
- [ ] Relevance filter works
- [ ] Custodian filter works
- [ ] Date range filter works
- [ ] Combined filters work correctly

### Audit & Compliance
- [ ] All actions are logged
- [ ] Audit logs show user, action, timestamp
- [ ] Audit logs can be filtered
- [ ] ADMIN can access all audit logs

### UI/UX
- [ ] Dashboard shows role-appropriate quick actions
- [ ] Navigation menu shows role-appropriate items
- [ ] Buttons are hidden for unauthorized actions
- [ ] Error messages are clear and helpful
- [ ] Success messages confirm actions
- [ ] Loading states are displayed

---

## Common Issues & Troubleshooting

### Issue: Cannot login
- **Check**: Are you using the correct email domain? (`@seed.local`)
- **Check**: Is the backend server running?
- **Check**: Has the database been seeded?

### Issue: No cases visible
- **Check**: Are you logged in as ASSOCIATE or PARALEGAL? They only see assigned cases
- **Check**: Have cases been created by PARTNER/ADMIN?
- **Check**: Are you a team member on the case?

### Issue: Cannot upload documents
- **Check**: Are you logged in as PARALEGAL, PARTNER, or ADMIN?
- **Check**: Are you a team member on the case?
- **Check**: Is the file type supported?

### Issue: Cannot review documents
- **Check**: Are you logged in as ASSOCIATE, PARTNER, or ADMIN?
- **Check**: Are you assigned as REVIEWER on the case?
- **Check**: Are there documents available for review?

### Issue: Cannot approve production
- **Check**: Are you logged in as PARTNER or ADMIN?
- **Check**: Is the production in IN_REVIEW status?

### Issue: Changes not saving
- **Check**: Is the backend server running?
- **Check**: Check browser console for errors
- **Check**: Check network tab for failed requests

---

## Quick Test Commands

### Reset and Reseed Database
```bash
cd ediscovery-platform/server
npm run seed -- --reset
```

### Check Server Logs
```bash
cd ediscovery-platform/server
npm run dev
# Watch console for errors
```

### Check Client Logs
```bash
cd ediscovery-platform/client
npm run dev
# Open browser console (F12) for errors
```

---

## Test Data Summary

After seeding, you should have:
- **6 test users** (1 admin, 1 partner, 2 associates, 1 paralegal, 2 reviewers)
- **1 synthetic case** (TechCorp v. InnovateLLC) with sample documents
- **Sample custodians** in the synthetic case
- **Sample documents** with varied coding
- **Sample production sets**

Use the synthetic case to explore features, and create new test cases to verify workflows from scratch.
