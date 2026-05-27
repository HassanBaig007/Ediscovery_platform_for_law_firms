# e-Discovery Platform - Missing Pages Implementation

## Phase 1: Essential Pages (High Priority)

### 1. User Profile & Settings Page (`/profile`)
- [x] Create ProfilePage.tsx with user info display
- [x] Add password change functionality
- [x] Add preferences section (theme, notifications)
- [ ] Add activity history section
- [x] Add route to App.tsx

### 2. Production Sets Management (`/cases/:id/productions`)
- [x] Create ProductionSetsPage.tsx
- [x] List production sets with status badges
- [x] Create production set modal/form
- [x] Bates numbering display
- [x] Export workflow actions (Approve, Produce)
- [x] Download functionality
- [x] Add route to App.tsx

### 3. Custodian Management Page (`/cases/:id/custodians`)
- [x] Create CustodiansPage.tsx
- [x] List custodians with stats
- [x] Add/Edit custodian modal
- [x] Document count per custodian
- [ ] Import from CSV functionality
- [x] Add route to App.tsx

### 4. Issue Tags Management (`/cases/:id/tags`)
- [x] Create TagsPage.tsx
- [x] List tags with color coding
- [x] Create/Edit tag modal with color picker
- [x] Tag usage statistics
- [x] Bulk delete functionality
- [x] Add route to App.tsx

### 5. 404 Not Found Page (`*`)
- [x] Create NotFoundPage.tsx
- [x] Professional error illustration
- [x] Navigation assistance (links to home, cases, search)
- [x] Search functionality
- [x] Update route in App.tsx

### 6. Forgot/Reset Password Page (`/forgot-password`)
- [x] Create ForgotPasswordPage.tsx
- [x] Email input form
- [x] Token validation page
- [x] New password form
- [x] Add routes to App.tsx

## Phase 2: Administrative Pages (Medium Priority)

### 7. User Management Page (`/admin/users`)
- [x] Create UserManagementPage.tsx (Admin only)
- [x] User list with filters
- [x] Create/Edit user modal
- [x] Role assignment dropdown
- [x] Activate/Deactivate toggle
- [ ] Bulk operations
- [x] Add route to App.tsx with admin protection

### 8. Audit Logs Page (`/admin/audit-logs`)
- [x] Create AuditLogsPage.tsx (Admin/Partner)
- [x] Activity list with filters
- [x] Filter by user, action, date range
- [x] Export audit reports (CSV)
- [x] Pagination
- [x] Add route to App.tsx

## Phase 3: Advanced Features (Lower Priority)

### 9. Advanced Analytics Dashboard (`/analytics`)
- [x] Create AnalyticsPage.tsx
- [x] Review progress charts (recharts)
- [x] Document statistics cards
- [ ] User productivity metrics (needs API integration)
- [x] Timeline visualizations
- [ ] Case comparison charts
- [x] Add route to App.tsx

### 10. Notifications Center (`/notifications`)
- [x] Create NotificationsPage.tsx
- [x] Notification list with categories
- [x] Mark as read/unread
- [ ] Real-time updates indicator
- [x] Notification settings
- [x] Add route to App.tsx

### 11. Dedicated Document Upload Page (`/cases/:id/upload`)
- [x] Create UploadPage.tsx
- [x] Drag-and-drop zone
- [x] Upload progress tracking
- [x] Custodian selection
- [x] Duplicate detection preview
- [x] Batch upload status
- [x] Add route to App.tsx

## Phase 4: UI/UX Polish & Components

### 12. Global Header Component
- [x] Create Header.tsx component
- [x] User profile dropdown
- [x] Quick search bar
- [x] Notifications bell with badge
- [x] Breadcrumb navigation
- [x] Integrate into MainLayout.tsx

### 13. Enhanced Sidebar Navigation
- [x] Update Sidebar.tsx with all routes
- [x] Add role-based menu visibility
- [x] Collapsible submenus for Cases
- [x] Active state indicators
- [x] Icons for all menu items

### 14. Toast Notification System
- [x] Create toast store (toastStore.ts)
- [x] Create ToastContainer component
- [x] Success/Error/Warning/Info variants
- [x] Auto-dismiss with progress bar
- [x] Integrate into MainLayout.tsx

### 15. Confirmation Modal System
- [x] Create ConfirmationModal component (Dialog.tsx)
- [x] Delete confirmation variant
- [x] Action warning variant
- [x] Customizable buttons and text

### 16. Loading Skeletons
- [x] Create SkeletonCard component
- [x] Create SkeletonTable component
- [ ] Create SkeletonStats component
- [x] Apply to existing pages

## UI Components to Create/Extend

### New UI Components Needed:
- [x] ColorPicker.tsx (for tag colors)
- [x] FileDropzone.tsx (for uploads)
- [x] ProgressBar.tsx (for uploads/review)
- [x] StatCard.tsx (for analytics)
- [ ] ActivityItem.tsx (for audit logs)
- [ ] NotificationItem.tsx
- [x] Breadcrumb.tsx

### Extend Existing Components:
- [x] Update Button.tsx variants if needed
- [x] Update Card.tsx with new variants
- [x] Update Input.tsx with new features

## Routes Update Checklist

Update App.tsx with all new routes:
- [x] `/profile` - ProfilePage
- [x] `/forgot-password` - ForgotPasswordPage
- [x] `/cases/:id/custodians` - CustodiansPage
- [x] `/cases/:id/tags` - TagsPage
- [x] `/cases/:id/productions` - ProductionSetsPage
- [x] `/cases/:id/upload` - UploadPage
- [x] `/admin/users` - UserManagementPage (admin only)
- [x] `/admin/audit-logs` - AuditLogsPage
- [x] `/analytics` - AnalyticsPage
- [x] `/notifications` - NotificationsPage
- [x] `*` - NotFoundPage (update existing)

## API Integration Checklist

Ensure all pages have proper API integration:
- [x] Profile API endpoints
- [x] Production sets API endpoints
- [x] Custodian CRUD API endpoints
- [x] Tags CRUD API endpoints
- [x] Audit logs API endpoints
- [ ] Analytics API endpoints (partial - some charts use mock data)
- [x] Notifications API endpoints

## Testing Checklist

- [x] All routes accessible
- [x] Role-based access working
- [ ] Responsive design on mobile/tablet/desktop (partial)
- [ ] Dark mode support (if applicable)
- [x] Loading states working
- [x] Error handling implemented
- [x] Form validations working
- [x] Toast notifications appearing
