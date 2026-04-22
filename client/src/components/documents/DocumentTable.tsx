import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import { ColDef, ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { IDocument } from '../../../../shared/types';
import { FaEye, FaDownload, FaTrash } from 'react-icons/fa';
import api from '../../services/api';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

interface DocumentTableProps {
    documents: IDocument[];
    onRefresh: () => void;
    canDelete: boolean;
}

const DocumentTable: React.FC<DocumentTableProps> = ({ documents, onRefresh, canDelete }) => {
    // Row Data: The data to be displayed.
    const rowData = documents;

    const getDocumentId = (doc: IDocument): string => {
        return (doc as IDocument & { _id?: string }).id || (doc as IDocument & { _id?: string })._id || '';
    };

    // Column Definitions: Defines the columns to be displayed.
    const colDefs: ColDef[] = [
        { field: 'docNumber', headerName: 'Doc ID', width: 120, filter: true },
        { field: 'filename', headerName: 'Filename', flex: 1, filter: true },
        { field: 'fileType', headerName: 'Type', width: 80 },
        {
            field: 'custodianId.name', // Assuming populated
            headerName: 'Custodian',
            width: 150,
            valueGetter: (p: any) => p.data.custodianId?.name || 'Unknown'
        },
        {
            field: 'isDuplicate',
            headerName: 'Duplicate',
            width: 100,
            cellRenderer: (p: any) => p.value ? <span className="text-yellow-600 font-bold">Yes</span> : 'No'
        },
        {
            field: 'fileSize',
            headerName: 'Size',
            width: 100,
            valueFormatter: (p: any) => (p.value / 1024 / 1024).toFixed(2) + ' MB'
        },
        {
            field: 'uploadedAt',
            headerName: 'Date',
            width: 120,
            valueFormatter: (p: any) => new Date(p.value).toLocaleDateString()
        },
        {
            headerName: 'Actions',
            width: 120,
            cellRenderer: (params: any) => {
                const doc = params.data;
                return (
                    <div className="flex space-x-2 items-center justify-center h-full">
                        <button
                            className="text-muted-foreground hover:text-primary"
                            title="View"
                            onClick={() => handleView(doc)}
                        >
                            <FaEye />
                        </button>
                        <button
                            className="text-muted-foreground hover:text-success"
                            title="Download"
                            onClick={() => handleDownload(doc)}
                        >
                            <FaDownload />
                        </button>
                        {canDelete && (
                            <button
                                className="text-muted-foreground hover:text-destructive"
                                title="Delete"
                                onClick={() => handleDelete(getDocumentId(doc))}
                            >
                                <FaTrash />
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];

    const handleDownload = async (doc: IDocument) => {
        try {
            const docId = getDocumentId(doc);
            const response = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', doc.filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download error:', err);
            alert('Failed to download file');
        }
    };

    const handleView = async (doc: IDocument) => {
        try {
            const docId = getDocumentId(doc);
            const response = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
            const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: doc.fileType }));
            window.open(fileUrl, '_blank', 'noopener,noreferrer');

            // Revoke later so the new tab can finish loading the object URL.
            window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60_000);
        } catch (err) {
            console.error('View error:', err);
            alert('Failed to open document preview');
        }
    };

    const handleDelete = async (id: string) => {
        if (!id) {
            alert('Invalid document id');
            return;
        }

        if (window.confirm('Are you sure you want to delete this document?')) {
            try {
                await api.delete(`/documents/${id}`);
                onRefresh();
            } catch (err) {
                console.error('Delete error:', err);
                alert('Failed to delete document');
            }
        }
    };

    const defaultColDef = useMemo(() => {
        return {
            flex: 1,
            minWidth: 100,
            sortable: true,
            filter: true,
            resizable: true,
        };
    }, []);

    return (
        <div className="h-[500px] w-full" style={{ height: 500 }}>{/* Valid CSS height required for Grid */}
            <AgGridReact
                rowData={rowData}
                columnDefs={colDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={20}
                theme={themeQuartz}
            />
        </div>
    );
};

export default DocumentTable;
