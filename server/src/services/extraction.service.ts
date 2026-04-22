import pdfParseModule from 'pdf-parse';
// pdf-parse exports differently depending on bundler; normalise to a callable
const pdfParse: (buf: Buffer) => Promise<{ text: string }> =
    typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule as any).default ?? pdfParseModule;
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

/**
 * Extracts text from a file buffer based on its mime type.
 * @param buffer The file buffer
 * @param mimeType The file mime type
 * @returns Extracted text as a string
 */
export const extractTextFromBuffer = async (buffer: Buffer, mimeType: string): Promise<string> => {
    try {
        if (mimeType === 'application/pdf') {
            const data = await pdfParse(buffer);
            return data.text;
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
            mimeType === 'application/msword'
        ) {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } else if (mimeType.startsWith('text/') || mimeType === 'text/plain') {
            return buffer.toString('utf-8');
        } else if (mimeType.startsWith('image/')) {
            const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
            return text;
        } else {
            // Unhandled mime types return an empty string
            return '';
        }
    } catch (error) {
        console.error('Error extracting text from document:', error);
        return '';
    }
};
