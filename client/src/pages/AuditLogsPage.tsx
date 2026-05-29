import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Download,
  User, Eye, Edit, Trash2, Plus,
  CheckCircle, XCircle, Lock, Unlock, Loader2, X,
  Clock, Activity, Shield, FileText, Calendar,
  Globe, Hash, ChevronRight,
} from 'lucide-react';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
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
  getAuditActionClassName,
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

// ── helpers ──────────────────────────────────────────────────────────────────

const getActionIcon = (action: string) => {
  const a = action.toUpperCase();
  if (a.includes('CREATE') || a.includes('ADD') || a.includes('UPLOAD') || a.includes('IMPORT')) return Plus;
  if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('CODE')) return Edit;
  if (a.includes('DELETE') || a.includes('REMOVE') || a.includes('REVOKE')) return Trash2;
  if (a.includes('VIEW')) return Eye;
  if (a.includes('DOWNLOAD') || a.includes('EXPORT')) return Download;
  if (a.includes('LOGIN')) return Lock;
  if (a.includes('LOGOUT')) return Unlock;
  if (a.includes('APPROVE') || a.includes('PRODUCED')) return CheckCircle;
  if (a.includes('REJECT') || a.includes('DEACTIVATE')) return XCircle;
  return Activity;
};

// Solid background colours per action category (better contrast than /12 opacity)
const getActionStyle = (action: string): { bg: string; text: string; dot: string } => {
  const a = action.toUpperCase();
  if (a.includes('UPLOAD') || a.includes('CREATE') || a.includes('IMPORT'))
    return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' };
  if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('CODE'))
    return { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' };
  if (a.includes('DELETE') || a.includes('REMOVE') || a.includes('REVOKE'))
    return { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' };
  if (a.includes('VIEW') || a.includes('DOWNLOAD') || a.includes('EXPORT'))
    return { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' };
  if (a.includes('LOGIN') || a.includes('LOGOUT'))
    return { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' };
  if (a.includes('APPROVE') || a.includes('PRODUCE'))
    return { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', dot: 'bg-teal-500' };
  return { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' };
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const stringToHue = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};

// ── component ─────────────────────────────────────────────────────────────────

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
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  const numberFormatter = new Intl.NumberFormat();

  useEffect(() => {
    if (!isAdmin && !isPartner) return;
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isPartner]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/audit-logs');
      setLogs(response.data.logs || response.data || []);
    } catch {
      setLogs([]);
      addToast({ title: 'Failed to load audit logs', message: 'Please refresh or try again shortly.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const toCsvCell = (value: unknown): string => {
    if (value === undefined || value === null) return '""';
    const normalized = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/"/g, '""');
    return `"${normalized}"`;
  };

  const exportLogs = () => {
    const headers = ['Timestamp (UTC)', 'User', 'Email', 'Action', 'Entity Type', 'Entity ID', 'Entity Name', 'IP Address'];
    const lines = [headers.map(toCsvCell).join(',')];
    for (const log of filteredLogs) {
      lines.push([
        new Date(log.createdAt).toISOString(), log.userName, log.userEmail,
        formatAuditAction(log.action), formatEntityName(log.entityType),
        log.entityId || '', log.entityName || '', log.ipAddress || '',
      ].map(toCsvCell).join(','));
    }
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = globalThis.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      log.userName.toLowerCase().includes(q) ||
      log.userEmail.toLowerCase().includes(q) ||
      log.entityName?.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q);
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'ALL' || log.entityType === entityFilter;
    const matchesDateFrom = !dateFrom || new Date(log.createdAt) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(log.createdAt) <= new Date(dateTo + 'T23:59:59');
    return matchesSearch && matchesAction && matchesEntity && matchesDateFrom && matchesDateTo;
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));
  const uniqueEntities = Array.from(new Set(logs.map(l => l.entityType)));

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? 'Invalid date' : dateTimeFormatter.format(d);
  };

  const getTimeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  if (!isAdmin && !isPartner) return <PermissionDenied requiredRole="ADMIN or PARTNER" />;

  const todayCount = logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length;
  const uniqueUserCount = new Set(logs.map(l => l.userId)).size;

  return (
    <div className="space-y-6 pb-10 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cases')} className="-ml-1 h-8 w-8" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Audit Logs</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Track all system activities and changes</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportLogs} className="gap-1.5 shrink-0">
          <Download className="h-3.5 w-3.5" /> Export Logs
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: numberFormatter.format(logs.length), icon: Activity, bg: 'bg-muted', iconCls: 'text-foreground' },
          { label: 'Today', value: todayCount, icon: Calendar, bg: 'bg-emerald-500/10', iconCls: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Unique Users', value: uniqueUserCount, icon: User, bg: 'bg-blue-500/10', iconCls: 'text-blue-600 dark:text-blue-400' },
          { label: 'Entity Types', value: uniqueEntities.length, icon: Shield, bg: 'bg-violet-500/10', iconCls: 'text-violet-600 dark:text-violet-400' },
        ].map(({ label, value, icon: Icon, bg, iconCls }) => (
          <Card key={label} className="border border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn('p-2.5 rounded-xl shrink-0', bg)}>
                <Icon className={cn('h-5 w-5', iconCls)} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ── */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by user, action, entity…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search">
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              )}
            </div>

            {/* Dropdowns + dates */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'action-filter', value: actionFilter, onChange: setActionFilter, defaultLabel: 'All Actions', options: uniqueActions.map(a => ({ value: a, label: formatAuditAction(a) })) },
                { id: 'entity-filter', value: entityFilter, onChange: setEntityFilter, defaultLabel: 'All Entities', options: uniqueEntities.map(e => ({ value: e, label: formatEntityName(e) })) },
              ].map(({ id, value, onChange, defaultLabel, options }) => (
                <div key={id} className="relative">
                  <label htmlFor={id} className="sr-only">{defaultLabel}</label>
                  <select
                    id={id}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="h-9 pl-3 pr-8 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
                  >
                    <option value="ALL">{defaultLabel}</option>
                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground rotate-90 pointer-events-none" />
                </div>
              ))}

              {[
                { id: 'date-from', value: dateFrom, onChange: setDateFrom, label: 'From date' },
                { id: 'date-to', value: dateTo, onChange: setDateTo, label: 'To date' },
              ].map(({ id, value, onChange, label }) => (
                <div key={id} className="relative">
                  <label htmlFor={id} className="sr-only">{label}</label>
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    id={id}
                    type="date"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="h-9 pl-8 pr-3 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    title={label}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Log List ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading audit logs…</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="border border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Activity className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-foreground">No logs found</p>
            <p className="text-sm text-muted-foreground mt-1">No audit events match your current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          {/* Table header */}
          <CardHeader className="px-5 py-3 border-b border-border bg-muted/40 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-foreground">
              Activity Feed
            </CardTitle>
            <span className="text-xs text-muted-foreground bg-background border border-border/60 px-2.5 py-1 rounded-full font-medium">
              {numberFormatter.format(filteredLogs.length)} of {numberFormatter.format(logs.length)} events
            </span>
          </CardHeader>

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-2 border-b border-border/60 bg-muted/20">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Event</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">User</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Timestamp</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Action</span>
          </div>

          <div className="divide-y divide-border/40">
            <AnimatePresence initial={false}>
              {filteredLogs.map((log, index) => {
                const ActionIcon = getActionIcon(log.action);
                const style = getActionStyle(log.action);
                const hue = stringToHue(log.userName);

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(index * 0.015, 0.3), duration: 0.25 }}
                    className="group grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-3 md:gap-4 items-center px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => { setSelectedLog(log); setIsDetailModalOpen(true); }}
                  >
                    {/* Event */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('p-2 rounded-lg shrink-0', style.bg)}>
                        <ActionIcon className={cn('h-4 w-4', style.text)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">
                          <span className="font-semibold">{log.userName}</span>
                          {' '}
                          <span className="text-muted-foreground font-normal">{formatAuditAction(log.action).toLowerCase()}</span>
                          {' '}
                          <span className="font-semibold">{formatEntityName(log.entityType)}</span>
                        </p>
                        {log.entityName && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-[260px]">
                            <FileText className="inline h-3 w-3 mr-1 shrink-0" />
                            {log.entityName}
                          </p>
                        )}
                        {/* Mobile-only meta */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 md:hidden text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTimestamp(log.createdAt)}</span>
                          <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{log.ipAddress || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* User */}
                    <div className="hidden md:flex items-center gap-2 min-w-0">
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                        style={{ backgroundColor: `hsl(${hue}, 50%, 46%)` }}
                      >
                        {getInitials(log.userName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{log.userName}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">{log.userEmail}</p>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="hidden md:block">
                      <p className="text-xs text-foreground font-medium">{formatTimestamp(log.createdAt)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {getTimeAgo(log.createdAt)}
                      </p>
                      {log.ipAddress && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 font-mono">
                          <Globe className="h-3 w-3 shrink-0" />
                          {log.ipAddress}
                        </p>
                      )}
                    </div>

                    {/* Action badge */}
                    <div className="hidden md:flex items-center justify-between gap-2">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                        style.bg, style.text,
                        'border-current/20'
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', style.dot)} />
                        {formatAuditAction(log.action)}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {/* ── Detail Modal ── */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Full record of this system event.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (() => {
            const style = getActionStyle(selectedLog.action);
            const ActionIcon = getActionIcon(selectedLog.action);
            const hue = stringToHue(selectedLog.userName);
            return (
              <div className="space-y-4 pt-2">

                {/* Action banner */}
                <div className={cn('flex items-center gap-3 p-3 rounded-xl border', style.bg, 'border-current/10')}>
                  <div className={cn('p-2 rounded-lg', style.bg)}>
                    <ActionIcon className={cn('h-5 w-5', style.text)} />
                  </div>
                  <div>
                    <p className={cn('text-sm font-bold', style.text)}>{formatAuditAction(selectedLog.action)}</p>
                    <p className="text-xs text-muted-foreground">{formatEntityName(selectedLog.entityType)}</p>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">{getTimeAgo(selectedLog.createdAt)}</span>
                </div>

                {/* Grid of fields */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Clock, label: 'Timestamp', value: formatTimestamp(selectedLog.createdAt) },
                    { icon: Hash, label: 'Entity ID', value: selectedLog.entityId || 'N/A', mono: true, small: true },
                    { icon: FileText, label: 'Entity Name', value: selectedLog.entityName || 'N/A' },
                    { icon: Globe, label: 'IP Address', value: selectedLog.ipAddress || 'N/A', mono: true },
                  ].map(({ icon: Icon, label, value, mono, small }) => (
                    <div key={label} className="p-3 rounded-lg bg-muted/50 border border-border/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        <Icon className="h-3 w-3" /> {label}
                      </div>
                      <p className={cn('font-semibold text-foreground break-all', mono && 'font-mono', small ? 'text-[11px]' : 'text-sm')}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* User */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/60">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                    style={{ backgroundColor: `hsl(${hue}, 50%, 46%)` }}
                  >
                    {getInitials(selectedLog.userName)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedLog.userName}</p>
                    <p className="text-xs text-muted-foreground">{selectedLog.userEmail}</p>
                  </div>
                </div>

                {/* Details JSON */}
                {selectedLog.details && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Payload</p>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40 text-foreground border border-border/60">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}

                {/* User agent */}
                {selectedLog.userAgent && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">User Agent</p>
                    <p className="text-xs text-muted-foreground bg-muted p-2.5 rounded-lg border border-border/60 break-all">
                      {selectedLog.userAgent}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogsPage;
