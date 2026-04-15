/**
 * AES-256 Encryption Utilities
 * Handles secure encryption/decryption of financial documents
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Generate a secure encryption key from a master key
 */
export function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt data using AES-256-GCM
 * Returns: base64 encoded string containing salt + iv + ciphertext + authTag
 */
export function encryptData(plaintext: string | Buffer, masterKey: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: salt + iv + ciphertext + authTag
  const combined = Buffer.concat([salt, iv, encrypted, authTag]);
  return combined.toString('base64');
}

/**
 * Decrypt AES-256-GCM encrypted data
 */
export function decryptData(encrypted: string, masterKey: string): string {
  const combined = Buffer.from(encrypted, 'base64');

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH, combined.length - AUTH_TAG_LENGTH);
  const authTag = combined.slice(combined.length - AUTH_TAG_LENGTH);

  const key = deriveKey(masterKey, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Generate a hash of encrypted data for verification
 */
export function hashEncryptedData(encrypted: string): string {
  return crypto.createHash('sha256').update(encrypted).digest('hex');
}

/**
 * Mask PII (Personally Identifiable Information)
 */
export function maskPII(value: string, type: 'email' | 'phone' | 'name' | 'id'): string {
  if (!value) return value;

  switch (type) {
    case 'email': {
      const [local, domain] = value.split('@');
      if (!local || !domain) return value;
      const visible = local.substring(0, 2);
      return `${visible}${'*'.repeat(local.length - 2)}@${domain}`;
    }
    case 'phone': {
      return value.replace(/\d(?=\d{4})/g, '*');
    }
    case 'name': {
      const parts = value.split(' ');
      return parts
        .map((part) =>
          part.length > 1 ? part[0] + '*'.repeat(part.length - 1) : part
        )
        .join(' ');
    }
    case 'id': {
      return value.substring(0, 3) + '*'.repeat(value.length - 6) + value.substring(value.length - 3);
    }
    default:
      return value;
  }
}

/**
 * Sanitize financial data before processing
 */
export function sanitizeFinancialData(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  const piiFields = {
    email: ['email', 'email_address', 'contact_email'],
    phone: ['phone', 'phone_number', 'contact_phone'],
    name: ['name', 'full_name', 'employee_name', 'contact_name'],
    id: ['id_number', 'passport', 'ssn', 'tax_id'],
  };

  for (const [key, value] of Object.entries(data)) {
    let shouldMask = false;
    let maskType: 'email' | 'phone' | 'name' | 'id' | null = null;

    for (const [type, fields] of Object.entries(piiFields)) {
      if (fields.some((field) => key.toLowerCase().includes(field))) {
        shouldMask = true;
        maskType = type as 'email' | 'phone' | 'name' | 'id';
        break;
      }
    }

    if (shouldMask && typeof value === 'string' && maskType) {
      sanitized[key] = maskPII(value, maskType);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Verify integrity of encrypted file
 */
export function verifyFileIntegrity(encrypted: string, hash: string): boolean {
  return hashEncryptedData(encrypted) === hash;
}

/**
 * Generate encryption key from environment variable
 */
export function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY is not set. Please configure it in your environment variables.'
    );
  }
  return key;
}
