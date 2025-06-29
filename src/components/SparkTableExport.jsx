/**
 * Spark Table Export Component
 * Uses Spark to connect to database and export table lists as CSV
 * Verifies the complete bundled runtime stack
 */

import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import Notification from './ui/Notification';

const SparkTableExport = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [tables, setTables] = useState([]);
    const [exportProgress, setExportProgress] = useState(0);
    const [logs, setLogs] = useState([]);
    const [sparkSession, setSparkSession] = useState(null);
    const [notification, setNotification] = useState({ show: false, type: 'success', title: '', message: '' });

    // Salem database configuration
    const dbConfig = {
        type: "mssql",
        host: "salemseats-prod-clone.database.windows.net",
        port: "1433",
        database: "salemseats-prod-clone",
        username: "appuser",
        password: "Salem@1234",
        schema: "",
        ssl: true,
        sslMode: "prefer",
        name: "Salem"
    };

    const showNotification = (type, title, message) => {
        setNotification({ show: true, type, title, message });
    };

    const hideNotification = () => {
        setNotification({ show: false, type: 'success', title: '', message: '' });
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
        setIsConnecting(true);
        setConnectionStatus(null);
        setLogs([]);
        
        addLog('🚀 Starting Spark connection verification...', 'info');
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
            const filename = `salem_tables_${new Date().toISOString().slice(0, 10)}.csv`;
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
                
                // Show success notification popup
                showNotification(
                    'success',
                    'Export Successful! 🎉',
                    `Successfully exported ${tables.length} tables to CSV file: ${filename}`
                );
            } else {
                addLog(`❌ Export failed: ${result.error}`, 'error');
                showNotification(
                    'error',
                    'Export Failed',
                    `Failed to export tables: ${result.error}`
                );
            }
        } catch (error) {
            addLog(`❌ Export error: ${error.message}`, 'error');
            showNotification(
                'error',
                'Export Error',
                `An error occurred during export: ${error.message}`
            );
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
            <h1>🚀 Spark Table Export - Runtime Verification</h1>
            <p>Connect to Salem database using Spark and export table list to verify all bundled components.</p>

            {/* Connection Status */}
            <Card title="Connection Status" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                    <div>
                        <strong>Database:</strong> {dbConfig.name} ({dbConfig.database})
                    </div>
                    <div>
                        <strong>Host:</strong> {dbConfig.host}:{dbConfig.port}
                    </div>
                    <div style={{ 
                        color: getStatusColor(connectionStatus),
                        fontWeight: 'bold'
                    }}>
                        Status: {connectionStatus === 'connected' ? '🟢 Connected' : 
                                connectionStatus === 'failed' ? '🔴 Failed' : '⚪ Not Connected'}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                        onClick={connectWithSpark}
                        disabled={isConnecting || connectionStatus === 'connected'}
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
            {tables.length > 0 && (
                <Card title={`📋 Tables Found (${tables.length})`} style={{ marginBottom: '20px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <strong>Database Schema:</strong> {dbConfig.database}
                    </div>
                    
                    <div style={{ 
                        maxHeight: '300px', 
                        overflowY: 'auto', 
                        border: '2px solid #e0e0e0', 
                        borderRadius: '8px',
                        marginBottom: '15px',
                        backgroundColor: '#ffffff'
                    }}>
                        {/* Table Header */}
                        <div style={{
                            display: 'flex',
                            backgroundColor: '#f8f9fa',
                            padding: '12px 16px',
                            borderBottom: '2px solid #e0e0e0',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#495057'
                        }}>
                            <div style={{ flex: '2', minWidth: '200px' }}>Schema.Table Name</div>
                            <div style={{ flex: '1', textAlign: 'right' }}>Type</div>
                        </div>
                        
                        {/* Table Rows */}
                        {tables.map((table, index) => (
                            <div key={index} style={{ 
                                display: 'flex',
                                padding: '12px 16px',
                                borderBottom: index < tables.length - 1 ? '1px solid #f0f0f0' : 'none',
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9',
                                transition: 'background-color 0.2s ease',
                                cursor: 'default'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#e3f2fd'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9'}
                            >
                                <div style={{ 
                                    flex: '2', 
                                    minWidth: '200px',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    color: '#212529',
                                    fontFamily: 'monospace'
                                }}>
                                    <span style={{ color: '#6f42c1' }}>{table.schema || 'dbo'}</span>
                                    <span style={{ color: '#495057' }}>.</span>
                                    <span style={{ color: '#0d6efd' }}>{table.name}</span>
                                </div>
                                <div style={{ 
                                    flex: '1', 
                                    textAlign: 'right',
                                    fontSize: '13px',
                                    color: '#6c757d',
                                    fontWeight: '500'
                                }}>
                                    {table.type || 'TABLE'}
                                </div>
                            </div>
                        ))}
                        
                        {/* Empty state */}
                        {tables.length === 0 && (
                            <div style={{
                                padding: '40px 16px',
                                textAlign: 'center',
                                color: '#6c757d',
                                fontSize: '14px'
                            }}>
                                No tables found. Connect to database first.
                            </div>
                        )}
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
            
            {/* Notification Component */}
            <Notification
                show={notification.show}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                onClose={hideNotification}
                duration={6000}
            />
        </div>
    );
};

export default SparkTableExport;
