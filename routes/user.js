// routes/user.js
const express = require('express');
const router = express.Router();

// Middleware to check if user is logged in
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
};

// User dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
    const Database = require('../core/database');
    const db = new Database();
    
    try {
        const [plugins, logs] = await Promise.all([
            db.get('plugins'),
            db.get('logs', { userId: req.session.user.id }, 10)
        ]);
        
        res.render('user/dashboard', {
            title: 'Dashboard',
            user: req.session.user,
            plugins: plugins.filter(p => p.enabled),
            recentLogs: logs,
            stats: {
                totalPlugins: plugins.length,
                enabledPlugins: plugins.filter(p => p.enabled).length
            }
        });
    } catch (error) {
        res.render('user/dashboard', {
            title: 'Dashboard',
            user: req.session.user,
            plugins: [],
            recentLogs: [],
            stats: { totalPlugins: 0, enabledPlugins: 0 }
        });
    }
});

// User profile
router.get('/profile', requireAuth, async (req, res) => {
    const Database = require('../core/database');
    const db = new Database();
    
    try {
        const users = await db.get('users', { id: req.session.user.id });
        const user = users[0] || req.session.user;
        
        res.render('user/profile', {
            title: 'My Profile',
            user: user
        });
    } catch (error) {
        res.render('user/profile', {
            title: 'My Profile',
            user: req.session.user
        });
    }
});

// Update profile
router.post('/profile', requireAuth, async (req, res) => {
    const { username, bio, avatar } = req.body;
    const Database = require('../core/database');
    const db = new Database();
    
    try {
        await db.update('users', req.session.user.id, {
            username: username,
            bio: bio,
            avatar: avatar,
            updatedAt: new Date().toISOString()
        });
        
        // Update session
        req.session.user.username = username;
        
        res.redirect('/user/profile?success=true');
    } catch (error) {
        res.redirect('/user/profile?error=' + encodeURIComponent(error.message));
    }
});

// User settings
router.get('/settings', requireAuth, (req, res) => {
    res.render('user/settings', {
        title: 'Settings',
        user: req.session.user,
        themes: ['dark', 'light', 'midnight', 'ocean', 'sunset', 'forest']
    });
});

// Update settings
router.post('/settings', requireAuth, async (req, res) => {
    const { theme, notifications, language } = req.body;
    const Database = require('../core/database');
    const db = new Database();
    
    try {
        await db.update('users', req.session.user.id, {
            settings: {
                theme: theme || 'dark',
                notifications: notifications === 'on',
                language: language || 'en',
                updatedAt: new Date().toISOString()
            }
        });
        
        // Set theme cookie
        res.cookie('theme', theme || 'dark', {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: true
        });
        
        res.redirect('/user/settings?success=true');
    } catch (error) {
        res.redirect('/user/settings?error=' + encodeURIComponent(error.message));
    }
});

// Themes page
router.get('/themes', requireAuth, (req, res) => {
    const themes = [
        { id: 'dark', name: 'Dark', colors: ['#6366f1', '#8b5cf6'] },
        { id: 'light', name: 'Light', colors: ['#3b82f6', '#8b5cf6'] },
        { id: 'midnight', name: 'Midnight', colors: ['#8b5cf6', '#ec4899'] },
        { id: 'ocean', name: 'Ocean', colors: ['#06b6d4', '#0ea5e9'] },
        { id: 'sunset', name: 'Sunset', colors: ['#f97316', '#ec4899'] },
        { id: 'forest', name: 'Forest', colors: ['#10b981', '#059669'] }
    ];
    
    res.render('user/themes', {
        title: 'Themes',
        user: req.session.user,
        themes: themes,
        currentTheme: req.cookies.theme || 'dark'
    });
});

// Apply theme
router.post('/themes/apply', requireAuth, (req, res) => {
    const { theme } = req.body;
    const allowedThemes = ['dark', 'light', 'midnight', 'ocean', 'sunset', 'forest'];
    
    if (allowedThemes.includes(theme)) {
        res.cookie('theme', theme, {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: true
        });
    }
    
    res.redirect('/user/themes?applied=true');
});

// User activity logs
router.get('/activity', requireAuth, async (req, res) => {
    const Database = require('../core/database');
    const db = new Database();
    
    try {
        const logs = await db.get('logs', { userId: req.session.user.id }, 50);
        
        res.render('user/activity', {
            title: 'Activity Logs',
            user: req.session.user,
            logs: logs || []
        });
    } catch (error) {
        res.render('user/activity', {
            title: 'Activity Logs',
            user: req.session.user,
            logs: []
        });
    }
});

// Delete account
router.post('/delete-account', requireAuth, async (req, res) => {
    const { confirm } = req.body;
    
    if (confirm !== 'DELETE') {
        return res.redirect('/user/settings?error=Confirmation text does not match');
    }
    
    const Database = require('../core/database');
    const db = new Database();
    
    try {
        // Delete user
        await db.delete('users', req.session.user.id);
        
        // Delete user sessions
        const sessions = await db.get('sessions', { userId: req.session.user.id });
        for (const session of sessions) {
            await db.delete('sessions', session.id);
        }
        
        // Destroy current session
        req.session.destroy();
        
        res.redirect('/?message=Account deleted successfully');
    } catch (error) {
        res.redirect('/user/settings?error=' + encodeURIComponent(error.message));
    }
});

module.exports = router;
