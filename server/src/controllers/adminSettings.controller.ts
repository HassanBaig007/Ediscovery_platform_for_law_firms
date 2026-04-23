import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import SystemSetting from '../models/SystemSetting';
import Integration from '../models/Integration';
import LicenseState from '../models/LicenseState';
import BillingSummary from '../models/BillingSummary';
import User from '../models/User';
import { logAction } from '../utils/audit.util';

const defaultSettings = {
    maintenanceMode: false,
    strictSessionTimeout: true,
    allowSelfRegistration: false,
    auditRetentionEnabled: true
};

export const getSystemSettings = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        let settings = await SystemSetting.findOne();
        if (!settings) {
            settings = await SystemSetting.create(defaultSettings);
        }
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSystemSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const payload = {
            maintenanceMode: Boolean(req.body.maintenanceMode),
            strictSessionTimeout: Boolean(req.body.strictSessionTimeout),
            allowSelfRegistration: Boolean(req.body.allowSelfRegistration),
            auditRetentionEnabled: Boolean(req.body.auditRetentionEnabled)
        };

        const settings = await SystemSetting.findOneAndUpdate(
            {},
            { $set: payload },
            { upsert: true, new: true }
        );

        await logAction(req.user!._id, 'UPDATE', 'SystemSetting', settings!._id, payload, req.ip);
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getIntegrations = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const integrations = await Integration.find().sort({ createdAt: -1 });
        res.json(integrations);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, provider, endpoint } = req.body;
        const integration = await Integration.create({
            name,
            provider,
            endpoint,
            isEnabled: true,
            status: 'DISCONNECTED'
        });

        await logAction(req.user!._id, 'CREATE', 'Integration', integration._id, { name, provider }, req.ip);
        res.status(201).json(integration);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const integration = await Integration.findById(req.params.id);
        if (!integration) {
            res.status(404).json({ message: 'Integration not found' });
            return;
        }

        integration.name = req.body.name || integration.name;
        integration.provider = req.body.provider || integration.provider;
        integration.endpoint = req.body.endpoint !== undefined ? req.body.endpoint : integration.endpoint;
        if (typeof req.body.isEnabled === 'boolean') {
            integration.isEnabled = req.body.isEnabled;
            integration.status = req.body.isEnabled ? 'CONNECTED' : 'DISCONNECTED';
        }

        await integration.save();
        await logAction(req.user!._id, 'UPDATE', 'Integration', integration._id, req.body, req.ip);
        res.json(integration);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const integration = await Integration.findById(req.params.id);
        if (!integration) {
            res.status(404).json({ message: 'Integration not found' });
            return;
        }

        await integration.deleteOne();
        await logAction(req.user!._id, 'DELETE', 'Integration', integration._id, { name: integration.name }, req.ip);
        res.json({ message: 'Integration deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getLicenseState = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        let license = await LicenseState.findOne();
        if (!license) {
            license = await LicenseState.create({
                planName: 'Enterprise',
                seatsTotal: 50,
                seatsUsed: 0,
                status: 'ACTIVE'
            });
        }

        // Auto-compute seatsUsed from active user count
        const activeUserCount = await User.countDocuments({ isActive: { $ne: false } });
        const licenseObj = license.toJSON();
        licenseObj.seatsUsed = activeUserCount;

        res.json(licenseObj);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateLicenseState = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { planName, seatsTotal, seatsUsed, renewalDate, status } = req.body;
        const payload = {
            ...(planName !== undefined && { planName }),
            ...(seatsTotal !== undefined && { seatsTotal: Number(seatsTotal) }),
            ...(seatsUsed !== undefined && { seatsUsed: Number(seatsUsed) }),
            ...(renewalDate !== undefined && { renewalDate }),
            ...(status !== undefined && { status })
        };

        const license = await LicenseState.findOneAndUpdate({}, { $set: payload }, { upsert: true, new: true });
        await logAction(req.user!._id, 'UPDATE', 'LicenseState', license!._id, payload, req.ip);
        res.json(license);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBillingSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        let billing = await BillingSummary.findOne();
        if (!billing) {
            billing = await BillingSummary.create({
                currentPeriod: 'Monthly',
                monthlyCost: 0,
                outstandingBalance: 0,
                currency: 'USD'
            });
        }
        res.json(billing);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateBillingSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { currentPeriod, monthlyCost, outstandingBalance, currency, nextInvoiceDate } = req.body;
        const payload = {
            ...(currentPeriod !== undefined && { currentPeriod }),
            ...(monthlyCost !== undefined && { monthlyCost: Number(monthlyCost) }),
            ...(outstandingBalance !== undefined && { outstandingBalance: Number(outstandingBalance) }),
            ...(currency !== undefined && { currency }),
            ...(nextInvoiceDate !== undefined && { nextInvoiceDate })
        };

        const billing = await BillingSummary.findOneAndUpdate({}, { $set: payload }, { upsert: true, new: true });
        await logAction(req.user!._id, 'UPDATE', 'BillingSummary', billing!._id, payload, req.ip);
        res.json(billing);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
