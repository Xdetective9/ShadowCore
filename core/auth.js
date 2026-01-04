// routes/auth.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Admin Login (Simple password check)
router.get('/admin/login', (req, res) => {
    if (req.session.user?.role === 'admin') {
        return res.redirect('/admin');
    }
    res.render('auth/login', {
        title: 'Admin Login | ShadowCore',
        error: null
    });
});

router.post('/admin/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'Rana0986';
    
    if (password === adminPassword) {
        req.session.user = {
            id: 'admin',
            name: 'Administrator',
            email: 'admin@shadowcore.app',
            role: 'admin',
            verified: true
        };
        return res.redirect('/admin');
    }
    
    res.render('auth/login', {
        title: 'Admin Login | ShadowCore',
        error: 'Invalid password'
    });
});

// User Login
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('auth/login', {
        title: 'Login | ShadowCore',
        error: null,
        isAdmin: false
    });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Simple demo login - accept any credentials
    if (email && password) {
        req.session.user = {
            id: 'user_' + Date.now(),
            email: email,
            username: email.split('@')[0],
            role: 'user',
            verified: true
        };
        return res.redirect('/dashboard');
    }
    
    res.render('auth/login', {
        title: 'Login | ShadowCore',
        error: 'Please enter credentials',
        isAdmin: false
    });
});

// Signup (Simplified - no email verification for now)
router.get('/signup', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('auth/signup', {
        title: 'Sign Up | ShadowCore',
        error: null
    });
});

router.post('/signup', async (req, res) => {
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) {
        return res.render('auth/signup', {
            title: 'Sign Up | ShadowCore',
            error: 'All fields are required'
        });
    }
    
    // Create user session directly (skip email verification for now)
    req.session.user = {
        id: 'user_' + Date.now(),
        email: email,
        username: username,
        role: 'user',
        verified: true
    };
    
    res.redirect('/dashboard');
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Forgot password
router.get('/forgot', (req, res) => {
    res.render('auth/forgot', {
        title: 'Forgot Password | ShadowCore'
    });
});

// Email verification placeholder
router.get('/verify/:token', (req, res) => {
    res.render('auth/verify-success', {
        title: 'Email Verified | ShadowCore',
        message: 'Email verification is currently disabled in demo mode.'
    });
});

module.exports = router;
