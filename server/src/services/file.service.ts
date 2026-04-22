import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure base upload directory exists (fail-safe)
try {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
} catch (err) {
    console.error('Warning: Could not create base upload directory:', err);
    // Do not throw here to avoid crashing the app at module import time; saveFile will surface errors per-file.
}

export const ensureDirectoryExists = (dirPath: string): void => {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    } catch (err) {
        console.error('Failed to ensure directory exists:', dirPath, err);
        throw err;
    }
};

export const calculateMD5 = (buffer: Buffer): string => {
    return crypto.createHash('md5').update(buffer).digest('hex');
};

interface SavedFile {
    filePath: string;
    fileName: string;
    originalName: string;
    size: number;
    mimeType: string;
}

export const saveFile = async (
    file: Express.Multer.File,
    caseId: string,
    custodianId: string
): Promise<SavedFile> => {
    const timestamp = Date.now();
    // Sanitize filename to prevent issues
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const fileName = `${timestamp}_${sanitizedOriginalName}`;

    // Directory structure: uploads/caseId/custodianId/
    const caseDir = path.join(UPLOAD_DIR, caseId);
    const custodianDir = path.join(caseDir, custodianId);

    ensureDirectoryExists(custodianDir);

    const filePath = path.join(custodianDir, fileName);

    // Write file to disk
    try {
        await fs.promises.writeFile(filePath, file.buffer);
    } catch (err) {
        console.error('Error saving file to disk:', filePath, err);
        throw err;
    }

    // Return relative path for storage in DB, or absolute logic? 
    // Usually relative to project root or upload root is better for portability.
    // Let's store relative to UPLOAD_DIR or just the Relative Path from server root.
    // Storing `uploads/caseId/custodianId/filename` seems good.
    const relativePath = path.join('uploads', caseId, custodianId, fileName);

    return {
        filePath: relativePath,
        fileName,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
    };
};

export const getFileStream = (relativePath: string): fs.ReadStream => {
    const fullPath = path.join(__dirname, '../../', relativePath);
    if (!fs.existsSync(fullPath)) {
        throw new Error('File not found');
    }
    return fs.createReadStream(fullPath);
};

export const deleteFile = async (relativePath: string): Promise<void> => {
    const fullPath = path.join(__dirname, '../../', relativePath);
    if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
    }
};
