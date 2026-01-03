// Main JavaScript file
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initThemeSwitcher();
    initMobileMenu();
    initDropdowns();
    initForms();
    initNotifications();
    initMusicPlayer();
    
    // Check for session messages
    checkSessionMessages();
    
    // Initialize Socket.IO if available
    initSocketIO();
});

// Theme Switcher
function initThemeSwitcher() {
    const themeButtons = document.querySelectorAll('.theme-btn');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    
    themeButtons.forEach(button => {
        // Mark current theme as active
        if (button.getAttribute('data-theme') === currentTheme) {
            button.classList.add('active');
        }
        
        // Theme change handler
        button.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            
            // Update active state
            themeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Apply theme
            document.documentElement.setAttribute('data-theme', theme);
            
            // Save to cookie
            document.cookie = `theme=${theme}; max-age=${30 * 24 * 60 * 60}; path=/`;
            
            // Save to localStorage
            localStorage.setItem('theme', theme);
            
            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
        });
    });
    
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === savedTheme);
        });
    }
}

// Mobile Menu
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
}

// Dropdowns
function initDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle, .btn');
        
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const content = dropdown.querySelector('.dropdown-content');
                if (content) {
                    content.style.display = content.style.display === 'block' ? 'none' : 'block';
                }
            });
        }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-content').forEach(content => {
            content.style.display = 'none';
        });
    });
}

// Form handling
function initForms() {
    // Auto-submit OTP forms
    const otpInputs = document.querySelectorAll('.otp-input');
    if (otpInputs.length > 0) {
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
                
                // Auto-submit when all filled
                const allFilled = Array.from(otpInputs).every(i => i.value.length === 1);
                if (allFilled && index === otpInputs.length - 1) {
                    const form = input.closest('form');
                    if (form) {
                        setTimeout(() => form.submit(), 300);
                    }
                }
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
    }
    
    // Form validation
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            // Show loading
            submitBtn.innerHTML = '<span class="loading"></span> Processing...';
            submitBtn.disabled = true;
            
            try {
                const formData = new FormData(this);
                const response = await fetch(this.action, {
                    method: this.method,
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showNotification('success', result.message);
                    
                    if (result.redirect) {
                        setTimeout(() => {
                            window.location.href = result.redirect;
                        }, 1500);
                    }
                    
                    if (result.reset) {
                        this.reset();
                    }
                } else {
                    showNotification('error', result.error);
                }
            } catch (error) {
                showNotification('error', 'Network error. Please try again.');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    });
}

// Music Player
function initMusicPlayer() {
    const player = document.getElementById('musicPlayer');
    const toggleBtn = document.getElementById('musicToggle');
    const closeBtn = document.getElementById('musicClose');
    const audio = document.getElementById('musicAudio');
    
    if (player && audio) {
        // Play/pause toggle
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (audio.paused) {
                    audio.play();
                    toggleBtn.innerHTML = '⏸️';
                } else {
                    audio.pause();
                    toggleBtn.innerHTML = '▶️';
                }
            });
        }
        
        // Close player
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                player.style.display = 'none';
                audio.pause();
                audio.currentTime = 0;
            });
        }
        
        // Update button on play/pause
        audio.addEventListener('play', () => {
            if (toggleBtn) toggleBtn.innerHTML = '⏸️';
        });
        
        audio.addEventListener('pause', () => {
            if (toggleBtn) toggleBtn.innerHTML = '▶️';
        });
    }
}

// Socket.IO
function initSocketIO() {
    if (typeof io !== 'undefined') {
        const socket = io();
        
        // System notifications
        socket.on('system_notification', (data) => {
            showNotification(data.type || 'info', data.message, data.title);
        });
        
        // Plugin events
        socket.on('plugin_loaded', (data) => {
            showNotification('success', `Plugin "${data.name}" loaded`, 'Plugin Manager');
        });
        
        socket.on('plugin_error', (data) => {
            showNotification('error', data.error, 'Plugin Error');
        });
        
        // User notifications
        socket.on('user_notification', (data) => {
            if (data.userId === window.currentUserId) {
                showNotification(data.type || 'info', data.message, data.title);
            }
        });
        
        // Store socket globally
        window.socket = socket;
    }
}

// Utility functions
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('success', 'Copied to clipboard!');
    }).catch(() => {
        showNotification('error', 'Failed to copy');
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Session messages
function checkSessionMessages() {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const message = urlParams.get('message');
    
    if (success) {
        showNotification('success', decodeURIComponent(success));
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (error) {
        showNotification('error', decodeURIComponent(error));
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (message) {
        showNotification('info', decodeURIComponent(message));
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Global export
window.ShadowCore = {
    showNotification: window.showNotification,
    showSuccess: window.showSuccess,
    showError: window.showError,
    showWarning: window.showWarning,
    showInfo: window.showInfo,
    copyToClipboard,
    debounce,
    formatBytes
};
