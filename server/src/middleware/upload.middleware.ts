import multer from 'multer';
import path from 'node:path';

// Configure storage
// We use memoryStorage to access the buffer for MD5 calculation BEFORE saving to disk.
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = new Set([
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.msg', '.eml', '.txt',
        '.png', '.jpg', '.jpeg', '.gif', '.webp', '.tif', '.tiff', '.bmp'
    ]);
    const extension = path.extname(file.originalname).toLowerCase();
    const extname = allowedExtensions.has(extension);

    // Note: Mime type checking can be tricky for MSG/EML, strict extension check is often safer for these legacy formats.
    // For this implementation, we rely on extension.

    if (extname) {
        cb(null, true);
    } else {
        cb(new Error('Error: File type not allowed! Allowed: PDF, DOC/DOCX, XLS/XLSX, MSG, EML, TXT, PNG/JPG/JPEG/GIF/WEBP/TIF/TIFF/BMP'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: fileFilter
});

export default upload;
