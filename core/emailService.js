// core/emailService.js - UPDATED VERSION
const { Resend } = require('resend');

class EmailService {
    constructor() {
        // Use your API key with proper error handling
        this.apiKey = process.env.RESEND_API_KEY || 're_KLNiEivw_CKWPC6uskbxrNP1n2chKVBv2';
        
        // Log if API key is missing
        if (!this.apiKey || this.apiKey === 'your-resend-api-key-here') {
            console.warn('⚠️  RESEND_API_KEY not configured. Email verification will be simulated.');
            this.simulationMode = true;
        } else {
            this.resend = new Resend(this.apiKey);
            this.simulationMode = false;
        }
        
        this.from = process.env.EMAIL_FROM || 'ShadowCore <onboarding@resend.dev>';
    }

    async sendVerificationEmail(to, token, username) {
        // If in simulation mode, skip real email sending
        if (this.simulationMode) {
            console.log(`📧 [SIMULATION] Verification email would be sent to: ${to}`);
            console.log(`📧 [SIMULATION] Verification token: ${token}`);
            console.log(`📧 [SIMULATION] Verification URL: ${process.env.APP_URL || 'http://localhost:3000'}/auth/verify/${token}`);
            
            // Simulate success for testing
            return {
                success: true,
                simulated: true,
                verificationUrl: `${process.env.APP_URL || 'http://localhost:3000'}/auth/verify/${token}`
            };
        }
        
        try {
            const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth/verify/${token}`;
            
            console.log(`📧 Sending verification email to: ${to}`);
            console.log(`📧 Using API key: ${this.apiKey.substring(0, 10)}...`);
            
            const { data, error } = await this.resend.emails.send({
                from: this.from,
                to: [to],
                subject: 'Verify Your ShadowCore Account',
                html: this.getVerificationEmailHtml(username, verificationUrl),
                headers: {
                    'X-Entity-Ref-ID': `verify-${Date.now()}`
                }
            });

            if (error) {
                console.error('❌ Email sending failed:', error);
                
                // Fallback to simulation mode
                console.log(`📧 [FALLBACK] Verification URL: ${verificationUrl}`);
                
                return {
                    success: false,
                    error: error.message,
                    fallbackUrl: verificationUrl
                };
            }

            console.log(`✅ Verification email sent to ${to}, ID: ${data?.id || 'unknown'}`);
            
            return {
                success: true,
                emailId: data?.id,
                verificationUrl: verificationUrl
            };
            
        } catch (error) {
            console.error('❌ Email service error:', error.message);
            
            // Return verification URL anyway so user can still verify
            const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth/verify/${token}`;
            
            return {
                success: false,
                error: error.message,
                fallbackUrl: verificationUrl
            };
        }
    }

    getVerificationEmailHtml(username, verificationUrl) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your ShadowCore Account</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f9fafb;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: white;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 20px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
        }
        .content { 
            padding: 30px; 
            border-radius: 0 0 10px 10px; 
            border: 1px solid #e5e7eb;
            border-top: none;
        }
        .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white !important; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            margin: 20px 0; 
            text-align: center;
        }
        .footer { 
            text-align: center; 
            margin-top: 30px; 
            color: #6b7280; 
            font-size: 14px; 
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        .code-box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            font-family: monospace;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🚀 ShadowCore</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Universal Plugin Platform</p>
        </div>
        <div class="content">
            <h2 style="color: #374151; margin-top: 0;">Hello ${username}!</h2>
            <p>Thank you for registering with ShadowCore. To activate your account and access all features, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <div class="code-box">${verificationUrl}</div>
            
            <p><strong>This verification link will expire in 24 hours.</strong></p>
            
            <p>If you didn't create an account with ShadowCore, you can safely ignore this email.</p>
            
            <p>Best regards,<br>The ShadowCore Team</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ShadowCore. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
            <p style="font-size: 12px; color: #9ca3af;">
                Having trouble? Contact support at: support@shadowcore.app
            </p>
        </div>
    </div>
</body>
</html>
        `;
    }

    async sendWelcomeEmail(to, username) {
        if (this.simulationMode) {
            console.log(`📧 [SIMULATION] Welcome email would be sent to: ${to}`);
            return { success: true, simulated: true };
        }
        
        try {
            const { data, error } = await this.resend.emails.send({
                from: this.from,
                to: [to],
                subject: 'Welcome to ShadowCore! 🎉',
                html: this.getWelcomeEmailHtml(username)
            });

            return { success: !error, error };
            
        } catch (error) {
            console.error('Welcome email error:', error);
            return { success: false, error: error.message };
        }
    }

    getWelcomeEmailHtml(username) {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to ShadowCore!</h1>
            <p>Your account is now verified and ready</p>
        </div>
        <div class="content">
            <h2>Hello ${username},</h2>
            <p>Your ShadowCore account has been successfully verified! You can now access all features:</p>
            
            <div style="margin: 20px 0;">
                <strong>🔌 Plugin System:</strong> Install and manage unlimited plugins<br>
                <strong>🎨 Custom Themes:</strong> Choose from multiple theme options<br>
                <strong>⚡ AI Tools:</strong> Access powerful AI-powered features<br>
                <strong>📱 Mobile Friendly:</strong> Works perfectly on all devices
            </div>
            
            <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
            </div>
            
            <p>Need help? Check out our documentation or contact support.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ShadowCore. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;
    }
}

module.exports = EmailService;
