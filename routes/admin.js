// routes/admin.js - WORKING VERSION
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Admin middleware
const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/auth/admin/login');
};

// Admin dashboard
router.get('/admin', requireAdmin, (req, res) => {
    const plugins = global.plugins ? Array.from(global.plugins.values()) : [];
    
    res.render('admin/dashboard', {
        title: 'Admin Dashboard | ShadowCore',
        user: req.session.user,
        plugins: plugins,
        stats: {
            totalUsers: 1,
            totalPlugins: plugins.length,
            activePlugins: plugins.filter(p => p.enabled).length,
            todayLogs: 0
        }
    });
});

// Plugin manager
router.get('/admin/plugins', requireAdmin, (req, res) => {
    const plugins = global.plugins ? Array.from(global.plugins.values()) : [];
    
    res.render('admin/plugins', {
        title: 'Plugin Manager | ShadowCore',
        user: req.session.user,
        plugins: plugins
    });
});

// Plugin upload
router.get('/admin/plugins/upload', requireAdmin, (req, res) => {
    res.render('admin/upload', {
        title: 'Upload Plugin | ShadowCore',
        user: req.session.user
    });
});

router.post('/admin/plugins/upload', requireAdmin, async (req, res) => {
    try {
        if (!req.files || !req.files.plugin) {
            return res.json({ success: false, error: 'No plugin file uploaded' });
        }
        
        const pluginFile = req.files.plugin;
        const pluginName = pluginFile.name.replace('.plugin.js', '');
        
        // Save file
        const pluginPath = path.join(__dirname, '../plugins', pluginFile.name);
        await pluginFile.mv(pluginPath);
        
        // Load plugin
        const pluginModule = require(pluginPath);
        
        // Add to global plugins
        const plugin = {
            id: pluginName,
            name: pluginModule.name || pluginName,
            version: pluginModule.version || '1.0.0',
            author: pluginModule.author || 'Unknown',
            description: pluginModule.description || 'Uploaded plugin',
            icon: pluginModule.icon || '🧩',
            enabled: true,
            loadedAt: new Date()
        };
        
        if (!global.plugins) {
            global.plugins = new Map();
        }
        
        global.plugins.set(pluginName, plugin);
        
        // Initialize if has init function
        if (typeof pluginModule.init === 'function') {
            await pluginModule.init({
                app: require('../index.js').app,
                pluginId: pluginName
            });
        }
        
        res.json({
            success: true,
            message: 'Plugin uploaded successfully',
            plugin: plugin
        });
        
    } catch (error) {
        console.error('Plugin upload error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Users page
router.get('/admin/users', requireAdmin, (req, res) => {
    res.render('admin/users', {
        title: 'User Management | ShadowCore',
        user: req.session.user,
        users: [req.session.user]
    });
});

// Settings
router.get('/admin/settings', requireAdmin, (req, res) => {
    res.render('admin/settings', {
        title: 'Settings | ShadowCore',
        user: req.session.user
    });
});

// Logs
router.get('/admin/logs', requireAdmin, (req, res) => {
    res.render('admin/logs', {
        title: 'System Logs | ShadowCore',
        user: req.session.user,
        logs: []
    });
});

// Plugin toggle
router.post('/admin/plugins/:pluginId/toggle', requireAdmin, (req, res) => {
    const { pluginId } = req.params;
    const { enabled } = req.body;
    
    if (global.plugins && global.plugins.has(pluginId)) {
        const plugin = global.plugins.get(pluginId);
        plugin.enabled = enabled === 'true';
        
        res.json({
            success: true,
            message: `Plugin ${plugin.enabled ? 'enabled' : 'disabled'}`
        });
    } else {
        res.json({
            success: false,
            error: 'Plugin not found'
        });
    }
});

module.exports = router;
