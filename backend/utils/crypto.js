const crypto = require('crypto');

// Use a secure key from environment or a fallback for development
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '696c6f766567616d696e69616e74696772617669747931323334353637383930'; // 32 chars / 256 bits
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt text using AES-256-CBC
 * @param {string} text 
 * @returns {string} iv:encryptedData
 */
function encrypt(text) {
    if (!text) return null;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (err) {
        console.error('Encryption failed:', err);
        return null;
    }
}

/**
 * Decrypt text using AES-256-CBC
 * @param {string} text iv:encryptedData
 * @returns {string} decryptedText
 */
function decrypt(text) {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (err) {
        console.error('Decryption failed:', err);
        return null;
    }
}

module.exports = { encrypt, decrypt };
