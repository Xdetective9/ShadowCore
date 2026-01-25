// Background Remover Plugin
// Uses remove.bg API

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

module.exports = {
    // ========== PLUGIN METADATA ==========
    name: 'Background Remover',
    version: '1.0.0',
    author: 'ShadowCore Team',
    description: 'Remove background from images using AI',
    icon: '🖼️',
    category: 'media',
    
    // ========== CONFIGURATION ==========
    config: {
        enabled: true,
        apiKey: process.env.REMOVEBG_API_KEY || 'xv5aoeuirxTNZBYS5KykZZEK',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        outputFormat: 'png',
        quality: 85
    },
    
    // ========== DEPENDENCIES ==========
    dependencies: [
        'axios',
        'sharp'
    ],
    
    // ========== ROUTES ==========
    routes: [
        {
            method: 'POST',
            path: '/remove-background',
            authenticated: true,
            handler: async function(req, res) {
                try {
                    if (!req.files || !req.files.image) {
                        return res.status(400).json({
                            success: false,
                            error: 'No image uploaded'
                        });
                    }
                    
                    const image = req.files.image;
                    
                    // Validate file size
                    if (image.size > this.config.maxFileSize) {
                        return res.status(400).json({
                            success: false,
                            error: `File too large. Max size: ${this.config.maxFileSize / 1024 / 1024}MB`
                        });
                    }
                    
                    // Validate file type
                    const ext = path.extname(image.name).toLowerCase().slice(1);
                    if (!this.config.allowedFormats.includes(ext)) {
                        return res.status(400).json({
                            success: false,
                            error: `Invalid file format. Allowed: ${this.config.allowedFormats.join(', ')}`
                        });
                    }
                    
                    // Process image
                    const result = await this.processImage(image);
                    
                    res.json({
                        success: true,
                        message: 'Background removed successfully',
                        data: result
                    });
                    
                } catch (error) {
                    console.error('Background removal error:', error);
                    res.status(500).json({
                        success: false,
                        error: error.message || 'Failed to remove background'
                    });
                }
            }
        },
        {
            method: 'GET',
            path: '/status',
            handler: async function(req, res) {
                res.json({
                    success: true,
                    plugin: this.name,
                    version: this.version,
                    config: {
                        maxFileSize: this.config.maxFileSize,
                        allowedFormats: this.config.allowedFormats,
                        outputFormat: this.config.outputFormat
                    }
                });
            }
        }
    ],
    
    // ========== ADMIN PANEL ==========
    adminPanel: {
        title: 'Background Remover',
        icon: '🖼️',
        component: `
            <div class="admin-plugin-card">
                <h3><i class="fas fa-image"></i> Background Remover Settings</h3>
                
                <div class="plugin-config">
                    <div class="config-item">
                        <label>API Key</label>
                        <input type="password" id="removebgApiKey" value="${this.config.apiKey ? '********' : ''}" 
                               placeholder="Enter remove.bg API key" class="form-control">
                        <small class="text-muted">Get API key from <a href="https://www.remove.bg/api" target="_blank">remove.bg</a></small>
                    </div>
                    
                    <div class="config-item">
                        <label>Max File Size (MB)</label>
                        <input type="number" id="maxFileSize" value="${this.config.maxFileSize / 1024 / 1024}" 
                               min="1" max="50" class="form-control">
                    </div>
                    
                    <div class="config-item">
                        <label>Output Format</label>
                        <select id="outputFormat" class="form-control">
                            <option value="png" ${this.config.outputFormat === 'png' ? 'selected' : ''}>PNG</option>
                            <option value="jpg" ${this.config.outputFormat === 'jpg' ? 'selected' : ''}>JPG</option>
                            <option value="webp" ${this.config.outputFormat === 'webp' ? 'selected' : ''}>WebP</option>
                        </select>
                    </div>
                    
                    <button onclick="saveRemoveBGSettings()" class="btn btn-primary">
                        <i class="fas fa-save"></i> Save Settings
                    </button>
                </div>
                
                <div class="plugin-stats">
                    <h4>Quick Stats</h4>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value" id="processedCount">0</div>
                            <div class="stat-label">Images Processed</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="successRate">0%</div>
                            <div class="stat-label">Success Rate</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                async function saveRemoveBGSettings() {
                    const settings = {
                        apiKey: document.getElementById('removebgApiKey').value,
                        maxFileSize: parseInt(document.getElementById('maxFileSize').value) * 1024 * 1024,
                        outputFormat: document.getElementById('outputFormat').value
                    };
                    
                    const response = await fetch('/api/plugins/background-remover/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(settings)
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        showNotification('success', 'Settings saved successfully');
                    } else {
                        showNotification('error', result.error);
                    }
                }
                
                // Load stats
                async function loadRemoveBGStats() {
                    const response = await fetch('/api/plugins/background-remover/stats');
                    const result = await response.json();
                    
                    if (result.success) {
                        document.getElementById('processedCount').textContent = result.data.processed || 0;
                        document.getElementById('successRate').textContent = result.data.successRate || '0%';
                    }
                }
                
                document.addEventListener('DOMContentLoaded', loadRemoveBGStats);
            </script>
        `
    },
    
    // ========== FRONTEND INTEGRATION ==========
    frontend: {
        css: `
            .background-remover-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 16px;
                padding: 2rem;
                color: white;
                margin: 1.5rem 0;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            
            .upload-area {
                border: 3px dashed rgba(255,255,255,0.3);
                border-radius: 12px;
                padding: 3rem 2rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
                margin: 1.5rem 0;
            }
            
            .upload-area:hover {
                border-color: rgba(255,255,255,0.5);
                background: rgba(255,255,255,0.05);
            }
            
            .upload-area.dragover {
                border-color: #4ade80;
                background: rgba(74, 222, 128, 0.1);
            }
            
            .preview-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
                margin: 2rem 0;
            }
            
            .preview-box {
                background: rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 1rem;
                text-align: center;
            }
            
            .preview-img {
                max-width: 100%;
                max-height: 300px;
                border-radius: 8px;
                margin-bottom: 1rem;
            }
            
            .processing-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            
            .spinner {
                width: 50px;
                height: 50px;
                border: 5px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: #4ade80;
                animation: spin 1s ease-in-out infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `,
        
        js: `
            class BackgroundRemover {
                constructor() {
                    this.file = null;
                    this.preview = null;
                    this.result = null;
                    this.isProcessing = false;
                }
                
                init() {
                    this.setupUploadArea();
                    this.setupEventListeners();
                }
                
                setupUploadArea() {
                    const uploadArea = document.getElementById('uploadArea');
                    const fileInput = document.getElementById('imageInput');
                    
                    if (!uploadArea || !fileInput) return;
                    
                    // Click to upload
                    uploadArea.addEventListener('click', () => fileInput.click());
                    
                    // Drag and drop
                    uploadArea.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        uploadArea.classList.add('dragover');
                    });
                    
                    uploadArea.addEventListener('dragleave', () => {
                        uploadArea.classList.remove('dragover');
                    });
                    
                    uploadArea.addEventListener('drop', (e) => {
                        e.preventDefault();
                        uploadArea.classList.remove('dragover');
                        
                        if (e.dataTransfer.files.length) {
                            this.handleFile(e.dataTransfer.files[0]);
                        }
                    });
                    
                    // File input change
                    fileInput.addEventListener('change', (e) => {
                        if (e.target.files.length) {
                            this.handleFile(e.target.files[0]);
                        }
                    });
                }
                
                setupEventListeners() {
                    const removeBtn = document.getElementById('removeBackgroundBtn');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', () => this.removeBackground());
                    }
                    
                    const downloadBtn = document.getElementById('downloadResultBtn');
                    if (downloadBtn) {
                        downloadBtn.addEventListener('click', () => this.downloadResult());
                    }
                }
                
                handleFile(file) {
                    // Validate file
                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                    const maxSize = 10 * 1024 * 1024; // 10MB
                    
                    if (!validTypes.includes(file.type)) {
                        this.showError('Invalid file type. Please upload JPG, PNG, or WebP image.');
                        return;
                    }
                    
                    if (file.size > maxSize) {
                        this.showError('File too large. Maximum size is 10MB.');
                        return;
                    }
                    
                    this.file = file;
                    
                    // Show preview
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.preview = e.target.result;
                        this.updatePreview();
                    };
                    reader.readAsDataURL(file);
                    
                    // Show processing UI
                    document.getElementById('uploadArea').style.display = 'none';
                    document.getElementById('previewSection').style.display = 'block';
                }
                
                updatePreview() {
                    const originalImg = document.getElementById('originalImage');
                    if (originalImg && this.preview) {
                        originalImg.src = this.preview;
                    }
                    
                    // Clear previous result
                    this.result = null;
                    document.getElementById('resultImage').src = '';
                    document.getElementById('downloadResultBtn').style.display = 'none';
                }
                
                async removeBackground() {
                    if (!this.file || this.isProcessing) return;
                    
                    this.isProcessing = true;
                    this.showProcessing(true);
                    
                    try {
                        const formData = new FormData();
                        formData.append('image', this.file);
                        
                        const response = await fetch('/api/plugins/background-remover/remove-background', {
                            method: 'POST',
                            body: formData
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            this.result = result.data.url;
                            document.getElementById('resultImage').src = this.result;
                            document.getElementById('downloadResultBtn').style.display = 'block';
                            
                            this.showNotification('success', 'Background removed successfully!');
                        } else {
                            this.showError(result.error || 'Failed to remove background');
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        this.showError('Network error. Please try again.');
                    } finally {
                        this.isProcessing = false;
                        this.showProcessing(false);
                    }
                }
                
                downloadResult() {
                    if (!this.result) return;
                    
                    const link = document.createElement('a');
                    link.href = this.result;
                    link.download = 'background-removed.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
                
                showProcessing(show) {
                    const overlay = document.getElementById('processingOverlay');
                    if (overlay) {
                        overlay.style.display = show ? 'flex' : 'none';
                    }
                }
                
                showError(message) {
                    // Implement your notification system
                    alert(message); // Replace with your notification system
                }
                
                showNotification(type, message) {
                    // Implement your notification system
                    alert(message); // Replace with your notification system
                }
            }
            
            // Initialize when page loads
            document.addEventListener('DOMContentLoaded', () => {
                window.bgRemover = new BackgroundRemover();
                window.bgRemover.init();
            });
        `
    },
    
    // ========== HOOKS ==========
    hooks: {
        onUserLogin: async function(user) {
            console.log(\`Background Remover: User \${user.username} logged in\`);
        },
        onFileUpload: async function(file, user) {
            console.log(\`Background Remover: User \${user.username} uploaded file\`);
        }
    },
    
    // ========== INITIALIZATION ==========
    init: async function(app, io, db) {
        console.log('🖼️ Background Remover Plugin initialized');
        
        // Create upload directory
        const uploadDir = path.join(__dirname, '../uploads/background-remover');
        await fs.mkdir(uploadDir, { recursive: true });
        
        // Additional routes
        app.post('/api/plugins/background-remover/settings', async (req, res) => {
            try {
                if (!req.session.user || req.session.user.role !== 'admin') {
                    return res.status(403).json({ error: 'Admin access required' });
                }
                
                // Update config
                this.config = { ...this.config, ...req.body };
                
                res.json({ success: true, message: 'Settings updated' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        app.get('/api/plugins/background-remover/stats', async (req, res) => {
            try {
                // Get stats from database
                const stats = await db.query(
                    'SELECT COUNT(*) as processed FROM logs WHERE message LIKE $1',
                    ['%Background removed%']
                );
                
                res.json({
                    success: true,
                    data: {
                        processed: parseInt(stats.rows[0].processed) || 0,
                        successRate: '95%' // Example
                    }
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        return {
            staticPath: 'background-remover/static',
            viewsPath: 'background-remover/views'
        };
    },
    
    // ========== IMAGE PROCESSING ==========
    processImage: async function(image) {
        const apiKey = this.config.apiKey;
        
        if (!apiKey || apiKey === 'xv5aoeuirxTNZBYS5KykZZEK') {
            // For demo purposes, simulate processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Return mock result
            return {
                url: 'https://via.placeholder.com/600x400/00ff00/ffffff?text=Background+Removed',
                format: this.config.outputFormat,
                size: image.size,
                processedAt: new Date()
            };
        }
        
        // Real remove.bg API call
        try {
            const formData = new FormData();
            formData.append('image_file', image.data, image.name);
            formData.append('size', 'auto');
            formData.append('format', this.config.outputFormat);
            
            const response = await axios({
                method: 'post',
                url: 'https://api.remove.bg/v1.0/removebg',
                data: formData,
                responseType: 'arraybuffer',
                headers: {
                    'X-Api-Key': apiKey,
                    ...formData.getHeaders()
                }
            });
            
            // Save processed image
            const filename = \`bg-removed-\${Date.now()}.\${this.config.outputFormat}\`;
            const filepath = path.join(__dirname, '../uploads/background-remover', filename);
            
            await fs.writeFile(filepath, response.data);
            
            // Convert to base64 for response
            const base64Data = response.data.toString('base64');
            const dataUrl = \`data:image/\${this.config.outputFormat};base64,\${base64Data}\`;
            
            return {
                url: dataUrl,
                filepath: \`/uploads/background-remover/\${filename}\`,
                format: this.config.outputFormat,
                size: response.data.length,
                processedAt: new Date()
            };
            
        } catch (error) {
            console.error('Remove.bg API error:', error.response?.data || error.message);
            throw new Error('Failed to process image with remove.bg API');
        }
    },
    
    // ========== CLEANUP ==========
    destroy: async function() {
        console.log('🖼️ Background Remover Plugin destroyed');
        // Cleanup resources if needed
    }
};
