const { Pool } = require('pg');
const chalk = require('chalk');

class Database {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
            idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
            connectionTimeoutMillis: 5000,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        this.pool.on('connect', () => {
            console.log(chalk.green('📊 Database connected'));
        });

        this.pool.on('error', (err) => {
            console.error(chalk.red('❌ Database error:'), err);
        });
    }

    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            if (process.env.NODE_ENV === 'development') {
                console.log(chalk.cyan(`📝 Query executed in ${duration}ms`));
            }
            
            return result;
        } catch (error) {
            console.error(chalk.red('❌ Query error:'), error);
            throw error;
        }
    }

    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

const db = new Database();

async function initDatabase() {
    try {
        // Create tables
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                avatar VARCHAR(500),
                theme VARCHAR(20) DEFAULT 'dark',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                status VARCHAR(20) DEFAULT 'active'
            );

            CREATE TABLE IF NOT EXISTS plugins (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                version VARCHAR(50) NOT NULL,
                author VARCHAR(255),
                description TEXT,
                enabled BOOLEAN DEFAULT true,
                config JSONB DEFAULT '{}',
                dependencies JSONB DEFAULT '[]',
                routes JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS user_plugins (
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                plugin_id VARCHAR(100) REFERENCES plugins(id) ON DELETE CASCADE,
                enabled BOOLEAN DEFAULT true,
                config JSONB DEFAULT '{}',
                PRIMARY KEY (user_id, plugin_id)
            );

            CREATE TABLE IF NOT EXISTS sessions (
                sid VARCHAR PRIMARY KEY,
                sess JSON NOT NULL,
                expire TIMESTAMP(6) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS logs (
                id SERIAL PRIMARY KEY,
                level VARCHAR(20),
                message TEXT,
                user_id INTEGER,
                ip_address INET,
                user_agent TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_plugins_enabled ON plugins(enabled);
            CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
            CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
        `);

        console.log(chalk.green('✅ Database tables created'));

        // Create admin user if not exists
        const bcrypt = require('bcryptjs');
        const adminPassword = process.env.ADMIN_PASSWORD || 'Rana0986';
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        
        await db.query(`
            INSERT INTO users (username, email, password, role, theme) 
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (username) DO NOTHING
        `, ['admin', 'admin@shadowcore.com', hashedPassword, 'admin', 'dark']);

        console.log(chalk.green('✅ Admin user created (username: admin)'));

        return true;
    } catch (error) {
        console.error(chalk.red('❌ Database initialization failed:'), error);
        throw error;
    }
}

module.exports = { db, initDatabase, Database };
