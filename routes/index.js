// routes/index.js - SIMPLIFIED VERSION
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Home page
router.get('/', (req, res) => {
    res.render('index', {
        title: 'ShadowCore | Universal Plugin Platform',
        user: req.session.user,
        plugins: global.plugins ? Array.from(global.plugins.values()) : []
    });
});

// Features page
router.get('/features', (req, res) => {
    res.render('features', {
        title: 'Features | ShadowCore',
        user: req.session.user,
        plugins: global.plugins ? Array.from(global.plugins.values()) : []
    });
});

// Plugins page - FIXED
router.get('/plugins', async (req, res) => {
    try {
        // Get plugins from global or database
        let plugins = [];
        
        if (global.plugins) {
            plugins = Array.from(global.plugins.values());
        } else {
            // Fallback to file system
            const pluginDir = path.join(__dirname, '../plugins');
            try {
                const files = await fs.readdir(pluginDir);
                plugins = files
                    .filter(f => f.endsWith('.plugin.js'))
                    .map(f => ({
                        id: f.replace('.plugin.js', ''),
                        name: f.replace('.plugin.js', '').replace(/-/g, ' '),
                        icon: '🧩',
                        description: 'Plugin loaded from file',
                        enabled: true
                    }));
            } catch (err) {
                plugins = [];
            }
        }
        
        res.render('plugins/index', {
            title: 'Plugins | ShadowCore',
            user: req.session.user,
            plugins: plugins
        });
    } catch (error) {
        console.error('Plugins page error:', error);
        res.render('plugins/index', {
            title: 'Plugins | ShadowCore',
            user: req.session.user,
            plugins: [],
            error: 'Failed to load plugins'
        });
    }
});

// View specific plugin
router.get('/plugins/:pluginId', async (req, res) => {
    const { pluginId } = req.params;
    
    try {
        let plugin = null;
        
        if (global.plugins && global.plugins.has(pluginId)) {
            plugin = global.plugins.get(pluginId);
        }
        
        if (!plugin) {
            return res.redirect('/plugins');
        }
        
        res.render('plugins/view', {
            title: `${plugin.name} | ShadowCore`,
            user: req.session.user,
            plugin: plugin
        });
    } catch (error) {
        console.error('Plugin view error:', error);
        res.redirect('/plugins');
    }
});

// Dashboard
router.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    res.render('user/dashboard', {
        title: 'Dashboard | ShadowCore',
        user: req.session.user,
        plugins: global.plugins ? Array.from(global.plugins.values()) : []
    });
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '3.0.0',
        timestamp: new Date(),
        plugins: global.plugins ? global.plugins.size : 0
    });
});

module.exports = router;
