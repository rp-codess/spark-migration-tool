const fs = require('fs')
const path = require('path')
const os = require('os')

class FileManager {
  constructor() {
    this.documentsPath = path.join(os.homedir(), 'Documents')
    this.toolDirectory = path.join(this.documentsPath, 'SparkMigrationTool')
  }

  /**
   * Ensures the tool directory exists
   */
  async ensureToolDirectory() {
    await fs.promises.mkdir(this.toolDirectory, { recursive: true })
  }

  /**
   * Saves schema data to a file
   * @param {Object|string} data - The data to save
   * @param {string} filename - The filename (can include folder structure)
   * @returns {Object} Result object with success status and file path
   */
  async saveSchemaToFile(data, filename) {
    console.log('save-schema-to-file called with filename:', filename)
    try {
      await this.ensureToolDirectory()
      
      // Handle folder structure in filename - normalize path separators
      const normalizedFilename = filename.replace(/\//g, path.sep)
      const fullFilePath = path.join(this.toolDirectory, normalizedFilename)
      const fileDirectory = path.dirname(fullFilePath)
      
      console.log('Normalized filename:', normalizedFilename)
      console.log('Full file path:', fullFilePath)
      console.log('File directory:', fileDirectory)
      
      // Always create the directory structure
      console.log('Creating directory structure:', fileDirectory)
      await fs.promises.mkdir(fileDirectory, { recursive: true })
      
      // Determine if data is JSON or plain text (SQL)
      let fileContent
      if (typeof data === 'string') {
        // It's already a string (SQL content)
        fileContent = data
      } else {
        // It's an object (JSON content)
        fileContent = JSON.stringify(data, null, 2)
      }
      
      console.log('Writing file to:', fullFilePath)
      await fs.promises.writeFile(fullFilePath, fileContent, 'utf8')
      console.log('File saved successfully')
      
      // Verify file exists
      const fileExists = await fs.promises.access(fullFilePath).then(() => true).catch(() => false)
      console.log('File exists after write:', fileExists)
      
      return { success: true, filePath: fullFilePath }
    } catch (error) {
      console.error('Error saving file:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * Saves schema data to a specific folder
   * @param {Object} data - The data to save
   * @param {string} folderName - The folder name
   * @param {string} filename - The filename
   * @returns {Object} Result object with success status and file path
   */
  async saveSchemaToFolder(data, folderName, filename) {
    console.log('save-schema-to-folder called with folder:', folderName, 'filename:', filename)
    try {
      await this.ensureToolDirectory()
      
      // Create specific folder for this download
      const schemaFolderPath = path.join(this.toolDirectory, folderName)
      await fs.promises.mkdir(schemaFolderPath, { recursive: true })
      
      const filePath = path.join(schemaFolderPath, filename)
      console.log('Saving file to:', filePath)
      
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
      console.log('File saved successfully')
      
      return { success: true, filePath }
    } catch (error) {
      console.error('Error saving file:', error)
      return { success: false, message: error.message }
    }
  }
}

module.exports = new FileManager()
