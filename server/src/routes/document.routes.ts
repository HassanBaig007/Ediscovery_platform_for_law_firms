import express from 'express';
import { protect, requireCaseAccess, requireCaseRole } from '../middleware/authMiddleware';
import { uploadDocuments, getDocuments, downloadDocument, getDocumentById, checkDuplicate, getDocumentCodingHistory, deleteDocumentById } from '../controllers/document.controller';
import { advancedSearch, exportDocuments, deleteSavedSearch } from '../controllers/search.controller';
import upload from '../middleware/upload.middleware';

const router = express.Router();

// Case-scoped routes
// POST /api/cases/:caseId/documents/upload
router.post('/cases/:caseId/documents/upload',
    protect,
    requireCaseRole('LEAD', 'PARALEGAL'),
    upload.array('files'), // 'files' is the field name
    uploadDocuments
);

// GET /api/cases/:caseId/documents
router.get('/cases/:caseId/documents',
    protect,
    requireCaseAccess,
    getDocuments
);

// Document-scoped routes
// GET /api/documents/:id/download
router.get('/documents/:id/download',
    protect,
    requireCaseAccess,
    downloadDocument
);

// GET /api/documents/:id
router.get('/documents/:id',
    protect,
    requireCaseAccess,
    getDocumentById
);

// DELETE /api/documents/:id
router.delete('/documents/:id',
    protect,
    requireCaseRole('LEAD', 'PARALEGAL'),
    deleteDocumentById
);

// GET /api/documents/:id/coding-history
router.get('/documents/:id/coding-history',
    protect,
    requireCaseAccess,
    getDocumentCodingHistory
);

// GET /api/documents/check-duplicate?caseId=X&md5Hash=Y
router.get('/documents/check-duplicate',
    protect,
    requireCaseAccess,
    checkDuplicate
);

// POST /api/documents/check-duplicate
router.post('/documents/check-duplicate',
    protect,
    requireCaseAccess,
    checkDuplicate
);

// POST /api/documents/search
router.post('/documents/search',
    protect,
    requireCaseAccess,
    advancedSearch
);

// POST /api/documents/export
router.post('/documents/export',
    protect,
    requireCaseAccess,
    exportDocuments
);

// DELETE /api/saved-searches/:id
router.delete('/saved-searches/:id',
    protect,
    deleteSavedSearch
);

export default router;
