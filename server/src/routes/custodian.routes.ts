import express from 'express';
import multer from 'multer';
import { protect, requireCaseAccess, requireCaseRole } from '../middleware/authMiddleware';
import {
    getCustodians,
    createCustodian,
    updateCustodian,
    deleteCustodian,
    importCustodians
} from '../controllers/custodian.controller';

const router = express.Router();
const csvUpload = multer({ storage: multer.memoryStorage() });

// Case-scoped routes
// GET /api/cases/:caseId/custodians
// POST /api/cases/:caseId/custodians
router.route('/cases/:caseId/custodians')
    .get(protect, requireCaseAccess, getCustodians)
    .post(protect, requireCaseRole('LEAD', 'PARALEGAL'), createCustodian);

router.post('/cases/:caseId/custodians/import',
    protect,
    requireCaseRole('LEAD', 'PARALEGAL'),
    csvUpload.single('file'),
    importCustodians
);

// Custodian-scoped routes
// PUT /api/custodians/:id
// DELETE /api/custodians/:id
router.route('/custodians/:id')
    .put(protect, requireCaseRole('LEAD', 'PARALEGAL'), updateCustodian)
    .delete(protect, requireCaseRole('LEAD', 'PARALEGAL'), deleteCustodian);

export default router;
