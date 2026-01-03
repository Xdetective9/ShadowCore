// setup.js - Initial setup script
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function setup() {
    console.log('🚀 ShadowCore Setup v3.0');
    console.log('========================\n');
    
    // Create necessary directories
    const directories = [
        'data',
        'uploads',
        'uploads/plugins',
        'public',
        'public/css',
        'public/js',
        'public/assets',
        'views',
        'views/layouts',
        'views/partials',
        'views/auth',
        'views/admin',
        'views/user',
        'views/plugins',
        'views/error',
        'plugins',
        'logs',
        'core',
        'routes'
    ];
    
    for (const dir of directories) {
        await fs.mkdir(path.join(__dirname, dir), { recursive: true });
        console.log(`📁 Created: ${dir}`);
    }
    
    // Create .env file if not exists
    const envPath = path.join(__dirname, '.env');
    try {
        await fs.access(envPath);
        console.log('✅ .env file already exists');
    } catch {
        const envContent = `
# ShadowCore Configuration
PORT=3000
NODE_ENV=production

# Security
SESSION_SECRET=${crypto.randomBytes(32).toString('hex')}
PEPPER=${crypto.randomBytes(16).toString('hex')}

# Admin
ADMIN_PASSWORD=Rana0986

# Email (Resend.com)
RESEND_API_KEY=re_KLNiEivw_CKWPC6uskbxrNP1n2chKVBv2
EMAIL_FROM=ShadowCore <noreply@shadowcore.app>

# Plugin APIs
REMOVEBG_API_KEY=xv5aoeuirxTNZBYS5KykZZEK

# Application URL
APP_URL=http://localhost:3000
        `.trim();
        
        await fs.writeFile(envPath, envContent);
        console.log('✅ Created .env file with default settings');
    }
    
    // Create default plugins
    const defaultPlugins = [
        {
            name: 'removebg.plugin.js',
            content: `module.exports = {
    name: 'Remove Background',
    version: '1.0.0',
    author: 'ShadowCore',
    description: 'Remove background from images',
    icon: '🖼️',
    category: 'image',
    dependencies: ['axios', 'form-data'],
    requiredEnv: ['REMOVEBG_API_KEY'],
    config: {
        apiKey: process.env.REMOVEBG_API_KEY
    },
    async init({ app, db, pluginId }) {
        console.log('Remove Background plugin loaded');
        return { success: true };
    },
    routes: []
};`
        }
    ];
    
    for (const plugin of defaultPlugins) {
        const pluginPath = path.join(__dirname, 'plugins', plugin.name);
        try {
            await fs.access(pluginPath);
        } catch {
            await fs.writeFile(pluginPath, plugin.content);
            console.log(`✅ Created default plugin: ${plugin.name}`);
        }
    }
    
    console.log('\n✅ Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm install');
    console.log('2. Run: npm start');
    console.log('3. Visit: http://localhost:3000');
    console.log('4. Admin login: /admin/login (Password: Rana0986)');
    console.log('\n🚀 ShadowCore is ready to launch!');
}

setup().catch(console.error);
