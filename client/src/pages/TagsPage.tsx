import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Search, Tag, MoreHorizontal, Trash2, 
  Edit, Loader2, X, Hash, FileText, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/DropdownMenu';
import { cn } from '../lib/utils';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import api from '../services/api';

interface TagItem {
  id: string;
  caseId: string;
  tagName: string;
  tagDescription?: string;
  color: string;
  documentCount?: number;
  createdAt: string;
  updatedAt: string;
}

const COLORS = [
  { name: 'Red', value: '#ef4444', bg: 'bg-destructive/15', text: 'text-red-700', border: 'border-red-200' },
  { name: 'Orange', value: '#f97316', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { name: 'Amber', value: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { name: 'Yellow', value: '#eab308', bg: 'bg-warning/15', text: 'text-yellow-700', border: 'border-yellow-200' },
  { name: 'Lime', value: '#84cc16', bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-200' },
  { name: 'Green', value: '#22c55e', bg: 'bg-success/15', text: 'text-green-700', border: 'border-green-200' },
  { name: 'Emerald', value: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { name: 'Teal', value: '#14b8a6', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  { name: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  { name: 'Sky', value: '#0ea5e9', bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  { name: 'Blue', value: '#3b82f6', bg: 'bg-primary/15', text: 'text-blue-700', border: 'border-primary/20' },
  { name: 'Indigo', value: '#6366f1', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  { name: 'Violet', value: '#8b5cf6', bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  { name: 'Purple', value: '#a855f7', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  { name: 'Fuchsia', value: '#d946ef', bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  { name: 'Pink', value: '#ec4899', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  { name: 'Rose', value: '#f43f5e', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  { name: 'Slate', value: '#64748b', bg: 'bg-muted', text: 'text-foreground', border: 'border-border' },
];

const TagsPage = () => {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasFullAccess } = useRole();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    tagName: '',
    tagDescription: '',
    color: COLORS[10].value,
  });

  if (!hasFullAccess) {
    return <PermissionDenied requiredRole="ADMIN or PARTNER" />;
  }

  useEffect(() => {
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/cases/${caseId}/tags`);
      setTags(response.data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTag = async () => {
    setIsProcessing(true);
    try {
      const response = await api.post(`/cases/${caseId}/tags`, formData);
      setTags([...tags, response.data]);
      setIsCreateModalOpen(false);
      setFormData({ tagName: '', tagDescription: '', color: COLORS[10].value });
    } catch (error) {
      console.error('Error creating tag:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateTag = async () => {
    if (!selectedTag) return;
    setIsProcessing(true);
    try {
      const response = await api.put(`/cases/${caseId}/tags/${selectedTag.id}`, formData);
      setTags(tags.map(t => t.id === selectedTag.id ? response.data : t));
      setIsEditModalOpen(false);
      setSelectedTag(null);
    } catch (error) {
      console.error('Error updating tag:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!selectedTag) return;
    setIsProcessing(true);
    try {
      await api.delete(`/cases/${caseId}/tags/${selectedTag.id}`);
      setTags(tags.filter(t => t.id !== selectedTag.id));
      setIsDeleteDialogOpen(false);
      setSelectedTag(null);
    } catch (error) {
      console.error('Error deleting tag:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditModal = (tag: TagItem) => {
    setSelectedTag(tag);
    setFormData({
      tagName: tag.tagName,
      tagDescription: tag.tagDescription || '',
      color: tag.color,
    });
    setIsEditModalOpen(true);
  };

  const getColorConfig = (colorValue: string) => {
    return COLORS.find(c => c.value === colorValue) || COLORS[10];
  };

  const filteredTags = tags.filter(tag => {
    const searchLower = searchQuery.toLowerCase();
    return (
      tag.tagName.toLowerCase().includes(searchLower) ||
      tag.tagDescription?.toLowerCase().includes(searchLower)
    );
  });

  const totalTagged = tags.reduce((sum, t) => sum + (t.documentCount || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${caseId}`)} className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Issue Tags</h1>
            <p className="text-muted-foreground mt-1">Manage document categorization tags</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Tag
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-info/10 border-info/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-info">Total Tags</p>
                <p className="text-3xl font-bold text-foreground">{tags.length}</p>
              </div>
              <div className="p-3 bg-info/15 rounded-xl">
                <Tag className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-success">Tagged Documents</p>
                <p className="text-3xl font-bold text-foreground">{totalTagged.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-success/15 rounded-xl">
                <FileText className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple/10 border-purple/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple">Avg Tags per Doc</p>
                <p className="text-3xl font-bold text-foreground">
                  {tags.length > 0 ? (totalTagged / tags.length).toFixed(1) : '0'}
                </p>
              </div>
              <div className="p-3 bg-purple/15 rounded-xl">
                <Hash className="h-6 w-6 text-purple" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tags by name or description..."
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredTags.length === 0 ? (
        <Card className="p-12 text-center">
          <Tag className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground">No Tags Found</h3>
          <p className="text-muted-foreground mb-4">Create tags to categorize and organize documents</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create First Tag
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredTags.map((tag, index) => {
              const colorConfig = getColorConfig(tag.color);
              return (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    "group hover:shadow-lg transition-all duration-200 border-l-4",
                    colorConfig.border.replace('border-', 'border-l-')
                  )}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", colorConfig.bg)}>
                            <Tag className={cn("h-5 w-5", colorConfig.text)} />
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground">{tag.tagName}</h3>
                            <p className="text-xs text-muted-foreground">
                              Created {new Date(tag.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">

                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(tag)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedTag(tag);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {tag.tagDescription && (
                        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                          {tag.tagDescription}
                        </p>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        <Badge variant="outline" className={cn(colorConfig.bg, colorConfig.text, colorConfig.border)}>
                          <FileText className="mr-1 h-3 w-3" />
                          {tag.documentCount || 0} documents
                        </Badge>
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: tag.color }}
                          title={`Color: ${tag.color}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
            <DialogDescription>Create a tag to categorize documents in this case</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="tag-name" className="text-sm font-medium">Tag Name *</label>
              <Input 
                id="tag-name"
                placeholder="e.g., Attorney-Client Privileged"
                value={formData.tagName}
                onChange={(e) => setFormData({...formData, tagName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="tag-description" className="text-sm font-medium">Description</label>
              <textarea 
                id="tag-description"
                className="w-full min-h-[80px] p-3 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Describe when this tag should be used..."
                value={formData.tagDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, tagDescription: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Color</span>
              <div className="grid grid-cols-9 gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setFormData({...formData, color: color.value})}
                    className={cn(
                      "w-8 h-8 rounded-lg transition-all hover:scale-110",
                      formData.color === color.value && "ring-2 ring-offset-2 ring-foreground/80 scale-110"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    aria-label={`Select ${color.name} color`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTag} disabled={!formData.tagName || isProcessing}>
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : <><Plus className="mr-2 h-4 w-4" /> Create Tag</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>Update tag information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-tag-name" className="text-sm font-medium">Tag Name</label>
              <Input 
                id="edit-tag-name"
                value={formData.tagName} 
                onChange={(e) => setFormData({...formData, tagName: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-tag-description" className="text-sm font-medium">Description</label>
              <textarea 
                id="edit-tag-description"
                className="w-full min-h-[80px] p-3 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={formData.tagDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, tagDescription: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Color</span>
              <div className="grid grid-cols-9 gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setFormData({...formData, color: color.value})}
                    className={cn(
                      "w-8 h-8 rounded-lg transition-all hover:scale-110",
                      formData.color === color.value && "ring-2 ring-offset-2 ring-foreground/80 scale-110"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    aria-label={`Select ${color.name} color`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTag} disabled={isProcessing}>
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Edit className="mr-2 h-4 w-4" /> Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Delete Tag
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTag?.tagName}"? This will remove the tag from all {selectedTag?.documentCount || 0} documents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTag} disabled={isProcessing}>
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : <><Trash2 className="mr-2 h-4 w-4" /> Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TagsPage;
