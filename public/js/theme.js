// Theme management
class ThemeManager {
    constructor() {
        this.themes = {
            dark: {
                name: 'Dark',
                colors: {
                    primary: '#6366f1',
                    secondary: '#8b5cf6',
                    background: '#0f172a',
                    card: '#1e293b',
                    text: '#f8fafc'
                }
            },
            light: {
                name: 'Light',
                colors: {
                    primary: '#3b82f6',
                    secondary: '#8b5cf6',
                    background: '#f8fafc',
                    card: '#ffffff',
                    text: '#0f172a'
                }
            },
            midnight: {
                name: 'Midnight',
                colors: {
                    primary: '#8b5cf6',
                    secondary: '#ec4899',
                    background: '#030712',
                    card: '#111827',
                    text: '#f9fafb'
                }
            },
            ocean: {
                name: 'Ocean',
                colors: {
                    primary: '#06b6d4',
                    secondary: '#0ea5e9',
                    background: '#0c4a6e',
                    card: '#075985',
                    text: '#f0f9ff'
                }
            },
            sunset: {
                name: 'Sunset',
                colors: {
                    primary: '#f97316',
                    secondary: '#ec4899',
                    background: '#7c2d12',
                    card: '#9a3412',
                    text: '#fffbeb'
                }
            },
            forest: {
                name: 'Forest',
                colors: {
                    primary: '#10b981',
                    secondary: '#059669',
                    background: '#064e3b',
                    card: '#065f46',
                    text: '#f0fdf4'
                }
            }
        };
        
        this.currentTheme = this.getSavedTheme();
        this.init();
    }
    
    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeSwitcher();
        this.setupThemePreview();
        
        // Listen for system theme changes
        this.detectSystemTheme();
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('themeloaded', {
            detail: { theme: this.currentTheme }
        }));
    }
    
    getSavedTheme() {
        // Check cookie first
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('theme='))
            ?.split('=')[1];
        
        if (cookieValue && this.themes[cookieValue]) {
            return cookieValue;
        }
        
        // Check localStorage
        const localStorageValue = localStorage.getItem('theme');
        if (localStorageValue && this.themes[localStorageValue]) {
            return localStorageValue;
        }
        
        // Default to dark
        return 'dark';
    }
    
    applyTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn(`Theme "${themeName}" not found, using dark`);
            themeName = 'dark';
        }
        
        const theme = this.themes[themeName];
        
        // Update data-theme attribute
        document.documentElement.setAttribute('data-theme', themeName);
        
        // Update CSS variables
        const root = document.documentElement;
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
        });
        
        // Update theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === themeName);
        });
        
        this.currentTheme = themeName;
        
        // Save to cookie and localStorage
        document.cookie = `theme=${themeName}; max-age=${30 * 24 * 60 * 60}; path=/`;
        localStorage.setItem('theme', themeName);
        
        // Dispatch change event
        document.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: themeName, themeData: theme }
        }));
        
        // Notify server if user is logged in
        if (typeof socket !== 'undefined') {
            socket.emit('theme_changed', { theme: themeName });
        }
        
        console.log(`Theme applied: ${themeName}`);
    }
    
    setupThemeSwitcher() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.getAttribute('data-theme');
                this.applyTheme(theme);
            });
        });
        
        // Add theme selector dropdown if not exists
        if (!document.querySelector('.theme-selector')) {
            this.createThemeSelector();
        }
    }
    
    createThemeSelector() {
        const selector = document.createElement('div');
        selector.className = 'theme-selector dropdown';
        selector.innerHTML = `
            <button class="btn btn-sm" style="display: flex; align-items: center; gap: 0.5rem;">
                <span>🎨</span>
                <span>Theme</span>
                <span>▼</span>
            </button>
            <div class="dropdown-content" style="min-width: 200px;">
                ${Object.entries(this.themes).map(([id, theme]) => `
                    <button class="theme-option ${id === this.currentTheme ? 'active' : ''}" 
                            data-theme="${id}"
                            style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; width: 100%; background: none; border: none; color: var(--text-primary); text-align: left;">
                        <div class="theme-preview" style="width: 20px; height: 20px; border-radius: 4px; background: ${theme.colors.primary};"></div>
                        <span>${theme.name}</span>
                        ${id === this.currentTheme ? '✓' : ''}
                    </button>
                `).join('')}
            </div>
        `;
        
        // Add to page
        const container = document.querySelector('.theme-switcher') || document.querySelector('.nav-menu');
        if (container) {
            container.appendChild(selector);
        }
        
        // Add event listeners
        selector.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.applyTheme(theme);
                
                // Close dropdown
                selector.querySelector('.dropdown-content').style.display = 'none';
            });
        });
        
        // Toggle dropdown
        selector.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = selector.querySelector('.dropdown-content');
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
        
        // Close when clicking outside
        document.addEventListener('click', () => {
            selector.querySelector('.dropdown-content').style.display = 'none';
        });
    }
    
    setupThemePreview() {
        // Add theme preview to theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            const theme = btn.getAttribute('data-theme');
            if (theme && this.themes[theme]) {
                const color = this.themes[theme].colors.primary;
                btn.style.background = color;
                btn.style.borderColor = color;
            }
        });
    }
    
    detectSystemTheme() {
        // Detect system theme preference
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            const handleChange = (e) => {
                // Only apply system theme if user hasn't chosen one
                if (!localStorage.getItem('theme') && !document.cookie.includes('theme=')) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            };
            
            darkModeQuery.addEventListener('change', handleChange);
            
            // Initial check
            if (!localStorage.getItem('theme') && !document.cookie.includes('theme=')) {
                this.applyTheme(darkModeQuery.matches ? 'dark' : 'light');
            }
        }
    }
    
    // Get current theme info
    getCurrentTheme() {
        return {
            id: this.currentTheme,
            ...this.themes[this.currentTheme]
        };
    }
    
    // Get all themes
    getAllThemes() {
        return this.themes;
    }
    
    // Create theme CSS
    generateThemeCSS(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return '';
        
        return `
            [data-theme="${themeName}"] {
                --primary: ${theme.colors.primary};
                --secondary: ${theme.colors.secondary};
                --background: ${theme.colors.background};
                --card: ${theme.colors.card};
                --text: ${theme.colors.text};
            }
        `;
    }
}

// Initialize theme manager
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
    
    // Export to global scope
    window.applyTheme = (themeName) => window.themeManager.applyTheme(themeName);
    window.getCurrentTheme = () => window.themeManager.getCurrentTheme();
    window.getAllThemes = () => window.themeManager.getAllThemes();
});

// Theme-related utility functions
function generateThemeGradient(theme = 'dark') {
    const gradients = {
        dark: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        light: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        midnight: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
        ocean: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
        sunset: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
        forest: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    };
    
    return gradients[theme] || gradients.dark;
}

function getThemeContrastColor(theme = 'dark') {
    const lightThemes = ['light'];
    return lightThemes.includes(theme) ? '#000000' : '#ffffff';
}

// Theme change event listeners
document.addEventListener('themechange', (e) => {
    const { theme, themeData } = e.detail;
    
    // Update theme-specific elements
    document.querySelectorAll('[data-theme-bg]').forEach(el => {
        el.style.background = themeData.colors.background;
    });
    
    document.querySelectorAll('[data-theme-color]').forEach(el => {
        el.style.color = themeData.colors.text;
    });
    
    document.querySelectorAll('[data-theme-gradient]').forEach(el => {
        el.style.background = generateThemeGradient(theme);
    });
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.content = themeData.colors.primary;
    }
    
    // Update favicon for theme
    updateFaviconForTheme(theme);
});

function updateFaviconForTheme(theme) {
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
        // Create a dynamic favicon based on theme
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        const themeColors = {
            dark: '#6366f1',
            light: '#3b82f6',
            midnight: '#8b5cf6',
            ocean: '#06b6d4',
            sunset: '#f97316',
            forest: '#10b981'
        };
        
        const color = themeColors[theme] || themeColors.dark;
        
        // Draw favicon
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#ffffff';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚀', 32, 32);
        
        // Update favicon
        favicon.href = canvas.toDataURL('image/png');
    }
}
