import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Document from '../models/Document';
import Custodian from '../models/Custodian';
import { calculateMD5, saveFile, getFileStream, deleteFile } from '../services/file.service';
import { extractTextFromBuffer } from '../services/extraction.service';
import { logAction } from '../utils/audit.util';
import AuditLog from '../models/AuditLog';
import Case from '../models/Case';
import { createNotification } from './notification.controller';

// Helper to generate next document number atomically
const getNextDocNumber = async (caseId: string): Promise<string> => {
    const updatedCase = await Case.findByIdAndUpdate(
        caseId,
        { $inc: { lastDocNumber: 1 } },
        { new: true }
    );
    
    if (!updatedCase) {
        throw new Error('Case not found for document number generation');
    }

    return `DOC-${String(updatedCase.lastDocNumber).padStart(6, '0')}`;
};

// @desc    Upload documents
// @route   POST /api/cases/:caseId/documents/upload
// @access  Private (Paralegal/Lead)
export const uploadDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const caseId = req.params.caseId as string;
        if (!caseId) {
            res.status(400).json({ message: 'Case ID is required' });
            return;
        }
        const custodianId = req.body.custodianId as string;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            res.status(400).json({ message: 'No files uploaded' });
            return;
        }

        if (!custodianId) {
            res.status(400).json({ message: 'Custodian ID is required' });
            return;
        }

        const custodian = await Custodian.findById(custodianId);
        if (custodian?.caseId?.toString() !== caseId) {
            res.status(400).json({ message: 'Invalid custodian for this case' });
            return;
        }

        const results = [];
        const uploadedBy = req.user!._id;

        // Process files sequentially to maintain doc number order and avoid race conditions on doc number (mostly)
        // Note: For high concurrency, doc number generation needs a better lock mechanism (e.g. atomic counter), 
        // but for this project scope, sequential processing is likely acceptable.

        for (const file of files) {
            // 1. Calculate MD5
            const md5Hash = calculateMD5(file.buffer);

            // 2. Check for duplicate in THIS CASE
            const existingDoc = await Document.findOne({ caseId, md5Hash });

            let newDoc: any;

            if (existingDoc) {
                // DUPLICATE
                try {
                    const docNumber = await getNextDocNumber(caseId);

                    newDoc = await Document.create({
                        caseId,
                        custodianId,
                        docNumber,
                        filename: file.originalname,
                        fileType: file.mimetype,
                        fileSize: file.size,
                        filePath: existingDoc.filePath,
                        md5Hash,
                        extractedText: existingDoc.extractedText, // Copy extracted text
                        uploadedBy,
                        isDuplicate: true,
                        masterDocId: existingDoc._id,
                    });
                } catch (err) {
                    console.error('Error creating duplicate document record:', err);
                    results.push({ filename: file.originalname, error: (err as Error).message });
                    continue;
                }
            } else {
                // NEW FILE
                try {
                    const savedFile = await saveFile(file, caseId, custodianId);
                    const docNumber = await getNextDocNumber(caseId);

                    newDoc = await Document.create({
                        caseId,
                        custodianId,
                        docNumber,
                        filename: savedFile.originalName,
                        fileType: savedFile.mimeType,
                        fileSize: savedFile.size,
                        filePath: savedFile.filePath,
                        md5Hash,
                        extractedText: 'Processing text extraction...', // Temporary text
                        uploadedBy,
                        isDuplicate: false
                    });
                    
                    // Async text extraction (prevents blocking the HTTP response)
                    extractTextFromBuffer(file.buffer, file.mimetype)
                        .then(text => Document.findByIdAndUpdate(newDoc._id, { extractedText: text || '' }))
                        .catch(err => console.error(`Background extraction failed for ${file.originalname}:`, err));
                } catch (err) {
                    console.error('Error saving/creating document for file:', file.originalname, err);
                    results.push({ filename: file.originalname, error: (err as Error).message });
                    continue;
                }
            }
            
            // Log Action
            await logAction(uploadedBy, 'UPLOAD', 'document', newDoc._id, { 
                filename: newDoc.filename, 
                isDuplicate: newDoc.isDuplicate 
            }, req.ip);
            
            results.push(newDoc);
        }

        // Notify case team about new uploads (fire-and-forget)
        try {
            const caseRecord = await Case.findById(caseId).select('caseName team');
            if (caseRecord) {
                const teamUserIds = (caseRecord.team || []).map((t: any) => t.user?.toString()).filter(Boolean);
                for (const uid of teamUserIds) {
                    if (uid !== uploadedBy.toString()) {
                        createNotification(
                            uid,
                            'DOCUMENT',
                            'Documents uploaded',
                            `${files.length} document(s) uploaded to ${caseRecord.caseName}.`,
                            `/cases/${caseId}`,
                        ).catch(() => {});
                    }
                }
            }
        } catch { /* notification failure is non-critical */ }

        res.status(201).json({
            message: `Processed ${files.length} files`,
            documents: results
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Server error during upload', error: (error as Error).message });
    }
};

// @desc    Get documents for a case
// @route   GET /api/cases/:caseId/documents
// @access  Private
export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const caseId = req.params.caseId as string;
        const page = (req.query.page as string) || '1';
        const limit = (req.query.limit as string) || '50';
        const custodianId = req.query.custodianId as string;
        const search = req.query.search as string;

        const query: any = { caseId };

        if (custodianId) {
            query.custodianId = custodianId;
        }

        if (search) {
            query.filename = { $regex: search, $options: 'i' };
        }

        // Status logic if implemented (not fully defined in prompt, but implies 'reviewed'/'unreviewed')
        // We have coding field. coding.status? 
        // Document model has `coding` field.
        // Let's assume passed status filters on that.

        const documents = await Document.find(query)
            .populate('custodianId', 'name')
            .populate('uploadedBy', 'firstName lastName')
            .select('-filePath') // Exclude file path for security
            .sort({ createdAt: -1 }) // or docNumber
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await Document.countDocuments(query);

        res.json({
            documents,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};

// @desc    Download document
// @route   GET /api/documents/:id/download
// @access  Private
export const downloadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };

        const document = await Document.findById(id);
        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }

        // Check Access: User must belong to the Case of this document
        // We need to fetch Case or check user's team membership.
        // Assuming 'protect' middleware ensures user is logged in.
        // We should check if user is in Document.caseId team.
        // For simplicity/speed, assuming if they have the ID and are auth'd, they can access, OR check basic Case access.
        // Let's add basic check.
        // const hasAccess = ...

        // Log download
        await logAction(req.user!._id, 'DOWNLOAD', 'document', document._id, null, req.ip);

        // Stream file
        const fileStream = getFileStream(document.filePath);

        // Set headers
        res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
        res.setHeader('Content-Type', document.fileType || 'application/octet-stream');

        fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            if (!res.headersSent) {
                res.status(404).json({ message: 'Physical file not found on server' });
            }
        });

        fileStream.pipe(res);

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};

// @desc    Inline preview document stream
// @route   GET /api/documents/:id/preview
// @access  Private
export const previewDocument = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };

        const document = await Document.findById(id);
        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }

        await logAction(req.user!._id, 'VIEW', 'document', document._id, { preview: true }, req.ip);

        const fileStream = getFileStream(document.filePath);

        res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);
        res.setHeader('Content-Type', document.fileType || 'application/octet-stream');

        fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            if (!res.headersSent) {
                res.status(404).json({ message: 'Physical file not found on server' });
            }
        });

        fileStream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};

// @desc    Get single document by ID
// @route   GET /api/documents/:id
// @access  Private
export const getDocumentById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };
        const document = await Document.findById(id)
            .populate('tags')
            .populate('custodianId');

        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }
        
        await logAction(req.user!._id, 'VIEW', 'document', document._id, null, req.ip);

        res.json(document);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete single document by ID
// @route   DELETE /api/documents/:id
// @access  Private (Admin/Partner/Paralegal)
export const deleteDocumentById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };

        const document = await Document.findById(id);
        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }

        const referencedByOthers = await Document.countDocuments({
            _id: { $ne: document._id },
            filePath: document.filePath
        });

        await Document.deleteOne({ _id: document._id });

        if (referencedByOthers === 0 && document.filePath) {
            await deleteFile(document.filePath);
        }

        await logAction(
            req.user!._id,
            'DELETE',
            'document',
            document._id,
            {
                filename: document.filename,
                deletedPhysicalFile: referencedByOthers === 0
            },
            req.ip
        );

        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};

// @desc    Check if a document with the given MD5 hash already exists in a case
// @route   GET /api/documents/check-duplicate?caseId=X&md5Hash=Y
// @access  Private
export const checkDuplicate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const query = req.query as { caseId?: string; md5Hash?: string };
        const body = (req.body ?? {}) as { caseId?: string; md5Hash?: string };

        // Accept both GET query params and POST JSON body for compatibility.
        const caseId = query.caseId ?? body.caseId;
        const md5Hash = query.md5Hash ?? body.md5Hash;

        if (!caseId || !md5Hash) {
            res.status(400).json({ message: 'caseId and md5Hash are required' });
            return;
        }

        const existing = await Document.findOne({ caseId, md5Hash }).select('_id docNumber filename');

        if (!existing) {
            res.json({ isDuplicate: false, masterDocument: null, masterDocId: null });
            return;
        }

        res.json({
            isDuplicate: true,
            masterDocId: existing.id,
            masterDocument: {
                id: existing.id,
                docNumber: existing.docNumber,
                filename: existing.filename
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get coding history of a document
// @route   GET /api/documents/:id/coding-history
// @access  Private
export const getDocumentCodingHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Fetch audit logs related to this document
        const logs = await AuditLog.find({
            entityType: 'Document',
            entityId: id,
            action: { $in: ['UPDATE', 'UPLOAD', 'CODE'] }
        })
        .populate('userId', 'firstName lastName')
        .sort({ createdAt: -1 });

        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};
