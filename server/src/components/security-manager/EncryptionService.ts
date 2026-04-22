// Encryption Service
// Handles data encryption for data at rest and in transit

import * as crypto from 'crypto';

export interface EncryptionConfig {
    algorithm?: string;
    keyLength?: number;
    ivLength?: number;
}

export interface EncryptedData {
    data: string;
    iv: string;
    tag?: string;
}

export class EncryptionService {
    private algorithm: string;
    private keyLength: number;
    private ivLength: number;
    private masterKey: Buffer;

    constructor(config: EncryptionConfig = {}) {
        this.algorithm = config.algorithm || 'aes-256-gcm';
        this.keyLength = config.keyLength || 32;
        this.ivLength = config.ivLength || 16;
        
        // In production, load from secure key management service
        this.masterKey = this.generateKey();
    }

    /**
     * Encrypt data
     */
    encrypt(data: string): EncryptedData {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const result: EncryptedData = {
            data: encrypted,
            iv: iv.toString('hex')
        };

        // Add authentication tag for GCM mode
        if (this.algorithm.includes('gcm')) {
            result.tag = (cipher as any).getAuthTag().toString('hex');
        }

        return result;
    }

    /**
     * Decrypt data
     */
    decrypt(encryptedData: EncryptedData): string {
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);

        // Set authentication tag for GCM mode
        if (this.algorithm.includes('gcm') && encryptedData.tag) {
            (decipher as any).setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
        }

        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Encrypt file buffer
     */
    encryptFile(fileBuffer: Buffer): EncryptedData {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

        const encrypted = Buffer.concat([
            cipher.update(fileBuffer),
            cipher.final()
        ]);

        const result: EncryptedData = {
            data: encrypted.toString('base64'),
            iv: iv.toString('hex')
        };

        if (this.algorithm.includes('gcm')) {
            result.tag = (cipher as any).getAuthTag().toString('hex');
        }

        return result;
    }

    /**
     * Decrypt file buffer
     */
    decryptFile(encryptedData: EncryptedData): Buffer {
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);

        if (this.algorithm.includes('gcm') && encryptedData.tag) {
            (decipher as any).setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
        }

        const encryptedBuffer = Buffer.from(encryptedData.data, 'base64');
        
        return Buffer.concat([
            decipher.update(encryptedBuffer),
            decipher.final()
        ]);
    }

    /**
     * Hash data (one-way)
     */
    hash(data: string, algorithm: string = 'sha256'): string {
        return crypto.createHash(algorithm).update(data).digest('hex');
    }

    /**
     * Generate secure random token
     */
    generateToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Generate encryption key
     */
    private generateKey(): Buffer {
        // In production, use secure key management service (AWS KMS, Azure Key Vault, etc.)
        return crypto.randomBytes(this.keyLength);
    }

    /**
     * Rotate encryption key
     */
    async rotateKey(): Promise<void> {
        // In production, would:
        // 1. Generate new key
        // 2. Re-encrypt all data with new key
        // 3. Store new key securely
        // 4. Invalidate old key
        
        this.masterKey = this.generateKey();
    }

    /**
     * Encrypt sensitive fields in object
     */
    encryptFields(obj: Record<string, any>, fields: string[]): Record<string, any> {
        const encrypted = { ...obj };

        for (const field of fields) {
            if (encrypted[field]) {
                const encryptedData = this.encrypt(String(encrypted[field]));
                encrypted[field] = encryptedData;
            }
        }

        return encrypted;
    }

    /**
     * Decrypt sensitive fields in object
     */
    decryptFields(obj: Record<string, any>, fields: string[]): Record<string, any> {
        const decrypted = { ...obj };

        for (const field of fields) {
            if (decrypted[field] && typeof decrypted[field] === 'object') {
                const encryptedData = decrypted[field] as EncryptedData;
                decrypted[field] = this.decrypt(encryptedData);
            }
        }

        return decrypted;
    }

    /**
     * Verify data integrity
     */
    verifyIntegrity(data: string, expectedHash: string, algorithm: string = 'sha256'): boolean {
        const actualHash = this.hash(data, algorithm);
        return actualHash === expectedHash;
    }

    /**
     * Generate HMAC for data authentication
     */
    generateHMAC(data: string, secret?: string): string {
        const key = secret ? Buffer.from(secret) : this.masterKey;
        return crypto.createHmac('sha256', key).update(data).digest('hex');
    }

    /**
     * Verify HMAC
     */
    verifyHMAC(data: string, hmac: string, secret?: string): boolean {
        const expectedHMAC = this.generateHMAC(data, secret);
        return crypto.timingSafeEqual(
            Buffer.from(hmac),
            Buffer.from(expectedHMAC)
        );
    }
}
