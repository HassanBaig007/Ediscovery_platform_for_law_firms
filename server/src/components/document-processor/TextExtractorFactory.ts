// Text Extractor Factory
// Implements factory pattern for different text extraction strategies

import { ExtractedText } from '../../../../shared/enhanced-types';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { simpleParser } from 'mailparser';
import { OCRService } from './OCRService';

type BinaryFile = {
    name?: string;
    originalname?: string;
    type?: string;
    mimetype?: string;
    buffer?: Buffer;
    arrayBuffer?: () => Promise<ArrayBuffer>;
};

const MsgReaderModule = require('@kenjiuno/msgreader');
const MsgReader = MsgReaderModule.default ?? MsgReaderModule;

export interface TextExtractor {
    extract(file: BinaryFile): Promise<ExtractedText>;
    supports(mimeType: string): boolean;
}

// Base extractor with common functionality
abstract class BaseTextExtractor implements TextExtractor {
    abstract extract(file: BinaryFile): Promise<ExtractedText>;
    
    supports(mimeType: string): boolean {
        return this.getSupportedMimeTypes().includes(mimeType);
    }
    
    protected abstract getSupportedMimeTypes(): string[];
    
    protected async readFileAsBuffer(file: BinaryFile): Promise<Buffer> {
        if (file.buffer && Buffer.isBuffer(file.buffer)) {
            return file.buffer;
        }

        if (typeof file.arrayBuffer === 'function') {
            const arrayBuffer = await file.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }

        throw new Error('Failed to read file as buffer: no supported buffer source');
    }
    
    protected countWords(text: string): number {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    
    protected countCharacters(text: string): number {
        return text.length;
    }
}

// PDF Text Extractor
class PDFTextExtractor extends BaseTextExtractor {
    async extract(file: BinaryFile): Promise<ExtractedText> {
        const buffer = await this.readFileAsBuffer(file);
        
        // Use pdf-parse library for real PDF text extraction
        const pdfData = await pdfParse(buffer);
        
        return {
            content: pdfData.text,
            metadata: {
                pageCount: pdfData.numpages,
                wordCount: this.countWords(pdfData.text),
                characterCount: this.countCharacters(pdfData.text),
                language: 'en'
            }
        };
    }
    
    protected getSupportedMimeTypes(): string[] {
        return ['application/pdf'];
    }
}

// DOCX Text Extractor
class DOCXTextExtractor extends BaseTextExtractor {
    async extract(file: BinaryFile): Promise<ExtractedText> {
        const buffer = await this.readFileAsBuffer(file);
        
        // Use mammoth library for real DOCX text extraction
        const result = await mammoth.extractRawText({ buffer });
        const content = result.value;
        
        return {
            content,
            metadata: {
                pageCount: Math.ceil(content.length / 3000), // Estimate pages
                wordCount: this.countWords(content),
                characterCount: this.countCharacters(content),
                language: 'en'
            }
        };
    }
    
    protected getSupportedMimeTypes(): string[] {
        return ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    }
}

// XLSX Text Extractor
class XLSXTextExtractor extends BaseTextExtractor {
    async extract(file: BinaryFile): Promise<ExtractedText> {
        const buffer = await this.readFileAsBuffer(file);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetTexts = workbook.SheetNames.map((sheetName: string) => {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
            return `Sheet: ${sheetName}\n${csv}`;
        });
        const content = sheetTexts.join('\n\n').trim();
        
        return {
            content,
            metadata: {
                pageCount: 1,
                wordCount: this.countWords(content),
                characterCount: this.countCharacters(content),
                language: 'en'
            }
        };
    }
    
    protected getSupportedMimeTypes(): string[] {
        return ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    }
}

// PPTX Text Extractor
class PPTXTextExtractor extends BaseTextExtractor {
    async extract(file: BinaryFile): Promise<ExtractedText> {
        const buffer = await this.readFileAsBuffer(file);
        const zip = await JSZip.loadAsync(buffer);
        const slidePaths = Object.keys(zip.files)
            .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        const parts: string[] = [];
        for (const slidePath of slidePaths) {
            const xmlContent = await zip.file(slidePath)?.async('string');
            if (!xmlContent) {
                continue;
            }

            const slideText = this.extractTextFromSlideXml(xmlContent);
            if (slideText) {
                parts.push(slideText);
            }
        }

        const content = parts.join('\n\n').trim();
        
        return {
            content,
            metadata: {
                pageCount: 1,
                wordCount: this.countWords(content),
                characterCount: this.countCharacters(content),
                language: 'en'
            }
        };
    }
    
    protected getSupportedMimeTypes(): string[] {
        return ['application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    }

    private extractTextFromSlideXml(xmlContent: string): string {
        const textFragments = Array.from(xmlContent.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g))
            .map((match) => this.decodeXmlEntities(match[1] || ''))
            .map((text) => text.trim())
            .filter((text) => text.length > 0);

        return textFragments.join(' ');
    }

    private decodeXmlEntities(text: string): string {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
    }
}

// Plain Text Extractor
class PlainTextExtractor extends BaseTextExtractor {
    async extract(file: BinaryFile): Promise<ExtractedText> {
        const buffer = await this.readFileAsBuffer(file);
        const content = buffer.toString('utf-8');
        
        return {
            content,
            metadata: {
                pageCount: 1,
                wordCount: this.countWords(content),
                characterCount: this.countCharacters(content),
                language: this.detectLanguage(content)
            }
        };
    }
    
    protected getSupportedMimeTypes(): string[] {
        return ['text/plain'];
    }
    
    private detectLanguage(text: string): string {
        // Simple language detection (in real implementation, use a library)
        return 'en';
    }
}

// Email Text Extractor (EML/MSG)
class EmailTextExtractor extends BaseTextExtractor {
    async extract(file: BinaryFile): Promise<ExtractedText> {
        const buffer = await this.readFileAsBuffer(file);
        const fileName = (file.originalname || file.name || '').toLowerCase();

        let content = '';
        if (fileName.endsWith('.msg')) {
            content = this.parseMsg(buffer);
        } else {
            content = await this.parseEml(buffer);
        }
        
        return {
            content,
            metadata: {
                pageCount: 1,
                wordCount: this.countWords(content),
                characterCount: this.countCharacters(content),
                language: 'en'
            }
        };
    }
    
    protected getSupportedMimeTypes(): string[] {
        return ['message/rfc822', 'application/vnd.ms-outlook'];
    }

    private async parseEml(buffer: Buffer): Promise<string> {
        const parsed = await simpleParser(buffer);
        const toText = Array.isArray(parsed.to)
            ? parsed.to.map((entry) => entry.text || '').filter((entry) => entry.length > 0).join(', ')
            : parsed.to?.text || '';

        const headers = [
            parsed.subject ? `Subject: ${parsed.subject}` : '',
            parsed.from?.text ? `From: ${parsed.from.text}` : '',
            toText ? `To: ${toText}` : '',
            parsed.date ? `Date: ${parsed.date.toISOString()}` : ''
        ].filter((line) => line.length > 0);

        const body = parsed.text || parsed.html || '';
        return `${headers.join('\n')}\n\n${body}`.trim();
    }

    private parseMsg(buffer: Buffer): string {
        const reader = new MsgReader(buffer);
        const data = reader.getFileData();
        const headers = [
            data.subject ? `Subject: ${data.subject}` : '',
            data.senderName || data.senderEmail ? `From: ${[data.senderName, data.senderEmail].filter(Boolean).join(' <')}${data.senderEmail ? '>' : ''}` : '',
            data.recipients && data.recipients.length > 0 ? `To: ${data.recipients.map((r: any) => r.name || r.email || '').filter(Boolean).join(', ')}` : ''
        ].filter((line) => line.length > 0);

        const body = data.body || data.bodyHTML || '';
        return `${headers.join('\n')}\n\n${body}`.trim();
    }
}

// Image Text Extractor (OCR)
class ImageTextExtractor extends BaseTextExtractor {
    private ocrService: OCRService;
    
    constructor() {
        super();
        this.ocrService = new OCRService();
    }
    
    async extract(file: BinaryFile): Promise<ExtractedText> {
        const buffer = await this.readFileAsBuffer(file);
        
        try {
            const ocrResult = await this.ocrService.extractTextFromImage(buffer);
            const content = ocrResult.text;
            const confidence = ocrResult.confidence / 100;
            
            return {
                content,
                metadata: {
                    pageCount: 1,
                    wordCount: this.countWords(content),
                    characterCount: this.countCharacters(content),
                    language: this.detectLanguage(content),
                    ocrConfidence: confidence,
                    processingMethod: 'ocr'
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`OCR processing failed: ${errorMessage}`);
        }
    }
    
    protected getSupportedMimeTypes(): string[] {
        return ['image/jpeg', 'image/png', 'image/tiff', 'image/tif'];
    }
    
    private detectLanguage(text: string): string {
        // Simple language detection
        const englishWords = ['the', 'and', 'of', 'to', 'in', 'is', 'that', 'for'];
        const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'por'];
        
        const textLower = text.toLowerCase();
        const englishCount = englishWords.filter(word => textLower.includes(word)).length;
        const spanishCount = spanishWords.filter(word => textLower.includes(word)).length;
        
        return spanishCount > englishCount ? 'es' : 'en';
    }
}

// Text Extractor Factory
export class TextExtractorFactory {
    private extractors: TextExtractor[];
    
    constructor() {
        this.extractors = [
            new PDFTextExtractor(),
            new DOCXTextExtractor(),
            new XLSXTextExtractor(),
            new PPTXTextExtractor(),
            new PlainTextExtractor(),
            new EmailTextExtractor(),
            new ImageTextExtractor()
        ];
    }
    
    getExtractor(mimeType: string): TextExtractor {
        const extractor = this.extractors.find(ex => ex.supports(mimeType));
        
        if (!extractor) {
            throw new Error(`No text extractor found for MIME type: ${mimeType}`);
        }
        
        return extractor;
    }
    
    getSupportedMimeTypes(): string[] {
        return this.extractors.flatMap(ex => {
            if (ex instanceof BaseTextExtractor) {
                return (ex as any).getSupportedMimeTypes();
            }
            return [];
        });
    }
    
    isSupported(mimeType: string): boolean {
        return this.extractors.some(ex => ex.supports(mimeType));
    }
}

// Export the factory
export default TextExtractorFactory;