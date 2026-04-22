import { Response } from 'express';
import Custodian from '../models/Custodian';
import Case from '../models/Case';
import Document from '../models/Document';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Get all custodians for a case
// @route   GET /api/cases/:caseId/custodians
// @access  Private
export const getCustodians = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseId } = req.params as { caseId: string };
        const custodians = await Custodian.find({ caseId: caseId as any }).sort({ createdAt: -1 });
        res.json(custodians);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};

// @desc    Create a new custodian
// @route   POST /api/cases/:caseId/custodians
// @access  Private (Lead/Paralegal)
export const createCustodian = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseId } = req.params as { caseId: string };
        const { name, email, department, title } = req.body;

        const caseExists = await Case.findById(caseId);
        if (!caseExists) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        // Check if custodian with same email exists in this case
        const existingCustodian = await Custodian.findOne({ caseId: caseId as any, email });
        if (existingCustodian) {
            res.status(400).json({ message: 'Custodian with this email already exists in this case' });
            return;
        }

        const custodian = await Custodian.create({
            caseId: caseId as any,
            name,
            email,
            department,
            title
        });

        res.status(201).json(custodian);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};

// @desc    Update custodian
// @route   PUT /api/custodians/:id
// @access  Private (Lead/Paralegal)
export const updateCustodian = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };
        const { name, email, department, title } = req.body;

        const custodian = await Custodian.findById(id);
        if (!custodian) {
            res.status(404).json({ message: 'Custodian not found' });
            return;
        }

        // Check if updating email conflicts with another custodian in same case
        if (email && email !== custodian.email) {
            const existingconflicting = await Custodian.findOne({ caseId: custodian.caseId as any, email });
            if (existingconflicting) {
                res.status(400).json({ message: 'Email already in use by another custodian in this case' });
                return;
            }
        }

        custodian.name = name || custodian.name;
        custodian.email = email || custodian.email;
        custodian.department = department || custodian.department;
        custodian.title = title || custodian.title;

        const updatedCustodian = await custodian.save();
        res.json(updatedCustodian);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};

// @desc    Delete custodian
// @route   DELETE /api/custodians/:id
// @access  Private (Lead only?) - Let's say Paralegal can too if no docs
export const deleteCustodian = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };

        const custodian = await Custodian.findById(id);
        if (!custodian) {
            res.status(404).json({ message: 'Custodian not found' });
            return;
        }

        // Check if documents are assigned to this custodian
        const docsCount = await Document.countDocuments({ custodianId: id as any });
        if (docsCount > 0) {
            res.status(400).json({ message: `Cannot delete custodian. ${docsCount} documents are assigned to them. Reassign documents first.` });
            return;
        }

        await custodian.deleteOne();
        res.json({ message: 'Custodian removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};

// @desc    Import custodians from CSV
// @route   POST /api/cases/:caseId/custodians/import
// @access  Private (Lead/Paralegal/Partner/Admin via case middleware)
export const importCustodians = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseId } = req.params as { caseId: string };
        const file = req.file as Express.Multer.File | undefined;

        if (!file) {
            res.status(400).json({ message: 'CSV file is required' });
            return;
        }

        const caseExists = await Case.findById(caseId);
        if (!caseExists) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        const rows = file.buffer.toString('utf-8').split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (rows.length < 2) {
            res.status(400).json({ message: 'CSV must include a header row and at least one data row' });
            return;
        }

        const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());
        const nameIndex = headers.indexOf('name');
        const emailIndex = headers.indexOf('email');
        const departmentIndex = headers.indexOf('department');
        const titleIndex = headers.indexOf('title');

        if (nameIndex === -1 || emailIndex === -1) {
            res.status(400).json({ message: 'CSV must contain name and email columns' });
            return;
        }

        let created = 0;
        const skipped: string[] = [];

        for (let i = 1; i < rows.length; i += 1) {
            const columns = rows[i].split(',').map((value) => value.trim());
            const name = columns[nameIndex];
            const email = columns[emailIndex];

            if (!name || !email) {
                skipped.push(`Row ${i + 1}: missing name/email`);
                continue;
            }

            const existing = await Custodian.findOne({ caseId: caseId as any, email });
            if (existing) {
                skipped.push(`Row ${i + 1}: duplicate email ${email}`);
                continue;
            }

            await Custodian.create({
                caseId: caseId as any,
                name,
                email,
                department: departmentIndex >= 0 ? (columns[departmentIndex] || undefined) : undefined,
                title: titleIndex >= 0 ? (columns[titleIndex] || undefined) : undefined
            });
            created += 1;
        }

        res.status(201).json({
            success: true,
            created,
            skippedCount: skipped.length,
            skipped
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};
