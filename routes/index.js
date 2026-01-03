// routes/index.js
const express = require('express');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
    // Get database instance
    const Database = require('../core/database');
    const db = new Database();
    
    // Get plugins for display
    db.get('plugins').then(plugins => {
        res.render('index', {
            title: 'ShadowCore | Universal Plugin Platform',
            user: req.session.user,
            plugins: plugins || []
        });
    }).catch(() => {
        res.render('index', {
            title: 'ShadowCore | Universal Plugin Platform',
            user: req.session.user,
            plugins: []
        });
    });
});

// Features page
router.get('/features', (req, res) => {
    const Database = require('../core/database');
    const db = new Database();
    
    db.get('plugins').then(plugins => {
        res.render('features', {
            title: 'Features | ShadowCore',
            user: req.session.user,
            plugins: plugins || []
        });
    }).catch(() => {
        res.render('features', {
            title: 'Features | ShadowCore',
            user: req.session.user,
            plugins: []
        });
    });
});

// Plugins marketplace
router.get('/plugins', (req, res) => {
    const Database = require('../core/database');
    const db = new Database();
    
    db.get('plugins').then(plugins => {
        res.render('plugins/index', {
            title: 'Plugins | ShadowCore',
            user: req.session.user,
            plugins: plugins.filter(p => p.enabled) || []
        });
    }).catch(() => {
        res.render('plugins/index', {
            title: 'Plugins | ShadowCore',
            user: req.session.user,
            plugins: []
        });
    });
});

// View specific plugin
router.get('/plugins/:pluginId', (req, res) => {
    const { pluginId } = req.params;
    const Database = require('../core/database');
    const db = new Database();
    
    Promise.all([
        db.get('plugins', { id: pluginId }),
        db.get('logs', { plugin: pluginId }, 10)
    ]).then(([plugins, logs]) => {
        if (plugins.length === 0) {
            return res.redirect('/plugins');
        }
        
        const plugin = plugins[0];
        
        res.render('plugins/view', {
            title: `${plugin.name} | ShadowCore`,
            user: req.session.user,
            plugin: plugin,
            logs: logs || []
        });
    }).catch(() => {
        res.redirect('/plugins');
    });
});

// User dashboard
router.get('/dashboard', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    const Database = require('../core/database');
    const db = new Database();
    
    try {
        const [plugins, userLogs] = await Promise.all([
            db.get('plugins'),
            db.get('logs', { userId: req.session.user.id }, 20)
        ]);
        
        res.render('user/dashboard', {
            title: 'Dashboard | ShadowCore',
            user: req.session.user,
            plugins: plugins || [],
            logs: userLogs || []
        });
    } catch (error) {
        res.render('user/dashboard', {
            title: 'Dashboard | ShadowCore',
            user: req.session.user,
            plugins: [],
            logs: []
        });
    }
});

// User profile
router.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    res.render('user/profile', {
        title: 'My Profile | ShadowCore',
        user: req.session.user
    });
});

// User settings
router.get('/settings', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    res.render('user/settings', {
        title: 'Settings | ShadowCore',
        user: req.session.user
    });
});

// Theme selector
router.get('/themes', (req, res) => {
    res.render('user/themes', {
        title: 'Themes | ShadowCore',
        user: req.session.user
    });
});

// Change theme
router.post('/theme', (req, res) => {
    const { theme } = req.body;
    const allowedThemes = ['dark', 'light', 'midnight', 'ocean'];
    
    if (allowedThemes.includes(theme)) {
        res.cookie('theme', theme, { 
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            httpOnly: true 
        });
    }
    
    res.redirect('back');
});

// Health check (public)
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'shadowcore',
        timestamp: new Date().toISOString(),
        version: '3.0.0'
    });
});

module.exports = router;
