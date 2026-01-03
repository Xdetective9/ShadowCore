// core/config.js - Configuration Manager
const fs = require('fs').promises;
const path = require('path');

class Config {
    constructor() {
        this.configPath = path.join(__dirname, '../config');
        this.defaultConfig = {
            app: {
                name: 'ShadowCore',
                version: '3.0.0',
                port: 3000,
                env: 'production',
                url: 'http://localhost:3000'
            },
            security: {
                sessionSecret: 'change-this-in-production',
                pepper: 'another-random-string',
                rateLimit: {
                    windowMs: 15 * 60 * 1000,
                    max: 100
                }
            },
            email: {
                provider: 'resend',
                from: 'ShadowCore <noreply@shadowcore.app>',
                resendApiKey: ''
            },
            plugins: {
                autoLoad: true,
                hotReload: true,
                installDeps: true
            },
            themes: {
                default: 'dark',
                available: ['dark', 'light', 'midnight', 'ocean', 'sunset', 'forest']
            },
            uploads: {
                maxSize: 50 * 1024 * 1024,
                allowedTypes: ['image/*', 'application/*', 'text/*'],
                tempDir: './temp'
            }
        };
        
        this.currentConfig = { ...this.defaultConfig };
    }

    async init() {
        // Create config directory
        await fs.mkdir(this.configPath, { recursive: true });
        
        // Load config from file if exists
        await this.loadFromFile();
        
        // Override with environment variables
        this.loadFromEnv();
        
        console.log('⚙️  Configuration loaded');
    }

    async loadFromFile() {
        const configFile = path.join(this.configPath, 'config.json');
        
        try {
            const data = await fs.readFile(configFile, 'utf8');
            const fileConfig = JSON.parse(data);
            
            // Deep merge with defaults
            this.mergeConfig(this.currentConfig, fileConfig);
            
            console.log('📄 Loaded configuration from file');
        } catch (err) {
            // Config file doesn't exist, create it
            await this.saveToFile();
        }
    }

    async saveToFile() {
        const configFile = path.join(this.configPath, 'config.json');
        
        try {
            await fs.writeFile(configFile, JSON.stringify(this.currentConfig, null, 2));
            console.log('💾 Configuration saved to file');
        } catch (err) {
            console.error('Failed to save config file:', err);
        }
    }

    loadFromEnv() {
        // App config
        if (process.env.APP_NAME) this.currentConfig.app.name = process.env.APP_NAME;
        if (process.env.PORT) this.currentConfig.app.port = parseInt(process.env.PORT);
        if (process.env.NODE_ENV) this.currentConfig.app.env = process.env.NODE_ENV;
        if (process.env.APP_URL) this.currentConfig.app.url = process.env.APP_URL;
        
        // Security
        if (process.env.SESSION_SECRET) this.currentConfig.security.sessionSecret = process.env.SESSION_SECRET;
        if (process.env.PEPPER) this.currentConfig.security.pepper = process.env.PEPPER;
        
        // Email
        if (process.env.RESEND_API_KEY) this.currentConfig.email.resendApiKey = process.env.RESEND_API_KEY;
        if (process.env.EMAIL_FROM) this.currentConfig.email.from = process.env.EMAIL_FROM;
        
        // Plugin configs
        if (process.env.REMOVEBG_API_KEY) {
            if (!this.currentConfig.plugins.config) this.currentConfig.plugins.config = {};
            this.currentConfig.plugins.config.removebg = {
                apiKey: process.env.REMOVEBG_API_KEY
            };
        }
    }

    mergeConfig(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                this.mergeConfig(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    // Get config value
    get(key, defaultValue = null) {
        const keys = key.split('.');
        let value = this.currentConfig;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value !== undefined ? value : defaultValue;
    }

    // Set config value
    set(key, value) {
        const keys = key.split('.');
        let config = this.currentConfig;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!config[k] || typeof config[k] !== 'object') {
                config[k] = {};
            }
            config = config[k];
        }
        
        config[keys[keys.length - 1]] = value;
        
        // Auto-save to file
        this.saveToFile().catch(console.error);
    }

    // Get all config
    getAll() {
        return { ...this.currentConfig };
    }

    // Reset to defaults
    async reset() {
        this.currentConfig = { ...this.defaultConfig };
        await this.saveToFile();
        console.log('🔄 Configuration reset to defaults');
    }

    // Get plugin-specific config
    getPluginConfig(pluginId) {
        const pluginConfig = this.get(`plugins.config.${pluginId}`);
        return pluginConfig || {};
    }

    // Set plugin-specific config
    setPluginConfig(pluginId, config) {
        const key = `plugins.config.${pluginId}`;
        this.set(key, { ...this.getPluginConfig(pluginId), ...config });
    }

    // Check if required config exists
    validate() {
        const errors = [];
        
        // Check required security settings
        if (this.currentConfig.security.sessionSecret === 'change-this-in-production') {
            errors.push('SESSION_SECRET must be changed from default value');
        }
        
        // Check email config if using email features
        if (this.currentConfig.email.resendApiKey === '') {
            errors.push('RESEND_API_KEY is required for email features');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // Export to environment variables format
    toEnv() {
        const lines = [];
        
        // App config
        lines.push(`APP_NAME=${this.currentConfig.app.name}`);
        lines.push(`PORT=${this.currentConfig.app.port}`);
        lines.push(`NODE_ENV=${this.currentConfig.app.env}`);
        lines.push(`APP_URL=${this.currentConfig.app.url}`);
        
        // Security
        lines.push(`SESSION_SECRET=${this.currentConfig.security.sessionSecret}`);
        lines.push(`PEPPER=${this.currentConfig.security.pepper}`);
        
        // Email
        lines.push(`RESEND_API_KEY=${this.currentConfig.email.resendApiKey}`);
        lines.push(`EMAIL_FROM=${this.currentConfig.email.from}`);
        
        // Plugin configs
        if (this.currentConfig.plugins.config) {
            Object.entries(this.currentConfig.plugins.config).forEach(([plugin, config]) => {
                Object.entries(config).forEach(([key, value]) => {
                    lines.push(`${plugin.toUpperCase()}_${key.toUpperCase()}=${value}`);
                });
            });
        }
        
        return lines.join('\n');
    }
}

module.exports = Config;
