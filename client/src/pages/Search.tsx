import { useState, useMemo, useEffect, useCallback, type CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSearchStore } from '../store/searchStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Search as SearchIcon, Filter, SlidersHorizontal, FileText, Loader2, ArrowLeft, Bookmark, Download, X, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, ClientSideRowModelModule, ValidationModule } from 'ag-grid-community';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';
import { useToastStore } from '../store/toastStore';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { formatRelevanceStatus } from '../utils/formatters';

ModuleRegistry.registerModules([ClientSideRowModelModule, ValidationModule]);

/**
 * Cell renderer for document titles in the results grid.
 * Extracted to avoid nested component warnings.
 */
const TitleCellRenderer = (params: any) => (
    <div className="flex items-center gap-3 py-1">
        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
        <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{params.value}</p>
        </div>
    </div>
);

const FILE_TYPE_LABELS: Record<string, string> = {
    pdf: 'PDF',
    doc: 'Word',
    docx: 'Word',
    xls: 'Excel',
    xlsx: 'Excel',
    ppt: 'PowerPoint',
    pptx: 'PowerPoint',
    eml: 'Email',
    msg: 'Email',
    txt: 'Text',
    csv: 'CSV'
};

const FILE_TYPE_OPTIONS = [
    { ext: 'pdf', label: 'PDF' },
    { ext: 'doc', label: 'Word' },
    { ext: 'xls', label: 'Excel' },
    { ext: 'ppt', label: 'PowerPoint' },
    { ext: 'eml', label: 'Email' },
    { ext: 'txt', label: 'Text' },
    { ext: 'csv', label: 'CSV' }
];

const PRIVILEGE_OPTIONS = [
    'NOT_PRIVILEGED',
    'ATTORNEY_CLIENT',
    'WORK_PRODUCT',
    'NEEDS_REVIEW'
];

const RELEVANCE_OPTIONS = [
    'HIGHLY_RELEVANT',
    'RELEVANT',
    'MARGINAL',
    'NOT_RELEVANT'
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
});

const numberFormatter = new Intl.NumberFormat();

const formatBytes = (value?: number) => {
    if (!value || Number.isNaN(value)) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value;
    let index = 0;

    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index += 1;
    }

    const precision = index === 0 ? 0 : 1;
    return `${size.toFixed(precision)} ${units[index]}`;
};

const RelevanceCellRenderer = (params: any) => {
    const value = String(params.value || 'NOT_RELEVANT');
    const label = formatRelevanceStatus(value);

    const statusConfig: Record<string, { bg: string; text: string }> = {
        HIGHLY_RELEVANT: { bg: 'bg-emerald-100', text: 'text-emerald-900' },
        RELEVANT: { bg: 'bg-blue-100', text: 'text-blue-900' },
        MARGINAL: { bg: 'bg-amber-100', text: 'text-amber-900' },
        NOT_RELEVANT: { bg: 'bg-slate-100', text: 'text-slate-800' },
    };

    const config = statusConfig[value] || statusConfig.NOT_RELEVANT;

    return (
        <div className={`inline-flex items-center rounded-md px-2.5 py-1.5 font-semibold text-xs ${config.bg} ${config.text}`}>
            {label}
        </div>
    );
};

const FileTypeCellRenderer = (params: any) => {
    const rawValue = String(params.value || '').trim();
    const normalized = rawValue.toLowerCase();
    const display = FILE_TYPE_LABELS[normalized] || rawValue.toUpperCase() || 'Unknown';

    return (
        <div className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-1.5 font-semibold text-blue-900 text-xs">
            {display}
        </div>
    );
};

const SearchPage = () => {
    const { id: caseId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { canReview, hasFullAccess } = useRole();
    const {
        results,
        filters,
        isLoading,
        savedSearches,
        total,
        searchDocuments,
        setFilters,
        exportResults,
        loadSavedSearches,
        saveCurrentSearch,
        deleteSavedSearch,
    } = useSearchStore();

    if (!canReview && !hasFullAccess) {
        return <PermissionDenied requiredRole="ADMIN, PARTNER, or ASSOCIATE" />;
    }

    const [query, setQuery] = useState('');
    const [showFilters, setShowFilters] = useState(true);
    const [hasSearched, setHasSearched] = useState(false);
    const [custodians, setCustodians] = useState<Array<{_id: string; name: string}>>([]);
    const [saveSearchName, setSaveSearchName] = useState('');
    const [showSaveName, setShowSaveName] = useState(false);
    const [isSavingSearch, setIsSavingSearch] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);

    // Production Modal State
    const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
    const [draftProductions, setDraftProductions] = useState<any[]>([]);
    const [selectedProductionId, setSelectedProductionId] = useState<string>('');
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [isAddingToProduction, setIsAddingToProduction] = useState(false);
    const { addToast } = useToastStore();

    const selectedFileTypeLabels = useMemo(
        () => FILE_TYPE_OPTIONS.filter(option => selectedFileTypes.includes(option.ext)).map(option => option.label),
        [selectedFileTypes]
    );

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (query.trim()) count += 1;
        if (dateFrom) count += 1;
        if (dateTo) count += 1;
        count += selectedFileTypes.length;
        count += filters.privilegeStatuses?.length || 0;
        count += filters.relevanceStatuses?.length || 0;
        count += filters.custodianIds?.length || 0;
        return count;
    }, [dateFrom, dateTo, filters.custodianIds, filters.privilegeStatuses, filters.relevanceStatuses, query, selectedFileTypes.length]);

    useEffect(() => {
        if (!caseId) return;
        loadSavedSearches(caseId);
        api.get(`/cases/${caseId}/custodians`)
            .then(res => setCustodians(res.data ?? []))
            .catch(() => setCustodians([]));
    }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleQuickFilter = useCallback((presetFilters: Record<string, unknown>) => {
        setFilters(presetFilters as any);
        if (caseId) {
            searchDocuments(caseId);
            setHasSearched(true);
        }
    }, [caseId, setFilters, searchDocuments]);

    const handleExport = useCallback(async () => {
        if (!caseId) return;
        setIsExporting(true);
        try {
            await exportResults(caseId);
        } finally {
            setIsExporting(false);
        }
    }, [caseId, exportResults]);

    const handleSaveSearch = useCallback(async () => {
        if (!caseId || !saveSearchName.trim()) return;
        setIsSavingSearch(true);
        try {
            await saveCurrentSearch(caseId, saveSearchName.trim());
            setSaveSearchName('');
            setShowSaveName(false);
        } catch {
            // error is set in store
        } finally {
            setIsSavingSearch(false);
        }
    }, [caseId, saveSearchName, saveCurrentSearch]);

    const handleLoadSavedSearch = useCallback((savedSearch: typeof savedSearches[0]) => {
        setFilters(savedSearch.filters);
        if (caseId) {
            searchDocuments(caseId);
            setHasSearched(true);
        }
    }, [caseId, setFilters, searchDocuments]);

    const toggleFileType = useCallback((ft: string) => {
        setSelectedFileTypes(prev => {
            const updated = prev.includes(ft) ? prev.filter(t => t !== ft) : [...prev, ft];
            setFilters({ fileTypes: updated } as any);
            return updated;
        });
    }, [setFilters]);

    const togglePrivilege = useCallback((status: string) => {
        const current = filters.privilegeStatuses ?? [];
        const updated = current.includes(status as any) ? current.filter(s => s !== status) : [...current, status as any];
        setFilters({ privilegeStatuses: updated });
    }, [filters.privilegeStatuses, setFilters]);

    const toggleRelevance = useCallback((status: string) => {
        const current = filters.relevanceStatuses ?? [];
        const updated = current.includes(status as any) ? current.filter(s => s !== status) : [...current, status as any];
        setFilters({ relevanceStatuses: updated });
    }, [filters.relevanceStatuses, setFilters]);

    const toggleCustodian = useCallback((id: string) => {
        const current = filters.custodianIds ?? [];
        const updated = current.includes(id)
            ? current.filter(c => c !== id)
            : [...current, id];
        setFilters({ custodianIds: updated });
    }, [filters.custodianIds, setFilters]);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (caseId) {
            setFilters({ filenameQuery: query });
            searchDocuments(caseId);
            setHasSearched(true);
        }
    };

    const handleRowDoubleClick = (event: any) => {
        const doc = event.data;
        if (doc?.id || doc?._id) {
            const docId = doc.id || doc._id;
            navigate(`/cases/${caseId}/review?documentId=${docId}`);
        }
    };

    const handleSelectionChanged = (event: any) => {
        const selectedNodes = event.api.getSelectedNodes();
        const docIds = selectedNodes.map((node: any) => node.data._id || node.data.id);
        setSelectedDocIds(docIds);
    };

    const openProductionModal = async () => {
        if (!caseId || selectedDocIds.length === 0) return;
        setIsProductionModalOpen(true);
        try {
            const res = await api.get(`/cases/${caseId}/productions`);
            // Only DRAFT productions can have documents added
            setDraftProductions((res.data || []).filter((p: any) => p.status === 'DRAFT'));
            setSelectedProductionId('');
        } catch (error) {
            console.error('Failed to load productions', error);
            addToast({ title: 'Failed to load productions', type: 'error' });
        }
    };

    const handleAddToProduction = async () => {
        if (!selectedProductionId || selectedDocIds.length === 0) return;
        setIsAddingToProduction(true);
        try {
            await api.post(`/productions/${selectedProductionId}/documents`, {
                documentIds: selectedDocIds
            });
            addToast({ title: `Added ${selectedDocIds.length} documents to production`, type: 'success' });
            setIsProductionModalOpen(false);
        } catch (error: any) {
            console.error('Failed to add docs to production:', error);
            addToast({ 
                title: error.response?.data?.message || 'Failed to add documents', 
                type: 'error' 
            });
        } finally {
            setIsAddingToProduction(false);
        }
    };

    // Column Definitions for Results Grid
    const colDefs = useMemo<ColDef[]>(() => [
        {
            field: 'docNumber',
            headerName: 'Doc #',
            width: 90,
            valueFormatter: (params) => params.value || '—',
            cellClass: 'text-muted-foreground text-sm font-medium',
        },
        {
            field: "filename",
            headerName: "Document",
            flex: 1,
            minWidth: 250,
            cellRenderer: TitleCellRenderer,
            headerCheckboxSelection: true,
            checkboxSelection: true,
            autoHeight: true,
        },
        {
            field: 'fileType',
            headerName: 'Type',
            width: 110,
            cellRenderer: FileTypeCellRenderer,
            cellClass: 'flex items-center justify-center',
        },
        {
            field: 'fileSize',
            headerName: 'Size',
            width: 100,
            valueFormatter: (params) => formatBytes(Number(params.value || 0)),
            cellClass: 'text-right font-medium text-muted-foreground text-xs',
        },
        { 
            field: "custodianId.name", 
            headerName: "Custodian", 
            flex: 0.8,
            minWidth: 130,
            cellClass: 'text-sm font-medium text-foreground',
        },
        {
            field: "documentDate",
            headerName: "Date",
            width: 120,
            valueFormatter: (params) => {
                if (!params.value) {
                    return '—';
                }
                const date = new Date(params.value);
                return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
            },
            cellClass: 'text-center font-medium text-muted-foreground text-xs',
        },
        {
            field: 'coding.privilegeStatus',
            headerName: 'Privilege',
            width: 150,
            cellRenderer: (params: any) => {
                const value = String(params.value || 'NOT_PRIVILEGED');
                const display = value.replace(/_/g, ' ');
                const isPrivileged = value !== 'NOT_PRIVILEGED';
                return (
                    <div className={`inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                        isPrivileged 
                            ? 'bg-amber-100 text-amber-900' 
                            : 'bg-emerald-100 text-emerald-900'
                    }`}>
                        {display}
                    </div>
                );
            },
        },
        {
            field: 'coding.relevanceStatus',
            headerName: 'Relevance',
            width: 150,
            cellRenderer: RelevanceCellRenderer,
        }
    ], []);

    // Main Content Sections to resolve complex ternary warnings
    const renderInitialState = () => (
        <motion.div
            key="initial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-6"
        >
            <div className="w-full max-w-2xl space-y-8 text-center">
                <div className="space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-primary text-white mb-4 shadow-lg shadow-blue-200">
                        <SearchIcon className="h-8 w-8" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">Search Case Data</h1>
                    <p className="text-lg text-muted-foreground">Query documents, metadata, and extracted text across the entire case.</p>
                </div>

                <form onSubmit={handleSearch} className="relative group">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-colors" />
                    <div className="relative flex gap-2 p-2 bg-card rounded-2xl shadow-xl border border-border">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Keywords, phrases, or filenames..."
                                className="pl-12 h-12 text-lg border-none focus-visible:ring-0 bg-transparent shadow-none"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <Button type="submit" size="lg" disabled={isLoading} className="px-8 rounded-xl bg-primary hover:bg-primary/90 h-12 text-base font-semibold transition-all hover:shadow-lg hover:shadow-blue-200">
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
                        </Button>
                    </div>
                </form>

                <div className="flex flex-wrap justify-center gap-2 pt-4">
                    <span className="text-sm text-muted-foreground mr-2">Quick Filters:</span>
                    {[
                        { label: 'Emails', filters: { filenameQuery: 'email' } },
                        { label: 'PDFs', filters: { filenameQuery: '.pdf' } },
                        { label: 'Privileged', filters: { privilegeStatuses: ['ATTORNEY_CLIENT', 'WORK_PRODUCT', 'NEEDS_REVIEW'] } },
                        { label: 'Highly Relevant', filters: { relevanceStatuses: ['HIGHLY_RELEVANT'] } },
                    ].map(({ label, filters: qf }) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => handleQuickFilter(qf)}
                            className="px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors shadow-sm"
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </motion.div>
    );

    const renderResultsArea = () => {
        if (isLoading) {
            return (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[1.5rem] border border-border/60 bg-card/80 text-muted-foreground shadow-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-foreground">Searching case data</p>
                    <p className="mt-1 text-sm text-muted-foreground">Refining documents, metadata, and text matches.</p>
                </div>
            );
        }

        if (results && results.length > 0) {
            return (
                <div className="flex h-full min-h-0 flex-col gap-3">
                    <div className="page-surface rounded-[1.5rem] px-5 py-4 shadow-sm md:px-6 md:py-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="max-w-3xl space-y-2">
                                <p className="text-section-title">Search Results</p>
                                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                                    Found {numberFormatter.format(total || results.length)} documents
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {query
                                        ? `Matching “${query}” across the current case with ${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}.`
                                        : `Showing ${numberFormatter.format(total || results.length)} documents from the current search filters.`}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {selectedDocIds.length > 0 && (
                                    <Button variant="secondary" size="sm" onClick={openProductionModal} className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary">
                                        <Plus className="mr-2 h-3.5 w-3.5" />
                                        Add to Production ({selectedDocIds.length})
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                                    {isExporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
                                    Export CSV
                                </Button>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {query && (
                                <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                    Query: {query}
                                </span>
                            )}
                            {activeFilterCount > 0 && (
                                <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                    {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
                                </span>
                            )}
                            {selectedDocIds.length > 0 && (
                                <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                    {selectedDocIds.length} selected
                                </span>
                            )}
                            {selectedFileTypeLabels.length > 0 && (
                                <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                    {selectedFileTypeLabels.join(', ')}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-border/70 bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                        <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/35 px-4 py-3">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Document list</h3>
                                <p className="text-xs text-muted-foreground">Double-click a document to open review. Use checkboxes for batch actions.</p>
                            </div>
                            <div className="hidden rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm sm:block">
                                {numberFormatter.format(results.length)} results on page
                            </div>
                        </div>

                        <div
                            className="search-results-grid ag-theme-quartz flex-1 min-h-0 overflow-hidden"
                            style={{
                                '--ag-header-height': '44px',
                                '--ag-row-height': '50px',
                                '--ag-font-size': '13px',
                            } as CSSProperties}
                        >
                            <AgGridReact
                                rowData={results}
                                columnDefs={colDefs}
                                defaultColDef={{
                                    sortable: true,
                                    filter: true,
                                    resizable: true
                                }}
                                className="h-full w-full"
                                headerHeight={44}
                                rowHeight={50}
                                animateRows={true}
                                suppressNoRowsOverlay={true}
                                pagination={true}
                                paginationPageSize={20}
                                rowSelection="multiple"
                                onSelectionChanged={handleSelectionChanged}
                                onRowDoubleClicked={handleRowDoubleClick}
                            />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex min-h-[420px] items-center justify-center rounded-[1.5rem] border border-border/60 bg-card/80 px-4 text-center shadow-sm">
                <div className="w-full max-w-xl space-y-3 py-8">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <SearchIcon className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-base font-semibold text-foreground">No matching documents</h3>
                        <p className="text-sm text-muted-foreground">
                            {query
                                ? `Nothing matched “${query}” with the current filters.`
                                : 'Try broadening the filters or searching by filename, custodian, or relevance.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                        {query && <span className="rounded-full bg-muted px-2.5 py-1">Query: {query}</span>}
                        {activeFilterCount > 0 && <span className="rounded-full bg-muted px-2.5 py-1">{activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}</span>}
                        {selectedFileTypeLabels.length > 0 && <span className="rounded-full bg-muted px-2.5 py-1">{selectedFileTypeLabels.join(', ')}</span>}
                    </div>
                </div>
            </div>
        );
    };

    const renderResultsState = () => (
        <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
        >
            <div className="sticky top-0 z-10 border-b border-border/50 bg-card/95 px-4 py-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setHasSearched(false)} className="hover:bg-muted/80">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="space-y-0.5">
                            <h1 className="text-lg font-bold text-foreground">Search Results</h1>
                            <p className="text-xs text-muted-foreground/80">Refine your search or review documents below. Use filters to narrow results.</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={`transition-colors ${showFilters ? 'bg-blue-100 text-blue-900 border-blue-300/60 hover:bg-blue-200' : 'hover:bg-muted'}`}>
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                </div>

                <form onSubmit={handleSearch} className="mt-4 flex w-full gap-2">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                        <Input
                            placeholder="Search for keywords, phrases, or metadata..."
                            className="h-10 pl-10 pr-4 text-sm font-medium shadow-sm border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/30"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <Button type="submit" size="lg" disabled={isLoading} className="h-10 bg-primary px-7 text-sm font-bold text-white hover:bg-primary/90 transition-colors shadow-sm">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                    </Button>
                </form>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {showFilters && (
                    <aside className="w-80 shrink-0 overflow-y-auto border-r border-border/50 bg-card p-4 shadow-[inset_-1px_0_0_rgba(148,163,184,0.08)]">
                        <div className="mb-6 flex items-center justify-between gap-2 border-b border-border/40 pb-4">
                            <div className="flex items-center gap-2.5 font-semibold text-foreground text-sm">
                                <Filter className="h-4 w-4 text-primary" /> Filters
                            </div>
                            {activeFilterCount > 0 && (
                                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-900">
                                    {activeFilterCount} active
                                </span>
                            )}
                        </div>

                        <div className="space-y-5">
                            {/* File Type Filter */}
                            <div className="space-y-3 rounded-xl border border-blue-200/40 bg-blue-50/25 p-4">
                                <h3 className="text-xs font-bold uppercase tracking-wide text-blue-900/80">File Type</h3>
                                <div className="space-y-2.5">
                                    {FILE_TYPE_OPTIONS.map(({ ext, label }) => (
                                        <label key={ext} className="flex cursor-pointer items-center space-x-2.5 text-sm text-foreground/85 transition-colors hover:text-foreground">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-border/60 text-blue-600 focus:ring-2 focus:ring-blue-500/50"
                                                checked={selectedFileTypes.includes(ext)}
                                                onChange={() => toggleFileType(ext)}
                                            />
                                            <span className="font-medium">{label}</span>
                                            <span className="text-xs text-muted-foreground/70">(.{ext})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range Filter */}
                            <div className="space-y-3 rounded-xl border border-purple-200/40 bg-purple-50/25 p-4">
                                <h3 className="text-xs font-bold uppercase tracking-wide text-purple-900/80">Date Range</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label htmlFor="search-date-from" className="text-xs font-semibold text-foreground/85">From</label>
                                        <input
                                            id="search-date-from"
                                            type="date"
                                            value={dateFrom}
                                            onChange={e => { setDateFrom(e.target.value); setFilters({ dateFrom: e.target.value } as any); }}
                                            className="mt-1.5 w-full rounded-md border border-border/60 bg-white px-3 py-2 text-sm font-medium text-foreground focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="search-date-to" className="text-xs font-semibold text-foreground/85">To</label>
                                        <input
                                            id="search-date-to"
                                            type="date"
                                            value={dateTo}
                                            onChange={e => { setDateTo(e.target.value); setFilters({ dateTo: e.target.value } as any); }}
                                            className="mt-1.5 w-full rounded-md border border-border/60 bg-white px-3 py-2 text-sm font-medium text-foreground focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Privilege Status Filter */}
                            <div className="space-y-3 rounded-xl border border-amber-200/40 bg-amber-50/25 p-4">
                                <h3 className="text-xs font-bold uppercase tracking-wide text-amber-900/80">Privilege Status</h3>
                                <div className="space-y-2.5">
                                    {PRIVILEGE_OPTIONS.map(s => (
                                        <label key={s} className="flex cursor-pointer items-center space-x-2.5 text-sm text-foreground/85 transition-colors hover:text-foreground">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-border/60 text-amber-600 focus:ring-2 focus:ring-amber-500/50"
                                                checked={filters.privilegeStatuses?.includes(s as any) ?? false}
                                                onChange={() => togglePrivilege(s)}
                                            />
                                            <span className="font-medium">{s.replace(/_/g, ' ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Relevance Filter */}
                            <div className="space-y-3 rounded-xl border border-emerald-200/40 bg-emerald-50/25 p-4">
                                <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-900/80">Relevance</h3>
                                <div className="space-y-2.5">
                                    {RELEVANCE_OPTIONS.map(s => (
                                        <label key={s} className="flex cursor-pointer items-center space-x-2.5 text-sm text-foreground/85 transition-colors hover:text-foreground">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-border/60 text-emerald-600 focus:ring-2 focus:ring-emerald-500/50"
                                                checked={filters.relevanceStatuses?.includes(s as any) ?? false}
                                                onChange={() => toggleRelevance(s)}
                                            />
                                            <span className="font-medium">{s.replace(/_/g, ' ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Custodian Filter */}
                            <div className="space-y-3 rounded-xl border border-slate-200/40 bg-slate-50/25 p-4">
                                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900/80">Custodian</h3>
                                <div className="space-y-2.5">
                                    {custodians.length === 0 ? (
                                        <p className="text-xs italic text-muted-foreground/70">No custodians found.</p>
                                    ) : custodians.map(c => (
                                        <label key={c._id} className="flex cursor-pointer items-center space-x-2.5 text-sm text-foreground/85 transition-colors hover:text-foreground">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-border/60 text-slate-600 focus:ring-2 focus:ring-slate-500/50"
                                                checked={filters.custodianIds?.includes(c._id) ?? false}
                                                onChange={() => toggleCustodian(c._id)}
                                            />
                                            <span className="font-medium">{c.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Saved Searches */}
                            <div className="space-y-3 rounded-xl border border-indigo-200/40 bg-indigo-50/25 p-4">
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-900/80">
                                    <Bookmark className="h-3.5 w-3.5" /> Saved Searches
                                </h3>
                                {savedSearches.length === 0 ? (
                                    <p className="text-xs italic text-muted-foreground/70">No saved searches yet.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {savedSearches.map(s => (
                                            <div key={s.id} className="group flex items-center justify-between gap-2 rounded-lg border border-transparent bg-white/40 px-2.5 py-1.5 transition-all hover:border-indigo-200/60 hover:bg-white/70">
                                                <button
                                                    type="button"
                                                    onClick={() => handleLoadSavedSearch(s)}
                                                    className="flex-1 truncate text-left text-xs font-medium text-indigo-700 hover:text-indigo-900"
                                                    title={s.searchName}
                                                >
                                                    {s.searchName}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteSavedSearch(s.id);
                                                    }}
                                                    className="rounded p-0.5 text-slate-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                                                    title="Delete saved search"
                                                    aria-label="Delete saved search"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {showSaveName ? (
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            type="text"
                                            value={saveSearchName}
                                            onChange={e => setSaveSearchName(e.target.value)}
                                            placeholder="Search name..."
                                            className="flex-1 rounded border border-border/60 bg-white px-2.5 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveSearch(); }}
                                            autoFocus
                                        />
                                        <button type="button" onClick={handleSaveSearch} disabled={isSavingSearch} className="text-xs font-bold text-indigo-700 hover:text-indigo-900 disabled:opacity-50">
                                            {isSavingSearch ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                        </button>
                                        <button type="button" onClick={() => setShowSaveName(false)} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowSaveName(true)}
                                        className="text-xs font-bold text-indigo-700 hover:text-indigo-900"
                                    >
                                        + Save current search
                                    </button>
                                )}
                            </div>
                        </div>
                    </aside>
                )}

                <main className="flex flex-1 min-h-0 flex-col overflow-hidden p-4">
                    {renderResultsArea()}
                </main>
            </div>
        </motion.div>
    );

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-background">
            <AnimatePresence mode="wait">
                {hasSearched ? renderResultsState() : renderInitialState()}
            </AnimatePresence>

            {/* Add to Production Dialog */}
            <Dialog open={isProductionModalOpen} onOpenChange={setIsProductionModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add to Production Set</DialogTitle>
                        <DialogDescription>
                            Select a draft production set to add {selectedDocIds.length} document(s) to.
                            Privileged documents cannot be added and will be rejected.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <select
                            className="w-full h-10 px-3 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={selectedProductionId}
                            onChange={(e) => setSelectedProductionId(e.target.value)}
                        >
                            <option value="">-- Select a Draft Production --</option>
                            {draftProductions.map((p) => (
                                <option key={p._id || p.id} value={p._id || p.id}>
                                    {p.setName}
                                </option>
                            ))}
                        </select>
                        {draftProductions.length === 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                                No DRAFT productions available. Create one in the Production Sets tab.
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsProductionModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleAddToProduction}
                            disabled={!selectedProductionId || isAddingToProduction}
                            className="bg-primary hover:bg-primary/90 text-white"
                        >
                            {isAddingToProduction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Add {selectedDocIds.length} Documents
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SearchPage;
