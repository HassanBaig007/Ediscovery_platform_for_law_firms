import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Separator } from '../components/ui/Separator';
import { Toggle } from '../components/ui/Toggle';
import { 
  User, Mail, Shield, Clock, Activity, Lock, 
  Bell, Moon, Sun, CheckCircle, AlertCircle, 
  Save, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import api from '../services/api';
import { useToastStore } from '../store/toastStore';

import { dashboardService, DashboardStats, ActivityItem } from '../services/dashboard.service';

const ProfilePage = () => {
  const { user, fetchUser } = useAuthStore();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    reviewAlerts: true,
    darkMode: false,
    compactView: false,
  });

  // Live activity & stats
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, activityData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getRecentActivity(5)
        ]);
        setStats(statsData);
        setActivities(activityData);
      } catch (err) {
        console.error('Failed to load profile stats:', err);
      }
    };
    loadData();
  }, []);
  const handleProfileUpdate = async () => {
    setIsLoading(true);
    try {
      await api.put('/auth/profile', profileData);
      await fetchUser(); // Ensure global state accurately reflects the database
      addToast({ title: 'Profile updated successfully', type: 'success' });
    } catch (error: any) {
      console.error('Profile update error:', error);
      addToast({ title: error.response?.data?.message || 'Failed to update profile', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await api.put('/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      addToast({ title: 'Password changed successfully', type: 'success' });
    } catch (error: any) {
      console.error('Password change error:', error);
      addToast({ title: error.response?.data?.message || 'Failed to change password', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-destructive/12 text-destructive border-destructive/20';
      case 'PARTNER': return 'bg-purple/12 text-purple border-purple/20';
      case 'ASSOCIATE': return 'bg-primary/12 text-primary border-primary/20';
      case 'PARALEGAL': return 'bg-success/12 text-success border-success/20';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'Reviewed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'Uploaded': return <Activity className="h-4 w-4 text-primary" />;
      case 'Created': return <Sun className="h-4 w-4 text-warning" />;
      case 'Approved': return <Shield className="h-4 w-4 text-purple" />;
      case 'Login': return <Lock className="h-4 w-4 text-muted-foreground" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile & Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
        </div>
        <Badge 
          variant="outline" 
          className={cn("px-3 py-1 text-xs font-bold uppercase tracking-wider", getRoleColor(user?.role || ''))}
        >
          {user?.role}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - User Info */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <CardContent className="p-6 text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-white/20">
                <AvatarFallback className="bg-primary text-white text-2xl font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{user?.firstName} {user?.lastName}</h2>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Member Since</span>
                  <span className="font-medium">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Status</span>
                    <span className="flex items-center gap-1 text-success">
                      <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    Active
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/12 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Documents Reviewed</span>
                </div>
                <span className="text-lg font-bold text-foreground">{stats?.totalDocuments?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/12 rounded-lg">
                    <Clock className="h-4 w-4 text-success" />
                  </div>
                  <span className="text-sm font-medium">Pending Review</span>
                </div>
                <span className="text-lg font-bold text-foreground">{stats?.pendingReview?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple/12 rounded-lg">
                    <Shield className="h-4 w-4 text-purple" />
                  </div>
                  <span className="text-sm font-medium">Cases Active</span>
                </div>
                <span className="text-lg font-bold text-foreground">{stats?.activeCases?.toLocaleString() || '0'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted p-1 border border-border w-full justify-start">
              <TabsTrigger value="profile" className="px-6 gap-2">
                <User className="h-4 w-4" /> Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="px-6 gap-2">
                <Lock className="h-4 w-4" /> Security
              </TabsTrigger>
              <TabsTrigger value="preferences" className="px-6 gap-2">
                <Bell className="h-4 w-4" /> Preferences
              </TabsTrigger>
              <TabsTrigger value="activity" className="px-6 gap-2">
                <Clock className="h-4 w-4" /> Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details and contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="text-sm font-medium">First Name</label>
                      <Input 
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="lastName" className="text-sm font-medium">Last Name</label>
                      <Input 
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className="pl-10"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleProfileUpdate} disabled={isLoading}>
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="currentPassword" className="text-sm font-medium">Current Password</label>
                    <Input 
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      placeholder="Enter current password"
                    />
                  </div>

                  <Separator />
                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
                    <Input 
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</label>
                    <Input 
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      placeholder="Confirm new password"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive" role="alert">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button onClick={handlePasswordChange} disabled={isLoading}>
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                      ) : (
                        <><Lock className="mr-2 h-4 w-4" /> Update Password</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-destructive/10/50">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Delete Account</p>
                      <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data</p>
                    </div>
                    <Button variant="destructive" size="sm">
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose how you want to be notified</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { id: 'emailNotifications', label: 'Email Notifications', description: 'Receive email updates about case activities', icon: Mail },
                    { id: 'reviewAlerts', label: 'Review Alerts', description: 'Get notified when documents are assigned to you', icon: Bell },
                  ].map((pref) => (
                    <div key={pref.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-card rounded-lg shadow-xs">
                          <pref.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{pref.label}</p>
                          <p className="text-sm text-muted-foreground">{pref.description}</p>
                        </div>
                      </div>
                      <Toggle
                        id={pref.id}
                        checked={preferences[pref.id as keyof typeof preferences] as boolean}
                        onChange={(checked) => setPreferences({...preferences, [pref.id]: checked})}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Display Preferences</CardTitle>
                  <CardDescription>Customize your interface experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { id: 'darkMode', label: 'Dark Mode', description: 'Use dark theme across the application', icon: Moon },
                    { id: 'compactView', label: 'Compact View', description: 'Show more content with reduced spacing', icon: Sun },
                  ].map((pref) => (
                    <div key={pref.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-card rounded-lg shadow-xs">
                          <pref.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{pref.label}</p>
                          <p className="text-sm text-muted-foreground">{pref.description}</p>
                        </div>
                      </div>
                      <Toggle
                        id={pref.id}
                        checked={preferences[pref.id as keyof typeof preferences] as boolean}
                        onChange={(checked) => setPreferences({...preferences, [pref.id]: checked})}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

            </TabsContent>


            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent actions across all cases</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.length > 0 ? (
                      activities.map((activity, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-4 p-4 bg-muted rounded-xl hover:bg-muted transition-colors cursor-pointer group"
                        >
                          <div className="p-2 bg-card rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm">
                              {activity.description}
                            </p>
                            {activity.caseName && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                Case: {activity.caseName}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(activity.timestamp)}
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p>No recent activity found</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 text-center">
                    <Button variant="outline" size="sm">
                      View All Activity
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
