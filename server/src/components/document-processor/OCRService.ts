// OCR Service for document processing
// This service wraps OCR functionality for text extraction from images and PDFs

import { createOCREngine, OCROptions, OCRResult } from './OCREngine';

export class OCRService {
    private ocrEngine: any;
    private isInitialized = false;
    private totalProcessed = 0;
    private totalProcessingTimeMs = 0;
    private languagesUsed = new Set<string>();

    constructor(options: OCROptions = {}) {
        this.ocrEngine = createOCREngine(options);
    }

    /**
     * Initialize the OCR service
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            await this.ocrEngine.initialize();
            this.isInitialized = true;
            console.log('OCR Service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize OCR service:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`OCR initialization failed: ${errorMessage}`);
        }
    }

    /**
     * Extract text from an image buffer
     */
    async extractTextFromImage(
        imageBuffer: Buffer,
        options?: OCROptions
    ): Promise<OCRResult> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const result = await this.ocrEngine.extractTextFromImage(imageBuffer, options);
            this.recordAccuracy(result);
            return result;
        } catch (error) {
            console.error('OCR text extraction failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`OCR text extraction failed: ${errorMessage}`);
        }
    }

    /**
     * Extract text from a PDF document
     */
    async extractTextFromPDF(
        pdfBuffer: Buffer,
        options?: OCROptions
    ): Promise<OCRResult[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const results = await this.ocrEngine.extractTextFromPDF(pdfBuffer, options);
            // Record accuracy for each page
            results.forEach((result: OCRResult) => this.recordAccuracy(result));
            return results;
        } catch (error) {
            console.error('PDF OCR processing failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`PDF OCR processing failed: ${errorMessage}`);
        }
    }

    /**
     * Extract text from a scanned document image
     */
    async extractTextFromScannedDocument(
        imageBuffer: Buffer,
        options?: OCROptions
    ): Promise<OCRResult> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const result = await this.ocrEngine.extractTextFromScannedDocument(
                imageBuffer,
                options
            );
            this.recordAccuracy(result);
            return result;
        } catch (error) {
            console.error('Scanned document OCR failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Scanned document OCR failed: ${errorMessage}`);
        }
    }

    /**
     * Extract text from a multi-page TIFF document
     */
    async extractTextFromTIFF(
        tiffBuffer: Buffer,
        options?: OCROptions
    ): Promise<OCRResult[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const results = await this.ocrEngine.extractTextFromTIFF(tiffBuffer, options);
            // Record accuracy for each page
            results.forEach((result: OCRResult) => this.recordAccuracy(result));
            return results;
        } catch (error) {
            console.error('TIFF OCR processing failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`TIFF OCR processing failed: ${errorMessage}`);
        }
    }

    /**
     * Get available OCR languages
     */
    getAvailableLanguages(): string[] {
        return this.ocrEngine.getAvailableLanguages();
    }

    /**
     * Get OCR engine information
     */
    getEngineInfo() {
        return this.ocrEngine.getEngineInfo();
    }

    /**
     * Set OCR language
     */
    setLanguage(language: string): void {
        this.ocrEngine.setLanguage(language);
    }

    /**
     * Set page segmentation mode
     */
    setPageSegmentationMode(psm: number): void {
        this.ocrEngine.setPageSegmentationMode(psm);
    }

    /**
     * Set OCR engine mode
     */
    setOCREngineMode(oem: number): void {
        this.ocrEngine.setOCREngineMode(oem);
    }

    /**
     * Set confidence threshold
     */
    setConfidenceThreshold(threshold: number): void {
        this.ocrEngine.setConfidenceThreshold(threshold);
    }

    /**
     * Clean up OCR resources
     */
    async cleanup(): Promise<void> {
        if (this.isInitialized) {
            await this.ocrEngine.cleanup();
            this.isInitialized = false;
        }
    }

    private accuracyHistory: Array<{
        characterAccuracy: number;
        wordAccuracy: number;
        confidence: number;
        timestamp: Date;
    }> = [];

    /**
     * Record OCR accuracy for tracking
     */
    private recordAccuracy(result: OCRResult): void {
        this.totalProcessed += 1;
        this.totalProcessingTimeMs += result.processingTime;
        this.languagesUsed.add(result.language);

        this.accuracyHistory.push({
            characterAccuracy: result.confidence / 100,
            wordAccuracy: result.confidence / 100 * 0.97, // Estimate word accuracy slightly lower
            confidence: result.confidence / 100,
            timestamp: new Date()
        });

        // Keep only last 100 records
        if (this.accuracyHistory.length > 100) {
            this.accuracyHistory.shift();
        }
    }

    /**
     * Get OCR accuracy metrics
     */
    getAccuracyMetrics(): {
        characterAccuracy: number;
        wordAccuracy: number;
        confidence: number;
    } {
        // Calculate average from recorded accuracy history
        if (this.accuracyHistory.length === 0) {
            return {
                characterAccuracy: 0,
                wordAccuracy: 0,
                confidence: 0
            };
        }

        const sum = this.accuracyHistory.reduce((acc, record) => ({
            characterAccuracy: acc.characterAccuracy + record.characterAccuracy,
            wordAccuracy: acc.wordAccuracy + record.wordAccuracy,
            confidence: acc.confidence + record.confidence
        }), { characterAccuracy: 0, wordAccuracy: 0, confidence: 0 });

        const count = this.accuracyHistory.length;

        return {
            characterAccuracy: sum.characterAccuracy / count,
            wordAccuracy: sum.wordAccuracy / count,
            confidence: sum.confidence / count
        };
    }

    /**
     * Validate if OCR processing is likely to succeed for a given file
     */
    validateFileForOCR(filename: string, fileSize: number): {
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    } {
        const issues: string[] = [];
        const recommendations: string[] = [];
        
        // Check file size
        const maxFileSize = 50 * 1024 * 1024; // 50MB
        if (fileSize > maxFileSize) {
            issues.push(`File size (${(fileSize / (1024 * 1024)).toFixed(2)}MB) exceeds maximum of 50MB`);
            recommendations.push('Compress the file or split it into smaller files');
        }
        
        // Check file type
        const supportedFormats = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.pdf'];
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        
        if (!supportedFormats.includes(ext.toLowerCase())) {
            issues.push(`Unsupported file format: ${ext}. Supported formats: ${supportedFormats.join(', ')}`);
        }
        
        // Check for common issues
        if (filename.toLowerCase().endsWith('.pdf')) {
            recommendations.push('PDF files may require additional processing time');
        }
        
        return {
            isValid: issues.length === 0,
            issues,
            recommendations
        };
    }

    /**
     * Get OCR processing statistics
     */
    getProcessingStats(): {
        totalProcessed: number;
        averageConfidence: number;
        averageProcessingTime: number;
        languagesUsed: string[];
    } {
        const metrics = this.getAccuracyMetrics();
        return {
            totalProcessed: this.totalProcessed,
            averageConfidence: metrics.confidence,
            averageProcessingTime: this.totalProcessed > 0
                ? this.totalProcessingTimeMs / this.totalProcessed / 1000
                : 0,
            languagesUsed: Array.from(this.languagesUsed)
        };
    }
}

// Export a singleton instance
export const ocrService = new OCRService();

// Export types for external use
export type { OCRResult, OCROptions } from './OCREngine';