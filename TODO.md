# e-Discovery Platform - Missing Pages Implementation

## Phase 1: Essential Pages (High Priority)

### 1. User Profile & Settings Page (`/profile`)
- [ ] Create ProfilePage.tsx with user info display
- [ ] Add password change functionality
- [ ] Add preferences section (theme, notifications)
- [ ] Add activity history section
- [ ] Add route to App.tsx

### 2. Production Sets Management (`/cases/:id/productions`)
- [ ] Create ProductionSetsPage.tsx
- [ ] List production sets with status badges
- [ ] Create production set modal/form
- [ ] Bates numbering display
- [ ] Export workflow actions (Approve, Produce)
- [ ] Download functionality
- [ ] Add route to App.tsx

### 3. Custodian Management Page (`/cases/:id/custodians`)
- [ ] Create CustodiansPage.tsx
- [ ] List custodians with stats
- [ ] Add/Edit custodian modal
- [ ] Document count per custodian
- [ ] Import from CSV functionality
- [ ] Add route to App.tsx

### 4. Issue Tags Management (`/cases/:id/tags`)
- [ ] Create TagsPage.tsx
- [ ] List tags with color coding
- [ ] Create/Edit tag modal with color picker
- [ ] Tag usage statistics
- [ ] Bulk delete functionality
- [ ] Add route to App.tsx

### 5. 404 Not Found Page (`*`)
- [ ] Create NotFoundPage.tsx
- [ ] Professional error illustration
- [ ] Navigation assistance (links to home, cases, search)
- [ ] Search functionality
- [ ] Update route in App.tsx

### 6. Forgot/Reset Password Page (`/forgot-password`)
- [ ] Create ForgotPasswordPage.tsx
- [ ] Email input form
- [ ] Token validation page
- [ ] New password form
- [ ] Add routes to App.tsx

## Phase 2: Administrative Pages (Medium Priority)

### 7. User Management Page (`/admin/users`)
- [ ] Create UserManagementPage.tsx (Admin only)
- [ ] User list with filters
- [ ] Create/Edit user modal
- [ ] Role assignment dropdown
- [ ] Activate/Deactivate toggle
- [ ] Bulk operations
- [ ] Add route to App.tsx with admin protection

### 8. Audit Logs Page (`/admin/audit-logs`)
- [ ] Create AuditLogsPage.tsx (Admin/Partner)
- [ ] Activity list with filters
- [ ] Filter by user, action, date range
- [ ] Export audit reports (CSV)
- [ ] Pagination
- [ ] Add route to App.tsx

## Phase 3: Advanced Features (Lower Priority)

### 9. Advanced Analytics Dashboard (`/analytics`)
- [ ] Create AnalyticsPage.tsx
- [ ] Review progress charts (recharts)
- [ ] Document statistics cards
- [ ] User productivity metrics
- [ ] Timeline visualizations
- [ ] Case comparison charts
- [ ] Add route to App.tsx

### 10. Notifications Center (`/notifications`)
- [ ] Create NotificationsPage.tsx
- [ ] Notification list with categories
- [ ] Mark as read/unread
- [ ] Real-time updates indicator
- [ ] Notification settings
- [ ] Add route to App.tsx

### 11. Dedicated Document Upload Page (`/cases/:id/upload`)
- [ ] Create UploadPage.tsx
- [ ] Drag-and-drop zone
- [ ] Upload progress tracking
- [ ] Custodian selection
- [ ] Duplicate detection preview
- [ ] Batch upload status
- [ ] Add route to App.tsx

## Phase 4: UI/UX Polish & Components

### 12. Global Header Component
- [ ] Create Header.tsx component
- [ ] User profile dropdown
- [ ] Quick search bar
- [ ] Notifications bell with badge
- [ ] Breadcrumb navigation
- [ ] Integrate into MainLayout.tsx

### 13. Enhanced Sidebar Navigation
- [ ] Update Sidebar.tsx with all routes
- [ ] Add role-based menu visibility
- [ ] Collapsible submenus for Cases
- [ ] Active state indicators
- [ ] Icons for all menu items

### 14. Toast Notification System
- [ ] Create toast store (toastStore.ts)
- [ ] Create ToastContainer component
- [ ] Success/Error/Warning/Info variants
- [ ] Auto-dismiss with progress bar
- [ ] Integrate into MainLayout.tsx

### 15. Confirmation Modal System
- [ ] Create ConfirmationModal component
- [ ] Delete confirmation variant
- [ ] Action warning variant
- [ ] Customizable buttons and text

### 16. Loading Skeletons
- [ ] Create SkeletonCard component
- [ ] Create SkeletonTable component
- [ ] Create SkeletonStats component
- [ ] Apply to existing pages

## UI Components to Create/Extend

### New UI Components Needed:
- [ ] ColorPicker.tsx (for tag colors)
- [ ] FileDropzone.tsx (for uploads)
- [ ] ProgressBar.tsx (for uploads/review)
- [ ] StatCard.tsx (for analytics)
- [ ] ActivityItem.tsx (for audit logs)
- [ ] NotificationItem.tsx
- [ ] Breadcrumb.tsx

### Extend Existing Components:
- [ ] Update Button.tsx variants if needed
- [ ] Update Card.tsx with new variants
- [ ] Update Input.tsx with new features

## Routes Update Checklist

Update App.tsx with all new routes:
- [ ] `/profile` - ProfilePage
- [ ] `/forgot-password` - ForgotPasswordPage
- [ ] `/cases/:id/custodians` - CustodiansPage
- [ ] `/cases/:id/tags` - TagsPage
- [ ] `/cases/:id/productions` - ProductionSetsPage
- [ ] `/cases/:id/upload` - UploadPage
- [ ] `/admin/users` - UserManagementPage (admin only)
- [ ] `/admin/audit-logs` - AuditLogsPage
- [ ] `/analytics` - AnalyticsPage
- [ ] `/notifications` - NotificationsPage
- [ ] `*` - NotFoundPage (update existing)

## API Integration Checklist

Ensure all pages have proper API integration:
- [ ] Profile API endpoints
- [ ] Production sets API endpoints
- [ ] Custodian CRUD API endpoints
- [ ] Tags CRUD API endpoints
- [ ] Audit logs API endpoints
- [ ] Analytics API endpoints
- [ ] Notifications API endpoints

## Testing Checklist

- [ ] All routes accessible
- [ ] Role-based access working
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Dark mode support (if applicable)
- [ ] Loading states working
- [ ] Error handling implemented
- [ ] Form validations working
- [ ] Toast notifications appearing

