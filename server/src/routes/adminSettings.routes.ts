import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware';
import {
    getSystemSettings,
    updateSystemSettings,
    getIntegrations,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    getLicenseState,
    updateLicenseState,
    getBillingSummary,
    updateBillingSummary
} from '../controllers/adminSettings.controller';
import { seedSyntheticDataHandler } from '../controllers/seed.controller';

const router = express.Router();

router.use(protect, adminOnly);

router.route('/system-settings')
    .get(getSystemSettings)
    .put(updateSystemSettings);

router.route('/integrations')
    .get(getIntegrations)
    .post(createIntegration);

router.route('/integrations/:id')
    .put(updateIntegration)
    .delete(deleteIntegration);

router.route('/license')
    .get(getLicenseState)
    .put(updateLicenseState);

router.route('/billing')
    .get(getBillingSummary)
    .put(updateBillingSummary);

// Synthetic seed data (dev/testing). Protected by admin auth.
router.post('/seed', seedSyntheticDataHandler);

export default router;
