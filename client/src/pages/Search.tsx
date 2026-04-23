import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSearchStore } from '../store/searchStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Separator } from '../components/ui/Separator';
import { Search as SearchIcon, Filter, SlidersHorizontal, FileText, Loader2, ArrowLeft, Bookmark, Download, X, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, ClientSideRowModelModule, ValidationModule } from 'ag-grid-community';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';
import { useToastStore } from '../store/toastStore';
import { Badge } from '../components/ui/Badge';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { formatRelevanceStatus } from '../utils/formatters';

ModuleRegistry.registerModules([ClientSideRowModelModule, ValidationModule]);

/**
 * Cell renderer for document titles in the results grid.
 * Extracted to avoid nested component warnings.
 */
const TitleCellRenderer = (params: any) => (
    <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground">{params.value}</span>
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

    const className =
        value === 'HIGHLY_RELEVANT'
            ? 'bg-success/15 text-success border-success/30'
            : value === 'RELEVANT'
                ? 'bg-primary/15 text-primary border-primary/30'
                : value === 'MARGINAL'
                    ? 'bg-warning/15 text-warning border-warning/30'
                    : 'bg-muted text-muted-foreground border-border';

    return (
        <Badge variant="outline" className={className}>
            {label}
        </Badge>
    );
};

const FileTypeCellRenderer = (params: any) => {
    const rawValue = String(params.value || '').trim();
    const normalized = rawValue.toLowerCase();
    const display = FILE_TYPE_LABELS[normalized] || rawValue.toUpperCase() || 'Unknown';

    return <span className="font-medium text-foreground">{display}</span>;
};

const SearchPage = () => {
    const { id: caseId } = useParams<{ id: string }>();
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
        if (caseId && query.trim()) {
            setFilters({ filenameQuery: query });
            searchDocuments(caseId);
            setHasSearched(true);
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
            width: 130,
            valueFormatter: (params) => params.value || 'N/A'
        },
        {
            field: "filename",
            headerName: "Document",
            flex: 2,
            cellRenderer: TitleCellRenderer,
            headerCheckboxSelection: true,
            checkboxSelection: true,
        },
        {
            field: 'fileType',
            headerName: 'Type',
            width: 130,
            cellRenderer: FileTypeCellRenderer
        },
        {
            field: 'fileSize',
            headerName: 'Size',
            width: 120,
            valueFormatter: (params) => formatBytes(Number(params.value || 0))
        },
        { field: "custodianId.name", headerName: "Custodian", flex: 1 },
        {
            field: "documentDate",
            headerName: "Date",
            width: 140,
            valueFormatter: (params) => {
                if (!params.value) {
                    return 'N/A';
                }
                const date = new Date(params.value);
                return Number.isNaN(date.getTime()) ? 'N/A' : dateFormatter.format(date);
            }
        },
        {
            field: 'coding.privilegeStatus',
            headerName: 'Privilege',
            width: 150,
            valueFormatter: (params) => (params.value || 'NOT_PRIVILEGED').replaceAll('_', ' ')
        },
        {
            field: 'coding.relevanceStatus',
            headerName: 'Relevance',
            width: 170,
            cellRenderer: RelevanceCellRenderer
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
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-pulse">
                    <SearchIcon className="h-12 w-12 mb-4 opacity-20" />
                    <p>Searching vast oceans of data...</p>
                </div>
            );
        }

        if (results && results.length > 0) {
            return (
                <div className="flex flex-col h-full space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Results</h2>
                            <p className="text-sm text-muted-foreground">
                                Found {numberFormatter.format(total || results.length)} documents
                                {query ? ` matching "${query}"` : ''}
                            </p>
                        </div>
                        <div className="flex gap-2">
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

                    <div className="bg-card rounded-xl border border-border shadow-sm flex-1 overflow-hidden ag-theme-quartz">
                        <AgGridReact
                            rowData={results}
                            columnDefs={colDefs}
                            defaultColDef={{
                                sortable: true,
                                filter: true,
                                resizable: true
                            }}
                            pagination={true}
                            paginationPageSize={25}
                            rowSelection="multiple"
                            onSelectionChanged={handleSelectionChanged}
                        />
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <div className="bg-muted p-6 rounded-full mb-4">
                    <SearchIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No results found</h3>
                <p className="max-w-xs text-center mt-2">Try adjusting your search terms or filters to find what you're looking for.</p>
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
            {/* Compact Header Search Bar */}
            <div className="bg-card border-b border-border p-4 flex flex-col gap-4 shadow-sm z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setHasSearched(false)}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    <h1 className="text-xl font-semibold text-foreground">Search Results</h1>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={showFilters ? 'bg-muted' : ''}>
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2 max-w-4xl mx-auto w-full">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search for keywords, phrases, or metadata..."
                            className="pl-10 h-10 text-base shadow-sm"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <Button type="submit" size="lg" disabled={isLoading} className="px-8 bg-primary hover:bg-primary/90 h-10 text-base font-semibold">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                    </Button>
                </form>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Filters Sidebar */}
                {showFilters && (
                    <aside className="w-80 bg-muted border-r border-border overflow-y-auto p-4 space-y-6">
                        <div className="flex items-center gap-2 font-semibold text-foreground pb-2 border-b border-border">
                            <Filter className="h-4 w-4" /> Filters
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">File Type</h3>
                            <div className="space-y-1.5">
                                {Object.entries(FILE_TYPE_LABELS).filter(([k], i, arr) =>
                                    arr.findIndex(([, v]) => v === FILE_TYPE_LABELS[k]) === i
                                ).map(([ext, label]) => (
                                    <label key={ext} className="flex items-center space-x-2 text-sm text-muted-foreground cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-border text-primary focus:ring-primary"
                                            checked={selectedFileTypes.includes(ext)}
                                            onChange={() => toggleFileType(ext)}
                                        />
                                        <span>{label} (.{ext})</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">Date Range</h3>
                            <div className="space-y-2">
                                <div>
                                    <label htmlFor="search-date-from" className="text-xs text-muted-foreground">From</label>
                                    <input
                                        id="search-date-from"
                                        type="date"
                                        value={dateFrom}
                                        onChange={e => { setDateFrom(e.target.value); setFilters({ dateFrom: e.target.value } as any); }}
                                        className="w-full mt-1 px-2 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="search-date-to" className="text-xs text-muted-foreground">To</label>
                                    <input
                                        id="search-date-to"
                                        type="date"
                                        value={dateTo}
                                        onChange={e => { setDateTo(e.target.value); setFilters({ dateTo: e.target.value } as any); }}
                                        className="w-full mt-1 px-2 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">Privilege Status</h3>
                            <div className="space-y-1.5">
                                {['NOT_PRIVILEGED', 'ATTORNEY_CLIENT', 'WORK_PRODUCT', 'NEEDS_REVIEW'].map(s => (
                                    <label key={s} className="flex items-center space-x-2 text-sm text-muted-foreground cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-border text-primary focus:ring-primary"
                                            checked={filters.privilegeStatuses?.includes(s as any) ?? false}
                                            onChange={() => togglePrivilege(s)}
                                        />
                                        <span>{s.replace(/_/g, ' ')}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">Relevance</h3>
                            <div className="space-y-1.5">
                                {['HIGHLY_RELEVANT', 'RELEVANT', 'MARGINAL', 'NOT_RELEVANT'].map(s => (
                                    <label key={s} className="flex items-center space-x-2 text-sm text-muted-foreground cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-border text-primary focus:ring-primary"
                                            checked={filters.relevanceStatuses?.includes(s as any) ?? false}
                                            onChange={() => toggleRelevance(s)}
                                        />
                                        <span>{s.replace(/_/g, ' ')}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">Custodian</h3>
                            <div className="space-y-2">
                                {custodians.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">No custodians found.</p>
                                ) : custodians.map(c => (
                                    <label key={c._id} className="flex items-center space-x-2 text-sm text-muted-foreground cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-border text-primary focus:ring-primary"
                                            checked={filters.custodianIds?.includes(c._id) ?? false}
                                            onChange={() => toggleCustodian(c._id)}
                                        />
                                        <span>{c.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <Separator className="my-4" />

                        {/* Saved Searches */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                <Bookmark className="h-3.5 w-3.5" /> Saved Searches
                            </h3>
                            {savedSearches.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No saved searches yet.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {savedSearches.map(s => (
                                        <div key={s.id} className="flex items-center gap-1 group justify-between">
                                            <button
                                                type="button"
                                                onClick={() => handleLoadSavedSearch(s)}
                                                className="flex-1 text-left text-xs text-primary hover:underline truncate"
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
                                                className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded transition-all"
                                                title="Delete saved search"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showSaveName ? (
                                <div className="flex gap-1.5 mt-2">
                                    <input
                                        type="text"
                                        value={saveSearchName}
                                        onChange={e => setSaveSearchName(e.target.value)}
                                        placeholder="Search name..."
                                        className="flex-1 text-xs border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveSearch(); }}
                                        autoFocus
                                    />
                                    <button type="button" onClick={handleSaveSearch} disabled={isSavingSearch} className="text-xs text-primary font-medium disabled:opacity-50">
                                        {isSavingSearch ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                    </button>
                                    <button type="button" onClick={() => setShowSaveName(false)} className="text-muted-foreground">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowSaveName(true)}
                                    className="text-xs text-primary hover:underline mt-1"
                                >
                                    + Save current search
                                </button>
                            )}
                        </div>
                    </aside>
                )}

                {/* Results Area */}
                <main className="flex-1 p-6 overflow-hidden flex flex-col">
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
