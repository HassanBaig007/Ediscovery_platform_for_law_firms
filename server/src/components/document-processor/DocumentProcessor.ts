// Document Processor Component
// Implements the DocumentProcessor interface for advanced document processing
// Uses factory pattern for different text extraction strategies

import { DocumentProcessor as IDocumentProcessor, ProcessedDocument, ExtractedText, DocumentClassification } from '../../../../shared/enhanced-types';
import { ProcessingError } from '../../../../shared/enhanced-types';
import { TextExtractorFactory, TextExtractor } from './TextExtractorFactory';

export class DocumentProcessor implements IDocumentProcessor {
    private extractorFactory: TextExtractorFactory;
    private supportedFormats: Set<string>;

    constructor() {
        this.extractorFactory = new TextExtractorFactory();
        this.supportedFormats = new Set(this.extractorFactory.getSupportedMimeTypes());
    }

    async processDocument(file: File): Promise<ProcessedDocument> {
        try {
            // 1. Detect file format
            const fileType = this.detectFileType(file);
            
            // 2. Validate file type
            if (!this.isSupportedFormat(fileType)) {
                throw new Error(`Unsupported file format: ${fileType}. Supported formats: ${Array.from(this.supportedFormats).join(', ')}`);
            }

            // 3. Extract text using appropriate extractor
            const extractedText = await this.extractTextFromFile(file, fileType);
            
            // 4. Classify document
            const classification = await this.classifyDocument(extractedText);
            
            // 5. Create processed document
            const processedDocument: ProcessedDocument = {
                id: this.generateId(),
                originalFilename: file.name,
                fileType: fileType,
                extractedText: extractedText.content,
                metadata: {
                    ...extractedText.metadata,
                    customFields: {
                        documentType: classification.documentType,
                        language: classification.language,
                        hasPII: classification.hasPII,
                        piiTypes: classification.piiTypes,
                        confidence: classification.confidence
                    }
                },
                processingStatus: 'completed' as const,
                error: undefined
            };

            return processedDocument;
            
        } catch (error) {
            console.error('Document processing failed:', error);
            
            const errorDoc: ProcessedDocument = {
                id: this.generateId(),
                originalFilename: file.name,
                fileType: this.detectFileType(file),
                extractedText: '',
                metadata: {
                    customFields: {}
                },
                processingStatus: 'failed',
                error: this.formatErrorMessage(error)
            };
            
            return errorDoc;
        }
    }

    async extractText(document: any): Promise<ExtractedText> {
        try {
            // For this method, we assume document has file information
            const fileType = this.detectFileTypeFromDocument(document);
            
            if (!this.isSupportedFormat(fileType)) {
                throw new Error(`Unsupported file format: ${fileType}`);
            }

            // Create a mock File object from document data
            const mockFile = this.createMockFile(document);
            return await this.extractTextFromFile(mockFile, fileType);
            
        } catch (error) {
            console.error('Text extraction failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Text extraction failed: ${errorMessage}`);
        }
    }

    async classifyDocument(document: any): Promise<DocumentClassification> {
        const content = document.content || '';
        const fileType = document.fileType || '';
        
        return {
            documentType: this.determineDocumentType(content, fileType),
            language: this.detectLanguage(content),
            hasPII: this.detectPII(content),
            piiTypes: this.detectPIIFields(content),
            confidence: this.calculateConfidence(content)
        };
    }

    private detectFileType(file: File): string {
        // Use file.type if available, otherwise detect from extension
        if (file.type && file.type !== 'application/octet-stream') {
            return file.type;
        }
        
        // Fall back to extension-based detection
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const mimeTypes: { [key: string]: string } = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'eml': 'message/rfc822',
            'msg': 'message/rfc822',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'tiff': 'image/tiff',
            'tif': 'image/tiff'
        };
        
        return mimeTypes[extension] || 'application/octet-stream';
    }

    private isSupportedFormat(mimeType: string): boolean {
        return this.supportedFormats.has(mimeType);
    }

    private async extractTextFromFile(file: File, mimeType: string): Promise<ExtractedText> {
        const extractor = this.extractorFactory.getExtractor(mimeType);
        return await extractor.extract(file);
    }

    private determineDocumentType(content: string, fileType: string): string {
        // Determine document type based on content and file type
        if (fileType === 'message/rfc822') {
            return 'email';
        }
        
        if (content.includes('@') && (content.includes('Subject:') || content.includes('From:'))) {
            return 'email';
        }
        
        if (content.includes('§') || content.includes('Article') || content.includes('WHEREAS')) {
            return 'legal';
        }
        
        if (content.includes('$') || content.includes('USD') || content.includes('balance') || content.includes('invoice')) {
            return 'financial';
        }
        
        if (content.includes('resume') || content.includes('CV') || content.includes('experience')) {
            return 'resume';
        }
        
        if (content.includes('contract') || content.includes('agreement') || content.includes('terms')) {
            return 'contract';
        }
        
        return 'general';
    }

    private detectLanguage(text: string): string {
        // Simple language detection based on common words
        const englishWords = ['the', 'and', 'of', 'to', 'in', 'is', 'that', 'for', 'it', 'with'];
        const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'por', 'con', 'no'];
        
        const textLower = text.toLowerCase();
        const englishCount = englishWords.filter(word => textLower.includes(word)).length;
        const spanishCount = spanishWords.filter(word => textLower.includes(word)).length;
        
        if (spanishCount > englishCount) {
            return 'es';
        }
        
        return 'en'; // Default to English
    }

    private detectPII(text: string): boolean {
        const patterns = [
            // SSN patterns
            /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/,
            // Email patterns
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
            // Phone patterns
            /(\+\d{1,2}\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
            // Credit card patterns (simplified)
            /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
            // Date of birth patterns
            /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-]\d{4}\b/,
            // Address patterns (simple)
            /\b\d+\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)\b/i
        ];
        
        return patterns.some(pattern => pattern.test(text));
    }

    private detectPIIFields(text: string): string[] {
        const piiFields: string[] = [];
        
        if (/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/.test(text)) {
            piiFields.push('SSN');
        }
        
        if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) {
            piiFields.push('Email');
        }
        
        if (/(\+\d{1,2}\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) {
            piiFields.push('Phone');
        }
        
        if (/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/.test(text)) {
            piiFields.push('CreditCard');
        }
        
        if (/\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-]\d{4}\b/.test(text)) {
            piiFields.push('DateOfBirth');
        }
        
        if (/\b\d+\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)\b/i.test(text)) {
            piiFields.push('Address');
        }
        
        return piiFields;
    }

    private calculateConfidence(content: string): number {
        // Simple confidence calculation based on content length and structure
        if (!content || content.trim().length === 0) {
            return 0.0;
        }
        
        const wordCount = content.split(/\s+/).length;
        const hasStructure = content.includes('\n') || content.includes('. ') || content.includes(', ');
        
        let confidence = 0.5; // Base confidence
        
        if (wordCount > 10) confidence += 0.2;
        if (wordCount > 50) confidence += 0.1;
        if (wordCount > 100) confidence += 0.1;
        if (hasStructure) confidence += 0.1;
        
        return Math.min(confidence, 0.95);
    }

    private generateId(): string {
        return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private formatErrorMessage(error: any): string {
        if (error instanceof Error) {
            return `Document processing failed: ${error.message}. Please try again or contact support if the issue persists.`;
        }
        return 'Document processing failed due to an unknown error. Please try again.';
    }

    private detectFileTypeFromDocument(doc: any): string {
        if (doc.fileType) {
            return doc.fileType;
        }
        
        if (doc.filename) {
            return this.detectFileType({ name: doc.filename, type: '' } as File);
        }
        
        return 'application/octet-stream';
    }

    private createMockFile(document: any): File {
        // Create a mock File object for extraction
        const blob = new Blob([document.content || ''], { type: document.fileType || 'text/plain' });
        return new File([blob], document.filename || 'document.txt', { type: document.fileType || 'text/plain' });
    }

    // Public method to get supported formats
    getSupportedFormats(): string[] {
        return Array.from(this.supportedFormats);
    }

    // Public method to check if format is supported
    canProcess(mimeType: string): boolean {
        return this.isSupportedFormat(mimeType);
    }
}

// Export the processor
export default DocumentProcessor;