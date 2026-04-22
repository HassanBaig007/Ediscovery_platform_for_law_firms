import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Search, Mail, Building2, 
  Briefcase, FileText, MoreHorizontal, Trash2, 
  Edit, Upload, Loader2, X, User,
  ChevronRight, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';

import { Avatar, AvatarFallback } from '../components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/DropdownMenu';

import { cn } from '../lib/utils';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import api from '../services/api';

interface Custodian {
  id: string;
  caseId: string;
  name: string;
  email: string;
  department?: string;
  title?: string;
  documentCount?: number;
  createdAt: string;
}

const extractEntityId = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as { id?: unknown; _id?: unknown };
    if (typeof obj.id === 'string') return obj.id;
    if (typeof obj._id === 'string') return obj._id;
  }
  return null;
};

const CustodiansPage = () => {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canUpload, hasFullAccess } = useRole();
  const [custodians, setCustodians] = useState<Custodian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustodian, setSelectedCustodian] = useState<Custodian | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    title: '',
  });

  // Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][]>([]);

  if (!canUpload && !hasFullAccess) {
    return <PermissionDenied requiredRole="ADMIN, PARTNER, or PARALEGAL" />;
  }


  useEffect(() => {
    fetchCustodians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);


  const fetchCustodians = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/cases/${caseId}/custodians`);
      const rawCustodians: Custodian[] = Array.isArray(response.data) ? response.data : [];
      const hasServerCounts = rawCustodians.some((custodian) => typeof custodian.documentCount === 'number');

      if (hasServerCounts) {
        setCustodians(rawCustodians);
      } else {
        const documentsResponse = await api.get(`/cases/${caseId}/documents`, {
          params: { page: 1, limit: 5000 },
        });

        const docs = Array.isArray(documentsResponse.data?.documents)
          ? documentsResponse.data.documents
          : Array.isArray(documentsResponse.data)
            ? documentsResponse.data
            : [];

        const countMap = new Map<string, number>();
        for (const doc of docs) {
          const custodianId = extractEntityId(doc?.custodianId);
          if (!custodianId) continue;
          countMap.set(custodianId, (countMap.get(custodianId) || 0) + 1);
        }

        const merged = rawCustodians.map((custodian) => ({
          ...custodian,
          documentCount: countMap.get(custodian.id || (custodian as any)._id) || 0,
        }));

        setCustodians(merged);
      }
    } catch (error) {
      console.error('Error fetching custodians:', error);
      setCustodians([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustodian = async () => {
    setIsProcessing(true);
    try {
      const response = await api.post(`/cases/${caseId}/custodians`, formData);
      setCustodians([...custodians, response.data]);
      setIsCreateModalOpen(false);
      setFormData({ name: '', email: '', department: '', title: '' });
    } catch (error) {
      console.error('Error creating custodian:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateCustodian = async () => {
    if (!selectedCustodian) return;
    setIsProcessing(true);
    try {
      const response = await api.put(`/custodians/${selectedCustodian.id}`, formData);
      setCustodians(custodians.map(c => c.id === selectedCustodian.id ? response.data : c));
      setIsEditModalOpen(false);
      setSelectedCustodian(null);
    } catch (error) {
      console.error('Error updating custodian:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCustodian = async () => {
    if (!selectedCustodian) return;
    setIsProcessing(true);
    try {
      await api.delete(`/custodians/${selectedCustodian.id}`);
      setCustodians(custodians.filter(c => c.id !== selectedCustodian.id));
      setIsDeleteDialogOpen(false);
      setSelectedCustodian(null);
    } catch (error) {
      console.error('Error deleting custodian:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      // Parse CSV for preview using Blob#text()
      const text = await file.text();
      const lines = text.split('\n').slice(0, 6); // Preview first 5 rows
      setImportPreview(lines.map(line => line.split(',')));
    }
  };


  const handleImport = async () => {
    if (!csvFile) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      await api.post(`/cases/${caseId}/custodians/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsImportModalOpen(false);
      setCsvFile(null);
      setImportPreview([]);
      fetchCustodians();
    } catch (error) {
      console.error('Error importing custodians:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditModal = (custodian: Custodian) => {
    setSelectedCustodian(custodian);
    setFormData({
      name: custodian.name,
      email: custodian.email,
      department: custodian.department || '',
      title: custodian.title || '',
    });
    setIsEditModalOpen(true);
  };

  const filteredCustodians = custodians.filter(custodian => {
    const searchLower = searchQuery.toLowerCase();
    return (
      custodian.name.toLowerCase().includes(searchLower) ||
      custodian.email.toLowerCase().includes(searchLower) ||
      custodian.department?.toLowerCase().includes(searchLower) ||
      custodian.title?.toLowerCase().includes(searchLower)
    );
  });

  const totalDocuments = custodians.reduce((sum, c) => sum + (c.documentCount || 0), 0);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-primary', 'bg-success', 'bg-purple', 'bg-warning', 'bg-destructive', 'bg-info'];
    const index = (name.codePointAt(0) || 0) % colors.length;
    return colors[index];
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Custodians</h1>
            <p className="text-muted-foreground mt-1">Manage document custodians and sources</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Custodian
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary">Total Custodians</p>
                <p className="text-3xl font-bold text-foreground">{custodians.length}</p>
              </div>
              <div className="p-3 bg-primary/15 rounded-xl">
                <User className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-success">Total Documents</p>
                <p className="text-3xl font-bold text-foreground">{totalDocuments.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-success/15 rounded-xl">
                <FileText className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple">Departments</p>
                <p className="text-3xl font-bold text-foreground">
                  {new Set(custodians.map(c => c.department)).size}
                </p>
              </div>
              <div className="p-3 bg-purple/15 rounded-xl">
                <Building2 className="h-6 w-6 text-purple" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search custodians by name, email, department..."
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
        </CardContent>
      </Card>

      {/* Custodians Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredCustodians.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground">No Custodians Found</h3>
          <p className="text-muted-foreground mb-4">Add custodians to track document sources</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Custodian
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredCustodians.map((custodian, index) => (
              <motion.div
                key={custodian.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className={cn("h-12 w-12 text-white", getAvatarColor(custodian.name))}>
                          <AvatarFallback className={getAvatarColor(custodian.name)}>
                            {getInitials(custodian.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-foreground">{custodian.name}</h3>
                          <p className="text-sm text-muted-foreground">{custodian.email}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">

                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(custodian)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedCustodian(custodian);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      {custodian.department && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{custodian.department}</span>
                        </div>
                      )}
                      {custodian.title && (
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{custodian.title}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{custodian.documentCount?.toLocaleString() || 0} documents</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-primary"
                        onClick={() => navigate(`/cases/${caseId}/search?custodianId=${custodian.id}`)}
                      >
                        View Documents <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Custodian</DialogTitle>
            <DialogDescription>
              Add a new document custodian to this case
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="custodian-name" className="text-sm font-medium">Full Name *</label>
              <Input 
                id="custodian-name"
                placeholder="e.g., John Smith"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="custodian-email" className="text-sm font-medium">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="custodian-email"
                  type="email"
                  placeholder="john.smith@company.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="custodian-department" className="text-sm font-medium">Department</label>
                <Input 
                  id="custodian-department"
                  placeholder="e.g., Legal"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="custodian-title" className="text-sm font-medium">Title</label>
                <Input 
                  id="custodian-title"
                  placeholder="e.g., General Counsel"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCustodian} 
              disabled={!formData.name || !formData.email || isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" /> Add Custodian</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Custodian</DialogTitle>
            <DialogDescription>
              Update custodian information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-custodian-name" className="text-sm font-medium">Full Name</label>
              <Input 
                id="edit-custodian-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-custodian-email" className="text-sm font-medium">Email Address</label>
              <Input 
                id="edit-custodian-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="edit-custodian-department" className="text-sm font-medium">Department</label>
                <Input 
                  id="edit-custodian-department"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-custodian-title" className="text-sm font-medium">Title</label>
                <Input 
                  id="edit-custodian-title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateCustodian} 
              disabled={isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Edit className="mr-2 h-4 w-4" /> Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import Custodians from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with custodian data. Required columns: name, email. Optional: department, title.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                {csvFile ? csvFile.name : 'Drag and drop your CSV file here, or click to browse'}
              </p>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="inline-flex">
                <Button variant="outline" size="sm" className="cursor-pointer">
                  Browse Files
                </Button>
              </label>

            </div>
            
            {importPreview.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Preview (first 5 rows):</h4>
                <div className="bg-muted rounded-lg p-3 overflow-x-auto">
                  <table className="text-xs w-full">
                    <tbody>
                      {importPreview.map((row, i) => (
                        <tr key={`preview-${i}`} className={i === 0 ? 'font-bold border-b border-border' : ''}>
                          {row.map((cell: string, j: number) => (
                            <td key={`preview-${i}-${j}`} className="px-2 py-1 border-r border-border last:border-r-0">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportModalOpen(false);
              setCsvFile(null);
              setImportPreview([]);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!csvFile || isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Import {csvFile ? '1' : ''} File</>
              )}
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
              Delete Custodian
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCustodian?.name}"? This will not delete their documents, but the custodian association will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteCustodian}
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
    </div>
  );
};

export default CustodiansPage;
