// Load File Generator
// Generates standard eDiscovery load files (DAT, OPT, CSV, XML)

import { createHash, randomUUID } from 'crypto';
import { LoadFile, IProductionSet } from '../../../../shared/enhanced-types';
import { IDocument } from '../../../../shared/types';

export interface LoadFileMetadata {
    documentId: string;
    batesNumber: string;
    filename: string;
    fileType: string;
    fileSize: number;
    documentDate?: Date;
    custodianName: string;
    privilegeStatus?: string;
    relevanceStatus?: string;
    tags: string[];
    [key: string]: any; // Allow custom fields
}

export class LoadFileGenerator {
    private readonly datDelimiter = String.fromCharCode(20);
    private readonly datQuote = String.fromCharCode(254);
    private readonly datNewline = String.fromCharCode(174);
    private readonly lineEnding = '\r\n';

    /**
     * Generate DAT load file (Concordance format)
     */
    async generateDATFile(
        productionSetId: string,
        metadata: LoadFileMetadata[]
    ): Promise<LoadFile> {
        const lines: string[] = [];

        // Add header
        const headers = [
            'DOCID',
            'BEGBATES',
            'ENDBATES',
            'FILENAME',
            'DOCTYPE',
            'FILESIZE',
            'DOCDATE',
            'CUSTODIAN',
            'PRIVILEGE',
            'RELEVANCE',
            'TAGS'
        ];
        lines.push(headers.join(this.datDelimiter));

        // Add data rows
        for (const meta of metadata) {
            const row = [
                meta.documentId,
                meta.batesNumber,
                meta.batesNumber, // Single page docs have same begin/end
                meta.filename,
                meta.fileType,
                meta.fileSize.toString(),
                this.formatDateTime(meta.documentDate),
                meta.custodianName,
                meta.privilegeStatus || '',
                meta.relevanceStatus || '',
                meta.tags.join(';')
            ];

            // Escape and quote fields
            const escapedRow = row.map(field => {
                const escaped = this.sanitizeDatField(field)
                    .replace(new RegExp(this.datQuote, 'g'), this.datQuote + this.datQuote)
                    .replace(/\n/g, this.datNewline);
                return `${this.datQuote}${escaped}${this.datQuote}`;
            });

            lines.push(escapedRow.join(this.datDelimiter));
        }

        const content = lines.join(this.lineEnding);
        const filePath = `productions/${productionSetId}/loadfile.dat`;

        const loadFile: LoadFile = {
            id: `loadfile-${randomUUID()}`,
            productionSetId,
            fileType: 'dat',
            filePath,
            recordCount: metadata.length,
            generatedAt: new Date(),
            checksum: this.generateChecksum(content)
        };

        return loadFile;
    }

    /**
     * Generate OPT load file (image pointer file)
     */
    async generateOPTFile(
        productionSetId: string,
        metadata: LoadFileMetadata[]
    ): Promise<LoadFile> {
        const lines: string[] = [];

        for (const meta of metadata) {
            // OPT format: BatesNumber,ImagePath,DocumentBreak,FolderBreak,BoxBreak,PageCount
            const imagePath = `images/${this.sanitizePathSegment(meta.batesNumber)}.tif`;
            const line = `${this.escapeCsv(meta.batesNumber)},${this.escapeCsv(imagePath)},Y,,,1`;
            lines.push(line);
        }

        const content = lines.join(this.lineEnding);
        const filePath = `productions/${productionSetId}/loadfile.opt`;

        const loadFile: LoadFile = {
            id: `loadfile-${randomUUID()}`,
            productionSetId,
            fileType: 'opt',
            filePath,
            recordCount: metadata.length,
            generatedAt: new Date(),
            checksum: this.generateChecksum(content)
        };

        return loadFile;
    }

    /**
     * Generate CSV load file
     */
    async generateCSVFile(
        productionSetId: string,
        metadata: LoadFileMetadata[]
    ): Promise<LoadFile> {
        const lines: string[] = [];

        // Add header
        const headers = [
            'Document ID',
            'Bates Number',
            'Filename',
            'File Type',
            'File Size',
            'Document Date',
            'Custodian',
            'Privilege Status',
            'Relevance Status',
            'Tags'
        ];
        lines.push(headers.map(header => this.escapeCsv(header)).join(','));

        // Add data rows
        for (const meta of metadata) {
            const row = [
                meta.documentId,
                meta.batesNumber,
                meta.filename,
                meta.fileType,
                meta.fileSize.toString(),
                this.formatDateTime(meta.documentDate),
                meta.custodianName,
                meta.privilegeStatus || '',
                meta.relevanceStatus || '',
                meta.tags.join(';')
            ];

            // Escape and quote fields
            const escapedRow = row.map(field => this.escapeCsv(field));

            lines.push(escapedRow.join(','));
        }

        const content = `\uFEFF${lines.join(this.lineEnding)}`;
        const filePath = `productions/${productionSetId}/loadfile.csv`;

        const loadFile: LoadFile = {
            id: `loadfile-${randomUUID()}`,
            productionSetId,
            fileType: 'csv',
            filePath,
            recordCount: metadata.length,
            generatedAt: new Date(),
            checksum: this.generateChecksum(content)
        };

        return loadFile;
    }

    /**
     * Generate XML load file
     */
    async generateXMLFile(
        productionSetId: string,
        metadata: LoadFileMetadata[]
    ): Promise<LoadFile> {
        const xmlParts: string[] = [];
        
        xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
        xmlParts.push('<production>');
        xmlParts.push(`  <productionSetId>${productionSetId}</productionSetId>`);
        xmlParts.push('  <documents>');

        for (const meta of metadata) {
            xmlParts.push('    <document>');
            xmlParts.push(`      <documentId>${this.escapeXml(meta.documentId)}</documentId>`);
            xmlParts.push(`      <batesNumber>${this.escapeXml(meta.batesNumber)}</batesNumber>`);
            xmlParts.push(`      <filename>${this.escapeXml(meta.filename)}</filename>`);
            xmlParts.push(`      <fileType>${this.escapeXml(meta.fileType)}</fileType>`);
            xmlParts.push(`      <fileSize>${meta.fileSize}</fileSize>`);
            
            if (meta.documentDate) {
                xmlParts.push(`      <documentDate>${this.formatDateTime(meta.documentDate)}</documentDate>`);
            }
            
            xmlParts.push(`      <custodian>${this.escapeXml(meta.custodianName)}</custodian>`);
            
            if (meta.privilegeStatus) {
                xmlParts.push(`      <privilegeStatus>${this.escapeXml(meta.privilegeStatus)}</privilegeStatus>`);
            }
            
            if (meta.relevanceStatus) {
                xmlParts.push(`      <relevanceStatus>${this.escapeXml(meta.relevanceStatus)}</relevanceStatus>`);
            }
            
            if (meta.tags.length > 0) {
                xmlParts.push('      <tags>');
                meta.tags.forEach(tag => {
                    xmlParts.push(`        <tag>${this.escapeXml(tag)}</tag>`);
                });
                xmlParts.push('      </tags>');
            }
            
            xmlParts.push('    </document>');
        }

        xmlParts.push('  </documents>');
        xmlParts.push('</production>');

        const content = xmlParts.join(this.lineEnding);
        const filePath = `productions/${productionSetId}/loadfile.xml`;

        const loadFile: LoadFile = {
            id: `loadfile-${randomUUID()}`,
            productionSetId,
            fileType: 'xml',
            filePath,
            recordCount: metadata.length,
            generatedAt: new Date(),
            checksum: this.generateChecksum(content)
        };

        return loadFile;
    }

    /**
     * Generate all load file formats
     */
    async generateAllLoadFiles(
        productionSetId: string,
        metadata: LoadFileMetadata[]
    ): Promise<LoadFile[]> {
        const loadFiles: LoadFile[] = [];

        loadFiles.push(await this.generateDATFile(productionSetId, metadata));
        loadFiles.push(await this.generateOPTFile(productionSetId, metadata));
        loadFiles.push(await this.generateCSVFile(productionSetId, metadata));
        loadFiles.push(await this.generateXMLFile(productionSetId, metadata));

        return loadFiles;
    }

    /**
     * Validate load file metadata
     */
    validateMetadata(metadata: LoadFileMetadata[]): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (metadata.length === 0) {
            errors.push('At least one document is required');
        }

        const batesNumbers = new Set<string>();
        const documentIds = new Set<string>();

        for (let i = 0; i < metadata.length; i++) {
            const meta = metadata[i];

            if (!meta.documentId) {
                errors.push(`Document at index ${i} missing documentId`);
            } else if (documentIds.has(meta.documentId)) {
                errors.push(`Duplicate document ID: ${meta.documentId}`);
            } else {
                documentIds.add(meta.documentId);
            }

            if (!meta.batesNumber) {
                errors.push(`Document ${meta.documentId} missing Bates number`);
            } else if (batesNumbers.has(meta.batesNumber)) {
                errors.push(`Duplicate Bates number: ${meta.batesNumber}`);
            } else {
                batesNumbers.add(meta.batesNumber);
            }

            if (!meta.filename) {
                errors.push(`Document ${meta.documentId} missing filename`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Generate checksum for load file content
     */
    private generateChecksum(content: string): string {
        return createHash('sha256').update(content, 'utf8').digest('hex');
    }

    private formatDateTime(value?: Date): string {
        if (!value) {
            return '';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
    }

    private sanitizeDatField(value: string): string {
        return value
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
    }

    private sanitizePathSegment(value: string): string {
        return value.replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    private escapeCsv(value: string): string {
        const escaped = value
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/"/g, '""');
        return `"${escaped}"`;
    }

    /**
     * Escape XML special characters
     */
    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
