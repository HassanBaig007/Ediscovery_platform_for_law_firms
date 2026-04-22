import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Download, CheckCircle, Clock,
  AlertCircle, FileText, MoreHorizontal, Trash2,
  Edit, Eye, Send, Loader2,
  Package, Calendar, User,
  Search, X, FilePlus, Hash
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Separator } from '../components/ui/Separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/DropdownMenu';
import { cn } from '../lib/utils';
import api from '../services/api';
import { useToastStore } from '../store/toastStore';
import { BatesNumberingModal } from '../components/enhanced/production';
import { useRole } from '../hooks/useRole';

interface ProductionDocument {
  documentId: string;
  batesNumber?: string;
  isRedacted: boolean;
  addedAt: string;
}

interface ProductionSet {
  id: string;
  caseId: string;
  setName: string;
  description?: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PRODUCED';
  documents: ProductionDocument[];
  documentCount: number;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  producedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const ProductionSetsPage = () => {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isPartner } = useRole();
  const canApprove = isAdmin || isPartner;
  const [productions, setProductions] = useState<ProductionSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedProduction, setSelectedProduction] = useState<ProductionSet | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [detailedProduction, setDetailedProduction] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Add Docs Modal
  const [isAddDocsModalOpen, setIsAddDocsModalOpen] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isBatesModalOpen, setIsBatesModalOpen] = useState(false);
  const [batesTargetProduction, setBatesTargetProduction] = useState<ProductionSet | null>(null);
  const { addToast } = useToastStore();

  // Form state for creating production
  const [formData, setFormData] = useState({
    setName: '',
    description: '',
  });

  const numberFormatter = new Intl.NumberFormat();
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
  const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const formatDate = (value?: string) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'N/A' : dateFormatter.format(date);
  };

  const formatDateTime = (value?: string) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'N/A' : dateTimeFormatter.format(date);
  };

  const formatUser = (value?: string) => {
    if (!value) return 'Unknown';
    if (value.length <= 18) return value;
    return `${value.slice(0, 8)}...${value.slice(-6)}`;
  };

  const parseDownloadFilename = (headerValue?: string) => {
    if (!headerValue) return null;

    const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const plainMatch = headerValue.match(/filename="?([^";]+)"?/i);
    if (plainMatch?.[1]) {
      return plainMatch[1];
    }

    return null;
  };

  const fetchProductions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/cases/${caseId}/productions`);
      setProductions(response.data || []);
    } catch (error) {
      console.error('Error fetching productions:', error);
      setProductions([]);
      addToast({
        title: 'Failed to load production sets',
        message: 'Please refresh or try again shortly.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [caseId, addToast]);

  useEffect(() => {
    fetchProductions();
  }, [fetchProductions]);

  const handleCreateProduction = async () => {
    setIsProcessing(true);
    try {
      const response = await api.post(`/cases/${caseId}/productions`, formData);
      setProductions([response.data, ...productions]);
      setIsCreateModalOpen(false);
      setFormData({ setName: '', description: '' });
    } catch (error) {
      console.error('Error creating production:', error);
      addToast({ title: 'Could not create production set', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteProduction = async () => {
    if (!selectedProduction) return;
    setIsProcessing(true);
    try {
      await api.delete(`/productions/${selectedProduction.id}`);
      setProductions(productions.filter(p => p.id !== selectedProduction.id));
      setIsDeleteDialogOpen(false);
      setSelectedProduction(null);
    } catch (error) {
      console.error('Error deleting production:', error);
      addToast({ title: 'Could not delete production set', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const openViewModal = async (production: ProductionSet) => {
    setSelectedProduction(production);
    setIsViewModalOpen(true);
    setDetailedProduction(null);
    setIsLoadingDetails(true);
    try {
      const res = await api.get(`/productions/${production.id}`);
      setDetailedProduction(res.data);
    } catch (error) {
      console.error('Failed to load details', error);
      addToast({ title: 'Failed to load production details', type: 'error' });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const openAddDocsModal = async (production: ProductionSet) => {
    setSelectedProduction(production);
    setIsAddDocsModalOpen(true);
    setSelectedDocIds([]);
    setIsLoadingDocs(true);
    try {
      const res = await api.get(`/cases/${caseId}/documents`);
      // Use standard pagination format or direct array
      setAvailableDocs(res.data.documents || res.data || []);
    } catch (error) {
      console.error('Failed to load documents', error);
      setAvailableDocs([]);
      addToast({ title: 'Failed to load case documents', type: 'error' });
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleAddDocumentsSubmit = async () => {
    if (!selectedProduction || selectedDocIds.length === 0) return;
    setIsProcessing(true);
    try {
      await api.post(`/productions/${selectedProduction.id}/documents`, {
        documentIds: selectedDocIds
      });
      setIsAddDocsModalOpen(false);
      fetchProductions(); // refresh the list to see new documentCount
    } catch (error: any) {
      console.error('Error adding documents to production:', error);
      addToast({
        title: 'Failed to add documents',
        message: error.response?.data?.message || 'Check privilege status and try again.',
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (productionId: string, newStatus: string) => {
    setIsProcessing(true);
    try {
      // Map status transitions to correct server endpoints
      let endpoint: string;
      if (newStatus === 'IN_REVIEW') {
        endpoint = `/productions/${productionId}/submit`;
      } else if (newStatus === 'APPROVED') {
        endpoint = `/productions/${productionId}/approve`;
      } else if (newStatus === 'PRODUCED') {
        endpoint = `/productions/${productionId}/produce`;
      } else {
        return;
      }
      await api.put(endpoint);
      setProductions(productions.map(p =>
        p.id === productionId ? { ...p, status: newStatus as ProductionSet['status'] } : p
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      addToast({ title: 'Status update failed', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async (productionId: string) => {
    try {
      const response = await api.get(`/productions/${productionId}/export`, {
        responseType: 'blob'
      });
      const url = globalThis.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filenameFromHeader = parseDownloadFilename(response.headers['content-disposition']);
      const fallbackName = `production_${productionId}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.setAttribute('download', filenameFromHeader || fallbackName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading production:', error);
      addToast({ title: 'Download failed', type: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-muted text-foreground border-border';
      case 'IN_REVIEW': return 'bg-warning/12 text-warning border-warning/20';
      case 'APPROVED': return 'bg-primary/12 text-primary border-primary/20';
      case 'PRODUCED': return 'bg-success/12 text-success border-success/20';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Edit className="h-3 w-3" />;
      case 'IN_REVIEW': return <Clock className="h-3 w-3" />;
      case 'APPROVED': return <CheckCircle className="h-3 w-3" />;
      case 'PRODUCED': return <Package className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const filteredProductions = productions.filter(production => {
    const matchesSearch = production.setName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      production.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || production.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: productions.length,
    draft: productions.filter(p => p.status === 'DRAFT').length,
    inReview: productions.filter(p => p.status === 'IN_REVIEW').length,
    approved: productions.filter(p => p.status === 'APPROVED').length,
    produced: productions.filter(p => p.status === 'PRODUCED').length,
    totalDocuments: productions.reduce((sum, p) => sum + p.documentCount, 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${caseId}`)} className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Production Sets</h1>
            <p className="text-muted-foreground mt-1">Manage document productions and exports</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Production
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-muted">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Sets</div>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Draft Sets</div>
            <div className="text-2xl font-bold text-foreground">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card className="bg-warning/10">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-warning uppercase tracking-wider">In Review</div>
            <div className="text-2xl font-bold text-warning">{stats.inReview}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/10">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-primary uppercase tracking-wider">Approved</div>
            <div className="text-2xl font-bold text-primary">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card className="bg-success/10">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-success uppercase tracking-wider">Produced</div>
            <div className="text-2xl font-bold text-success">{stats.produced}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple/10">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-purple uppercase tracking-wider">Total Documents</div>
            <div className="text-2xl font-bold text-purple">{numberFormatter.format(stats.totalDocuments)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search productions..."
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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                title="Filter by status"
                aria-label="Filter by status"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PRODUCED">Produced</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Productions List */}
      <div className="space-y-4">
        {(() => {
          if (isLoading) {
            return (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            );
          }
          if (filteredProductions.length === 0) {
            return (
              <Card className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground">No Productions Found</h3>
                <p className="text-muted-foreground mb-4">Create your first production set to get started</p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Production
                </Button>
              </Card>
            );
          }
          return (
            <AnimatePresence>
              {filteredProductions.map((production) => (
                <motion.div
                  key={production.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className={cn(
                    "group hover:shadow-lg transition-all duration-200 border-l-4",
                    production.status === 'DRAFT' && "border-l-muted-foreground",
                    production.status === 'IN_REVIEW' && "border-l-warning",
                    production.status === 'APPROVED' && "border-l-primary",
                    production.status === 'PRODUCED' && "border-l-success",
                  )}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-foreground truncate">
                              {production.setName}
                            </h3>
                            <Badge
                              variant="outline"
                              className={cn("flex items-center gap-1", getStatusColor(production.status))}
                            >
                              {getStatusIcon(production.status)}
                              {production.status.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {production.description || 'No description provided'}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {numberFormatter.format(production.documentCount)} documents
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Created by {formatUser(production.createdBy)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(production.createdAt)}
                            </span>
                            {production.approvedBy && (
                              <span className="flex items-center gap-1 text-primary">
                                <CheckCircle className="h-3 w-3" />
                                Approved by {formatUser(production.approvedBy)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {production.status === 'PRODUCED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(production.id)}
                              title="Download production"
                              aria-label="Download production"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewModal(production)}
                            title="View details"
                            aria-label="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" title="More options" aria-label="More options">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {production.status === 'DRAFT' && (
                                <>
                                  <DropdownMenuItem onClick={() => openAddDocsModal(production)}>
                                    <FilePlus className="mr-2 h-4 w-4" /> Add Documents
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setBatesTargetProduction(production); setIsBatesModalOpen(true); }}>
                                    <Hash className="mr-2 h-4 w-4" /> Apply Bates Numbers
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(production.id, 'IN_REVIEW')}>
                                    <Send className="mr-2 h-4 w-4" /> Submit for Review
                                  </DropdownMenuItem>
                                </>
                              )}
                              {production.status === 'IN_REVIEW' && canApprove && (
                                <DropdownMenuItem onClick={() => handleStatusChange(production.id, 'APPROVED')}>
                                  <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                </DropdownMenuItem>
                              )}
                              {production.status === 'APPROVED' && canApprove && (
                                <DropdownMenuItem onClick={() => handleStatusChange(production.id, 'PRODUCED')}>
                                  <Package className="mr-2 h-4 w-4" /> Mark as Produced
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedProduction(production);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          );
        })()}
      </div>

      {/* Create Production Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Production Set</DialogTitle>
            <DialogDescription>
              Create a new production set for document export. You can add documents after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="production-name" className="text-sm font-medium">Production Name</label>
              <Input
                id="production-name"
                placeholder="e.g., Initial Production Set"
                value={formData.setName}
                onChange={(e) => setFormData({ ...formData, setName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="production-desc" className="text-sm font-medium">Description</label>
              <textarea
                id="production-desc"
                className="w-full min-h-[100px] p-3 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Describe the purpose of this production set..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateProduction}
              disabled={!formData.setName || isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" /> Create Production</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Production Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedProduction?.setName}</DialogTitle>
            <DialogDescription>
              Production details and document information
            </DialogDescription>
          </DialogHeader>
          {selectedProduction && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(selectedProduction.status)}>
                  {getStatusIcon(selectedProduction.status)}
                  {selectedProduction.status.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Documents</span>
                  <p className="font-semibold">{numberFormatter.format(selectedProduction.documentCount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-semibold">{formatDateTime(selectedProduction.createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created By</span>
                  <p className="font-semibold font-mono text-xs">{selectedProduction.createdBy}</p>
                </div>
                {selectedProduction.approvedBy && (
                  <div>
                    <span className="text-muted-foreground">Approved By</span>
                    <p className="font-semibold font-mono text-xs">{selectedProduction.approvedBy}</p>
                  </div>
                )}
                {selectedProduction.producedAt && (
                  <div>
                    <span className="text-muted-foreground">Produced</span>
                    <p className="font-semibold">{formatDateTime(selectedProduction.producedAt)}</p>
                  </div>
                )}
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedProduction.description || 'No description provided'}
                </p>
              </div>

              {/* H5 Document List from Detailed Fetch */}
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Documents</h4>
                {(() => {
                  if (isLoadingDetails) {
                    return (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Fetching documents...
                      </div>
                    );
                  }
                  if (detailedProduction?.documents?.length > 0) {
                    return (
                      <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="px-3 py-2 font-medium">Bates #</th>
                              <th className="px-3 py-2 font-medium truncate">Filename</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailedProduction.documents.map((doc: any, i: number) => (
                              <tr key={doc.batesNumber || `doc-${i}`} className="border-t border-border hover:bg-muted/50 transition-colors">
                                <td className="px-3 py-2 text-muted-foreground font-mono">{doc.batesNumber || 'Pending'}</td>
                                <td className="px-3 py-2 truncate max-w-[200px]" title={doc.documentId?.filename}>{doc.documentId?.filename || 'Unknown Document'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  return <p className="text-sm text-muted-foreground italic">No documents in this production.</p>;
                })()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            {selectedProduction?.status === 'PRODUCED' && (
              <Button onClick={() => selectedProduction && handleDownload(selectedProduction.id)}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Documents Modal */}
      <Dialog open={isAddDocsModalOpen} onOpenChange={setIsAddDocsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Documents to "{selectedProduction?.setName}"</DialogTitle>
            <DialogDescription>
              Select documents to include in this production set. Privileged documents will be rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[400px] overflow-y-auto">
            {isLoadingDocs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : availableDocs.length === 0 ? (
              <p className="text-center text-muted-foreground italic py-8">No documents available in this case.</p>
            ) : (
              <div className="space-y-2">
                {availableDocs.map((doc: any) => (
                  <label key={doc.id || doc._id} className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedDocIds.includes(doc.id || doc._id)}
                      onChange={(e) => {
                        const id = doc.id || doc._id;
                        if (e.target.checked) setSelectedDocIds([...selectedDocIds, id]);
                        else setSelectedDocIds(selectedDocIds.filter(i => i !== id));
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground truncate">{doc.custodian || 'No custodian'} • {doc.mimeType || 'Unknown type'}</p>
                      {doc.coding && doc.coding.privilegeStatus !== 'NOT_PRIVILEGED' && (
                        <Badge variant="outline" className="mt-1 bg-destructive/10 text-destructive text-[10px] leading-tight px-1 py-0">Privileged</Badge>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDocsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDocumentsSubmit}
              disabled={selectedDocIds.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
              ) : (
                <><CheckCircle className="mr-2 h-4 w-4" /> Add {selectedDocIds.length} Docs</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Production Set
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedProduction?.setName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduction}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="mr-2 h-4 w-4" /> Delete</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bates Numbering Modal */}
      {batesTargetProduction && (
        <BatesNumberingModal
          open={isBatesModalOpen}
          onOpenChange={setIsBatesModalOpen}
          productionSetId={batesTargetProduction.id}
          productionName={batesTargetProduction.setName}
          onSuccess={() => {
            addToast({ title: 'Bates numbering applied successfully', type: 'success' });
            fetchProductions();
          }}
        />
      )}
    </div>
  );
};

export default ProductionSetsPage;
