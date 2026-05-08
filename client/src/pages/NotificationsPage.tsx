import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Bell, Check, Trash2, Settings, 
  FileText, User, AlertCircle, CheckCircle, 
  Clock, Loader2, Folder
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';


import { cn } from '../lib/utils';
import { notificationService } from '../services/notification.service';
import { ErrorState } from '../components/ui/ErrorState';
import { emitNotificationsUpdated } from '../lib/notificationEvents';

interface Notification {
  id: string;
  type: 'DOCUMENT' | 'CASE' | 'REVIEW' | 'SYSTEM' | 'USER';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

const NOTIFICATION_CONFIG = {
  DOCUMENT: { icon: FileText, color: 'bg-primary/12 text-primary', label: 'Document' },
  CASE: { icon: Folder, color: 'bg-purple/12 text-purple', label: 'Case' },
  REVIEW: { icon: CheckCircle, color: 'bg-success/12 text-success', label: 'Review' },
  SYSTEM: { icon: AlertCircle, color: 'bg-warning/12 text-warning', label: 'System' },
  USER: { icon: User, color: 'bg-info/12 text-info', label: 'User' },
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchNotifications(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    setPage(1);
    setSelectedNotifications([]);
  }, [activeTab]);

  const fetchNotifications = async (targetPage = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await notificationService.getAll(targetPage, PAGE_SIZE, false);
      setNotifications(response.notifications || []);
      setPages(Math.max(1, response.pages || 1));
      setTotal(response.total || 0);
      setUnreadCount(response.unreadCount || 0);
      emitNotificationsUpdated(response.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications from the server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        emitNotificationsUpdated(next);
        return next;
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      emitNotificationsUpdated(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const target = notifications.find((n) => n.id === id);
      await notificationService.delete(id);
      setNotifications((prev) => prev.filter(n => n.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (target && !target.isRead) {
        setUnreadCount((prev) => {
          const next = Math.max(0, prev - 1);
          emitNotificationsUpdated(next);
          return next;
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteSelected = async () => {
    try {
      const removedUnread = notifications.filter(
        (n) => selectedNotifications.includes(n.id) && !n.isRead
      ).length;

      await notificationService.deleteBatch(selectedNotifications);
      setNotifications((prev) => prev.filter(n => !selectedNotifications.includes(n.id)));
      setSelectedNotifications([]);
      setTotal((prev) => Math.max(0, prev - selectedNotifications.length));
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - removedUnread);
        emitNotificationsUpdated(next);
        return next;
      });
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.isRead;
    return notification.type === activeTab;
  });

  const getTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cases')} className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-destructive/12 text-destructive border-destructive/20">
                  {unreadCount} unread
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">Stay updated on case activities</p>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedNotifications.length > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedNotifications.length})
            </Button>
          )}
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="mr-2 h-4 w-4" /> Mark all read
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorState 
          title="Failed to Load Notifications" 
          message={error} 
          onRetry={fetchNotifications} 
        />
      ) : (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted p-1 border border-border flex-wrap h-auto">
          <TabsTrigger value="all" className="px-4 gap-2">
            All <Badge variant="secondary" className="ml-1">{total}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="px-4 gap-2">
            Unread <Badge variant="secondary" className="ml-1 bg-destructive/12 text-destructive">{unreadCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="REVIEW" className="px-4 gap-2">
            Review
          </TabsTrigger>
          <TabsTrigger value="DOCUMENT" className="px-4 gap-2">
            Documents
          </TabsTrigger>
          <TabsTrigger value="CASE" className="px-4 gap-2">
            Cases
          </TabsTrigger>
          <TabsTrigger value="SYSTEM" className="px-4 gap-2">
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground">No Notifications</h3>
              <p className="text-muted-foreground">
                {activeTab === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : "No notifications in this category."}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredNotifications.map((notification, index) => {
                  const config = NOTIFICATION_CONFIG[notification.type];
                  const Icon = config.icon || Bell;
                  
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className={cn(
                          "group transition-all duration-200 hover:shadow-md",
                          !notification.isRead && "border-l-4 border-l-blue-500 bg-primary/10/30"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={selectedNotifications.includes(notification.id)}
                                onChange={() => toggleSelection(notification.id)}
                                className="rounded border-border"
                                aria-label={`Select notification: ${notification.title}`}
                              />
                              <div className={cn("p-2 rounded-lg", config.color)}>
                                <Icon className="h-5 w-5" />
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className={cn(
                                      "font-semibold text-foreground",
                                      !notification.isRead && "text-foreground font-semibold"
                                    )}>
                                      {notification.title}
                                    </h3>
                                    <Badge variant="outline" className={cn("text-xs", config.color)}>
                                      {config.label}
                                    </Badge>
                                    {!notification.isRead && (
                                      <span className="w-2 h-2 bg-primary rounded-full" />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {getTimeAgo(notification.createdAt)}
                                    </span>
                                    <span>
                                      {new Date(notification.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!notification.isRead && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => markAsRead(notification.id)}
                                      title="Mark as read"
                                      aria-label="Mark as read"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {notification.link && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => navigate(notification.link!)}
                                      title="View"
                                      aria-label="View notification"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => deleteNotification(notification.id)}
                                    className="text-destructive hover:text-destructive/80"
                                    title="Delete"
                                    aria-label="Delete notification"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Page {page} of {pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
                  disabled={page >= pages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
};

export default NotificationsPage;
