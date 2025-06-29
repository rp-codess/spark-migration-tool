/**
 * Spark Table Export Component
 * Uses Spark to connect to database and export table lists as CSV
 * Verifies the complete bundled runtime stack
 */

import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';

// Add CSS for notification animation
const notificationStyles = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = notificationStyles;
    document.head.appendChild(styleSheet);
}

const SparkTableExport = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [tables, setTables] = useState([]);
    const [exportProgress, setExportProgress] = useState(0);
    const [logs, setLogs] = useState([]);
    const [sparkSession, setSparkSession] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');
    const [dbConfig, setDbConfig] = useState(null);
    const [availableConnections, setAvailableConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState('');

    // Load database configurations on component mount
    useEffect(() => {
        loadDatabaseConfigurations();
    }, []);

    const loadDatabaseConfigurations = async () => {
        try {
            // Load saved connections using existing system
            const connectionsResult = await window.electronAPI.invoke('get-saved-configs');
            if (connectionsResult.success && connectionsResult.configs.length > 0) {
                setAvailableConnections(connectionsResult.configs);
                
                // Use the first available connection as default (or look for a specific one)
                const defaultConnection = connectionsResult.configs.find(config => 
                    config.name === 'Salem' || config.database === 'salemseats-prod-clone'
                ) || connectionsResult.configs[0];
                
                if (defaultConnection) {
                    setDbConfig(defaultConnection);
                    setSelectedConnection(defaultConnection.id);
                    addLog(`📋 Loaded connection: ${defaultConnection.name}`, 'info');
                } else {
                    addLog(`⚠️ No saved connections found`, 'warning');
                }
            } else {
                addLog(`⚠️ No saved connections available: ${connectionsResult.message || 'Please create a connection first'}`, 'warning');
            }
        } catch (error) {
            addLog(`❌ Error loading database configurations: ${error.message}`, 'error');
        }
    };

    const handleConnectionChange = async (connectionId) => {
        try {
            const selectedConfig = availableConnections.find(config => config.id === connectionId);
            if (selectedConfig) {
                setDbConfig(selectedConfig);
                setSelectedConnection(connectionId);
                setConnectionStatus(null);
                setTables([]);
                setSparkSession(null);
                addLog(`📋 Switched to connection: ${selectedConfig.name}`, 'info');
            } else {
                addLog(`❌ Connection not found`, 'error');
            }
        } catch (error) {
            addLog(`❌ Error changing connection: ${error.message}`, 'error');
        }
    };

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, {
            id: `${Date.now()}_${Math.random()}`, // Ensure unique keys
            timestamp,
            message,
            type
        }]);
    };

    const connectWithSpark = async () => {
        if (!dbConfig) {
            addLog('❌ No database configuration selected', 'error');
            return;
        }

        setIsConnecting(true);
        setConnectionStatus(null);
        setLogs([]);
        
        addLog('🚀 Starting Spark connection verification...', 'info');
        addLog(`📋 Using connection: ${dbConfig.name} (${dbConfig.type})`, 'info');
        addLog('� Checking Python environment and packages...', 'info');

        try {
            // First, verify all required packages are installed
            const packageCheck = await window.electronAPI.invoke('python-runtime:verify-packages');
            
            if (packageCheck.success) {
                if (!packageCheck.all_installed) {
                    addLog(`⚠️ Missing packages detected: ${packageCheck.missing_packages.join(', ')}`, 'warning');
                    addLog('📦 Installing missing packages automatically...', 'info');
                    
                    const installResult = await window.electronAPI.invoke('python-runtime:install-missing-packages');
                    
                    if (installResult.success) {
                        addLog('✅ All required packages installed successfully!', 'success');
                        if (installResult.installedPackages.length > 0) {
                            installResult.installedPackages.forEach(pkg => {
                                addLog(`  📦 ${pkg}`, 'info');
                            });
                        }
                    } else {
                        addLog(`❌ Package installation failed: ${installResult.error}`, 'error');
                        setConnectionStatus('failed');
                        return;
                    }
                } else {
                    addLog('✅ All required packages are already installed', 'success');
                }
            } else {
                addLog(`❌ Package verification failed: ${packageCheck.error}`, 'error');
                setConnectionStatus('failed');
                return;
            }

            addLog('�📊 Initializing Spark session with SQL Server JDBC driver...', 'info');
            
            const result = await window.electronAPI.invoke('spark:connect-database', dbConfig);
            
            if (result.success) {
                setConnectionStatus('connected');
                setSparkSession(result.sessionId);
                addLog('✅ Spark connection established successfully!', 'success');
                addLog(`📋 Session ID: ${result.sessionId}`, 'info');
                addLog(`⚡ Spark Version: ${result.sparkVersion}`, 'info');
                addLog(`☕ Java Home: ${result.javaHome}`, 'info');
                addLog(`🏠 Spark Home: ${result.sparkHome}`, 'info');
                
                // Get table list through Spark
                await getTablesWithSpark(result.sessionId);
            } else {
                setConnectionStatus('failed');
                addLog(`❌ Connection failed: ${result.error}`, 'error');
            }
        } catch (error) {
            setConnectionStatus('failed');
            addLog(`❌ Connection error: ${error.message}`, 'error');
        } finally {
            setIsConnecting(false);
        }
    };

    const getTablesWithSpark = async (sessionId) => {
        addLog('📋 Fetching table list using Spark SQL...', 'info');
        
        try {
            const result = await window.electronAPI.invoke('spark:get-tables', sessionId, dbConfig);
            
            if (result.success) {
                setTables(result.tables);
                addLog(`✅ Found ${result.tables.length} tables in database`, 'success');
                result.tables.forEach(table => {
                    addLog(`  📄 ${table.schema || 'dbo'}.${table.name} (${table.type || 'TABLE'})`, 'info');
                });
            } else {
                addLog(`❌ Failed to get tables: ${result.error}`, 'error');
            }
        } catch (error) {
            addLog(`❌ Error getting tables: ${error.message}`, 'error');
        }
    };

    const exportTableListToCSV = async () => {
        if (tables.length === 0) {
            addLog('❌ No tables to export', 'error');
            return;
        }

        setIsExporting(true);
        setExportProgress(0);
        
        addLog('📥 Starting CSV export...', 'info');

        try {
            // Prepare CSV data
            const csvData = [
                ['Schema', 'Table Name', 'Table Type', 'Database', 'Connection']
            ];

            tables.forEach(table => {
                csvData.push([
                    table.schema || 'dbo',
                    table.name,
                    table.type || 'TABLE',
                    dbConfig.database,
                    dbConfig.name
                ]);
            });

            setExportProgress(50);

            // Convert to CSV format
            const csvContent = csvData.map(row => 
                row.map(field => `"${field}"`).join(',')
            ).join('\n');

            setExportProgress(75);

            // Save using Spark session for consistency
            const timestamp = new Date().toISOString().slice(0, 10);
            const safeDbName = dbConfig.database.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${safeDbName}_tables_${timestamp}.csv`;
            const result = await window.electronAPI.invoke('spark:export-csv', {
                sessionId: sparkSession,
                filename,
                content: csvContent,
                metadata: {
                    database: dbConfig.database,
                    host: dbConfig.host,
                    tableCount: tables.length,
                    exportedAt: new Date().toISOString()
                }
            });

            setExportProgress(100);

            if (result.success) {
                addLog(`✅ CSV exported successfully: ${result.filePath}`, 'success');
                addLog(`📊 Exported ${tables.length} tables to CSV`, 'success');
                
                // Show success notification
                setNotificationMessage(`✅ Successfully exported ${tables.length} tables to CSV!`);
                setNotificationType('success');
                setShowNotification(true);
                
                // Auto-hide notification after 5 seconds
                setTimeout(() => {
                    setShowNotification(false);
                }, 5000);
            } else {
                addLog(`❌ Export failed: ${result.error}`, 'error');
            }
        } catch (error) {
            addLog(`❌ Export error: ${error.message}`, 'error');
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    const disconnectSpark = async () => {
        if (!sparkSession) return;

        addLog('🔌 Disconnecting Spark session...', 'info');
        
        try {
            await window.electronAPI.invoke('spark:disconnect', sparkSession);
            setSparkSession(null);
            setConnectionStatus(null);
            setTables([]);
            addLog('✅ Spark session disconnected', 'success');
        } catch (error) {
            addLog(`❌ Disconnect error: ${error.message}`, 'error');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'connected': return '#28a745';
            case 'failed': return '#dc3545';
            default: return '#6c757d';
        }
    };

    const getLogIcon = (type) => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Success Notification */}
            {showNotification && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: notificationType === 'success' ? '#28a745' : '#dc3545',
                    color: 'white',
                    padding: '15px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    fontSize: '16px',
                    fontWeight: 'bold',
                    maxWidth: '400px',
                    animation: 'slideInRight 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{notificationMessage}</span>
                        <button 
                            onClick={() => setShowNotification(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                fontSize: '18px',
                                cursor: 'pointer',
                                marginLeft: '10px'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <h1>🚀 Spark Table Export - Runtime Verification</h1>
            <p>Connect to Salem database using Spark and export table list to verify all bundled components.</p>

            {/* Connection Status */}
            <Card title="Connection Status" style={{ marginBottom: '20px' }}>
                {/* Connection Selector */}
                {availableConnections.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>
                            Select Database Connection:
                        </label>
                        <select 
                            value={selectedConnection}
                            onChange={(e) => handleConnectionChange(e.target.value)}
                            disabled={connectionStatus === 'connected'}
                            style={{
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                backgroundColor: '#2a2a2a',
                                color: '#ffffff',
                                minWidth: '200px'
                            }}
                        >
                            <option value="">-- Select Connection --</option>
                            {availableConnections.map(conn => (
                                <option key={conn.id} value={conn.id}>
                                    {conn.name} ({conn.type.toUpperCase()})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {dbConfig && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                        <div>
                            <strong>Database:</strong> {dbConfig.name} ({dbConfig.database})
                        </div>
                        <div>
                            <strong>Host:</strong> {dbConfig.host}:{dbConfig.port}
                        </div>
                        <div>
                            <strong>Type:</strong> {dbConfig.type.toUpperCase()}
                        </div>
                        <div style={{ 
                            color: getStatusColor(connectionStatus),
                            fontWeight: 'bold'
                        }}>
                            Status: {connectionStatus === 'connected' ? '🟢 Connected' : 
                                    connectionStatus === 'failed' ? '🔴 Failed' : '⚪ Not Connected'}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                        onClick={connectWithSpark}
                        disabled={isConnecting || connectionStatus === 'connected' || !dbConfig}
                        loading={isConnecting}
                        variant="primary"
                    >
                        {isConnecting ? 'Connecting with Spark...' : 'Connect with Spark'}
                    </Button>

                    {connectionStatus === 'connected' && (
                        <Button 
                            onClick={disconnectSpark}
                            variant="secondary"
                        >
                            Disconnect
                        </Button>
                    )}
                </div>
            </Card>

            {/* Tables and Export */}
            {tables.length > 0 && dbConfig && (
                <Card title={`📋 Tables Found (${tables.length})`} style={{ marginBottom: '20px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <strong>Database Schema:</strong> {dbConfig.database}
                    </div>
                    
                    <div style={{ 
                        maxHeight: '200px', 
                        overflowY: 'auto', 
                        border: '1px solid #444', 
                        borderRadius: '4px',
                        padding: '10px',
                        marginBottom: '15px',
                        backgroundColor: '#2a2a2a',
                        color: '#ffffff'
                    }}>
                        {tables.map((table, index) => (
                            <div key={index} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                padding: '8px 0',
                                borderBottom: index < tables.length - 1 ? '1px solid #444' : 'none',
                                fontSize: '14px'
                            }}>
                                <span style={{ 
                                    fontWeight: 'bold', 
                                    color: '#ffffff',
                                    fontFamily: 'monospace'
                                }}>
                                    {table.schema || 'dbo'}.{table.name}
                                </span>
                                <span style={{ 
                                    color: '#888',
                                    fontSize: '12px',
                                    fontStyle: 'italic'
                                }}>
                                    {table.type || 'TABLE'}
                                </span>
                            </div>
                        ))}
                    </div>

                    {isExporting && (
                        <ProgressBar 
                            value={exportProgress} 
                            label="Exporting to CSV..."
                            style={{ marginBottom: '15px' }}
                        />
                    )}

                    <Button 
                        onClick={exportTableListToCSV}
                        disabled={isExporting || tables.length === 0}
                        loading={isExporting}
                        variant="success"
                    >
                        📥 Export Tables to CSV
                    </Button>
                </Card>
            )}

            {/* Runtime Verification Logs */}
            <Card title="🔍 Runtime Verification Logs" style={{ marginBottom: '20px' }}>
                <div style={{
                    height: '300px',
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '10px',
                    backgroundColor: '#000',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                }}>
                    {logs.length === 0 ? (
                        <div style={{ color: '#6c757d' }}>Click "Connect with Spark" to start verification...</div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} style={{ marginBottom: '5px' }}>
                                <span style={{ color: '#6c757d' }}>[{log.timestamp}]</span>{' '}
                                <span>{getLogIcon(log.type)}</span>{' '}
                                <span style={{ 
                                    color: log.type === 'error' ? '#ff6b6b' : 
                                           log.type === 'success' ? '#51cf66' :
                                           log.type === 'warning' ? '#ffd43b' : '#fff'
                                }}>
                                    {log.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Component Verification Status */}
            <Card title="🔧 Bundled Runtime Components" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>🐍 Python 3.11.7</div>
                        <div style={{ color: '#28a745' }}>✅ Embedded Distribution</div>
                    </div>
                    <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>☕ OpenJDK 17 JRE</div>
                        <div style={{ color: '#28a745' }}>✅ Java Runtime</div>
                    </div>
                    <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>⚡ Apache Spark 3.5.0</div>
                        <div style={{ color: '#28a745' }}>✅ Distributed Computing</div>
                    </div>
                    <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>🔌 JDBC Drivers</div>
                        <div style={{ color: '#28a745' }}>✅ SQL Server, PostgreSQL, MySQL, Oracle</div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SparkTableExport;
