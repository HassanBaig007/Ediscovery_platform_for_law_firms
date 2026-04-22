import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Search, Mail, 
  MoreHorizontal, Trash2, Edit, Loader2, X, User,
  CheckCircle, XCircle, Download, Users,
  AlertCircle
} from 'lucide-react';


import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';

import { Badge } from '../components/ui/Badge';
import { Avatar, AvatarFallback } from '../components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/DropdownMenu';

import { cn } from '../lib/utils';
import api from '../services/api';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'PARTNER' | 'ASSOCIATE' | 'PARALEGAL';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  caseCount?: number;
  documentCount?: number;
}

const normalizeUser = (raw: any): User => ({
  id: raw.id || raw._id,
  email: raw.email,
  firstName: raw.firstName,
  lastName: raw.lastName,
  role: raw.role,
  isActive: Boolean(raw.isActive),
  lastLogin: raw.lastLogin,
  createdAt: raw.createdAt,
  caseCount: raw.caseCount,
  documentCount: raw.documentCount,
});

const ROLES = [
  { value: 'ADMIN', label: 'Admin', color: 'bg-destructive/12 text-destructive border-destructive/20', bg: 'bg-destructive/10', text: 'text-destructive' },
  { value: 'PARTNER', label: 'Partner', color: 'bg-purple/12 text-purple border-purple/20', bg: 'bg-purple/10', text: 'text-purple' },
  { value: 'ASSOCIATE', label: 'Associate', color: 'bg-primary/12 text-primary border-primary/20', bg: 'bg-primary/10', text: 'text-primary' },
  { value: 'PARALEGAL', label: 'Paralegal', color: 'bg-success/12 text-success border-success/20', bg: 'bg-success/10', text: 'text-success' },
];


const UserManagementPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'ASSOCIATE' as User['role'],
    isActive: true,
    password: '',
  });

  useEffect(() => {
    // Only fetch when user is admin. Do not force-navigation; show permission UI instead.
    if (!isAdmin) return;
    fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users');
      // Server returns { users, total, page, pages }
      const rawUsers = response.data.users || response.data || [];
      setUsers(Array.isArray(rawUsers) ? rawUsers.map(normalizeUser) : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    setIsProcessing(true);
    try {
      const response = await api.post('/auth/register', formData);
      // Register returns { success, data: { user } }
      const createdUser = normalizeUser(response.data.data?.user || response.data);
      setUsers([...users, createdUser]);
      setIsCreateModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', role: 'ASSOCIATE', isActive: true, password: '' });
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const response = await api.put(`/users/${selectedUser.id}`, formData);
      const updatedUser = normalizeUser(response.data.data?.user || response.data);
      setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      await api.delete(`/users/${selectedUser.id}`);
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const endpoint = user.isActive ? `/users/${user.id}/deactivate` : `/users/${user.id}/activate`;
      await api.patch(endpoint);
      setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: '',
    });
    setIsEditModalOpen(true);
  };

  const getRoleConfig = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[2];
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getAvatarColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-destructive';
      case 'PARTNER': return 'bg-purple';
      case 'ASSOCIATE': return 'bg-primary';
      case 'PARALEGAL': return 'bg-success';
      default: return 'bg-muted';
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower);
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && user.isActive) ||
      (statusFilter === 'INACTIVE' && !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    byRole: ROLES.map(role => ({
      ...role,
      count: users.filter(u => u.role === role.value).length,
    })),
  };

  const exportUsers = () => {
    const csvContent = [
      ['First Name', 'Last Name', 'Email', 'Role', 'Status', 'Created At'].join(','),
      ...filteredUsers.map(u => [
        u.firstName,
        u.lastName,
        u.email,
        u.role,
        u.isActive ? 'Active' : 'Inactive',
        new Date(u.createdAt).toLocaleDateString(),
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = globalThis.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `users_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return <PermissionDenied requiredRole="ADMIN" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cases')} className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage system users and permissions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportUsers}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-muted">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Users</div>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-success/10">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-success uppercase tracking-wider">Active</div>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/10">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-destructive uppercase tracking-wider">Inactive</div>
            <div className="text-2xl font-bold text-destructive">{stats.inactive}</div>
          </CardContent>
        </Card>
        {stats.byRole.map(role => (
          <Card key={role.value} className={role.bg}>
            <CardContent className="p-4">
              <div className={cn("text-xs font-bold uppercase tracking-wider", role.text)}>
                {role.label}s
              </div>
              <div className={cn("text-2xl font-bold", role.text)}>{role.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-3 top-3"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

            </div>
            <div className="flex gap-2">
              <label htmlFor="role-filter" className="sr-only">Filter by role</label>
              <select 
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-card text-sm"
                title="Filter by role"
              >

                <option value="ALL">All Roles</option>
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
              <label htmlFor="status-filter" className="sr-only">Filter by status</label>
              <select 
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-card text-sm"
                title="Filter by status"
              >

                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      {(() => {
        if (isLoading) {
          return (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }
        if (filteredUsers.length === 0) {
          return (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground">No Users Found</h3>
              <p className="text-muted-foreground mb-4">Add users to grant access to the system</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add First User
              </Button>
            </Card>
          );
        }
        return (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Activity</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Cases</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence>
                  {filteredUsers.map((user, index) => {
                    const roleConfig = getRoleConfig(user.role);
                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className={cn("h-10 w-10 text-white", getAvatarColor(user.role))}>
                              <AvatarFallback>
                                {getInitials(user.firstName, user.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-foreground">{user.firstName} {user.lastName}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={cn(roleConfig.color)}>
                            {roleConfig.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors",
                              user.isActive 
                                ? "bg-success/12 text-success" 
                                : "bg-destructive/12 text-destructive"
                            )}
                          >
                            {user.isActive ? (
                              <><CheckCircle className="h-3 w-3" /> Active</>
                            ) : (
                              <><XCircle className="h-3 w-3" /> Inactive</>
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-muted-foreground">
                            {user.lastLogin 
                              ? `Last login ${new Date(user.lastLogin).toLocaleDateString()}`
                              : 'Never logged in'
                            }
                          </p>
                          {user.documentCount !== undefined && user.documentCount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {user.documentCount.toLocaleString()} documents reviewed
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-foreground">
                            {user.caseCount || 0}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                  <Button variant="ghost" size="sm">

                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(user)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
        );
      })()}

      {/* Create/Edit User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="user-firstname" className="text-sm font-medium">First Name</label>
                <Input 
                  id="user-firstname"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="user-lastname" className="text-sm font-medium">Last Name</label>
                <Input 
                  id="user-lastname"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="user-email" className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="user-email"
                  type="email"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="john.doe@company.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="user-role" className="text-sm font-medium">Role</label>
              <select 
                id="user-role"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as User['role']})}
                className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm"
                title="Select user role"
              >
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="user-password" className="text-sm font-medium">Password</label>

              <Input 
                id="user-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Set initial password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={!formData.firstName || !formData.lastName || !formData.email || isProcessing}
            >
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : <><Plus className="mr-2 h-4 w-4" /> Create User</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="edit-user-firstname" className="text-sm font-medium">First Name</label>
                <Input 
                  id="edit-user-firstname"
                  value={formData.firstName} 
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-user-lastname" className="text-sm font-medium">Last Name</label>
                <Input 
                  id="edit-user-lastname"
                  value={formData.lastName} 
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-user-email" className="text-sm font-medium">Email</label>
              <Input 
                id="edit-user-email"
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-user-role" className="text-sm font-medium">Role</label>
              <select 
                id="edit-user-role"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as User['role']})}
                className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm"
                title="Select user role"
              >
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">

              <input 
                type="checkbox"
                id="edit-isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="rounded border-border"
              />
              <label htmlFor="edit-isActive" className="text-sm font-medium">Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser} disabled={isProcessing}>
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Edit className="mr-2 h-4 w-4" /> Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.firstName} {selectedUser?.lastName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isProcessing}>
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : <><Trash2 className="mr-2 h-4 w-4" /> Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;
