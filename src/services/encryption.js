const crypto = require('crypto')

const ENCRYPTION_KEY = crypto.createHash('sha256').update('spark-migration-tool-secret-key-2024').digest()
const algorithm = 'aes-256-cbc'

/**
 * Encrypts a text string using AES-256-CBC encryption
 * @param {string} text - The text to encrypt
 * @returns {string} Encrypted text in format: iv:encryptedData
 */
function encrypt(text) {
  if (!text) return ''
  try {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    return text // Return original text if encryption fails
  }
}

/**
 * Decrypts a text string that was encrypted with the encrypt function
 * @param {string} text - The encrypted text in format: iv:encryptedData
 * @returns {string} Decrypted text
 */
function decrypt(text) {
  if (!text) return ''
  try {
    const textParts = text.split(':')
    if (textParts.length < 2) return text // Return as-is if not encrypted format
    
    const iv = Buffer.from(textParts.shift(), 'hex')
    const encryptedText = textParts.join(':')
    const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    return text // Return original text if decryption fails
  }
}

module.exports = {
  encrypt,
  decrypt
}
