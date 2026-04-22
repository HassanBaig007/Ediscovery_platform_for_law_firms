# Role-Based UI/UX Allocation Analysis

## Executive Summary

This document analyzes the current role-based access control (RBAC) implementation in the eDiscovery platform and identifies missing UI components, pages, and features for each role.

## Current Role Structure

### System Roles (UserRole)
- **ADMIN**: Full system access, user management, audit logs
- **PARTNER**: Case management, team oversight, production approval
- **ASSOCIATE**: Document review, search, analysis
- **PARALEGAL**: Document upload, custodian management, basic review

### Case-Level Roles (CaseRole)
- **LEAD**: Case settings, team management, tag management
- **REVIEWER**: Document review and coding
- **PARALEGAL**: Document upload, custodian management

## Current Role-Based Access Implementation

### Pages with Role Protection

| Page | Required Role | Status |
|------|--------------|--------|
| UserManagementPage | ADMIN | ✅ Implemented |
| AuditLogsPage | ADMIN or PARTNER | ✅ Implemented |
| UploadPage | ADMIN, PARTNER, or PARALEGAL | ✅ Implemented |
| ReviewPage | ADMIN, PARTNER, or ASSOCIATE | ✅ Implemented |
| ProductionSetsPage | ADMIN or PARTNER (for approval) | ⚠️ Partial |
| Cases | canCreateCase (ADMIN or PARTNER) | ⚠️ Partial |

### Pages WITHOUT Role Protection (CRITICAL ISSUES)

| Page | Current Access | Should Be |
|------|---------------|-----------|
| DashboardPage | ALL AUTHENTICATED | ✅ Correct (personalized per role) |
| CaseDetail | ALL AUTHENTICATED | ⚠️ Needs case-level role check |
| SearchPage | ALL AUTHENTICATED | ⚠️ Should require REVIEWER+ |
| CustodiansPage | ALL AUTHENTICATED | ⚠️ Should require LEAD or PARALEGAL+ |
| TagsPage | ALL AUTHENTICATED | ⚠️ Should require LEAD+ |
| CaseSettingsPage | ALL AUTHENTICATED | ⚠️ Should require LEAD+ |
| AnalyticsPage | ALL AUTHENTICATED | ⚠️ Should require PARTNER+ |
| NotificationsPage | ALL AUTHENTICATED | ✅ Correct |
| ProfilePage | ALL AUTHENTICATED | ✅ Correct |

## CRITICAL PROBLEMS IDENTIFIED

### 1. **Mixed Up Role Allocations**

#### Problem: Pages accessible to wrong roles
- **CaseSettingsPage**: Currently accessible to ALL, should be LEAD+ only
- **TagsPage**: Currently accessible to ALL, should be LEAD+ only
- **CustodiansPage**: Currently accessible to ALL, should be LEAD or PARALEGAL+
- **AnalyticsPage**: Currently accessible to ALL, should be PARTNER+ or ADMIN
- **SearchPage**: Currently accessible to ALL, should be REVIEWER+ (ASSOCIATE, PARTNER, ADMIN)

#### Problem: Inconsistent permission checks
- Some pages use `useRole()` hook with `PermissionDenied` component
- Other pages have NO role checks at all
- Some pages check role but don't render `PermissionDenied`

### 2. **Missing UI Components by Role**

#### ADMIN Role - Missing Components
- ❌ System-wide analytics dashboard (separate from case analytics)
- ❌ License management UI
- ❌ System configuration panel
- ❌ Backup/restore interface
- ❌ Integration management (API keys, webhooks)
- ❌ Billing/subscription management
- ❌ System health monitoring dashboard

#### PARTNER Role - Missing Components
- ❌ Team performance dashboard
- ❌ Cross-case analytics view
- ❌ Resource allocation dashboard
- ❌ Budget tracking interface
- ❌ Client communication portal
- ❌ Matter management overview
- ❌ Billing/time tracking integration

#### ASSOCIATE Role - Missing Components
- ❌ Personal review queue dashboard
- ❌ Review statistics/performance metrics
- ❌ Document comparison tool
- ❌ Research notes/annotations panel
- ❌ Saved searches management
- ❌ Review history timeline
- ❌ Privilege log interface

#### PARALEGAL Role - Missing Components
- ❌ Bulk document upload interface (exists but needs enhancement)
- ❌ Custodian communication tracker
- ❌ Document collection checklist
- ❌ Chain of custody tracker
- ❌ Processing status dashboard
- ❌ Quality control checklist
- ❌ Metadata validation interface

### 3. **Missing Page-Level Features**

#### DashboardPage
- ❌ Role-specific widgets (currently shows same for all)
- ❌ Quick actions based on role
- ❌ Role-specific metrics
- ❌ Personalized task list

#### CaseDetail
- ❌ Role-based action buttons
- ❌ Case-level permission checks
- ❌ Role-specific tabs/sections
- ❌ Team member role indicators

#### SearchPage
- ❌ Role-based search filters
- ❌ Saved searches (per user)
- ❌ Search history
- ❌ Advanced search builder

#### AnalyticsPage
- ❌ Role-based analytics views
- ❌ Export restrictions by role
- ❌ Custom report builder
- ❌ Scheduled reports

### 4. **Missing UI Sections/Divisions**

#### Navigation/Layout Issues
- ❌ Role-based navigation menu (all users see same menu)
- ❌ Role indicators in user avatar/profile
- ❌ Quick role switcher (for users with multiple roles)
- ❌ Contextual help based on role

#### Missing Sections in MainLayout
- ❌ Role-specific sidebar sections
- ❌ Quick actions panel (role-based)
- ❌ Notifications filtered by role
- ❌ Recent activity filtered by role

#### Missing Sections in CaseDetail
- ❌ Team management section (LEAD only)
- ❌ Case timeline (all roles, different views)
- ❌ Document statistics panel
- ❌ Case notes/comments section
- ❌ Related cases section (PARTNER+)

### 5. **Missing Component-Level UI**

#### Document Viewer
- ❌ Role-based annotation permissions
- ❌ Redaction permissions (PARTNER+ only)
- ❌ Export permissions
- ❌ Print permissions

#### Document Table
- ❌ Role-based column visibility
- ❌ Role-based bulk actions
- ❌ Role-based filters
- ❌ Role-based export options

#### Review Interface
- ❌ Role-based coding options
- ❌ Review assignment interface (LEAD only)
- ❌ Quality control review mode (PARTNER only)
- ❌ Review conflict resolution (LEAD+)

#### Production Interface
- ❌ Production approval workflow (PARTNER only)
- ❌ Bates numbering configuration (LEAD+)
- ❌ Privilege designation (ASSOCIATE+)
- ❌ Production history/audit trail

## Recommended Role-Based UI Allocation

### ADMIN - Full System Control
**Primary Pages:**
- ✅ UserManagementPage
- ✅ AuditLogsPage
- ❌ SystemSettingsPage (MISSING)
- ❌ IntegrationsPage (MISSING)
- ❌ SystemAnalyticsPage (MISSING)
- ❌ LicenseManagementPage (MISSING)

**Access to All Pages:** Yes, with full permissions

### PARTNER - Case & Team Management
**Primary Pages:**
- ✅ DashboardPage (partner view)
- ✅ Cases (full access)
- ✅ CaseDetail (full access)
- ✅ AnalyticsPage
- ✅ AuditLogsPage
- ✅ ProductionSetsPage (with approval)
- ❌ TeamPerformancePage (MISSING)
- ❌ ClientPortalPage (MISSING)
- ❌ BillingPage (MISSING)

**Case-Level Access:**
- All case pages with full permissions
- Can create/edit/delete cases
- Can manage team members
- Can approve productions

### ASSOCIATE - Document Review & Analysis
**Primary Pages:**
- ✅ DashboardPage (associate view)
- ✅ Cases (view only)
- ✅ CaseDetail (limited)
- ✅ SearchPage
- ✅ ReviewPage
- ❌ MyReviewQueuePage (MISSING)
- ❌ ReviewStatisticsPage (MISSING)
- ❌ PrivilegeLogPage (MISSING)

**Case-Level Access:**
- Search and review documents
- Apply tags and codes
- View analytics (limited)
- Cannot upload or manage custodians

### PARALEGAL - Document Management
**Primary Pages:**
- ✅ DashboardPage (paralegal view)
- ✅ Cases (view only)
- ✅ CaseDetail (limited)
- ✅ UploadPage
- ✅ CustodiansPage
- ❌ ProcessingStatusPage (MISSING)
- ❌ ChainOfCustodyPage (MISSING)
- ❌ QualityControlPage (MISSING)

**Case-Level Access:**
- Upload documents
- Manage custodians
- View document status
- Cannot review or code documents

## Implementation Priority

### CRITICAL (Immediate)
1. Add role checks to unprotected pages (CaseSettingsPage, TagsPage, etc.)
2. Implement PermissionDenied for all role-restricted pages
3. Add role-based navigation menu filtering
4. Implement case-level role checks in CaseDetail

### HIGH (Next Sprint)
1. Create role-specific dashboard widgets
2. Implement MyReviewQueuePage for Associates
3. Implement TeamPerformancePage for Partners
4. Add role-based action buttons in CaseDetail
5. Implement ProcessingStatusPage for Paralegals

### MEDIUM (Future Sprints)
1. SystemSettingsPage for Admins
2. PrivilegeLogPage for Associates
3. ChainOfCustodyPage for Paralegals
4. ClientPortalPage for Partners
5. Role-based analytics views

### LOW (Nice to Have)
1. Quick role switcher
2. Contextual help by role
3. Custom report builder
4. Scheduled reports
5. Integration management

## Code Changes Required

### 1. Update ProtectedRoute Component
```typescript
// Add role-based route protection
interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  allowedCaseRoles?: CaseRole[];
  requireCaseAccess?: boolean;
}
```

### 2. Add Role Checks to Pages
```typescript
// Example for CaseSettingsPage
const CaseSettingsPage = () => {
  const { isLead, hasFullAccess } = useRole();
  const caseData = useCaseContext();
  
  if (!hasFullAccess && !isLead(caseData)) {
    return <PermissionDenied requiredRole="LEAD, PARTNER, or ADMIN" />;
  }
  // ... rest of component
};
```

### 3. Update MainLayout Navigation
```typescript
// Filter navigation items by role
const getNavigationItems = (user: IUser) => {
  const items = [
    { path: '/dashboard', label: 'Dashboard', roles: ['ALL'] },
    { path: '/cases', label: 'Cases', roles: ['ALL'] },
    { path: '/admin/users', label: 'Users', roles: ['ADMIN'] },
    { path: '/admin/audit-logs', label: 'Audit Logs', roles: ['ADMIN', 'PARTNER'] },
    { path: '/analytics', label: 'Analytics', roles: ['ADMIN', 'PARTNER'] },
  ];
  
  return items.filter(item => 
    item.roles.includes('ALL') || item.roles.includes(user.role)
  );
};
```

### 4. Create Missing Pages
- SystemSettingsPage.tsx
- TeamPerformancePage.tsx
- MyReviewQueuePage.tsx
- ProcessingStatusPage.tsx
- PrivilegeLogPage.tsx
- ChainOfCustodyPage.tsx
- ClientPortalPage.tsx

## Testing Requirements

### Unit Tests
- Test role-based access for each page
- Test PermissionDenied rendering
- Test navigation filtering by role
- Test case-level role checks

### Integration Tests
- Test complete user journeys for each role
- Test role transitions (e.g., ASSOCIATE promoted to PARTNER)
- Test multi-role scenarios
- Test permission denied redirects

### E2E Tests
- Test ADMIN workflow
- Test PARTNER workflow
- Test ASSOCIATE workflow
- Test PARALEGAL workflow

## Conclusion

The current implementation has significant gaps in role-based access control:

1. **7 pages lack proper role protection** (CaseSettingsPage, TagsPage, CustodiansPage, AnalyticsPage, SearchPage, CaseDetail, ProductionSetsPage)
2. **8 major pages are completely missing** (SystemSettingsPage, TeamPerformancePage, MyReviewQueuePage, etc.)
3. **Navigation is not role-aware** (all users see same menu)
4. **Dashboard is not personalized** (same view for all roles)
5. **Case-level permissions are not enforced** (team roles ignored)

**Estimated Effort:**
- Critical fixes: 2-3 days
- High priority features: 1-2 weeks
- Medium priority features: 2-3 weeks
- Low priority features: 1-2 weeks

**Total: 6-8 weeks for complete role-based UI implementation**
