/**
 * Spark Runtime Manager Component
 * Provides UI for managing the bundled Spark runtime environment
 */

import React, { useState, useEffect, useRef } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import './SparkRuntimeManager.css';

const SparkRuntimeManager = () => {
    const [runtimeInfo, setRuntimeInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSetupRunning, setIsSetupRunning] = useState(false);
    const [isInstallRunning, setIsInstallRunning] = useState(false);
    const [setupProgress, setSetupProgress] = useState(0);
    const [logs, setLogs] = useState([]);
    const [showLogs, setShowLogs] = useState(false);
    const logsRef = useRef(null);

    useEffect(() => {
        loadRuntimeInfo();
        setupIPCListeners();

        return () => {
            // Cleanup IPC listeners
            window.electronAPI?.removeAllListeners?.('python-runtime:setup-progress');
            window.electronAPI?.removeAllListeners?.('python-runtime:install-progress');
        };
    }, []);

    useEffect(() => {
        // Auto-scroll logs to bottom
        if (logsRef.current) {
            logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
    }, [logs]);

    const setupIPCListeners = () => {
        // Setup progress listener
        window.electronAPI?.on?.('python-runtime:setup-progress', (data) => {
            addLog(data.data, data.type);
            
            // Estimate progress based on log content
            const content = data.data.toLowerCase();
            if (content.includes('downloading')) {
                setSetupProgress(25);
            } else if (content.includes('extracting')) {
                setSetupProgress(50);
            } else if (content.includes('configuring')) {
                setSetupProgress(75);
            } else if (content.includes('complete')) {
                setSetupProgress(100);
            }
        });

        // Install progress listener
        window.electronAPI?.on?.('python-runtime:install-progress', (data) => {
            addLog(data.data, data.type);
        });
    };

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { 
            id: Date.now() + Math.random(), 
            timestamp, 
            message: message.trim(), 
            type 
        }]);
    };

    const loadRuntimeInfo = async () => {
        setIsLoading(true);
        try {
            const result = await window.electronAPI.invoke('python-runtime:get-info');
            setRuntimeInfo(result);
        } catch (error) {
            console.error('Failed to load runtime info:', error);
            addLog(`Failed to load runtime info: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetupRuntime = async (force = false) => {
        setIsSetupRunning(true);
        setSetupProgress(0);
        setLogs([]);
        setShowLogs(true);
        
        addLog('Starting runtime setup...', 'info');
        
        try {
            const result = await window.electronAPI.invoke('python-runtime:setup', force);
            
            if (result.success) {
                addLog('✅ Runtime setup completed successfully!', 'success');
                setSetupProgress(100);
                await loadRuntimeInfo();
            } else {
                addLog(`❌ Runtime setup failed: ${result.error}`, 'error');
            }
        } catch (error) {
            addLog(`❌ Setup error: ${error.message}`, 'error');
        } finally {
            setIsSetupRunning(false);
        }
    };

    const handleInstallPackages = async (force = false) => {
        setIsInstallRunning(true);
        setLogs([]);
        setShowLogs(true);
        
        addLog('Installing Python packages...', 'info');
        
        try {
            const result = await window.electronAPI.invoke('python-runtime:install-packages', force);
            
            if (result.success) {
                addLog('✅ Python packages installed successfully!', 'success');
                await loadRuntimeInfo();
            } else {
                addLog(`❌ Package installation failed: ${result.error}`, 'error');
            }
        } catch (error) {
            addLog(`❌ Installation error: ${error.message}`, 'error');
        } finally {
            setIsInstallRunning(false);
        }
    };

    const clearLogs = () => {
        setLogs([]);
    };

    const getStatusIcon = (isValid) => {
        return isValid ? '✅' : '❌';
    };

    const getStatusText = (isValid) => {
        return isValid ? 'Ready' : 'Not Available';
    };

    if (isLoading) {
        return (
            <Card>
                <div className="spark-runtime-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading runtime information...</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="spark-runtime-manager">
            <Card>
                <div className="runtime-header">
                    <h2>🚀 Spark Runtime Environment</h2>
                    <Button 
                        variant="outline" 
                        onClick={loadRuntimeInfo}
                        disabled={isSetupRunning || isInstallRunning}
                    >
                        🔄 Refresh
                    </Button>
                </div>

                {runtimeInfo?.success ? (
                    <div className="runtime-info">
                        <div className="runtime-status">
                            <h3>Runtime Status</h3>
                            <div className="status-grid">
                                <div className="status-item">
                                    <span className="status-label">Overall Status:</span>
                                    <span className={`status-value ${runtimeInfo.info.runtimeValid ? 'valid' : 'invalid'}`}>
                                        {getStatusIcon(runtimeInfo.info.runtimeValid)} {getStatusText(runtimeInfo.info.runtimeValid)}
                                    </span>
                                </div>
                                <div className="status-item">
                                    <span className="status-label">Initialized:</span>
                                    <span className={`status-value ${runtimeInfo.info.initialized ? 'valid' : 'invalid'}`}>
                                        {getStatusIcon(runtimeInfo.info.initialized)} {getStatusText(runtimeInfo.info.initialized)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="components-status">
                            <h3>Components</h3>
                            <div className="components-grid">
                                <div className="component-item">
                                    <div className="component-header">
                                        <span className="component-icon">🐍</span>
                                        <span className="component-name">Python</span>
                                        <span className={`component-status ${runtimeInfo.info.pythonHome ? 'valid' : 'invalid'}`}>
                                            {getStatusIcon(runtimeInfo.info.pythonHome)}
                                        </span>
                                    </div>
                                    {runtimeInfo.info.pythonHome && (
                                        <div className="component-path">{runtimeInfo.info.pythonHome}</div>
                                    )}
                                </div>

                                <div className="component-item">
                                    <div className="component-header">
                                        <span className="component-icon">☕</span>
                                        <span className="component-name">Java</span>
                                        <span className={`component-status ${runtimeInfo.info.javaHome ? 'valid' : 'invalid'}`}>
                                            {getStatusIcon(runtimeInfo.info.javaHome)}
                                        </span>
                                    </div>
                                    {runtimeInfo.info.javaHome && (
                                        <div className="component-path">{runtimeInfo.info.javaHome}</div>
                                    )}
                                </div>

                                <div className="component-item">
                                    <div className="component-header">
                                        <span className="component-icon">⚡</span>
                                        <span className="component-name">Spark</span>
                                        <span className={`component-status ${runtimeInfo.info.sparkHome ? 'valid' : 'invalid'}`}>
                                            {getStatusIcon(runtimeInfo.info.sparkHome)}
                                        </span>
                                    </div>
                                    {runtimeInfo.info.sparkHome && (
                                        <div className="component-path">{runtimeInfo.info.sparkHome}</div>
                                    )}
                                </div>

                                <div className="component-item">
                                    <div className="component-header">
                                        <span className="component-icon">🔌</span>
                                        <span className="component-name">JDBC Drivers</span>
                                        <span className={`component-status ${runtimeInfo.info.driversPath ? 'valid' : 'invalid'}`}>
                                            {getStatusIcon(runtimeInfo.info.driversPath)}
                                        </span>
                                    </div>
                                    {runtimeInfo.info.driversPath && (
                                        <div className="component-path">{runtimeInfo.info.driversPath}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {runtimeInfo.info.issues && runtimeInfo.info.issues.length > 0 && (
                            <div className="runtime-issues">
                                <h3>⚠️ Issues Found</h3>
                                <ul className="issues-list">
                                    {runtimeInfo.info.issues.map((issue, index) => (
                                        <li key={index} className="issue-item">{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="runtime-actions">
                            <h3>Actions</h3>
                            <div className="actions-grid">
                                <Button
                                    onClick={() => handleSetupRuntime(false)}
                                    disabled={isSetupRunning || isInstallRunning}
                                    className="action-button"
                                >
                                    {isSetupRunning ? '⏳ Setting Up...' : '📥 Setup Runtime'}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => handleSetupRuntime(true)}
                                    disabled={isSetupRunning || isInstallRunning}
                                    className="action-button"
                                >
                                    🔄 Force Re-setup
                                </Button>

                                <Button
                                    onClick={() => handleInstallPackages(false)}
                                    disabled={isSetupRunning || isInstallRunning || !runtimeInfo.info.pythonHome}
                                    className="action-button"
                                >
                                    {isInstallRunning ? '⏳ Installing...' : '📦 Install Packages'}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => handleInstallPackages(true)}
                                    disabled={isSetupRunning || isInstallRunning || !runtimeInfo.info.pythonHome}
                                    className="action-button"
                                >
                                    🔄 Reinstall Packages
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="runtime-error">
                        <h3>❌ Runtime Not Available</h3>
                        <p>{runtimeInfo?.error || 'Failed to load runtime information'}</p>
                        <Button onClick={() => handleSetupRuntime(false)} disabled={isSetupRunning}>
                            {isSetupRunning ? '⏳ Setting Up...' : '📥 Setup Runtime'}
                        </Button>
                    </div>
                )}

                {isSetupRunning && (
                    <div className="setup-progress">
                        <h3>Setup Progress</h3>
                        <ProgressBar value={setupProgress} max={100} />
                        <p>{setupProgress}% Complete</p>
                    </div>
                )}

                {showLogs && (
                    <div className="runtime-logs">
                        <div className="logs-header">
                            <h3>📋 Runtime Logs</h3>
                            <div className="logs-actions">
                                <Button variant="outline" size="sm" onClick={clearLogs}>
                                    🗑️ Clear
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setShowLogs(false)}>
                                    ➖ Hide
                                </Button>
                            </div>
                        </div>
                        <div className="logs-content" ref={logsRef}>
                            {logs.map((log) => (
                                <div key={log.id} className={`log-entry log-${log.type}`}>
                                    <span className="log-timestamp">{log.timestamp}</span>
                                    <span className="log-message">{log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!showLogs && logs.length > 0 && (
                    <div className="logs-toggle">
                        <Button variant="outline" onClick={() => setShowLogs(true)}>
                            📋 Show Logs ({logs.length})
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default SparkRuntimeManager;
