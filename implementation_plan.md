# Implementation Plan: e-Discovery Platform Full-Stack Enhancement

## Overview

This plan addresses missing functionality, code quality issues, and refactoring opportunities across the e-Discovery Platform. The application currently has solid foundations for case management, document upload, review workflow, and production sets, but lacks several critical features and has technical debt that needs addressing.

The goal is to create a production-ready e-discovery platform with proper API integrations, type safety, error handling, and all planned pages fully functional.

## Types

### New Type Definitions Required

```
typescript
// shared/types.ts additions

// Notification types
export interface INotification {
  id: string;
  userId: string;
  type: 'DOCUMENT' | 'CASE' | 'REVIEW' | 'SYSTEM' | 'USER';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

// Analytics types
export interface IAnalytics {
  caseId: string;
  totalDocuments: number;
  reviewedDocuments: number;
  pendingDocuments: number;
  privilegedDocuments: number;
  relevanceBreakdown: {
    HIGHLY_RELEVANT: number;
    RELEVANT: number;
    NOT_RELEVANT: number;
    MARGINAL: number;
  };
  privilegeBreakdown: {
    NOT_PRIVILEGED: number;
    ATTORNEY_CLIENT: number;
    WORK_PRODUCT: number;
    NEEDS_REVIEW: number;
  };
  teamPerformance: {
    userId: string;
    userName: string;
    documentsReviewed: number;
    avgTimePerDoc: number;
  }[];
  dailyProgress: {
    date: string;
    reviewed: number;
    uploaded: number;
  }[];
}

// Dashboard stats
export interface IDashboardStats {
  activeCases: number;
  totalDocuments: number;
  pendingReview: number;
  recentActivity: {
    type: string;
    description: string;
    timestamp: string;
  }[];
}

// User management types
export interface IUserUpdate {
  firstName?: string;
  lastName?: string;
  role?: 'ADMIN' | 'PARTNER' | 'ASSOCIATE' | 'PARALEGAL';
  isActive?: boolean;
}

// Audit log types
export interface IAuditLogQuery {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
```

## Files

### New Files to Create

**Backend (Server):**
1. `src/controllers/notification.controller.ts` - Notification CRUD operations
2. `src/controllers/analytics.controller.ts` - Analytics and dashboard data
3. `src/controllers/user.controller.ts` - User management operations
4. `src/controllers/dashboard.controller.ts` - Dashboard statistics
5. `src/routes/notification.routes.ts` - Notification API routes
6. `src/routes/analytics.routes.ts` - Analytics API routes
7. `src/routes/user.routes.ts` - User management routes
8. `src/routes/dashboard.routes.ts` - Dashboard routes

**Frontend (Client):**
1. `src/services/notification.service.ts` - Notification API service
2. `src/services/analytics.service.ts` - Analytics API service
3. `src/services/dashboard.service.ts` - Dashboard API service
4. `src/hooks/useNotifications.ts` - Notification hook
5. `src/hooks/useAnalytics.ts` - Analytics hook

### Existing Files to Modify

**Backend:**
1. `src/server.ts` - Register new routes
2. `src/controllers/authController.ts` - Add password reset endpoints
3. `src/models/Notification.ts` - Create notification model
4. `src/models/AuditLog.ts` - Add query methods

**Frontend:**
1. `client/src/services/api.ts` - Add JWT refresh interceptor
2. `client/src/store/authStore.ts` - Add token refresh logic
3. `client/src/pages/Search.tsx` - Connect filters to API
4. `client/src/pages/ProductionSetsPage.tsx` - Connect to API
5. `client/src/pages/UserManagementPage.tsx` - Connect to API
6. `client/src/pages/AuditLogsPage.tsx` - Connect to API
7. `client/src/pages/AnalyticsPage.tsx` - Connect to API
8. `client/src/pages/NotificationsPage.tsx` - Connect to API

## Functions

### New Backend Functions

**Notification Controller:**
- `getNotifications` - Fetch user notifications with pagination
- `markAsRead` - Mark single notification as read
- `markAllAsRead` - Mark all notifications as read
- `deleteNotification` - Delete notification
- `createNotification` - Create notification (internal use)

**Analytics Controller:**
- `getCaseAnalytics` - Get detailed analytics for a case
- `getTeamPerformance` - Get review team performance metrics
- `getReviewProgress` - Get review progress over time

**User Controller:**
- `getAllUsers` - List all users with pagination
- `getUserById` - Get user details
- `updateUser` - Update user details
- `deactivateUser` - Deactivate user account
- `getUsersByRole` - Filter users by role

**Dashboard Controller:**
- `getDashboardStats` - Get overall dashboard statistics
- `getRecentActivity` - Get recent activity across cases

### Modified Backend Functions

1. `authController.ts`:
   - Add `forgotPassword` - Send password reset email
   - Add `resetPassword` - Reset password with token
   - Add `changePassword` - Change password for logged in user

### New Frontend Functions

1. API service methods:
   - `getNotifications()`, `markAsRead()`, `markAllAsRead()`, `deleteNotification()`
   - `getCaseAnalytics(caseId)`, `getTeamPerformance(caseId)`
   - `getUsers()`, `updateUser()`, `deactivateUser()`
   - `getDashboardStats()`

## Classes

### New Backend Classes/Controllers

1. **NotificationController** - Handles all notification operations
2. **AnalyticsController** - Handles analytics computations
3. **UserController** - Handles user management
4. **DashboardController** - Aggregates dashboard data

### Frontend Changes

1. Update stores:
   - Add notification state to existing stores or create notification store
   - Add analytics state management

## Dependencies

### New NPM Packages

**Backend:**
- `nodemailer` - For password reset emails (dev only)
- `crypto` - Built-in for token generation

**Frontend:**
- Already has necessary packages

### Configuration Updates

1. Add environment variables:
   - `JWT_REFRESH_SECRET` - For refresh token validation
   - `FRONTEND_URL` - For CORS and emails

## Testing

### Backend Testing Requirements

1. Test all new endpoints with:
   - Valid requests (happy path)
   - Invalid requests (error handling)
   - Unauthorized access (auth middleware)
   - Role-based access control

2. Critical test cases:
   - Notification CRUD operations
   - Analytics calculations accuracy
   - User management permissions

### Frontend Testing Requirements

1. Test all connected pages:
   - Loading states
   - Error states
   - Empty states
   - Form validations

2. Integration tests:
   - Search filters actually work
   - Notifications update in real-time
   - Analytics charts render correctly

## Implementation Order

### Phase 1: Backend Foundation (Priority: High)
1. Create Notification model
2. Implement notification controller and routes
3. Implement analytics controller and routes
4. Implement user controller and routes
5. Implement dashboard controller and routes
6. Add password reset to auth controller
7. Register all new routes in server.ts

### Phase 2: Frontend Services (Priority: High)
1. Create notification service
2. Create analytics service
3. Create dashboard service
4. Add JWT refresh interceptor to api.ts

### Phase 3: Page Integration (Priority: Medium)
1. Connect Search.tsx filters to API
2. Connect ProductionSetsPage.tsx to API
3. Connect UserManagementPage.tsx to API
4. Connect AuditLogsPage.tsx to API
5. Connect AnalyticsPage.tsx to API
6. Connect NotificationsPage.tsx to API

### Phase 4: Code Quality (Priority: Medium)
1. Remove debug console.log statements
2. Replace `any` types with proper types
3. Add input validation
4. Improve error handling
5. Add loading states where missing

### Phase 5: Polish (Priority: Low)
1. Add animations
2. Improve accessibility
3. Add keyboard navigation
4. Optimize performance

---

## Detailed Technical Notes

### Notification System
The notification system should support:
- Real-time updates (polling or WebSocket - polling for simplicity)
- Different notification types (document assigned, review needed, production approved, etc.)
- Read/unread status
- Clickable links to relevant pages

### Analytics Calculations
- Review progress: (reviewed / total) * 100
- Relevance breakdown: Count documents by relevance status
- Privilege breakdown: Count documents by privilege status
- Team performance: Aggregate reviews per user with timestamps

### Search Integration
The Search.tsx currently has mock filter data. Need to:
1. Fetch actual custodians from API
2. Fetch actual tags from API
3. Build proper filter query
4. Connect to advancedSearch endpoint

### JWT Refresh Flow
1. Access token expires after 15 minutes
2. Refresh token expires after 7 days
3. On 401, try refresh endpoint
4. If refresh fails, logout user
