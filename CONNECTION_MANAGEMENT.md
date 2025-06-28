# Spark Migration Tool - Connection Management

## New Features Added

### 🔐 Saved Connections
The application now supports saving and managing database connection configurations for quick access.

#### Features:
- **Save Current Connection**: Save any configured connection with a custom name
- **Password Security**: Optional encrypted password storage with user consent
- **Quick Load**: One-click loading of saved connections
- **Visual Indicators**: Clear indicators showing whether passwords are saved
- **Secure Storage**: Connections are stored locally in `Documents/SparkMigrationTool/configs.json`

#### Security Features:
- **Encryption**: Passwords are encrypted using AES-256-CBC encryption
- **Local Storage**: All data is stored locally on your machine
- **User Choice**: Users can choose whether to save passwords or not
- **Visual Warnings**: Clear security notices about password storage

#### How to Use:
1. **Save a Connection**:
   - Configure your database connection
   - Click "Save Current" in the Saved Connections section
   - Enter a name for the connection
   - Choose whether to save the password (optional)
   - Click "Save"

2. **Load a Connection**:
   - Find your saved connection in the list
   - Click "Load" to populate the connection form
   - If password wasn't saved, you'll need to enter it manually

3. **Delete a Connection**:
   - Click "Delete" next to any saved connection
   - Confirm the deletion in the dialog

#### UI Improvements:
- **Responsive Layout**: Better spacing and alignment
- **Tooltips**: Helpful tooltips on buttons and actions
- **Visual Feedback**: Success and error messages
- **Better Contrast**: Improved readability and accessibility

#### Running the Application:
```bash
# Start both Vite dev server and Electron app
yarn electron-dev

# Or start them separately
yarn dev        # Start Vite dev server
yarn electron   # Start Electron app (after dev server is running)
```

#### File Storage Location:
- **Windows**: `C:\Users\[YourUsername]\Documents\SparkMigrationTool\configs.json`
- **macOS**: `~/Documents/SparkMigrationTool/configs.json`
- **Linux**: `~/Documents/SparkMigrationTool/configs.json`

#### Security Notes:
- Passwords are encrypted using AES-256-CBC with a unique IV for each password
- The encryption key is derived from a application-specific string
- Only save passwords on trusted devices
- You can always choose not to save passwords and enter them manually each time

#### Example Connection Storage:
```json
{
  "id": "1640995200000",
  "name": "Production SQL Server",
  "type": "mssql",
  "host": "myserver.database.windows.net",
  "port": "1433",
  "database": "mydb",
  "username": "myuser",
  "password": "encrypted_password_here",
  "ssl": true,
  "createdAt": "2024-06-28T19:33:20.000Z"
}
```
