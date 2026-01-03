// core/auth.js
const crypto = require('crypto');
const Utils = require('./utils');

class Auth {
    constructor(db) {
        this.db = db;
        this.pepper = process.env.PEPPER || 'default-pepper-change-me';
    }

    // Create user session
    async createSession(user) {
        const sessionId = Utils.generateToken(32);
        const sessionData = {
            userId: user.id,
            email: user.email,
            role: user.role,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };

        await this.db.insert('sessions', {
            id: sessionId,
            ...sessionData
        });

        return { sessionId, user: sessionData };
    }

    // Validate session
    async validateSession(sessionId) {
        const sessions = await this.db.get('sessions', { id: sessionId });
        
        if (sessions.length === 0) {
            return null;
        }

        const session = sessions[0];
        
        // Check expiration
        if (new Date(session.expiresAt) < new Date()) {
            await this.db.delete('sessions', sessionId);
            return null;
        }

        // Get user data
        const users = await this.db.get('users', { id: session.userId });
        if (users.length === 0) {
            return null;
        }

        return {
            ...session,
            user: users[0]
        };
    }

    // Destroy session
    async destroySession(sessionId) {
        await this.db.delete('sessions', sessionId);
        return true;
    }

    // Authentication middleware
    middleware(requiredRole = 'user') {
        return async (req, res, next) => {
            const sessionId = req.sessionID;
            
            if (!sessionId) {
                return res.status(401).json({ 
                    error: 'Authentication required' 
                });
            }

            const session = await this.validateSession(sessionId);
            
            if (!session) {
                return res.status(401).json({ 
                    error: 'Invalid or expired session' 
                });
            }

            // Check role permissions
            const roles = ['user', 'admin'];
            const userRoleIndex = roles.indexOf(session.user.role);
            const requiredRoleIndex = roles.indexOf(requiredRole);

            if (userRoleIndex < requiredRoleIndex) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions' 
                });
            }

            // Attach user to request
            req.auth = session;
            next();
        };
    }

    // Verify password
    async verifyPassword(email, password) {
        const users = await this.db.get('users', { email });
        
        if (users.length === 0) {
            return false;
        }

        const user = users[0];
        const hashedPassword = Utils.hashPassword(password, this.pepper);
        
        return user.password === hashedPassword;
    }

    // Reset password
    async resetPassword(email, newPassword) {
        const users = await this.db.get('users', { email });
        
        if (users.length === 0) {
            return false;
        }

        const user = users[0];
        const hashedPassword = Utils.hashPassword(newPassword, this.pepper);
        
        await this.db.update('users', user.id, {
            password: hashedPassword,
            passwordChangedAt: new Date().toISOString()
        });

        return true;
    }
}

module.exports = Auth;
