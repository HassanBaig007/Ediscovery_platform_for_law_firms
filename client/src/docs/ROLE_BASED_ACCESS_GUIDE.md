# Role-Based Access Control - Developer Guide

## Quick Reference

### Available Roles

#### System Roles (UserRole)
```typescript
type UserRole = 'ADMIN' | 'PARTNER' | 'ASSOCIATE' | 'PARALEGAL';
```

#### Case Roles (CaseRole)
```typescript
type CaseRole = 'LEAD' | 'REVIEWER' | 'PARALEGAL';
```

### Role Hierarchy & Permissions

```
ADMIN (Full System Access)
  ├─ User Management
  ├─ System Settings
  ├─ All Case Operations
  └─ Audit Logs

PARTNER (Case Management)
  ├─ Case Creation/Deletion
  ├─ Team Management
  ├─ Production Approval
  ├─ Analytics
  └─ Audit Logs

ASSOCIATE (Document Review)
  ├─ Document Search
  ├─ Document Review
  ├─ Coding/Tagging
  └─ View Analytics (limited)

PARALEGAL (Document Management)
  ├─ Document Upload
  ├─ Custodian Management
  ├─ Processing Status
  └─ Quality Control
```

## Using the useRole Hook

### Import
```typescript
import { useRole } from '../hooks/useRole';
```

### Available Properties

```typescript
const {
  user,              // Current user object
  isAdmin,           // true if role === 'ADMIN'
  isPartner,         // true if role === 'PARTNER' or 'ADMIN'
  isAssociate,       // true if role === 'ASSOCIATE'
  isParalegal,       // true if role === 'PARALEGAL'
  hasFullAccess,     // true if ADMIN or PARTNER
  canUpload,         // true if ADMIN, PARTNER, or PARALEGAL
  canReview,         // true if ADMIN, PARTNER, or ASSOCIATE
  canCreateCase,     // true if ADMIN or PARTNER
  getCaseRole,       // Function to get case-level role
  isLead,            // Function to check if user is LEAD on a case
} = useRole();
```

## Protecting Pages

### Pattern 1: Simple Role Check

```typescript
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';

const MyPage = () => {
  const { isAdmin } = useRole();

  if (!isAdmin) {
    return <PermissionDenied requiredRole="ADMIN" />;
  }

  return (
    <div>
      {/* Page content */}
    </div>
  );
};
```

### Pattern 2: Multiple Role Check

```typescript
const MyPage = () => {
  const { hasFullAccess } = useRole();

  if (!hasFullAccess) {
    return <PermissionDenied requiredRole="ADMIN or PARTNER" />;
  }

  return <div>{/* Page content */}</div>;
};
```

### Pattern 3: Custom Permission Logic

```typescript
const MyPage = () => {
  const { canUpload, hasFullAccess } = useRole();

  if (!canUpload && !hasFullAccess) {
    return <PermissionDenied requiredRole="ADMIN, PARTNER, or PARALEGAL" />;
  }

  return <div>{/* Page content */}</div>;
};
```

### Pattern 4: Case-Level Role Check

```typescript
const CaseDetailPage = () => {
  const { isLead, hasFullAccess } = useRole();
  const [caseData, setCaseData] = useState(null);

  // ... fetch case data

  if (!hasFullAccess && !isLead(caseData)) {
    return <PermissionDenied requiredRole="LEAD, PARTNER, or ADMIN" />;
  }

  return <div>{/* Page content */}</div>;
};
```

## Conditional UI Elements

### Show/Hide Based on Role

```typescript
const MyComponent = () => {
  const { isAdmin, canUpload } = useRole();

  return (
    <div>
      {/* Always visible */}
      <ViewButton />

      {/* Only for users who can upload */}
      {canUpload && <UploadButton />}

      {/* Only for admins */}
      {isAdmin && <DeleteButton />}
    </div>
  );
};
```

### Disable Based on Role

```typescript
const MyComponent = () => {
  const { hasFullAccess } = useRole();

  return (
    <Button 
      disabled={!hasFullAccess}
      onClick={handleSave}
    >
      Save Changes
    </Button>
  );
};
```

## Navigation Filtering

### Adding Role-Based Navigation Items

```typescript
// In Sidebar.tsx or navigation component
const navItems = [
  { 
    icon: Home, 
    label: 'Dashboard', 
    path: '/dashboard', 
    roles: ['ALL'] // Visible to all
  },
  { 
    icon: Users, 
    label: 'User Management', 
    path: '/admin/users', 
    roles: ['ADMIN'] // Admin only
  },
  { 
    icon: BarChart3, 
    label: 'Analytics', 
    path: '/analytics', 
    roles: ['ADMIN', 'PARTNER'] // Admin and Partner
  },
];

// Filter based on user role
const { isAdmin, isPartner } = useRole();

const filteredNavItems = navItems.filter(item => {
  if (item.roles.includes('ALL')) return true;
  if (item.roles.includes('ADMIN') && isAdmin) return true;
  if (item.roles.includes('PARTNER') && isPartner) return true;
  return false;
});
```

## Common Patterns

### 1. Admin-Only Page

```typescript
const AdminPage = () => {
  const { isAdmin } = useRole();

  if (!isAdmin) {
    return <PermissionDenied requiredRole="ADMIN" />;
  }

  return <div>Admin Content</div>;
};
```

### 2. Management Page (Admin + Partner)

```typescript
const ManagementPage = () => {
  const { hasFullAccess } = useRole();

  if (!hasFullAccess) {
    return <PermissionDenied requiredRole="ADMIN or PARTNER" />;
  }

  return <div>Management Content</div>;
};
```

### 3. Review Page (Admin + Partner + Associate)

```typescript
const ReviewPage = () => {
  const { canReview } = useRole();

  if (!canReview) {
    return <PermissionDenied requiredRole="ADMIN, PARTNER, or ASSOCIATE" />;
  }

  return <div>Review Content</div>;
};
```

### 4. Upload Page (Admin + Partner + Paralegal)

```typescript
const UploadPage = () => {
  const { canUpload } = useRole();

  if (!canUpload) {
    return <PermissionDenied requiredRole="ADMIN, PARTNER, or PARALEGAL" />;
  }

  return <div>Upload Content</div>;
};
```

## Testing Role-Based Access

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react';
import { useRole } from '../hooks/useRole';
import MyProtectedPage from './MyProtectedPage';

// Mock the useRole hook
jest.mock('../hooks/useRole');

describe('MyProtectedPage', () => {
  it('shows PermissionDenied for non-admin users', () => {
    (useRole as jest.Mock).mockReturnValue({
      isAdmin: false,
      hasFullAccess: false,
    });

    render(<MyProtectedPage />);
    
    expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
  });

  it('shows page content for admin users', () => {
    (useRole as jest.Mock).mockReturnValue({
      isAdmin: true,
      hasFullAccess: true,
    });

    render(<MyProtectedPage />);
    
    expect(screen.getByText(/page content/i)).toBeInTheDocument();
  });
});
```

### Integration Test Example

```typescript
describe('Role-Based Navigation', () => {
  it('shows Analytics link for ADMIN', () => {
    loginAs('ADMIN');
    render(<Sidebar />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('hides Analytics link for ASSOCIATE', () => {
    loginAs('ASSOCIATE');
    render(<Sidebar />);
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
  });
});
```

## Best Practices

### ✅ DO

1. **Always check permissions at the page level**
   ```typescript
   if (!hasPermission) {
     return <PermissionDenied requiredRole="ROLE" />;
   }
   ```

2. **Use semantic permission checks**
   ```typescript
   const { canUpload } = useRole(); // Good
   // vs
   const { isParalegal } = useRole(); // Less clear
   ```

3. **Provide clear error messages**
   ```typescript
   <PermissionDenied requiredRole="ADMIN or PARTNER" />
   ```

4. **Filter navigation based on role**
   ```typescript
   const filteredItems = items.filter(item => hasPermission(item));
   ```

5. **Test with all roles**
   - Test each page with ADMIN, PARTNER, ASSOCIATE, PARALEGAL
   - Verify permission denied messages
   - Verify navigation filtering

### ❌ DON'T

1. **Don't rely only on client-side checks**
   ```typescript
   // Client-side check is good for UX
   if (!isAdmin) return <PermissionDenied />;
   
   // But server must also validate!
   // Backend: if (user.role !== 'ADMIN') return 403;
   ```

2. **Don't hardcode role names everywhere**
   ```typescript
   // Bad
   if (user.role === 'ADMIN' || user.role === 'PARTNER') { }
   
   // Good
   if (hasFullAccess) { }
   ```

3. **Don't forget to handle loading states**
   ```typescript
   const { user, isAdmin } = useRole();
   
   if (!user) return <LoadingSpinner />;
   if (!isAdmin) return <PermissionDenied />;
   ```

4. **Don't show actions users can't perform**
   ```typescript
   // Bad - shows button but disables it
   <Button disabled={!isAdmin}>Delete</Button>
   
   // Good - only shows if user can perform action
   {isAdmin && <Button>Delete</Button>}
   ```

## Troubleshooting

### Issue: Permission check not working

**Check:**
1. Is `useRole` imported correctly?
2. Is user authenticated?
3. Is user object populated?
4. Is role property set correctly?

```typescript
const { user, isAdmin } = useRole();
console.log('User:', user);
console.log('Is Admin:', isAdmin);
```

### Issue: Navigation not filtering

**Check:**
1. Are roles defined on nav items?
2. Is filtering logic correct?
3. Is useRole hook called in navigation component?

```typescript
console.log('Nav Items:', navItems);
console.log('Filtered Items:', filteredNavItems);
console.log('User Role:', user?.role);
```

### Issue: PermissionDenied not showing

**Check:**
1. Is component imported correctly?
2. Is return statement before other content?
3. Is condition correct?

```typescript
// Must be early return
if (!hasPermission) {
  return <PermissionDenied requiredRole="ADMIN" />;
}
// Not after other content
```

## Quick Checklist for New Pages

- [ ] Import `useRole` hook
- [ ] Import `PermissionDenied` component
- [ ] Add permission check at top of component
- [ ] Return `PermissionDenied` if unauthorized
- [ ] Add page to navigation with correct roles
- [ ] Test with all role types
- [ ] Verify server-side protection exists
- [ ] Document required role in page comments

## Example: Complete Protected Page

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

/**
 * MyProtectedPage
 * 
 * Required Role: ADMIN or PARTNER
 * 
 * This page allows management users to perform administrative tasks.
 */
const MyProtectedPage = () => {
  const navigate = useNavigate();
  const { hasFullAccess, isAdmin } = useRole();
  const [data, setData] = useState(null);

  // Permission check - must be first
  if (!hasFullAccess) {
    return <PermissionDenied requiredRole="ADMIN or PARTNER" />;
  }

  useEffect(() => {
    // Fetch data
  }, []);

  return (
    <div className="space-y-6">
      <h1>Protected Page</h1>
      
      <Card>
        <p>Content visible to ADMIN and PARTNER</p>
      </Card>

      {/* Admin-only action */}
      {isAdmin && (
        <Button variant="destructive">
          Delete (Admin Only)
        </Button>
      )}
    </div>
  );
};

export default MyProtectedPage;
```

## Resources

- **useRole Hook**: `src/hooks/useRole.ts`
- **PermissionDenied Component**: `src/components/ui/PermissionDenied.tsx`
- **Type Definitions**: `shared/types.ts`
- **Example Pages**: 
  - `src/pages/UserManagementPage.tsx` (ADMIN only)
  - `src/pages/AuditLogsPage.tsx` (ADMIN + PARTNER)
  - `src/pages/ReviewPage.tsx` (ADMIN + PARTNER + ASSOCIATE)
  - `src/pages/UploadPage.tsx` (ADMIN + PARTNER + PARALEGAL)
