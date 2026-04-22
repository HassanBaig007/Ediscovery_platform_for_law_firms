import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Upload, X, CheckCircle, AlertCircle, 
  Loader2, FolderOpen, Hash, User, Calendar, FileUp,
  Trash2, RefreshCw, List
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Progress } from '../components/ui/Progress';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';
import api from '../services/api';
import SparkMD5 from 'spark-md5';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';

interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'duplicate';
  error?: string;
  md5Hash?: string;
  isDuplicate?: boolean;
  masterDocId?: string;
}

interface Custodian {
  id: string;
  name: string;
  email: string;
}

const UploadPage = () => {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canUpload } = useRole();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [custodians, setCustodians] = useState<Custodian[]>([]);
  const [selectedCustodian, setSelectedCustodian] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState({
    total: 0,
    completed: 0,
    duplicates: 0,
    errors: 0,
  });

  useEffect(() => {
    const fetchCustodians = async () => {
      try {
        const response = await api.get(`/cases/${caseId}/custodians`);
        // Map backend _id to id if necessary
        const mappedCustodians = response.data.map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          email: c.email
        }));
        setCustodians(mappedCustodians);
      } catch (err) {
        console.error('Failed to fetch custodians:', err);
      }
    };
    if (caseId) fetchCustodians();
  }, [caseId]);

  const addFiles = useCallback((newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
      progress: 0,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...uploadFiles]);
    setUploadStats(prev => ({ ...prev, total: prev.total + uploadFiles.length }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  const retryFailed = async () => {
    const failed = files.filter((f) => f.status === 'error');
    if (failed.length === 0) return;
    setFiles((prev) =>
      prev.map((f) => (f.status === 'error' ? { ...f, status: 'pending', error: undefined, progress: 0 } : f))
    );
    setUploadStats((prev) => ({ ...prev, errors: Math.max(0, prev.errors - failed.length) }));
  };

  const retryAllUnfinished = async () => {
    const unfinished = files.filter((f) => f.status === 'error' || f.status === 'pending');
    if (unfinished.length === 0) return;
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'error' || f.status === 'pending'
          ? { ...f, status: 'pending', error: undefined, progress: 0 }
          : f
      )
    );
    setUploadStats((prev) => ({ ...prev, errors: 0 }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateMD5 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const blobSlice = File.prototype.slice || (File.prototype as any).mozSlice || (File.prototype as any).webkitSlice;
      const chunkSize = 2097152; // Read in chunks of 2MB
      const chunks = Math.ceil(file.size / chunkSize);
      let currentChunk = 0;
      const spark = new SparkMD5.ArrayBuffer();
      const fileReader = new FileReader();

      fileReader.onload = function (e) {
        if (e.target?.result) {
          spark.append(e.target.result as ArrayBuffer);
        }
        currentChunk++;
        if (currentChunk < chunks) {
          loadNext();
        } else {
          resolve(spark.end());
        }
      };

      fileReader.onerror = function () {
        reject('Error reading file for MD5 hashing');
      };

      function loadNext() {
        const start = currentChunk * chunkSize;
        const end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
        fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
      }

      loadNext();
    });
  };

  const checkDuplicate = async (md5Hash: string): Promise<{ isDuplicate: boolean; masterDocId?: string }> => {
    if (!caseId) {
      return { isDuplicate: false };
    }

    try {
      const response = await api.get('/documents/check-duplicate', {
        params: {
          caseId,
          md5Hash,
        }
      });

      const masterDocId = response.data.masterDocId
        ?? response.data.masterDocument?.id
        ?? response.data.masterDocument?._id;

      return {
        isDuplicate: Boolean(response.data.isDuplicate),
        masterDocId
      };
    } catch {
      return { isDuplicate: false };
    }
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    if (!selectedCustodian) {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: 'Please select a custodian' }
          : f
      ));
      return;
    }

    setFiles(prev => prev.map(f => 
      f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
    ));

    try {
      const md5Hash = await calculateMD5(uploadFile.file);
      const duplicateCheck = await checkDuplicate(md5Hash);
      
      if (duplicateCheck.isDuplicate) {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'duplicate', md5Hash, isDuplicate: true, masterDocId: duplicateCheck.masterDocId, progress: 100 }
            : f
        ));
        setUploadStats(prev => ({ ...prev, duplicates: prev.duplicates + 1 }));
        return;
      }

      const formData = new FormData();
      formData.append('files', uploadFile.file);
      formData.append('custodianId', selectedCustodian);
      formData.append('md5Hash', md5Hash);

      await api.post(`/cases/${caseId}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: { total?: number; loaded: number }) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { ...f, progress } : f
          ));
        },
      });

      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'completed', progress: 100, md5Hash }
          : f
      ));
      setUploadStats(prev => ({ ...prev, completed: prev.completed + 1 }));
    } catch {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: 'Upload failed' }
          : f
      ));
      setUploadStats(prev => ({ ...prev, errors: prev.errors + 1 }));
    }
  };

  const startUpload = async () => {
    setIsUploading(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      await uploadFile(file);
    }
    
    setIsUploading(false);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('image')) return '🖼️';
    if (type.includes('email') || type.includes('message')) return '📧';
    return '📁';
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending': return 'bg-muted text-muted-foreground';
      case 'uploading': return 'bg-primary/12 text-primary';
      case 'completed': return 'bg-success/12 text-success';
      case 'error': return 'bg-destructive/12 text-destructive';
      case 'duplicate': return 'bg-warning/12 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const canUploadFiles = pendingCount > 0 && selectedCustodian && !isUploading;

  if (!canUpload) {
    return <PermissionDenied requiredRole="ADMIN, PARTNER, or PARALEGAL" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${caseId}`)} className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Document Upload</h1>
            <p className="text-muted-foreground mt-1">Upload and ingest documents into the case</p>
          </div>
        </div>
        <div className="flex gap-2">
          {files.some(f => f.status === 'error') && (
            <Button variant="outline" onClick={retryFailed}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry Failed
            </Button>
          )}
          {files.some(f => f.status === 'pending' || f.status === 'error') && (
            <Button variant="outline" onClick={retryAllUnfinished}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry All
            </Button>
          )}
          {files.some(f => f.status === 'completed') && (
            <Button variant="outline" onClick={clearCompleted}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear Completed
            </Button>
          )}
          {files.some(f => f.status === 'completed') && (
            <Button variant="outline" onClick={() => navigate(`/cases/${caseId}`)}>
              <List className="mr-2 h-4 w-4" /> Open Case Documents
            </Button>
          )}
          <Button 
            onClick={startUpload} 
            disabled={!canUploadFiles}
            className={cn(!canUploadFiles && "opacity-50 cursor-not-allowed")}
          >
            {isUploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Upload {pendingCount > 0 && `(${pendingCount})`}</>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-muted">
            <CardContent className="p-4">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Files</div>
              <div className="text-2xl font-bold text-foreground">{uploadStats.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-success/10">
            <CardContent className="p-4">
              <div className="text-xs font-bold text-success uppercase tracking-wider">Completed</div>
              <div className="text-2xl font-bold text-success">{uploadStats.completed}</div>
            </CardContent>
          </Card>
          <Card className="bg-warning/10">
            <CardContent className="p-4">
              <div className="text-xs font-bold text-warning uppercase tracking-wider">Duplicates</div>
              <div className="text-2xl font-bold text-warning">{uploadStats.duplicates}</div>
            </CardContent>
          </Card>
          <Card className="bg-destructive/10">
            <CardContent className="p-4">
              <div className="text-xs font-bold text-destructive uppercase tracking-wider">Errors</div>
              <div className="text-2xl font-bold text-destructive">{uploadStats.errors}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Custodian Selection */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Select Custodian:</span>
            </div>
            <select 
              value={selectedCustodian}
              onChange={(e) => setSelectedCustodian(e.target.value)}
              title="Select a custodian for document upload"
              className="flex-1 max-w-md px-3 py-2 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Select a custodian --</option>
              {custodians.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
            {!selectedCustodian && files.length > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                <AlertCircle className="mr-1 h-3 w-3" />
                Required for upload
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drop Zone */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-all duration-200",
          isDragging 
            ? "border-blue-500 bg-primary/10" 
            : "border-border hover:border-border"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileUp className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </h3>
          <p className="text-muted-foreground mb-4">
            or click to browse from your computer
          </p>
          <input 
            type="file" 
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="inline-flex">
            <Button variant="outline" className="cursor-pointer">
              Select Files
            </Button>
          </label>

          <p className="text-xs text-muted-foreground mt-4">
            Supported: PDF, Word, Excel, Images, Email files (max 50MB each)
          </p>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Files to Upload ({files.length})</span>
              <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    className="p-4 flex items-center gap-4"
                  >
                    <div className="text-2xl">{getFileIcon(file.type)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{file.name}</p>
                        <Badge variant="outline" className={cn("text-xs", getStatusColor(file.status))}>
                          {file.status === 'duplicate' ? 'Duplicate' : file.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        {file.md5Hash && (
                          <span className="font-mono">MD5: {file.md5Hash.substring(0, 8)}...</span>
                        )}
                      </div>
                      
                      {file.status === 'uploading' && (
                        <div className="mt-2">
                          <Progress value={file.progress} className="h-1" />
                          <span className="text-xs text-muted-foreground">{file.progress}%</span>
                        </div>
                      )}
                      
                      {file.error && (
                        <p className="text-xs text-destructive mt-1">{file.error}</p>
                      )}
                      
                      {file.isDuplicate && (
                        <p className="text-xs text-warning mt-1">
                          Duplicate detected - referencing existing document
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {file.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-success" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                      {file.status === 'duplicate' && (
                        <Hash className="h-5 w-5 text-warning" />
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        disabled={file.status === 'uploading'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-info/10 border-info/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-info/15 rounded-lg">
                <Hash className="h-5 w-5 text-info" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Duplicate Detection</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Files are automatically checked for duplicates using MD5 hashing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-success/15 rounded-lg">
                <FolderOpen className="h-5 w-5 text-success" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Organized Storage</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Documents are organized by case and custodian for easy retrieval
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple/10 border-purple/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple/15 rounded-lg">
                <Calendar className="h-5 w-5 text-purple" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Metadata Extraction</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Document metadata is automatically extracted during upload
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadPage;
