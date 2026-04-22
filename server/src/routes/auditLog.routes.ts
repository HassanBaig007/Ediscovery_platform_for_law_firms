import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import { getAuditLogs } from '../controllers/auditLog.controller';

const router = express.Router();

// GET /api/audit-logs - List audit logs (Admin or Partner)
router.get('/', protect, authorize('ADMIN', 'PARTNER'), getAuditLogs);

export default router;
