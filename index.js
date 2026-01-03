// ========== SHADOWCORE v3.0 - UNIVERSAL PLATFORM ==========
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
require('dotenv').config();

class ShadowCore {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 10000;
        this.plugins = new Map();
        this.routes = new Map();
        this.middlewares = [];
        this.dependencies = new Set();
        this.theme = 'dark';
        this.io = null;
        
        this.dirs = ['plugins', 'uploads', 'public', 'views', 'logs', 'temp', 'data'];
    }

    async initialize() {
        console.log('🚀 ShadowCore v3.0 Initializing...');
        
        await this.createDirectories();
        await this.loadCore();
        await this.loadPlugins();
        await this.installDependencies();
        await this.setupServer();
        
        console.log('✅ ShadowCore Ready! All systems operational.');
    }

    async createDirectories() {
        for (const dir of this.dirs) {
            try {
                await fs.mkdir(path.join(__dirname, dir), { recursive: true });
            } catch (err) {}
        }
    }

    async loadCore() {
        const Database = require('./core/database');
        this.db = new Database();
        await this.db.init();
        
        const EmailService = require('./core/emailService');
        this.email = new EmailService();
        
        const Auth = require('./core/auth');
        this.auth = new Auth(this.db);
        
        this.setupExpress();
        this.loadCoreRoutes();
    }

    setupExpress() {
        this.app.use(require('helmet')());
        this.app.use(require('cors')());
        this.app.use(require('compression')());
        
        this.app.use(require('express').json({ limit: '50mb' }));
        this.app.use(require('express').urlencoded({ extended: true, limit: '50mb' }));
        
        this.app.use(require('express-session')({
            secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
            resave: false,
            saveUninitialized: false,
            store: new (require('memorystore')(require('express-session')))({
                checkPeriod: 86400000
            }),
            cookie: { 
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000 
            }
        }));
        
        this.app.use(require('express-fileupload')({
            useTempFiles: true,
            tempFileDir: '/tmp/'
        }));
        
        this.app.set('view engine', 'ejs');
        this.app.set('views', [
            path.join(__dirname, 'views'),
            path.join(__dirname, 'plugins/views')
        ]);
        
        this.app.use('/static', require('express').static(path.join(__dirname, 'public')));
        this.app.use('/plugin-assets', require('express').static(path.join(__dirname, 'plugins/assets')));
        
        // FIX: Add currentPage middleware
        this.app.use((req, res, next) => {
            // Determine current page from URL
            let currentPage = 'home';
            const path = req.path;
            
            if (path === '/') currentPage = 'home';
            else if (path.startsWith('/features')) currentPage = 'features';
            else if (path.startsWith('/plugins')) currentPage = 'plugins';
            else if (path.startsWith('/dashboard')) currentPage = 'dashboard';
            else if (path.startsWith('/admin')) currentPage = 'admin';
            else if (path.startsWith('/auth/login')) currentPage = 'login';
            else if (path.startsWith('/auth/signup')) currentPage = 'signup';
            else if (path.startsWith('/profile')) currentPage = 'profile';
            else if (path.startsWith('/settings')) currentPage = 'settings';
            
            // Set global template variables
            res.locals.user = req.session.user;
            res.locals.theme = req.cookies?.theme || 'dark';
            res.locals.plugins = Array.from(this.plugins.values());
            res.locals.siteName = 'ShadowCore';
            res.locals.currentPage = currentPage; // FIX: Add this line
            res.locals.ownerName = process.env.OWNER_NAME || 'Abdullah';
            res.locals.ownerNumber = process.env.OWNER_NUMBER || '+923288055104';
            
            next();
        });
    }

    async loadPlugins() {
        const pluginDir = path.join(__dirname, 'plugins');
        
        try {
            const files = await fs.readdir(pluginDir);
            
            for (const file of files) {
                if (file.endsWith('.plugin.js')) {
                    await this.loadPlugin(path.join(pluginDir, file));
                }
            }
            
            console.log(`📦 Loaded ${this.plugins.size} plugins`);
        } catch (err) {
            console.log('📁 No plugins directory found, creating...');
        }
    }

    async loadPlugin(filePath) {
        try {
            delete require.cache[require.resolve(filePath)];
            
            const pluginModule = require(filePath);
            const pluginId = path.basename(filePath, '.plugin.js');
            
            const plugin = {
                id: pluginId,
                name: pluginModule.name || pluginId,
                version: pluginModule.version || '1.0.0',
                author: pluginModule.author || 'Unknown',
                description: pluginModule.description || 'No description',
                icon: pluginModule.icon || '🧩',
                category: pluginModule.category || 'utility',
                enabled: true,
                file: filePath,
                module: pluginModule,
                loadedAt: new Date(),
                dependencies: pluginModule.dependencies || [],
                env: pluginModule.requiredEnv || []
            };
            
            const dbEnabled = await this.db.getPluginStatus(pluginId);
            if (dbEnabled === false) {
                console.log(`⏸️  Plugin ${plugin.name} is disabled in database`);
                return;
            }
            
            if (typeof pluginModule.init === 'function') {
                const initResult = await pluginModule.init({
                    app: this.app,
                    db: this.db,
                    email: this.email,
                    auth: this.auth,
                    pluginId: plugin.id,
                    config: pluginModule.config || {}
                });
                
                plugin.initResult = initResult;
                console.log(`✅ Plugin initialized: ${plugin.name} v${plugin.version}`);
            }
            
            if (pluginModule.routes && Array.isArray(pluginModule.routes)) {
                this.registerPluginRoutes(plugin);
            }
            
            if (pluginModule.middleware && Array.isArray(pluginModule.middleware)) {
                this.registerPluginMiddleware(plugin);
            }
            
            if (plugin.dependencies && plugin.dependencies.length > 0) {
                plugin.dependencies.forEach(dep => this.dependencies.add(dep));
            }
            
            this.plugins.set(pluginId, plugin);
            await this.db.savePlugin(plugin);
            
        } catch (err) {
            console.error(`❌ Failed to load plugin ${filePath}:`, err.message);
        }
    }

    registerPluginRoutes(plugin) {
        plugin.module.routes.forEach(route => {
            const method = (route.method || 'GET').toLowerCase();
            const path = `/api/plugins/${plugin.id}${route.path}`;
            
            const handlers = [];
            
            if (route.auth) {
                handlers.push(this.auth.middleware(route.auth));
            }
            
            handlers.push(async (req, res) => {
                try {
                    const result = await route.handler({
                        req,
                        res,
                        db: this.db,
                        user: req.session.user,
                        plugin: plugin,
                        config: plugin.module.config || {}
                    });
                    
                    if (result && !res.headersSent) {
                        res.json(result);
                    }
                } catch (error) {
                    console.error(`Plugin ${plugin.id} route error:`, error);
                    res.status(500).json({ 
                        error: 'Plugin route error', 
                        message: error.message 
                    });
                }
            });
            
            this.app[method](path, ...handlers);
            console.log(`🛣️  Registered route: ${method.toUpperCase()} ${path}`);
        });
    }

    registerPluginMiddleware(plugin) {
        plugin.module.middleware.forEach(middleware => {
            this.app.use(middleware);
            this.middlewares.push({ plugin: plugin.id, middleware: middleware.name });
        });
    }

    async installDependencies() {
        if (this.dependencies.size === 0) return;
        
        console.log('📦 Installing plugin dependencies...');
        const deps = Array.from(this.dependencies);
        
        const packagePath = path.join(__dirname, 'package.json');
        const packageData = JSON.parse(await fs.readFile(packagePath, 'utf8'));
        
        deps.forEach(dep => {
            if (!packageData.dependencies[dep]) {
                packageData.dependencies[dep] = 'latest';
            }
        });
        
        await fs.writeFile(packagePath, JSON.stringify(packageData, null, 2));
        console.log('✅ Updated package.json with plugin dependencies');
    }

    loadCoreRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                version: '3.0.0',
                plugins: this.plugins.size,
                timestamp: new Date()
            });
        });
        
        // Home page - FIXED: Pass currentPage
        this.app.get('/', (req, res) => {
            res.render('index', {
                title: 'ShadowCore | Universal Plugin Platform',
                user: req.session.user,
                plugins: Array.from(this.plugins.values()),
                currentPage: 'home' // FIX: Add this
            });
        });
        
        // Features page - FIXED: Pass currentPage
        this.app.get('/features', (req, res) => {
            res.render('features', {
                title: 'Features | ShadowCore',
                user: req.session.user,
                plugins: Array.from(this.plugins.values()),
                currentPage: 'features' // FIX: Add this
            });
        });
        
        // Plugins page - FIXED: Pass currentPage
        this.app.get('/plugins', (req, res) => {
            res.render('plugins/index', {
                title: 'Plugins | ShadowCore',
                user: req.session.user,
                plugins: Array.from(this.plugins.values()),
                currentPage: 'plugins' // FIX: Add this
            });
        });
        
        // Auto-load route files
        this.autoLoadRoutes();
    }

    autoLoadRoutes() {
        const routesDir = path.join(__dirname, 'routes');
        
        ['auth', 'admin', 'api', 'user'].forEach(routeFile => {
            try {
                const routePath = path.join(routesDir, `${routeFile}.js`);
                if (require('fs').existsSync(routePath)) {
                    const router = require(routePath);
                    this.app.use(`/${routeFile === 'index' ? '' : routeFile}`, router);
                    console.log(`🛣️  Loaded route: /${routeFile}`);
                }
            } catch (err) {
                console.log(`⚠️  Route ${routeFile}.js not found or has errors`);
            }
        });
    }

    async setupServer() {
        // Error handling with currentPage
        this.app.use((req, res) => {
            res.status(404).render('error/404', {
                title: '404 - Not Found',
                message: 'The page you requested does not exist.',
                currentPage: '404' // FIX: Add this
            });
        });
        
        this.app.use((err, req, res, next) => {
            console.error('Server error:', err);
            res.status(500).render('error/500', {
                title: '500 - Server Error',
                message: 'Something went wrong on our end.',
                currentPage: 'error' // FIX: Add this
            });
        });
        
        this.app.listen(this.port, () => {
            console.log(`
╔══════════════════════════════════════════════════════════╗
║                  🚀 SHADOWCORE v3.0                      ║
╠══════════════════════════════════════════════════════════╣
║ 📍 Port: ${this.port.toString().padEnd(40)} ║
║ 🌐 URL: http://localhost:${this.port.toString().padEnd(36)} ║
║ 📦 Plugins: ${this.plugins.size.toString().padEnd(38)} ║
║ 🎨 Theme: ${this.theme.padEnd(40)} ║
╠══════════════════════════════════════════════════════════╣
║         ✅ UNIVERSAL PLUGIN SYSTEM READY                ║
╚══════════════════════════════════════════════════════════╝

👤 Admin: /admin/login
🔐 Password: From .env file
📧 Email: Resend.com integrated
🧩 Plugins: Auto-loaded (${this.plugins.size} loaded)
🛠️  Upload: /admin/plugins/upload
📊 Database: Simple JSON (No foreign key errors)
            `);
        });
    }
}

const shadowcore = new ShadowCore();
shadowcore.initialize().catch(console.error);

module.exports = shadowcore.app;
