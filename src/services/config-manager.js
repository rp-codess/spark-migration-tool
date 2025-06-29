const fs = require('fs')
const path = require('path')
const os = require('os')
const { encrypt, decrypt } = require('./encryption')

class ConfigManager {
  constructor() {
    this.configsPath = path.join(os.homedir(), 'Documents', 'SparkMigrationTool', 'configs.json')
  }

  /**
   * Ensures the config directory exists
   */
  async ensureConfigDirectory() {
    await fs.promises.mkdir(path.dirname(this.configsPath), { recursive: true })
  }

  /**
   * Loads existing configurations from file
   * @returns {Array} Array of configurations
   */
  async loadConfigs() {
    try {
      const data = await fs.promises.readFile(this.configsPath, 'utf8')
      return JSON.parse(data)
    } catch (err) {
      // File doesn't exist, return empty array
      return []
    }
  }

  /**
   * Saves a new configuration
   * @param {Object} config - The configuration to save
   * @returns {Object} Result object with success status
   */
  async saveConfig(config) {
    console.log('Saving config...')
    try {
      await this.ensureConfigDirectory()
      
      // Load existing configs
      const configs = await this.loadConfigs()
      
      // Add new config with unique ID and encrypt password if present
      const newConfig = {
        ...config,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        password: config.password ? encrypt(config.password) : ''
      }
      
      configs.push(newConfig)
      
      // Save back to file
      await fs.promises.writeFile(this.configsPath, JSON.stringify(configs, null, 2), 'utf8')
      
      return { success: true }
    } catch (error) {
      console.error('Error saving config:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * Gets all saved configurations with decrypted passwords
   * @returns {Object} Result object with success status and configs array
   */
  async getSavedConfigs() {
    console.log('Loading saved configs...')
    try {
      const configs = await this.loadConfigs()
      
      // Decrypt passwords for configs that have them
      const decryptedConfigs = configs.map(config => ({
        ...config,
        password: config.password ? decrypt(config.password) : ''
      }))
      
      return { success: true, configs: decryptedConfigs }
    } catch (error) {
      console.error('Error loading configs:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * Deletes a configuration by ID
   * @param {string} configId - The ID of the configuration to delete
   * @returns {Object} Result object with success status
   */
  async deleteConfig(configId) {
    console.log('Deleting config with ID:', configId)
    try {
      // Load existing configs
      let configs = await this.loadConfigs()
      
      if (configs.length === 0) {
        return { success: false, message: 'No configurations found' }
      }
      
      // Remove config with matching ID
      configs = configs.filter(config => config.id !== configId)
      
      // Save back to file
      await fs.promises.writeFile(this.configsPath, JSON.stringify(configs, null, 2), 'utf8')
      
      return { success: true }
    } catch (error) {
      console.error('Error deleting config:', error)
      return { success: false, message: error.message }
    }
  }
}

module.exports = new ConfigManager()
