/**
 * Encryption Utilities for API Key Management
 *
 * Provides AES-256-GCM encryption/decryption for securely storing user API keys
 * in the database. Uses the ENCRYPTION_KEY environment variable.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES block size
const TAG_LENGTH = 16; // GCM authentication tag length

/**
 * Get the encryption key from environment variables
 * The key should be a 32-byte (64 character) hex string
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte (64 character) hex string');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt an API key for secure storage
 *
 * @param plaintext - The API key to encrypt
 * @returns Object containing encrypted key, IV, and authentication tag (all as hex strings)
 */
export function encryptApiKey(plaintext: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt an encrypted API key
 *
 * @param encrypted - The encrypted key (hex string)
 * @param iv - The initialization vector (hex string)
 * @param tag - The authentication tag (hex string)
 * @returns The decrypted API key
 */
export function decryptApiKey(encrypted: string, iv: string, tag: string): string {
  try {
    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getEncryptionKey(),
      Buffer.from(iv, 'hex')
    );

    // Set the authentication tag
    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Mask an API key for display purposes
 * Shows only the first 8 and last 4 characters
 *
 * @param apiKey - The API key to mask
 * @returns Masked version of the key (e.g., "sk-ant-...xyz123")
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length < 12) {
    return '***';
  }

  const prefix = apiKey.substring(0, 8);
  const suffix = apiKey.substring(apiKey.length - 4);

  return `${prefix}...${suffix}`;
}

/**
 * Validate API key format for different providers
 *
 * @param provider - The API provider ('anthropic', 'openai', or 'canlii')
 * @param apiKey - The API key to validate
 * @returns True if the format is valid
 */
export function validateApiKeyFormat(provider: 'anthropic' | 'openai' | 'canlii', apiKey: string): boolean {
  const patterns = {
    anthropic: /^sk-ant-[a-zA-Z0-9_-]{95,}$/,
    openai: /^sk-[a-zA-Z0-9]{32,}$/,
    canlii: /^[a-zA-Z0-9_-]{20,}$/, // CanLII API keys are typically alphanumeric
  };

  const pattern = patterns[provider];
  return pattern.test(apiKey);
}

/**
 * Encrypt an OAuth token for secure storage
 * Returns a single combined string with format: iv:tag:encrypted
 *
 * @param plaintext - The token to encrypt
 * @returns Combined encrypted string
 */
export function encryptToken(plaintext: string): string {
  const { encrypted, iv, tag } = encryptApiKey(plaintext);
  return `${iv}:${tag}:${encrypted}`;
}

/**
 * Decrypt an encrypted OAuth token
 *
 * @param combined - The combined encrypted string (iv:tag:encrypted)
 * @returns The decrypted token
 */
export function decryptToken(combined: string): string {
  const [iv, tag, encrypted] = combined.split(':');
  return decryptApiKey(encrypted, iv, tag);
}

/**
 * Generate a secure encryption key (for setup purposes)
 * Run this once and save the output to your .env file
 *
 * Usage: node -e "console.log(require('./lib/encryption').generateEncryptionKey())"
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
