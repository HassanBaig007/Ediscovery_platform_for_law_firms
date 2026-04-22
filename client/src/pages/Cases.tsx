import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import { useRole } from '../hooks/useRole';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import {
  Plus, Search, Briefcase, CheckCircle2, Archive, FolderOpen,
  ChevronUp, ChevronDown, ChevronsUpDown, ArrowRight, MoreHorizontal,
  Eye, Edit, Trash2, Calendar, User, Hash, X, Loader2, AlertCircle
} from 'lucide-react';
import { ICase } from '../../../shared/types';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonStats, SkeletonTable } from '../components/ui/Skeleton';
import { CreateCaseModal } from '../components/modals/CreateCaseModal';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/Dialog';
import { useToastStore } from '../store/toastStore';

type SortKey = 'caseName' | 'clientName' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc' | null;

const ROWS_PER_PAGE = 10;

// ─── Avatar initials component ──────────────────────────────────────────────
function CaseAvatar({ name }: { readonly name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const hue = (name.codePointAt(0) ?? 0) % 360;

  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
      style={{ background: `hsl(${hue},55%,48%)` }}
    >
      {initials}
    </span>
  );
}

// ─── Sort header button ──────────────────────────────────────────────────────
function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  readonly sortKey: SortKey;
  readonly active: boolean;
  readonly dir: SortDir;
  readonly onClick: (k: SortKey) => void;
  readonly className?: string;
}) {
  let Icon = ChevronsUpDown;
  if (active) {
    Icon = dir === 'asc' ? ChevronUp : ChevronDown;
  }

  return (
    <button
      onClick={() => onClick(sortKey)}
      className={cn(
        'flex items-center gap-1 text-xs font-semibold uppercase tracking-wider select-none',
        'text-muted-foreground hover:text-foreground transition-colors group',
        className
      )}
    >
      {label}
      <Icon
        className={cn(
          'h-3.5 w-3.5 transition-colors',
          active ? 'text-primary' : 'opacity-0 group-hover:opacity-60'
        )}
      />
    </button>
  );
}

// ─── Row actions dropdown ────────────────────────────────────────────────────
function RowActions({
  onNavigate,
  onDeleteRequested,
  canDelete,
}: {
  readonly onNavigate: () => void;
  readonly onDeleteRequested: () => void;
  readonly canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()} role="presentation">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'h-7 w-7 rounded-md flex items-center justify-center',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          'transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100',
          open && 'opacity-100 bg-muted'
        )}
        aria-label="Row actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className={cn(
                'absolute right-0 z-20 mt-1 w-44 rounded-xl border border-border',
                'bg-popover shadow-elevation-2 overflow-hidden'
              )}
            >
              <div className="p-1">
                <button
                  onClick={() => { setOpen(false); onNavigate(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted text-foreground transition-colors"
                >
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  View Details
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted text-foreground transition-colors"
                >
                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  Edit Case
                </button>
                {canDelete && (
                  <>
                    <div className="my-1 border-t border-border/60" />
                    <button
                      onClick={() => {
                        setOpen(false);
                        onDeleteRequested();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Cases Page ─────────────────────────────────────────────────────────
const Cases = () => {
  const { cases, isLoading, error, fetchCases, createCase, deleteCase, page: serverPage, pages: serverPages, total, statusCounts } = useCaseStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const { canCreateCase, isAdmin } = useRole();
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [caseToDelete, setCaseToDelete] = useState<ICase | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingCase, setIsDeletingCase] = useState(false);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);

  const formatDate = useCallback((value: string | Date | undefined) => {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  useEffect(() => {
    fetchCases(
      statusFilter ?? 'All',
      page,
      ROWS_PER_PAGE,
      search,
      sortKey,
      sortDir === null ? 'desc' : sortDir
    );
  }, [fetchCases, statusFilter, page, search, sortKey, sortDir]);

  const stats = useMemo(() => {
    if (!statusCounts) return { total: 0, active: 0, closed: 0, archived: 0 };
    return {
      total: statusCounts.total,
      active: statusCounts.active,
      closed: statusCounts.closed,
      archived: statusCounts.archived,
    };
  }, [statusCounts]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }, [sortKey]);

  const pageRows = useMemo(() => cases ?? [], [cases]);
  const totalPages = Math.max(1, serverPages || 1);

  // Reset to page 1 on filter/search/sort change
  useEffect(() => { setPage(1); }, [statusFilter, search, sortKey, sortDir]);

  const statusFilters = [
    { label: 'All', value: null, count: stats.total },
    { label: 'Active', value: 'ACTIVE', count: stats.active },
    { label: 'Closed', value: 'CLOSED', count: stats.closed },
    { label: 'Archived', value: 'ARCHIVED', count: stats.archived },
  ];

  const confirmDeleteCase = useCallback(async () => {
    if (!caseToDelete?.id) {
      return;
    }

    setIsDeletingCase(true);
    try {
      await deleteCase(caseToDelete.id);
      addToast({
        title: 'Case deleted',
        message: `${caseToDelete.caseName} has been removed.`,
        type: 'success'
      });
      setIsDeleteModalOpen(false);
      setCaseToDelete(null);
    } catch {
      addToast({
        title: 'Failed to delete case',
        message: 'Please try again in a moment.',
        type: 'error'
      });
    } finally {
      setIsDeletingCase(false);
    }
  }, [caseToDelete, deleteCase, addToast]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading && cases.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cases</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage and track your legal discovery cases.</p>
        </div>
        <SkeletonStats count={4} />
        <Card>
          <div className="px-5 py-3.5 border-b border-border">
            <SkeletonStats count={1} />
          </div>
          <div className="p-5">
            <SkeletonTable rows={6} columns={4} />
          </div>
        </Card>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Cases</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage and track your legal discovery cases.</p>
          </div>
          {canCreateCase && (
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Case
            </Button>
          )}
        </div>
        <ErrorState title="Failed to load cases" message={error} onRetry={() => fetchCases()} />
        <CreateCaseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={createCase} />
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cases</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage and track your legal discovery cases.</p>
        </div>
        {canCreateCase && (
          <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" /> New Case
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Cases"   value={stats.total}    icon={Briefcase}    subtitle="Across platform" />
        <StatCard label="Active Cases"  value={stats.active}   icon={Briefcase}    variant="primary"  subtitle="Currently processing" />
        <StatCard label="Closed Cases"  value={stats.closed}   icon={CheckCircle2} variant="success"  subtitle="Completed" />
        <StatCard label="Archived"      value={stats.archived} icon={Archive}      variant="warning"  subtitle="Stored records" />
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden">
        {/* Toolbar */}
        <CardHeader className="px-5 py-3 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="w-full flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2" />
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f.label}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  statusFilter === f.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                )}
              >
                {f.label}
                <span className={cn(
                  'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  statusFilter === f.value
                    ? 'bg-white/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {numberFormatter.format(f.count)}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search cases..."
              className="pl-9 h-9 text-sm pr-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </CardHeader>

        {/* Empty state */}
        {pageRows.length === 0 && !isLoading && !statusFilter && !search ? (
          <EmptyState
            icon={FolderOpen}
            title="No cases yet"
            description="Get started by creating your first case. Cases help you organize documents and manage your legal discovery workflow."
            actionLabel="Create First Case"
            onAction={() => setIsCreateModalOpen(true)}
          />
        ) : pageRows.length === 0 && !isLoading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <Search className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium text-foreground">No results found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filter.</p>
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(null); }}>
              Clear filters
            </Button>
          </div>
        ) : isLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="px-4 py-3 w-10 text-left">
                      <Hash className="h-3 w-3 text-muted-foreground/50" />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader label="Case Name" sortKey="caseName" active={sortKey === 'caseName'} dir={sortDir} onClick={handleSort} />
                    </th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">
                      <SortHeader label="Client" sortKey="clientName" active={sortKey === 'clientName'} dir={sortDir} onClick={handleSort} />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader label="Status" sortKey="status" active={sortKey === 'status'} dir={sortDir} onClick={handleSort} />
                    </th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">
                      <SortHeader label="Created" sortKey="createdAt" active={sortKey === 'createdAt'} dir={sortDir} onClick={handleSort} />
                    </th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <AnimatePresence mode="popLayout">
                    {pageRows.map((c, idx) => (
                      <motion.tr
                        key={c.id ?? idx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, delay: idx * 0.03 }}
                        onClick={() => { if (c.id) navigate(`/cases/${c.id}`); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (c.id) navigate(`/cases/${c.id}`); } }}
                        className={cn(
                          'group relative cursor-pointer',
                          'hover:bg-muted/50 transition-colors duration-100',
                          'focus-within:bg-muted/50'
                        )}
                      >
                        {/* Row number */}
                        <td className="px-4 py-3.5 text-xs text-muted-foreground/50 tabular-nums">
                          {(page - 1) * ROWS_PER_PAGE + idx + 1}
                        </td>

                        {/* Case name + avatar */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <CaseAvatar name={c.caseName ?? '?'} />
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate leading-tight">
                                {c.caseName}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                {c.caseNumber || 'No case number'}
                              </p>
                              {/* Show client inline on mobile */}
                              <p className="text-xs text-muted-foreground truncate mt-0.5 md:hidden">
                                <User className="h-3 w-3 inline mr-1 opacity-60" />
                                {c.clientName ?? '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Client */}
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className="text-muted-foreground">{c.clientName ?? '—'}</span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={c.status ?? 'draft'} />
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            {c.createdAt
                              ? formatDate(c.createdAt)
                              : '—'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); if (c.id) navigate(`/cases/${c.id}`); }}
                              className={cn(
                                'h-7 w-7 rounded-md flex items-center justify-center',
                                'text-muted-foreground hover:text-primary hover:bg-primary/10',
                                'transition-all opacity-0 group-hover:opacity-100 focus:opacity-100'
                              )}
                              aria-label="View case"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                            <RowActions
                              onNavigate={() => { if (c.id) navigate(`/cases/${c.id}`); }}
                              onDeleteRequested={() => {
                                setCaseToDelete(c);
                                setIsDeleteModalOpen(true);
                              }}
                              canDelete={isAdmin}
                            />
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="px-5 py-3 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Showing{' '}
                <span className="font-medium text-foreground">
                  {Math.min((serverPage - 1) * ROWS_PER_PAGE + 1, total || 0)}–
                  {Math.min(serverPage * ROWS_PER_PAGE, total || 0)}
                </span>{' '}
                of{' '}
                <span className="font-medium text-foreground">{numberFormatter.format(total || 0)}</span>{' '}
                {(total || 0) === 1 ? 'case' : 'cases'}
                {statusFilter || search ? (
                  <Badge variant="secondary" className="ml-2 text-[10px]">Filtered</Badge>
                ) : null}
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={serverPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - serverPage) <= 1)
                  .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (arr[idx - 1] as number) + 1 !== p) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-xs">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={cn(
                          'h-8 w-8 rounded-md text-xs font-medium transition-colors',
                          serverPage === p
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        {p}
                      </button>
                    )
                  )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={serverPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {canCreateCase && (
        <CreateCaseModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={createCase}
        />
      )}

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Case
            </DialogTitle>
            <DialogDescription>
              This will permanently remove
              {' '}
              <span className="font-medium text-foreground">{caseToDelete?.caseName || 'this case'}</span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setCaseToDelete(null);
              }}
              disabled={isDeletingCase}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCase}
              disabled={isDeletingCase}
            >
              {isDeletingCase ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Case
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cases;
