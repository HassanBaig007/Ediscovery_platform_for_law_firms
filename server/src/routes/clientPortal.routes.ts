import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import { createCaseShare, getCaseShares, revokeCaseShare } from '../controllers/clientPortal.controller';

const router = express.Router();

router.use(protect, authorize('ADMIN', 'PARTNER'));

router.post('/shares', createCaseShare);
router.get('/cases/:caseId/shares', getCaseShares);
router.patch('/shares/:shareId/revoke', revokeCaseShare);

export default router;
