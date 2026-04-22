// OCR Engine for document processing
// Uses local Tesseract CLI for server-side OCR.

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface OCROptions {
    language?: string;
    psm?: number; // Page segmentation mode
    oem?: number;  // OCR Engine mode
    dpi?: number;  // DPI for image processing
    confidenceThreshold?: number; // Minimum confidence score (0-100)
}

export interface OCRResult {
    text: string;
    confidence: number;
    boundingBoxes: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        text: string;
        confidence: number;
    }>;
    language: string;
    processingTime: number;
    error?: string;
}

export interface OCRTextBlock {
    text: string;
    confidence: number;
    bbox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    pageNum: number;
}

export class OCREngine {
    private isInitialized = false;
    private defaultOptions: OCROptions = {
        language: 'eng',
        psm: 3, // Page segmentation mode: 3 = Fully automatic page segmentation, but no OSD
        oem: 3,   // LSTM + Legacy OCR Engine
        dpi: 300,
        confidenceThreshold: 60
    };

    constructor(private options: OCROptions = {}) {
        this.options = { ...this.defaultOptions, ...options };
    }

    /**
     * Initialize the OCR engine
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            await execFileAsync('tesseract', ['--version']);
            this.isInitialized = true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`OCR Engine initialization failed: ${errorMessage}`);
        }
    }

    /**
     * Extract text from an image buffer
     */
    async extractTextFromImage(
        imageBuffer: Buffer,
        options?: OCROptions
    ): Promise<OCRResult> {
        const startTime = Date.now();
        
        try {
            await this.initialize();
            
            const mergedOptions = { ...this.options, ...options };
            const { text, tsv } = await this.runOcrOnBuffer(imageBuffer, '.png', mergedOptions, true);
            const boundingBoxes = this.parseTesseractTsv(tsv);
            const confidence = this.calculateConfidence(boundingBoxes);

            return {
                text,
                confidence,
                boundingBoxes,
                language: mergedOptions.language || 'eng',
                processingTime: Date.now() - startTime
            };
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`OCR processing failed: ${errorMessage}`);
        }
    }

    /**
     * Extract text from a PDF file
     */
    async extractTextFromPDF(
        pdfBuffer: Buffer,
        options?: OCROptions
    ): Promise<OCRResult[]> {
        const startTime = Date.now();
        
        try {
            await this.initialize();
            const mergedOptions = { ...this.options, ...options };

            const { text, tsv } = await this.runOcrOnBuffer(pdfBuffer, '.pdf', mergedOptions, true);
            const pages = text
                .split('\f')
                .map((page) => page.trim())
                .filter((page) => page.length > 0);

            const boundingBoxes = this.parseTesseractTsv(tsv);
            const confidence = this.calculateConfidence(boundingBoxes);

            return pages.map((pageText) => ({
                text: pageText,
                confidence,
                boundingBoxes,
                language: mergedOptions.language || 'eng',
                processingTime: Date.now() - startTime
            }));
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`PDF OCR failed: ${errorMessage}`);
        }
    }

    /**
     * Extract text from a scanned document image
     */
    async extractTextFromScannedDocument(
        imageBuffer: Buffer,
        options?: OCROptions
    ): Promise<OCRResult> {
        const startTime = Date.now();
        
        try {
            await this.initialize();
            const mergedOptions = { ...this.options, ...options };
            const { text, tsv } = await this.runOcrOnBuffer(imageBuffer, '.tiff', mergedOptions, true);
            const boundingBoxes = this.parseTesseractTsv(tsv);
            const confidence = this.calculateConfidence(boundingBoxes);

            return {
                text,
                confidence,
                boundingBoxes,
                language: mergedOptions.language || 'eng',
                processingTime: Date.now() - startTime
            };
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Scanned document OCR failed: ${errorMessage}`);
        }
    }

    /**
     * Extract text from a multi-page TIFF (common in scanned documents)
     */
    async extractTextFromTIFF(
        tiffBuffer: Buffer,
        options?: OCROptions
    ): Promise<OCRResult[]> {
        const startTime = Date.now();
        
        try {
            await this.initialize();
            const mergedOptions = { ...this.options, ...options };
            const { text, tsv } = await this.runOcrOnBuffer(tiffBuffer, '.tiff', mergedOptions, true);
            const pages = text
                .split('\f')
                .map((page) => page.trim())
                .filter((page) => page.length > 0);

            const boundingBoxes = this.parseTesseractTsv(tsv);
            const confidence = this.calculateConfidence(boundingBoxes);

            return pages.map((pageText) => ({
                text: pageText,
                confidence,
                boundingBoxes,
                language: mergedOptions.language || 'eng',
                processingTime: Date.now() - startTime
            }));
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`TIFF OCR failed: ${errorMessage}`);
        }
    }

    /**
     * Get available languages
     */
    getAvailableLanguages(): string[] {
        return ['eng'];
    }

    /**
     * Get engine information
     */
    getEngineInfo() {
        return {
            name: 'Tesseract CLI OCR Engine',
            version: '1.0.0',
            supportedLanguages: this.getAvailableLanguages(),
            maxImageSize: 10000, // Maximum image dimension
            maxFileSize: 50 * 1024 * 1024, // 50MB
            supportedFormats: ['png', 'jpg', 'jpeg', 'tiff', 'bmp', 'png', 'pdf']
        };
    }

    /**
     * Set language for OCR
     */
    setLanguage(lang: string): void {
        this.options.language = lang;
    }

    /**
     * Set page segmentation mode
     */
    setPageSegmentationMode(psm: number): void {
        this.options.psm = psm;
    }

    /**
     * Set OCR engine mode
     */
    setOCREngineMode(oem: number): void {
        this.options.oem = oem;
    }

    /**
     * Set confidence threshold
     */
    setConfidenceThreshold(threshold: number): void {
        this.options.confidenceThreshold = threshold;
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        if (this.isInitialized) {
            this.isInitialized = false;
        }
    }

    private async runOcrOnBuffer(
        fileBuffer: Buffer,
        extension: string,
        options: OCROptions,
        includeTsv: boolean
    ): Promise<{ text: string; tsv: string }> {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocr-'));
        const inputPath = path.join(tempDir, `input${extension}`);

        try {
            await fs.writeFile(inputPath, fileBuffer);

            const args = [
                inputPath,
                'stdout',
                '-l',
                options.language || 'eng',
                '--psm',
                String(options.psm ?? 3),
                '--oem',
                String(options.oem ?? 3)
            ];

            const textOutput = await execFileAsync('tesseract', args, { maxBuffer: 10 * 1024 * 1024 });
            const text = textOutput.stdout?.toString().trim() || '';

            let tsv = '';
            if (includeTsv) {
                const tsvOutput = await execFileAsync('tesseract', [...args, 'tsv'], { maxBuffer: 10 * 1024 * 1024 });
                tsv = tsvOutput.stdout?.toString() || '';
            }

            return { text, tsv };
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }

    private parseTesseractTsv(tsv: string): OCRResult['boundingBoxes'] {
        if (!tsv.trim()) {
            return [];
        }

        const lines = tsv.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length <= 1) {
            return [];
        }

        const boxes: OCRResult['boundingBoxes'] = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('\t');
            if (cols.length < 12) {
                continue;
            }

            const level = Number(cols[0]);
            const left = Number(cols[6]);
            const top = Number(cols[7]);
            const width = Number(cols[8]);
            const height = Number(cols[9]);
            const confidence = Number(cols[10]);
            const text = cols[11]?.trim() || '';

            if (level !== 5 || !text || Number.isNaN(confidence) || confidence < 0) {
                continue;
            }

            boxes.push({
                x: left,
                y: top,
                width,
                height,
                text,
                confidence
            });
        }

        return boxes;
    }

    private calculateConfidence(boxes: OCRResult['boundingBoxes']): number {
        if (boxes.length === 0) {
            return 0;
        }

        const total = boxes.reduce((sum, box) => sum + box.confidence, 0);
        return Number((total / boxes.length).toFixed(2));
    }
}

// Export a singleton instance
export const ocrEngine = new OCREngine();

// Helper function to create OCR engine with custom options
export function createOCREngine(options?: OCROptions): OCREngine {
    return new OCREngine(options);
}

// Utility function to check if file is an image
export function isImageFile(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(ext);
}

// Utility function to check if file is a PDF
export function isPDF(filename: string): boolean {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return ext === '.pdf';
}

// Utility function to check if file is a TIFF
export function isTIFF(filename: string): boolean {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return ext === '.tiff' || ext === '.tif';
}

// Utility function to get MIME type from filename
export function getMimeType(filename: string): string {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const mimeTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.tiff': 'image/tiff',
        '.tif': 'image/tiff',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
}