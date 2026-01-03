// routes/auth.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Login
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('auth/login', { title: 'Login', error: null });
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Get database
        const Database = require('../core/database');
        const db = new Database();
        
        // Find user
        const user = await db.findUser(email);
        
        if (!user) {
            return res.render('auth/login', {
                title: 'Login',
                error: 'Invalid email or password'
            });
        }
        
        // Verify password
        const hashedPassword = crypto
            .createHash('sha256')
            .update(password + process.env.PEPPER)
            .digest('hex');
        
        if (user.password !== hashedPassword) {
            return res.render('auth/login', {
                title: 'Login',
                error: 'Invalid email or password'
            });
        }
        
        // Check if verified
        if (!user.verified) {
            return res.render('auth/login', {
                title: 'Login',
                error: 'Please verify your email first'
            });
        }
        
        // Create session
        req.session.user = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            verified: user.verified
        };
        
        res.redirect('/dashboard');
        
    } catch (error) {
        res.render('auth/login', {
            title: 'Login',
            error: 'An error occurred. Please try again.'
        });
    }
});

// Signup
router.get('/signup', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('auth/signup', { title: 'Sign Up', error: null });
});

router.post('/signup', async (req, res) => {
    try {
        const { email, username, password, confirmPassword } = req.body;
        
        // Validate
        if (password !== confirmPassword) {
            return res.render('auth/signup', {
                title: 'Sign Up',
                error: 'Passwords do not match'
            });
        }
        
        if (password.length < 6) {
            return res.render('auth/signup', {
                title: 'Sign Up',
                error: 'Password must be at least 6 characters'
            });
        }
        
        // Get database and email service
        const Database = require('../core/database');
        const EmailService = require('../core/emailService');
        
        const db = new Database();
        const emailService = new EmailService();
        
        // Check if user exists
        const existingUser = await db.findUser(email);
        if (existingUser) {
            return res.render('auth/signup', {
                title: 'Sign Up',
                error: 'Email already registered'
            });
        }
        
        // Create user
        const user = await db.createUser({ email, username, password });
        
        // Send verification email
        await emailService.sendVerificationEmail(
            email, 
            user.verificationToken, 
            username
        );
        
        res.render('auth/verify-pending', {
            title: 'Verify Your Email',
            email: email
        });
        
    } catch (error) {
        res.render('auth/signup', {
            title: 'Sign Up',
            error: 'Registration failed. Please try again.'
        });
    }
});

// Email verification
router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const Database = require('../core/database');
        const EmailService = require('../core/emailService');
        
        const db = new Database();
        const emailService = new EmailService();
        
        const verified = await db.verifyUser(token);
        
        if (verified) {
            // Find user to get email
            const users = await db.get('users', { verificationToken: token });
            if (users.length > 0) {
                await emailService.sendWelcomeEmail(users[0].email, users[0].username);
            }
            
            res.render('auth/verify-success', {
                title: 'Email Verified',
                message: 'Your email has been verified successfully!'
            });
        } else {
            res.render('auth/verify-error', {
                title: 'Verification Failed',
                error: 'Invalid or expired verification token'
            });
        }
    } catch (error) {
        res.render('auth/verify-error', {
            title: 'Verification Failed',
            error: 'An error occurred during verification'
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Forgot password
router.get('/forgot', (req, res) => {
    res.render('auth/forgot', { title: 'Forgot Password' });
});

module.exports = router;
