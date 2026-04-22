import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../../services/api';
import { ICustodian } from '../../../../shared/types';
import { FaCloudUploadAlt, FaFile, FaCheck, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

interface DocumentUploadProps {
    caseId: string;
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: () => void;
}

interface UploadStatus {
    filename: string;
    status: 'pending' | 'uploading' | 'success' | 'error' | 'duplicate';
    message?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ caseId, isOpen, onClose, onUploadComplete }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [custodians, setCustodians] = useState<ICustodian[]>([]);
    const [selectedCustodian, setSelectedCustodian] = useState<string>('');
    const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const fetchCustodians = async () => {
        try {
            const res = await api.get(`/cases/${caseId}/custodians`);
            setCustodians(res.data);
            if (res.data.length > 0) {
                // Determine default custodian logic? Or just select first?
                // Requirement says "Option to Auto-assign custodian based on filename patterns (optional)"
                // For now, let user select.
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (isOpen && caseId) {
            fetchCustodians();
        }
    }, [isOpen, caseId]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Filter out .exe or other dangerous types frontend-side too
        const safeFiles = acceptedFiles.filter(f => !f.name.endsWith('.exe'));
        setFiles(prev => [...prev, ...safeFiles]);

        // Initialize statuses
        const newStatuses: Record<string, UploadStatus> = {};
        safeFiles.forEach(f => {
            newStatuses[f.name] = { filename: f.name, status: 'pending' };
        });
        setUploadStatuses(prev => ({ ...prev, ...newStatuses }));
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const removeFile = (filename: string) => {
        setFiles(prev => prev.filter(f => f.name !== filename));
        setUploadStatuses(prev => {
            const next = { ...prev };
            delete next[filename];
            return next;
        });
    };

    const handleUpload = async () => {
        if (!caseId) {
            alert('Missing case id. Please open a case before uploading.');
            return;
        }

        if (!selectedCustodian) {
            alert('Please select a custodian');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('custodianId', selectedCustodian);
            files.forEach(file => {
                formData.append('files', file);
            });

            const res = await api.post(`/cases/${caseId}/documents/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setUploadProgress(percentCompleted);
                }
            });

            // Handle response
            // Backend returns array of created documents with duplicate indicators
            // { message: "...", documents: [...] }
            const resultDocs = res.data.documents;

            const newStatuses = { ...uploadStatuses };

            resultDocs.forEach((doc: any) => {
                newStatuses[doc.filename] = {
                    filename: doc.filename,
                    status: doc.isDuplicate ? 'duplicate' : 'success', // Assuming logic based on what backend returns
                    message: doc.isDuplicate ? 'Duplicate detected' : 'Uploaded successfully'
                };
            });

            // Also mark files that might have failed if any (though backend seems to process all or fail all in this simplified endpoint, wait, controller loops and pushes to array)
            // If checking individually, we'd need sequential calls. My current backend implementation is batch.
            // So if batch succeeds, all good or duplicates.

            setUploadStatuses(newStatuses);
            setFiles([]); // Clear queue? Or leave them to show status? 
            // Better UX: Show status list below dropzone. 
            // But we can clear files to prevent re-upload.

            if (onUploadComplete) onUploadComplete();

        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            console.error('Upload error:', error);
            // Mark all as error?
            const newStatuses = { ...uploadStatuses };
            files.forEach(f => {
                newStatuses[f.name] = {
                    filename: f.name,
                    status: 'error',
                    message: error?.response?.data?.message || 'Upload failed'
                };
            });
            setUploadStatuses(newStatuses);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-card dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-border dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-foreground dark:text-gray-100">Upload Documents</h2>
                        <button
                            onClick={onClose}
                            aria-label="Close upload dialog"
                            title="Close upload dialog"
                            className="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-gray-200"
                        >
                            <FaTimes aria-hidden="true" size={20} />
                            {/* Using FaTimes from react-icons/fa */}
                        </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {/* Custodian Selection */}
                    <div className="mb-4">
                        <label htmlFor="custodian-select" className="block text-sm font-medium text-foreground dark:text-muted-foreground/40">Assign Custodian (Required)</label>
                        <select
                            id="custodian-select"
                            aria-required="true"
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={selectedCustodian}
                            onChange={(e) => setSelectedCustodian(e.target.value)}
                        >
                            <option value="">Select a custodian...</option>
                            {custodians.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                            ))}
                        </select>
                    </div>

                    {/* Dropzone */}
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                            ${isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900' : 'border-border hover:border-indigo-400 dark:border-gray-600'}
                            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <input {...getInputProps()} disabled={isUploading} />
                        <FaCloudUploadAlt className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">Drag & drop files here, or click to select files</p>
                        <p className="mt-1 text-xs text-muted-foreground">Allowed: PDF, DOCX, XLSX, MSG, EML, TXT (Max 50MB)</p>
                    </div>

                    {/* Progress Bar */}
                    {isUploading && (
                        <div className="mt-4">
                            <div className="w-full bg-muted rounded-full h-2.5 dark:bg-gray-700">
                                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                            <p className="text-xs text-center mt-1 text-muted-foreground">{uploadProgress}% Uploaded</p>
                        </div>
                    )}

                    {/* Preview List */}
                    {Object.values(uploadStatuses).length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-sm font-medium text-foreground dark:text-gray-200 mb-2">Files</h3>
                            <ul className="divide-y divide-border dark:divide-gray-700">
                                {Object.values(uploadStatuses).map(status => (
                                    <li key={status.filename} className="py-2 flex justify-between items-center">
                                        <div className="flex items-center">
                                            <FaFile className="text-muted-foreground mr-2" />
                                            <span className="text-sm text-foreground dark:text-muted-foreground/40 truncate max-w-xs">{status.filename}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {status.status === 'success' && <span className="text-success flex items-center text-xs"><FaCheck className="mr-1" /> Success</span>}
                                            {status.status === 'duplicate' && <span className="text-yellow-500 flex items-center text-xs"><FaExclamationTriangle className="mr-1" /> Duplicate</span>}
                                            {status.status === 'error' && <span className="text-destructive text-xs">{status.message}</span>}
                                            {status.status === 'pending' && (
                                                <button
                                                    onClick={() => removeFile(status.filename)}
                                                    aria-label={`Remove ${status.filename}`}
                                                    title={`Remove ${status.filename}`}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <FaTimes aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border dark:border-gray-700 flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        aria-label="Close upload dialog"
                        title="Close upload dialog"
                        className="bg-card py-2 px-4 border border-border rounded-md shadow-sm text-sm font-medium text-foreground hover:bg-muted dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-muted0"
                        disabled={isUploading}
                    >
                        Close
                    </button>
                    {!isUploading && files.length > 0 && (
                        <button
                            onClick={handleUpload}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            disabled={!selectedCustodian || files.length === 0}
                        >
                            Upload {files.length} Files
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentUpload;
