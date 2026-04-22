import { useCallback, useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in bytes
  className?: string;
}

export function FileDropzone({
  onFilesSelected,
  accept = '*',
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024, // 100MB default
  className,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `${file.name} is too large (max ${formatFileSize(maxSize)})`;
    }
    return null;
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: File[] = [];
    const newErrors: string[] = [];

    Array.from(files).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else if (newFiles.length < maxFiles) {
        newFiles.push(file);
      }
    });

    if (newFiles.length + selectedFiles.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
    }

    const updatedFiles = [...selectedFiles, ...newFiles].slice(0, maxFiles);
    setSelectedFiles(updatedFiles);
    setErrors(newErrors);
    onFilesSelected(updatedFiles);
  }, [maxFiles, maxSize, onFilesSelected, selectedFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = ''; // Reset input
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    onFilesSelected(updated);
  }, [onFilesSelected, selectedFiles]);

  return (
    <div className={cn('space-y-4', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          'hover:border-primary/50 hover:bg-muted',
          isDragOver ? 'border-primary bg-primary/10' : 'border-border',
          'cursor-pointer'
        )}
      >
        <input
          type="file"
          multiple
          accept={accept}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Upload files"
        />

        <Upload className={cn(
          'mx-auto h-12 w-12 mb-4 transition-colors',
          isDragOver ? 'text-primary' : 'text-muted-foreground'
        )} />
        <p className="text-sm font-medium text-foreground">
          {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or click to browse (max {maxFiles} files, up to {formatFileSize(maxSize)} each)
        </p>
      </div>

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, i) => (
            <p key={i} className="text-sm text-destructive">{error}</p>
          ))}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Selected files:</p>
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-muted rounded-md"
            >
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(index)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
