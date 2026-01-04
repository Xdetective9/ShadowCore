// index.js - WORKING VERSION
const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const fileUpload = require('express-fileupload');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// ========== MIDDLEWARE ==========
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}));

// ========== SESSION ==========
app.use(session({
    secret: process.env.SESSION_SECRET || 'shadowcore-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));

// ========== VIEW ENGINE ==========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ========== STATIC FILES ==========
app.use('/static', express.static(path.join(__dirname, 'public')));

// ========== GLOBAL VARIABLES ==========
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.theme = req.cookies?.theme || 'dark';
    res.locals.siteName = 'ShadowCore';
    next();
});

// ========== LOAD PLUGINS ==========
global.plugins = new Map();

async function loadPlugins() {
    const pluginDir = path.join(__dirname, 'plugins');
    
    try {
        await fs.access(pluginDir);
        const files = await fs.readdir(pluginDir);
        
        for (const file of files) {
            if (file.endsWith('.plugin.js')) {
                try {
                    const pluginPath = path.join(pluginDir, file);
                    const pluginModule = require(pluginPath);
                    const pluginId = file.replace('.plugin.js', '');
                    
                    const plugin = {
                        id: pluginId,
                        name: pluginModule.name || pluginId,
                        version: pluginModule.version || '1.0.0',
                        author: pluginModule.author || 'Unknown',
                        description: pluginModule.description || 'No description',
                        icon: pluginModule.icon || '🧩',
                        enabled: true,
                        module: pluginModule,
                        loadedAt: new Date()
                    };
                    
                    // Initialize plugin
                    if (typeof pluginModule.init === 'function') {
                        await pluginModule.init({
                            app: app,
                            pluginId: pluginId,
                            config: pluginModule.config || {}
                        });
                        console.log(`✅ Loaded plugin: ${plugin.name}`);
                    }
                    
                    // Register plugin routes
                    if (pluginModule.routes && Array.isArray(pluginModule.routes)) {
                        pluginModule.routes.forEach(route => {
                            const method = (route.method || 'GET').toLowerCase();
                            const routePath = `/api/plugins/${pluginId}${route.path}`;
                            
                            app[method](routePath, async (req, res) => {
                                try {
                                    const result = await route.handler({
                                        req,
                                        res,
                                        user: req.session.user
                                    });
                                    
                                    if (result && !res.headersSent) {
                                        res.json(result);
                                    }
                                } catch (error) {
                                    console.error(`Plugin ${pluginId} route error:`, error);
                                    res.status(500).json({ error: error.message });
                                }
                            });
                            
                            console.log(`🛣️  Registered: ${method.toUpperCase()} ${routePath}`);
                        });
                    }
                    
                    global.plugins.set(pluginId, plugin);
                    
                } catch (error) {
                    console.error(`❌ Failed to load plugin ${file}:`, error.message);
                }
            }
        }
        
        console.log(`📦 Total plugins loaded: ${global.plugins.size}`);
    } catch (err) {
        console.log('📁 No plugins directory found');
    }
}

// ========== LOAD ROUTES ==========
async function loadRoutes() {
    const routesDir = path.join(__dirname, 'routes');
    
    const routeFiles = [
        { name: 'index', path: '/' },
        { name: 'auth', path: '/auth' },
        { name: 'admin', path: '/admin' },
        { name: 'api', path: '/api' },
        { name: 'user', path: '/user' }
    ];
    
    for (const routeFile of routeFiles) {
        try {
            const routePath = path.join(routesDir, `${routeFile.name}.js`);
            await fs.access(routePath);
            
            const router = require(routePath);
            app.use(routeFile.path, router);
            
            console.log(`✅ Loaded route: ${routeFile.path}`);
        } catch (err) {
            console.log(`⚠️  Route ${routeFile.name}.js not found`);
        }
    }
}

// ========== DEFAULT ROUTES ==========
// Home page fallback
app.get('/', (req, res) => {
    res.render('index', {
        title: 'ShadowCore',
        user: req.session.user,
        plugins: Array.from(global.plugins.values())
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date() });
});

// Admin login fallback
app.get('/admin/login', (req, res) => {
    res.redirect('/auth/admin/login');
});

// ========== ERROR HANDLING ==========
app.use((req, res) => {
    res.status(404).render('error/404', {
        title: '404 - Not Found',
        message: 'Page not found'
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).render('error/500', {
        title: '500 - Error',
        message: 'Something went wrong'
    });
});

// ========== START SERVER ==========
async function startServer() {
    try {
        // Create directories
        const dirs = ['plugins', 'uploads', 'public', 'views', 'data'];
        for (const dir of dirs) {
            try {
                await fs.mkdir(path.join(__dirname, dir), { recursive: true });
            } catch (err) {}
        }
        
        // Load plugins
        await loadPlugins();
        
        // Load routes
        await loadRoutes();
        
        app.listen(PORT, () => {
            console.log(`
🚀 ShadowCore Started on port ${PORT}
👉 Website: http://localhost:${PORT}
🔐 Admin: http://localhost:${PORT}/auth/admin/login
📦 Plugins: ${global.plugins.size} loaded
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
