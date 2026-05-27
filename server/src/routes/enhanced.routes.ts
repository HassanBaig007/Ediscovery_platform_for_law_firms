// Enhanced API Routes
// RESTful endpoints for all enhanced features

import { Router, Request, Response } from 'express';
import { getServiceContainer } from '../components/ServiceContainer';
import { protect, requireCaseAccess, requireCaseRole, adminOnly } from '../middleware/authMiddleware';
import Document from '../models/Document';

const router = Router();

// Get services lazily to avoid initialization issues
const getServices = () => getServiceContainer();

// ============================================
// Collaborative Review Routes
// ============================================

router.post('/api/review/assign', protect, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const { reviewerId, documentIds } = req.body;
        await services.collaborativeReview.assignDocuments(reviewerId, documentIds);
        res.json({ success: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Assignment failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.post('/api/review/tag', protect, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const { documentId, tag, reviewerId } = req.body;
        await services.collaborativeReview.tagDocument(documentId, tag, reviewerId);
        res.json({ success: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Tagging failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.post('/api/review/note', protect, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const { documentId, note } = req.body;
        await services.collaborativeReview.addNote(documentId, note);
        res.json({ success: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Note creation failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.get('/api/review/progress/:reviewSetId', protect, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const reviewSetId = Array.isArray(req.params.reviewSetId) ? req.params.reviewSetId[0] : req.params.reviewSetId;
        const progress = await services.collaborativeReview.getReviewProgress(reviewSetId);
        res.json(progress);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Progress retrieval failed';
        res.status(500).json({ error: errorMessage });
    }
});

// ============================================
// Redaction Routes
// ============================================

router.post('/api/redaction/apply', protect, requireCaseRole('LEAD', 'REVIEWER', 'PARALEGAL'), async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const { documentId, redaction } = req.body;
        const redactionWithUser = {
            ...redaction,
            appliedBy: (req as any).user!._id.toString()
        };
        await services.redactionManager.applyRedaction(documentId, redactionWithUser);

        // Mark document as Reviewed
        const document = await Document.findById(documentId);
        if (document) {
            document.coding = {
                reviewedBy: (req as any).user!._id,
                reviewedAt: new Date(),
                updatedAt: new Date(),
                privilegeStatus: document.coding?.privilegeStatus || 'NEEDS_REVIEW',
                relevanceStatus: document.coding?.relevanceStatus || 'RELEVANT',
                isConfidential: document.coding?.isConfidential ?? false,
                privilegeReason: document.coding?.privilegeReason,
                reviewNotes: document.coding?.reviewNotes
            };
            await document.save();
        }

        const redactions = services.redactionManager.getDocumentRedactions(documentId);
        const applied = redactions[redactions.length - 1];
        res.json(applied ?? { success: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Redaction failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.get('/api/redaction/document/:documentId', protect, requireCaseAccess, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const documentId = Array.isArray(req.params.documentId) ? req.params.documentId[0] : req.params.documentId;
        const redactions = services.redactionManager.getDocumentRedactions(documentId);
        res.json(redactions);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Redaction retrieval failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.post('/api/redaction/approve/:redactionId', protect, requireCaseRole('LEAD', 'REVIEWER', 'PARALEGAL'), async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const redactionId = Array.isArray(req.params.redactionId) ? req.params.redactionId[0] : req.params.redactionId;
        const { reviewerId = 'system', documentId } = req.body;
        await services.redactionManager.approveRedaction(redactionId, reviewerId);

        // Mark document as Reviewed
        if (documentId) {
            const document = await Document.findById(documentId);
            if (document) {
                document.coding = {
                    reviewedBy: (req as any).user!._id,
                    reviewedAt: new Date(),
                    updatedAt: new Date(),
                    privilegeStatus: document.coding?.privilegeStatus || 'NEEDS_REVIEW',
                    relevanceStatus: document.coding?.relevanceStatus || 'RELEVANT',
                    isConfidential: document.coding?.isConfidential ?? false,
                    privilegeReason: document.coding?.privilegeReason,
                    reviewNotes: document.coding?.reviewNotes
                };
                await document.save();
            }
        }

        res.json({ success: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Approval failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.delete('/api/redaction/:redactionId', protect, requireCaseRole('LEAD', 'REVIEWER', 'PARALEGAL'), async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const redactionId = Array.isArray(req.params.redactionId) ? req.params.redactionId[0] : req.params.redactionId;
        const documentId = req.query.documentId as string | undefined;
        const userId = (req as any).user!._id.toString();

        if (!documentId) {
            res.status(400).json({ error: 'documentId query parameter is required' });
            return;
        }

        await services.redactionManager.removeRedaction(documentId, redactionId, userId);
        res.json({ success: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Delete redaction failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.get('/api/redaction/privilege-log/:caseId', protect, requireCaseAccess, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const caseId = Array.isArray(req.params.caseId) ? req.params.caseId[0] : req.params.caseId;
        const log = await services.redactionManager.getPrivilegeLog(caseId);
        res.json(log);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Privilege log retrieval failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.post('/api/redaction/production-version/:documentId', protect, requireCaseRole('LEAD', 'REVIEWER', 'PARALEGAL'), async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const documentId = Array.isArray(req.params.documentId) ? req.params.documentId[0] : req.params.documentId;
        const productionDoc = await services.redactionManager.generateProductionVersion(documentId);
        res.json(productionDoc);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Production version generation failed';
        res.status(500).json({ error: errorMessage });
    }
});

// ============================================
// Production Workflow Routes
// ============================================

router.post('/api/production/create', protect, requireCaseAccess, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const config = req.body;
        const productionSet = await services.productionWorkflow.createProductionSet(config);
        res.json(productionSet);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Production creation failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.post('/api/production/:productionSetId/bates', protect, requireCaseAccess, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const productionSetId = Array.isArray(req.params.productionSetId) ? req.params.productionSetId[0] : req.params.productionSetId;
        await services.productionWorkflow.applyBatesNumbering(productionSetId);
        res.json({ success: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Bates numbering failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.post('/api/production/:productionSetId/load-files', protect, requireCaseAccess, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const productionSetId = Array.isArray(req.params.productionSetId) ? req.params.productionSetId[0] : req.params.productionSetId;
        const loadFiles = await services.productionWorkflow.generateLoadFiles(productionSetId);
        res.json(loadFiles);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Load file generation failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.post('/api/production/:productionSetId/export', protect, requireCaseAccess, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const productionSetId = Array.isArray(req.params.productionSetId) ? req.params.productionSetId[0] : req.params.productionSetId;
        const exportResult = await services.productionWorkflow.exportProduction(productionSetId);
        res.json(exportResult);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Export failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.get('/api/production/:productionSetId/validate', protect, requireCaseAccess, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const productionSetId = Array.isArray(req.params.productionSetId) ? req.params.productionSetId[0] : req.params.productionSetId;
        const validation = await services.productionWorkflow.validateProduction(productionSetId);
        res.json(validation);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Validation failed';
        res.status(500).json({ error: errorMessage });
    }
});

// ============================================
// Security Routes
// ============================================

router.post('/api/auth/logout', protect, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const { token } = req.body;
        await services.securityManager.logout(token);
        res.json({ success: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Logout failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.get('/api/audit/trail', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const filters = req.query;
        const trail = await services.securityManager.getAuditTrail(filters as any);
        res.json(trail);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Audit trail retrieval failed';
        res.status(500).json({ error: errorMessage });
    }
});

// ============================================
// Health and Monitoring Routes
// ============================================

router.get('/api/health', async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const health = services.healthMonitor.getSystemHealth();
        const statusCode = health.overall === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Health check failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.get('/api/health/alerts', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const alerts = services.healthMonitor.getActiveAlerts();
        res.json(alerts);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Alert retrieval failed';
        res.status(500).json({ error: errorMessage });
    }
});

router.get('/api/logs', protect, adminOnly, async (req: Request, res: Response) => {
    try {
        const services = getServices();
        const { level, component, limit } = req.query;
        const logs = services.logger.getLogs({
            level: level as any,
            component: component as string,
            limit: limit ? Number.parseInt(limit as string) : undefined
        });
        res.json(logs);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Log retrieval failed';
        res.status(500).json({ error: errorMessage });
    }
});

export default router;
