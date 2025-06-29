/**
 * Python Runtime Service
 * Manages execution of Python scripts with bundled runtime
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

class PythonRuntimeService extends EventEmitter {
    constructor() {
        super();
        this.appRoot = path.resolve(__dirname, '../..');
        this.runtimeDir = path.join(this.appRoot, 'bundled-runtime');
        this.pythonScriptsDir = path.join(this.appRoot, 'python', 'scripts');
        this.isInitialized = false;
        this.runtimeInfo = null;
    }

    /**
     * Initialize the Python runtime environment
     */
    async initialize() {
        try {
            console.log('Initializing Python runtime...');
            
            // Check if runtime components exist
            const runtimeExists = await this.checkRuntimeExists();
            if (!runtimeExists) {
                throw new Error('Runtime components not found. Please run setup-runtime.ps1 first.');
            }

            // Load runtime configuration
            await this.loadRuntimeConfig();
            
            // Verify runtime components
            const verification = await this.verifyRuntime();
            if (!verification.success) {
                throw new Error(`Runtime verification failed: ${verification.errors.join(', ')}`);
            }

            this.isInitialized = true;
            console.log('✅ Python runtime initialized successfully');
            
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to initialize Python runtime:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if runtime components exist
     */
    async checkRuntimeExists() {
        try {
            const requiredPaths = [
                path.join(this.runtimeDir, 'python'),
                path.join(this.runtimeDir, 'java'),
                path.join(this.runtimeDir, 'spark'),
                path.join(this.runtimeDir, 'drivers'),
                path.join(this.runtimeDir, 'config', 'runtime.env')
            ];

            for (const reqPath of requiredPaths) {
                try {
                    await fs.access(reqPath);
                } catch (error) {
                    console.log(`Missing required path: ${reqPath}`);
                    return false;
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Load runtime configuration
     */
    async loadRuntimeConfig() {
        const configPath = path.join(this.runtimeDir, 'config', 'runtime.env');
        
        try {
            const configContent = await fs.readFile(configPath, 'utf8');
            const config = {};
            
            configContent.split('\n').forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#') && line.includes('=')) {
                    const [key, value] = line.split('=', 2);
                    config[key] = value;
                }
            });

            this.runtimeInfo = config;
            return config;
        } catch (error) {
            throw new Error(`Failed to load runtime configuration: ${error.message}`);
        }
    }

    /**
     * Verify runtime components
     */
    async verifyRuntime() {
        const errors = [];

        try {
            // Check Python executable
            const pythonExe = this.runtimeInfo.PYTHON_EXE;
            if (!pythonExe) {
                errors.push('Python executable path not configured');
            } else {
                try {
                    await fs.access(pythonExe);
                } catch {
                    errors.push('Python executable not found');
                }
            }

            // Check Java
            const javaHome = this.runtimeInfo.JAVA_HOME;
            if (!javaHome) {
                errors.push('Java home not configured');
            } else {
                try {
                    await fs.access(javaHome);
                } catch {
                    errors.push('Java runtime not found');
                }
            }

            // Check Spark
            const sparkHome = this.runtimeInfo.SPARK_HOME;
            if (!sparkHome) {
                errors.push('Spark home not configured');
            } else {
                try {
                    await fs.access(sparkHome);
                } catch {
                    errors.push('Spark installation not found');
                }
            }

            // Check drivers
            const driversPath = this.runtimeInfo.DRIVERS_PATH;
            if (driversPath) {
                try {
                    const files = await fs.readdir(driversPath);
                    const jarFiles = files.filter(f => f.endsWith('.jar'));
                    if (jarFiles.length === 0) {
                        errors.push('No JDBC drivers found');
                    }
                } catch {
                    errors.push('Drivers directory not accessible');
                }
            }

            return {
                success: errors.length === 0,
                errors
            };

        } catch (error) {
            return {
                success: false,
                errors: [`Verification failed: ${error.message}`]
            };
        }
    }

    /**
     * Execute a Python script
     */
    async executeScript(scriptName, args = [], options = {}) {
        if (!this.isInitialized) {
            const initResult = await this.initialize();
            if (!initResult.success) {
                return { success: false, error: 'Runtime not initialized' };
            }
        }

        const scriptPath = path.join(this.pythonScriptsDir, scriptName);
        
        try {
            // Verify script exists
            await fs.access(scriptPath);
        } catch (error) {
            return { success: false, error: `Script not found: ${scriptName}` };
        }

        return new Promise((resolve) => {
            const pythonExe = this.runtimeInfo.PYTHON_EXE;
            const cmd = [pythonExe, scriptPath, ...args];
            
            console.log(`Executing: ${cmd.join(' ')}`);

            const env = {
                ...process.env,
                ...this.runtimeInfo,
                PYTHONPATH: path.join(this.runtimeDir, 'python'),
                PATH: `${path.dirname(pythonExe)};${process.env.PATH}`
            };

            const child = spawn(cmd[0], cmd.slice(1), {
                env,
                cwd: options.cwd || this.pythonScriptsDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                
                // Emit real-time output for progress tracking
                this.emit('output', { type: 'stdout', data: output });
                
                if (options.onOutput) {
                    options.onOutput({ type: 'stdout', data: output });
                }
            });

            child.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                
                this.emit('output', { type: 'stderr', data: output });
                
                if (options.onOutput) {
                    options.onOutput({ type: 'stderr', data: output });
                }
            });

            child.on('close', (code) => {
                const result = {
                    success: code === 0,
                    exitCode: code,
                    stdout,
                    stderr
                };

                if (code !== 0) {
                    result.error = `Script exited with code ${code}`;
                }

                resolve(result);
            });

            child.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    stdout,
                    stderr
                });
            });

            // Handle timeout
            if (options.timeout) {
                setTimeout(() => {
                    child.kill('SIGTERM');
                    resolve({
                        success: false,
                        error: 'Script execution timed out',
                        stdout,
                        stderr
                    });
                }, options.timeout);
            }
        });
    }

    /**
     * Run schema comparison
     */
    async runSchemaComparison(configData) {
        try {
            // Create temporary config file
            const configPath = path.join(this.pythonScriptsDir, `schema_config_${Date.now()}.json`);
            await fs.writeFile(configPath, JSON.stringify(configData, null, 2));

            const result = await this.executeScript('schema_comparison.py', [configPath], {
                timeout: 300000 // 5 minutes
            });

            // Clean up config file
            try {
                await fs.unlink(configPath);
            } catch (error) {
                console.warn('Failed to clean up config file:', error.message);
            }

            return result;

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Run data migration
     */
    async runDataMigration(configData, onProgress) {
        try {
            // Create temporary config file
            const configPath = path.join(this.pythonScriptsDir, `migration_config_${Date.now()}.json`);
            await fs.writeFile(configPath, JSON.stringify(configData, null, 2));

            const result = await this.executeScript('data_migration.py', [configPath], {
                timeout: 3600000, // 1 hour
                onOutput: onProgress
            });

            // Clean up config file
            try {
                await fs.unlink(configPath);
            } catch (error) {
                console.warn('Failed to clean up config file:', error.message);
            }

            return result;

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get runtime information
     */
    async getRuntimeInfo() {
        if (!this.isInitialized) {
            const initResult = await this.initialize();
            if (!initResult.success) {
                return { success: false, error: 'Runtime not initialized' };
            }
        }

        const verification = await this.verifyRuntime();
        
        return {
            success: true,
            info: {
                initialized: this.isInitialized,
                runtimeValid: verification.success,
                pythonHome: this.runtimeInfo?.PYTHON_HOME,
                javaHome: this.runtimeInfo?.JAVA_HOME,
                sparkHome: this.runtimeInfo?.SPARK_HOME,
                driversPath: this.runtimeInfo?.DRIVERS_PATH,
                issues: verification.errors
            }
        };
    }

    /**
     * Setup runtime components (run PowerShell scripts)
     */
    async setupRuntime(force = false) {
        return new Promise((resolve) => {
            const scriptPath = path.join(this.runtimeDir, 'scripts', 'setup-runtime.ps1');
            const args = force ? ['-Force'] : [];
            
            const cmd = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}" ${args.join(' ')}`;
            
            console.log('Running runtime setup...');
            
            const child = exec(cmd, {
                cwd: this.runtimeDir,
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            let output = '';

            child.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                this.emit('setup-output', { type: 'stdout', data: text });
            });

            child.stderr.on('data', (data) => {
                const text = data.toString();
                output += text;
                this.emit('setup-output', { type: 'stderr', data: text });
            });

            child.on('close', (code) => {
                resolve({
                    success: code === 0,
                    exitCode: code,
                    output,
                    error: code !== 0 ? `Setup failed with exit code ${code}` : null
                });
            });

            child.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    output
                });
            });
        });
    }

    /**
     * Install Python packages
     */
    async installPythonPackages(force = false) {
        return new Promise((resolve) => {
            const scriptPath = path.join(this.runtimeDir, 'scripts', 'install-python-packages.ps1');
            const args = force ? ['-Force'] : [];
            
            const cmd = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}" ${args.join(' ')}`;
            
            console.log('Installing Python packages...');
            
            const child = exec(cmd, {
                cwd: this.runtimeDir,
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            let output = '';

            child.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                this.emit('install-output', { type: 'stdout', data: text });
            });

            child.stderr.on('data', (data) => {
                const text = data.toString();
                output += text;
                this.emit('install-output', { type: 'stderr', data: text });
            });

            child.on('close', (code) => {
                resolve({
                    success: code === 0,
                    exitCode: code,
                    output,
                    error: code !== 0 ? `Package installation failed with exit code ${code}` : null
                });
            });

            child.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    output
                });
            });
        });
    }
}

module.exports = PythonRuntimeService;
