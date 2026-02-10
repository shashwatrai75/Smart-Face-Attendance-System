const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Derive key from secret (in production, use a proper key management system)
const getKey = () => {
  const secret = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32-chars!!';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypt face embedding array (128 floats) to Buffer
 */
const encryptEmbedding = (embeddingArray) => {
  if (!Array.isArray(embeddingArray) || embeddingArray.length !== 128) {
    throw new Error('Embedding must be an array of 128 floats');
  }

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Convert float array to Buffer (4 bytes per float = 512 bytes)
  const embeddingBuffer = Buffer.from(new Float32Array(embeddingArray).buffer);

  const encrypted = Buffer.concat([
    cipher.update(embeddingBuffer),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Return: IV (16) + Tag (16) + Encrypted Data (512) = 544 bytes
  return Buffer.concat([iv, tag, encrypted]);
};

/**
 * Decrypt Buffer to face embedding array (128 floats)
 */
const decryptEmbedding = (encryptedBuffer) => {
  if (!Buffer.isBuffer(encryptedBuffer)) {
    throw new Error('Encrypted data must be a Buffer');
  }

  const key = getKey();
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const tag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  // Convert Buffer back to Float32Array, then to regular array
  const floatArray = new Float32Array(decrypted.buffer);
  return Array.from(floatArray);
};

module.exports = {
  encryptEmbedding,
  decryptEmbedding,
};

