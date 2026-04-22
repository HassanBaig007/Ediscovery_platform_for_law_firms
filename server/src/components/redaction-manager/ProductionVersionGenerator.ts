// Production Version Generator
// Generates production-ready documents with redactions applied

import { Redaction, ProductionDocument } from '../../../../shared/enhanced-types';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

export interface PrivilegeCategory {
    code: string;
    name: string;
    description: string;
}

export interface ProductionOptions {
    includeRedactionPlaceholders?: boolean;
    placeholderText?: string;
    watermark?: string;
    outputFormat?: 'pdf' | 'tiff';
}

export class ProductionVersionGenerator {
    private readonly outputRoot = path.resolve(__dirname, '../../');

    private defaultOptions: Required<ProductionOptions> = {
        includeRedactionPlaceholders: true,
        placeholderText: '[REDACTED]',
        watermark: '',
        outputFormat: 'pdf'
    };

    private privilegeCategories: PrivilegeCategory[] = [
        { code: 'ACP', name: 'Attorney-Client Privilege', description: 'Communications between attorney and client' },
        { code: 'WP', name: 'Work Product', description: 'Materials prepared in anticipation of litigation' },
        { code: 'CONF', name: 'Confidential', description: 'Confidential business information' },
        { code: 'TRADE', name: 'Trade Secret', description: 'Proprietary trade secrets' }
    ];

    /**
     * Generate production version of a document
     */
    async generateProductionVersion(
        documentId: string,
        originalFilePath: string,
        redactions: Redaction[],
        batesNumber: string,
        generatedBy: string,
        options: ProductionOptions = {}
    ): Promise<ProductionDocument> {
        const opts = { ...this.defaultOptions, ...options };

        // Validate redactions
        this.validateRedactions(redactions);

        // Sort redactions by page and position
        const sortedRedactions = this.sortRedactions(redactions);

        // Generate production file path
        const productionFilePath = this.generateProductionFilePath(documentId, batesNumber, opts.outputFormat);

        const sourceAbsolutePath = this.resolveAbsolutePath(originalFilePath);
        const targetAbsolutePath = this.resolveAbsolutePath(productionFilePath);
        await fs.mkdir(path.dirname(targetAbsolutePath), { recursive: true });

        const sourceBuffer = await fs.readFile(sourceAbsolutePath);
        const sourceExt = path.extname(originalFilePath).toLowerCase();

        if (opts.outputFormat === 'pdf' && sourceExt === '.pdf') {
            const redactedPdf = await this.applyPdfRedactions(sourceBuffer, sortedRedactions, opts.placeholderText);
            await fs.writeFile(targetAbsolutePath, redactedPdf);
        } else if (opts.includeRedactionPlaceholders && this.isTextLikeFile(sourceExt)) {
            let content = sourceBuffer.toString('utf-8');
            for (const redaction of sortedRedactions) {
                content = this.applyRedactionPlaceholder(content, redaction, opts.placeholderText);
            }
            await fs.writeFile(targetAbsolutePath, content, 'utf-8');
        } else {
            await fs.writeFile(targetAbsolutePath, sourceBuffer);
        }

        if (opts.outputFormat === 'pdf') {
            await this.addBatesStamp(targetAbsolutePath, batesNumber);
            if (opts.watermark) {
                await this.addWatermark(targetAbsolutePath, opts.watermark);
            }
        }

        // Create production document
        const productionDoc: ProductionDocument = {
            id: `prod-${randomUUID()}`,
            originalDocumentId: documentId,
            batesNumber,
            isRedacted: redactions.length > 0,
            redactions: sortedRedactions,
            filePath: productionFilePath,
            generatedAt: new Date(),
            generatedBy
        };

        return productionDoc;
    }

    /**
     * Validate redactions before applying
     */
    private validateRedactions(redactions: Redaction[]): void {
        for (const redaction of redactions) {
            if (!redaction.isApproved) {
                throw new Error(`Redaction ${redaction.id} is not approved for production`);
            }

            if (redaction.position.x < 0 || redaction.position.y < 0) {
                throw new Error(`Invalid redaction coordinates for ${redaction.id}`);
            }

            if (redaction.position.width <= 0 || redaction.position.height <= 0) {
                throw new Error(`Invalid redaction dimensions for ${redaction.id}`);
            }
        }
    }

    /**
     * Sort redactions by page and position
     */
    private sortRedactions(redactions: Redaction[]): Redaction[] {
        return [...redactions].sort((a, b) => {
            if (a.page !== b.page) {
                return a.page - b.page;
            }
            if (a.position.y !== b.position.y) {
                return a.position.y - b.position.y;
            }
            return a.position.x - b.position.x;
        });
    }

    /**
     * Generate production file path
     */
    private generateProductionFilePath(
        documentId: string,
        batesNumber: string,
        format: 'pdf' | 'tiff'
    ): string {
        const sanitizedDocumentId = documentId.replace(/[^a-zA-Z0-9-_]/g, '_');
        const sanitizedBates = batesNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
        return `productions/${sanitizedDocumentId}/${sanitizedBates}.${format}`;
    }

    /**
     * Apply redaction placeholder
     */
    applyRedactionPlaceholder(
        content: string,
        redaction: Redaction,
        placeholderText: string
    ): string {
        // For text-based redaction, replace the content at the specified position
        // In a real PDF implementation, this would manipulate PDF coordinates
        // For now, implement text-based redaction by replacing content
        
        if (!content || content.length === 0) {
            return content;
        }

        // Calculate text position based on redaction coordinates
        // This is a simplified approach - real implementation would work with PDF layers
        const startPos = Math.floor((redaction.position.y / 100) * content.length);
        const endPos = Math.min(startPos + Math.floor(redaction.position.width * 10), content.length);
        
        if (startPos >= content.length || startPos < 0) {
            return content;
        }

        // Replace the content with placeholder
        return content.substring(0, startPos) + placeholderText + content.substring(endPos);
    }

    /**
     * Add Bates number stamp to document
     */
    async addBatesStamp(
        documentPath: string,
        batesNumber: string,
        position: 'top-right' | 'bottom-right' | 'bottom-center' = 'bottom-right'
    ): Promise<void> {
        if (path.extname(documentPath).toLowerCase() !== '.pdf') {
            return;
        }

        const absolutePath = this.resolveAbsolutePath(documentPath);
        const pdfBytes = await fs.readFile(absolutePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        for (const page of pdfDoc.getPages()) {
            const width = page.getWidth();
            const height = page.getHeight();
            const fontSize = 10;
            const textWidth = font.widthOfTextAtSize(batesNumber, fontSize);

            let x = width - textWidth - 24;
            let y = 16;

            if (position === 'top-right') {
                y = height - 24;
            } else if (position === 'bottom-center') {
                x = (width - textWidth) / 2;
            }

            page.drawText(batesNumber, {
                x,
                y,
                size: fontSize,
                font,
                color: rgb(0, 0, 0)
            });
        }

        await fs.writeFile(absolutePath, await pdfDoc.save());
    }

    /**
     * Add watermark to document
     */
    async addWatermark(
        documentPath: string,
        watermarkText: string,
        opacity: number = 0.3
    ): Promise<void> {
        if (path.extname(documentPath).toLowerCase() !== '.pdf') {
            return;
        }

        const absolutePath = this.resolveAbsolutePath(documentPath);
        const pdfBytes = await fs.readFile(absolutePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        for (const page of pdfDoc.getPages()) {
            const width = page.getWidth();
            const height = page.getHeight();
            const size = Math.max(28, Math.min(width, height) / 12);
            const textWidth = font.widthOfTextAtSize(watermarkText, size);

            page.drawText(watermarkText, {
                x: (width - textWidth) / 2,
                y: height / 2,
                size,
                font,
                color: rgb(0.5, 0.5, 0.5),
                opacity: Math.max(0.05, Math.min(opacity, 0.9)),
                rotate: degrees(-35)
            });
        }

        await fs.writeFile(absolutePath, await pdfDoc.save());
    }

    /**
     * Validate production version
     */
    validateProductionVersion(productionDoc: ProductionDocument): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (!productionDoc.batesNumber) {
            errors.push('Bates number is required');
        }

        if (!productionDoc.filePath) {
            errors.push('Production file path is required');
        }

        if (productionDoc.isRedacted && productionDoc.redactions.length === 0) {
            errors.push('Document marked as redacted but has no redactions');
        }

        for (const redaction of productionDoc.redactions) {
            if (!redaction.isApproved) {
                errors.push(`Redaction ${redaction.id} is not approved`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get privilege categories
     */
    getPrivilegeCategories(): PrivilegeCategory[] {
        return [...this.privilegeCategories];
    }

    /**
     * Add custom privilege category
     */
    addPrivilegeCategory(category: PrivilegeCategory): void {
        const exists = this.privilegeCategories.some((c: PrivilegeCategory) => c.code === category.code);
        
        if (exists) {
            throw new Error(`Privilege category with code ${category.code} already exists`);
        }

        this.privilegeCategories.push(category);
    }

    private resolveAbsolutePath(filePath: string): string {
        if (path.isAbsolute(filePath)) {
            const normalizedAbsolute = path.normalize(filePath);
            if (!this.isWithinOutputRoot(normalizedAbsolute)) {
                throw new Error('Resolved path is outside of allowed output directory');
            }
            return normalizedAbsolute;
        }

        const normalizedRelative = path.normalize(filePath);
        const resolved = path.resolve(this.outputRoot, normalizedRelative);
        if (!this.isWithinOutputRoot(resolved)) {
            throw new Error('Resolved path is outside of allowed output directory');
        }

        return resolved;
    }

    private isWithinOutputRoot(candidatePath: string): boolean {
        const root = path.resolve(this.outputRoot).toLowerCase();
        const candidate = path.resolve(candidatePath).toLowerCase();
        return candidate === root || candidate.startsWith(`${root}${path.sep}`);
    }

    private isTextLikeFile(extension: string): boolean {
        return ['.txt', '.csv', '.json', '.xml', '.eml', '.msg'].includes(extension);
    }

    private async applyPdfRedactions(
        sourceBuffer: Buffer,
        redactions: Redaction[],
        placeholderText: string
    ): Promise<Uint8Array> {
        const pdfDoc = await PDFDocument.load(sourceBuffer);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();

        for (const redaction of redactions) {
            const page = pages[redaction.page - 1];
            if (!page) {
                continue;
            }

            page.drawRectangle({
                x: redaction.position.x,
                y: redaction.position.y,
                width: redaction.position.width,
                height: redaction.position.height,
                color: rgb(0, 0, 0)
            });

            if (placeholderText) {
                page.drawText(placeholderText, {
                    x: redaction.position.x + 2,
                    y: redaction.position.y + Math.max(2, redaction.position.height / 2 - 5),
                    size: 8,
                    font,
                    color: rgb(1, 1, 1)
                });
            }
        }

        return pdfDoc.save();
    }
}
