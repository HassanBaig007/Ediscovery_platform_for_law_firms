import express from 'express';
import { protect, checkProductionLock, requireCaseAccess, requireCaseRole } from '../middleware/authMiddleware';
import {
    createProduction,
    addDocumentsToProduction,
    removeDocumentFromProduction,
    approveProduction,
    markAsProduced,
    exportProduction,
    getProductionsByCase,
    getProductionById,
    submitForReview,
    deleteProduction
} from '../controllers/production.controller';

const router = express.Router();

// Case-specific production routes
router.post('/cases/:caseId/productions', protect, requireCaseRole('LEAD', 'PARALEGAL'), createProduction);
router.get('/cases/:caseId/productions', protect, requireCaseAccess, getProductionsByCase);

// Production-specific routes
router.get('/productions/:id', protect, requireCaseAccess, getProductionById);
router.post('/productions/:id/documents', protect, requireCaseRole('LEAD', 'PARALEGAL'), checkProductionLock, addDocumentsToProduction);
router.delete('/productions/:id/documents/:documentId', protect, requireCaseRole('LEAD', 'PARALEGAL'), checkProductionLock, removeDocumentFromProduction);
router.put('/productions/:id/submit', protect, requireCaseRole('LEAD', 'PARALEGAL'), submitForReview);
router.put('/productions/:id/approve', protect, requireCaseAccess, approveProduction);
router.put('/productions/:id/produce', protect, requireCaseAccess, markAsProduced);
router.get('/productions/:id/export', protect, requireCaseAccess, exportProduction);
router.delete('/productions/:id', protect, requireCaseRole('LEAD', 'PARALEGAL'), deleteProduction);

export default router;
