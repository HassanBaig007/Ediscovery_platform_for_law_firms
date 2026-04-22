
const CSV_LINE_ENDING = '\r\n';
const UTF8_BOM = '\uFEFF';

const toDateOnly = (value: unknown): string => {
    if (!value) {
        return '';
    }

    const date = new Date(value as string | number | Date);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toISOString().split('T')[0];
};

const normalizeCellValue = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
};

const escapeCsvCell = (value: unknown): string => {
    const normalized = normalizeCellValue(value);
    const escaped = normalized.replace(/"/g, '""');
    return `"${escaped}"`;
};

export const stringifyCSV = (
    headers: string[],
    rows: Array<Array<unknown>>,
    includeBom = true
): string => {
    const lines: string[] = [];
    lines.push(headers.map(escapeCsvCell).join(','));

    for (const row of rows) {
        lines.push(row.map(escapeCsvCell).join(','));
    }

    const content = lines.join(CSV_LINE_ENDING);
    return includeBom ? `${UTF8_BOM}${content}` : content;
};

export const generateCSV = (documents: any[]): string => {
    const headers = [
        'Document ID',
        'Doc Number',
        'Filename',
        'File Type',
        'File Size (Bytes)',
        'Custodian',
        'Document Date',
        'Privilege Status',
        'Relevance Status',
        'Review Notes',
        'Tags'
    ];

    const rows = documents.map(doc => {
        const custodianName = doc.custodianId && typeof doc.custodianId === 'object' && 'name' in doc.custodianId
            ? (doc.custodianId as any).name
            : doc.custodianId || '';

        const tagNames = doc.tags && Array.isArray(doc.tags)
            ? doc.tags
                .map((tag: any) => (typeof tag === 'object' && 'tagName' in tag ? tag.tagName : ''))
                .filter(Boolean)
                .join('; ')
            : '';

        const coding = doc.coding || {};

        return [
            doc.id || doc._id || '',
            doc.docNumber || '',
            doc.filename || '',
            doc.fileType || '',
            doc.fileSize ?? '',
            custodianName,
            toDateOnly(doc.documentDate),
            coding.privilegeStatus || 'NEEDS_REVIEW',
            coding.relevanceStatus || 'NOT_RELEVANT',
            coding.reviewNotes || '',
            tagNames
        ];
    });

    return stringifyCSV(headers, rows, true);
};
