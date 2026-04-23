import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, Download, 
  User, Eye, Edit, Trash2, Plus, 
  CheckCircle, XCircle, Lock, Unlock, Loader2, X,
  Clock, Activity
} from 'lucide-react';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';

import { Badge } from '../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/Dialog';

import { cn } from '../lib/utils';
import api from '../services/api';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { useToastStore } from '../store/toastStore';
import {
  formatAuditAction,
  formatEntityName,
  getAuditActionClassName
} from '../utils/formatters';

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

const AuditLogsPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isPartner } = useRole();
  const { addToast } = useToastStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const numberFormatter = new Intl.NumberFormat();

  useEffect(() => {
    // Only fetch when user has permission; show permission UI otherwise.
    if (!isAdmin && !isPartner) return;
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isPartner]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/audit-logs');
      // Server returns { logs, total, page, pages }
      setLogs(response.data.logs || response.data || []);
    } catch {
      setLogs([]);
      addToast({
        title: 'Failed to load audit logs',
        message: 'Please refresh or try again shortly.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toCsvCell = (value: unknown): string => {
    if (value === undefined || value === null) {
      return '""';
    }

    const normalized = String(value)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/"/g, '""');
    return `"${normalized}"`;
  };

  const exportLogs = () => {
    const headers = [
      'Timestamp (UTC)',
      'User',
      'Email',
      'Action',
      'Entity Type',
      'Entity ID',
      'Entity Name',
      'IP Address'
    ];

    const lines = [headers.map(toCsvCell).join(',')];

    for (const log of filteredLogs) {
      const row = [
        new Date(log.createdAt).toISOString(),
        log.userName,
        log.userEmail,
        formatAuditAction(log.action),
        formatEntityName(log.entityType),
        log.entityId || '',
        log.entityName || '',
        log.ipAddress || ''
      ];
      lines.push(row.map(toCsvCell).join(','));
    }

    const csvContent = `\uFEFF${lines.join('\r\n')}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = globalThis.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute('download', `audit_logs_${stamp}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.URL.revokeObjectURL(url);
  };

  const getActionIcon = (action: string) => {
    const normalizedAction = action.toUpperCase();

    if (normalizedAction.includes('CREATE') || normalizedAction.includes('ADD') || normalizedAction.includes('UPLOAD') || normalizedAction.includes('IMPORT')) {
      return Plus;
    }
    if (normalizedAction.includes('UPDATE') || normalizedAction.includes('EDIT') || normalizedAction.includes('CODE')) {
      return Edit;
    }
    if (normalizedAction.includes('DELETE') || normalizedAction.includes('REMOVE') || normalizedAction.includes('REVOKE')) {
      return Trash2;
    }
    if (normalizedAction.includes('VIEW')) {
      return Eye;
    }
    if (normalizedAction.includes('DOWNLOAD') || normalizedAction.includes('EXPORT')) {
      return Download;
    }
    if (normalizedAction.includes('LOGIN')) {
      return Lock;
    }
    if (normalizedAction.includes('LOGOUT')) {
      return Unlock;
    }
    if (normalizedAction.includes('APPROVE') || normalizedAction.includes('PRODUCED')) {
      return CheckCircle;
    }
    if (normalizedAction.includes('REJECT') || normalizedAction.includes('DEACTIVATE')) {
      return XCircle;
    }

    return Activity;
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchLower) ||
      log.userEmail.toLowerCase().includes(searchLower) ||
      log.entityName?.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.entityType.toLowerCase().includes(searchLower);
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'ALL' || log.entityType === entityFilter;
    const matchesDateFrom = !dateFrom || new Date(log.createdAt) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(log.createdAt) <= new Date(dateTo + 'T23:59:59');
    return matchesSearch && matchesAction && matchesEntity && matchesDateFrom && matchesDateTo;
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));
  const uniqueEntities = Array.from(new Set(logs.map(l => l.entityType)));

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? 'Invalid date' : dateTimeFormatter.format(date);
  };

  const getTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!isAdmin && !isPartner) {
    return <PermissionDenied requiredRole="ADMIN or PARTNER" />;
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Audit Logs</h1>
            <p className="text-muted-foreground mt-1">Track all system activities and changes</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportLogs}>
          <Download className="mr-2 h-4 w-4" /> Export Logs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-muted">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Events</div>
            <div className="text-2xl font-bold text-foreground">{numberFormatter.format(logs.length)}</div>
          </CardContent>
        </Card>
        <Card className="bg-success/10">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-success uppercase tracking-wider">Today</div>
            <div className="text-2xl font-bold text-success">
              {logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/10">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-primary uppercase tracking-wider">Unique Users</div>
            <div className="text-2xl font-bold text-primary">
              {new Set(logs.map(l => l.userId)).size}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple/10">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-purple uppercase tracking-wider">Entity Types</div>
            <div className="text-2xl font-bold text-purple">{uniqueEntities.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search logs..."
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
            <div className="flex flex-wrap gap-2">
              <label htmlFor="action-filter" className="sr-only">Filter by action</label>
              <select 
                id="action-filter"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-card text-sm"
                title="Filter by action"
              >
                <option value="ALL">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{formatAuditAction(action)}</option>
                ))}
              </select>
              <label htmlFor="entity-filter" className="sr-only">Filter by entity</label>
              <select 
                id="entity-filter"
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-card text-sm"
                title="Filter by entity"
              >
                <option value="ALL">All Entities</option>
                {uniqueEntities.map(entity => (
                  <option key={entity} value={entity}>{formatEntityName(entity)}</option>
                ))}
              </select>
              <label htmlFor="date-from" className="sr-only">From date</label>
              <input 
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-card text-sm"
                title="From date"
              />
              <label htmlFor="date-to" className="sr-only">To date</label>
              <input 
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-card text-sm"
                title="To date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground">No Logs Found</h3>
          <p className="text-muted-foreground">No audit logs match your current filters</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 text-xs text-muted-foreground">
            Showing {numberFormatter.format(filteredLogs.length)} of {numberFormatter.format(logs.length)} events
          </div>
          <div className="divide-y divide-border">
            <AnimatePresence>
              {filteredLogs.map((log, index) => {
                const ActionIcon = getActionIcon(log.action);
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedLog(log);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn('p-2 rounded-lg flex-shrink-0', getAuditActionClassName(log.action))}>
                        <ActionIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">
                              <span className="font-semibold">{log.userName}</span>
                              {' '}<span className="text-muted-foreground">{formatAuditAction(log.action).toLowerCase()}</span>{' '}
                              <span className="font-semibold">{formatEntityName(log.entityType)}</span>
                              {log.entityName && (
                                <span className="text-muted-foreground">: {log.entityName}</span>
                              )}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimestamp(log.createdAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {log.userEmail}
                              </span>
                              {log.ipAddress && (
                                <span className="font-mono">{log.ipAddress}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className={cn('text-xs', getAuditActionClassName(log.action))}>
                              {formatAuditAction(log.action)}
                            </Badge>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {getTimeAgo(log.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Detailed information about this activity
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Timestamp</span>
                  <p className="font-semibold">{formatTimestamp(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Action</span>
                  <p className="font-semibold">
                    <Badge variant="outline" className={getAuditActionClassName(selectedLog.action)}>
                      {formatAuditAction(selectedLog.action)}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">User</span>
                  <p className="font-semibold">{selectedLog.userName}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.userEmail}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity</span>
                  <p className="font-semibold">{formatEntityName(selectedLog.entityType)}</p>
                  {selectedLog.entityName && (
                    <p className="text-xs text-muted-foreground">{selectedLog.entityName}</p>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">IP Address</span>
                  <p className="font-semibold font-mono">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity ID</span>
                  <p className="font-semibold font-mono text-xs">{selectedLog.entityId || 'N/A'}</p>
                </div>
              </div>
              {selectedLog.details && (
                <div>
                  <span className="text-muted-foreground text-sm">Details</span>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.userAgent && (
                <div>
                  <span className="text-muted-foreground text-sm">User Agent</span>
                  <p className="text-xs text-muted-foreground mt-1">{selectedLog.userAgent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogsPage;

