// Bates Numbering Service
// Manages sequential Bates numbering with format customization

export interface BatesNumberFormat {
    prefix: string;
    startNumber: number;
    digits: number;
    suffix?: string;
}

export interface BatesNumberRange {
    start: string;
    end: string;
    count: number;
}

export class BatesNumberingService {
    private usedNumbers: Set<string> = new Set();
    private documentBatesMap: Map<string, string> = new Map(); // documentId -> batesNumber

    /**
     * Generate Bates numbers for documents
     */
    async applyBatesNumbering(
        documentIds: string[],
        format: BatesNumberFormat
    ): Promise<Map<string, string>> {
        const batesMap = new Map<string, string>();
        let currentNumber = format.startNumber;

        for (const documentId of documentIds) {
            // Check if document already has a Bates number
            if (this.documentBatesMap.has(documentId)) {
                throw new Error(`Document ${documentId} already has Bates number ${this.documentBatesMap.get(documentId)}`);
            }

            // Generate Bates number
            let batesNumber: string;
            let attempts = 0;
            const maxAttempts = 1000;

            do {
                batesNumber = this.formatBatesNumber(currentNumber, format);
                currentNumber++;
                attempts++;

                if (attempts > maxAttempts) {
                    throw new Error('Failed to generate unique Bates number after maximum attempts');
                }
            } while (this.usedNumbers.has(batesNumber));

            // Assign Bates number
            this.usedNumbers.add(batesNumber);
            this.documentBatesMap.set(documentId, batesNumber);
            batesMap.set(documentId, batesNumber);
        }

        return batesMap;
    }

    /**
     * Format a Bates number according to format specification
     */
    private formatBatesNumber(number: number, format: BatesNumberFormat): string {
        const paddedNumber = number.toString().padStart(format.digits, '0');
        return `${format.prefix}${paddedNumber}${format.suffix || ''}`;
    }

    /**
     * Get Bates number for a document
     */
    getBatesNumber(documentId: string): string | undefined {
        return this.documentBatesMap.get(documentId);
    }

    /**
     * Check if Bates number is already used
     */
    isBatesNumberUsed(batesNumber: string): boolean {
        return this.usedNumbers.has(batesNumber);
    }

    /**
     * Validate Bates number format
     */
    validateBatesFormat(format: BatesNumberFormat): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!format.prefix || format.prefix.trim().length === 0) {
            errors.push('Bates prefix is required');
        }

        if (format.startNumber < 0) {
            errors.push('Start number must be non-negative');
        }

        if (format.digits < 1 || format.digits > 20) {
            errors.push('Digits must be between 1 and 20');
        }

        if (format.prefix.length > 20) {
            errors.push('Prefix cannot exceed 20 characters');
        }

        if (format.suffix && format.suffix.length > 20) {
            errors.push('Suffix cannot exceed 20 characters');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get Bates number range for a production set
     */
    getBatesRange(documentIds: string[]): BatesNumberRange | null {
        const batesNumbers = documentIds
            .map(id => this.documentBatesMap.get(id))
            .filter((num): num is string => num !== undefined);

        if (batesNumbers.length === 0) {
            return null;
        }

        // Sort Bates numbers
        const sorted = [...batesNumbers].sort();

        return {
            start: sorted[0],
            end: sorted[sorted.length - 1],
            count: batesNumbers.length
        };
    }

    /**
     * Detect Bates number conflicts
     */
    detectConflicts(proposedNumbers: string[]): string[] {
        return proposedNumbers.filter(num => this.usedNumbers.has(num));
    }

    /**
     * Reserve Bates number range
     */
    async reserveRange(format: BatesNumberFormat, count: number): Promise<BatesNumberRange> {
        const startNumber = format.startNumber;
        const endNumber = startNumber + count - 1;

        const start = this.formatBatesNumber(startNumber, format);
        const end = this.formatBatesNumber(endNumber, format);

        // Check for conflicts
        const proposedNumbers: string[] = [];
        for (let i = startNumber; i <= endNumber; i++) {
            proposedNumbers.push(this.formatBatesNumber(i, format));
        }

        const conflicts = this.detectConflicts(proposedNumbers);
        if (conflicts.length > 0) {
            throw new Error(`Bates number conflicts detected: ${conflicts.join(', ')}`);
        }

        // Reserve numbers
        proposedNumbers.forEach(num => this.usedNumbers.add(num));

        return { start, end, count };
    }

    /**
     * Parse Bates number to extract components
     */
    parseBatesNumber(batesNumber: string, format: BatesNumberFormat): {
        prefix: string;
        number: number;
        suffix: string;
    } | null {
        const prefixLength = format.prefix.length;
        const suffixLength = format.suffix?.length || 0;
        
        if (batesNumber.length < prefixLength + format.digits) {
            return null;
        }

        const prefix = batesNumber.substring(0, prefixLength);
        const numberStr = batesNumber.substring(prefixLength, prefixLength + format.digits);
        const suffix = suffixLength > 0 
            ? batesNumber.substring(prefixLength + format.digits) 
            : '';

        if (prefix !== format.prefix) {
            return null;
        }

        const number = parseInt(numberStr, 10);
        if (isNaN(number)) {
            return null;
        }

        return { prefix, number, suffix };
    }

    /**
     * Get next available Bates number
     */
    getNextBatesNumber(format: BatesNumberFormat): string {
        let currentNumber = format.startNumber;
        let batesNumber: string;

        do {
            batesNumber = this.formatBatesNumber(currentNumber, format);
            currentNumber++;
        } while (this.usedNumbers.has(batesNumber));

        return batesNumber;
    }
}
