// core/database.js - Simple JSON database
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '../data');
        this.tables = {
            users: 'users.json',
            plugins: 'plugins.json',
            sessions: 'sessions.json',
            settings: 'settings.json',
            logs: 'logs.json'
        };
    }

    async init() {
        // Create data directory
        await fs.mkdir(this.dbPath, { recursive: true });
        
        // Initialize tables with empty arrays
        for (const [table, file] of Object.entries(this.tables)) {
            const filePath = path.join(this.dbPath, file);
            try {
                await fs.access(filePath);
            } catch {
                await fs.writeFile(filePath, JSON.stringify([], null, 2));
            }
        }
        
        console.log('✅ Database initialized (Simple JSON)');
    }

    async get(table, query = {}) {
        const filePath = path.join(this.dbPath, this.tables[table]);
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        if (Object.keys(query).length === 0) {
            return data;
        }
        
        return data.filter(item => {
            return Object.entries(query).every(([key, value]) => {
                return item[key] === value;
            });
        });
    }

    async insert(table, item) {
        const filePath = path.join(this.dbPath, this.tables[table]);
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        // Add metadata
        const newItem = {
            id: crypto.randomBytes(8).toString('hex'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...item
        };
        
        data.push(newItem);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        return newItem;
    }

    async update(table, id, updates) {
        const filePath = path.join(this.dbPath, this.tables[table]);
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        const index = data.findIndex(item => item.id === id);
        if (index === -1) return null;
        
        data[index] = {
            ...data[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return data[index];
    }

    async delete(table, id) {
        const filePath = path.join(this.dbPath, this.tables[table]);
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        const filtered = data.filter(item => item.id !== id);
        await fs.writeFile(filePath, JSON.stringify(filtered, null, 2));
        
        return true;
    }

    // Plugin-specific methods
    async getPluginStatus(pluginId) {
        const plugins = await this.get('plugins', { id: pluginId });
        return plugins.length > 0 ? plugins[0].enabled : true;
    }

    async savePlugin(plugin) {
        const existing = await this.get('plugins', { id: plugin.id });
        
        if (existing.length > 0) {
            return this.update('plugins', existing[0].id, {
                name: plugin.name,
                version: plugin.version,
                enabled: plugin.enabled,
                lastLoaded: new Date().toISOString()
            });
        } else {
            return this.insert('plugins', {
                id: plugin.id,
                name: plugin.name,
                version: plugin.version,
                author: plugin.author,
                enabled: true,
                installedAt: new Date().toISOString(),
                lastLoaded: new Date().toISOString()
            });
        }
    }

    // User authentication
    async createUser(userData) {
        // Hash password
        const hashedPassword = crypto
            .createHash('sha256')
            .update(userData.password + process.env.PEPPER)
            .digest('hex');
        
        const user = await this.insert('users', {
            email: userData.email,
            username: userData.username,
            password: hashedPassword,
            role: 'user',
            verified: false,
            verificationToken: crypto.randomBytes(16).toString('hex'),
            verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });
        
        return { ...user, password: undefined };
    }

    // In core/database.js, update the findUser method:

async findUser(email) {
    try {
        const users = await this.get('users', { email: email.toLowerCase().trim() });
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        console.error('Database findUser error:', error);
        return null;
    }
}

// Add verifyUser method:
async verifyUser(token) {
    try {
        const users = await this.get('users', { verificationToken: token });
        
        if (users.length === 0) {
            return { success: false, error: 'Invalid verification token' };
        }
        
        const user = users[0];
        
        // Check if already verified
        if (user.verified) {
            return { success: true, alreadyVerified: true, user: user };
        }
        
        // Check expiration
        if (user.verificationExpires && new Date(user.verificationExpires) < new Date()) {
            return { success: false, error: 'Verification token has expired' };
        }
        
        // Update user to verified
        await this.update('users', user.id, {
            verified: true,
            verificationToken: null,
            verificationExpires: null,
            verifiedAt: new Date().toISOString()
        });
        
        // Get updated user
        const updatedUsers = await this.get('users', { id: user.id });
        
        return { 
            success: true, 
            user: updatedUsers[0] || user 
        };
        
    } catch (error) {
        console.error('Database verifyUser error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = Database;
