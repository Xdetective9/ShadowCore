// Plugin System JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initPluginSystem();
    initPluginSearch();
    initPluginCategories();
    initPluginActions();
});

// Initialize plugin system
function initPluginSystem() {
    console.log('Plugin system initialized');
    
    // Load installed plugins
    loadInstalledPlugins();
    
    // Check for plugin updates
    checkPluginUpdates();
    
    // Initialize plugin marketplace
    initPluginMarketplace();
}

// Plugin search functionality
function initPluginSearch() {
    const searchInput = document.getElementById('pluginSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', debounce(function() {
        const searchTerm = this.value.toLowerCase().trim();
        const pluginCards = document.querySelectorAll('.plugin-card');
        
        pluginCards.forEach(card => {
            const pluginName = card.dataset.name.toLowerCase();
            const pluginDesc = card.dataset.description.toLowerCase();
            const pluginTags = card.dataset.tags.toLowerCase();
            
            if (searchTerm === '' || 
                pluginName.includes(searchTerm) || 
                pluginDesc.includes(searchTerm) ||
                pluginTags.includes(searchTerm)) {
                card.style.display = 'block';
                card.style.animation = 'plugin-load 0.6s ease-out';
            } else {
                card.style.display = 'none';
            }
        });
        
        // Show/hide empty state
        const visibleCards = Array.from(pluginCards).filter(card => 
            card.style.display !== 'none'
        );
        
        const emptyState = document.getElementById('pluginsEmptyState');
        if (emptyState) {
            emptyState.style.display = visibleCards.length === 0 ? 'block' : 'none';
        }
    }, 300));
}

// Plugin categories filter
function initPluginCategories() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    const pluginCards = document.querySelectorAll('.plugin-card');
    
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            categoryButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.dataset.category;
            
            // Filter plugins
            pluginCards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'block';
                    card.style.animation = 'plugin-load 0.6s ease-out';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// Plugin actions (install, remove, update)
function initPluginActions() {
    // Install plugin
    document.querySelectorAll('.plugin-install').forEach(btn => {
        btn.addEventListener('click', function() {
            const pluginId = this.dataset.plugin;
            const pluginName = this.dataset.name;
            
            if (confirm(`Install "${pluginName}" plugin?`)) {
                installPlugin(pluginId);
            }
        });
    });
    
    // Remove plugin
    document.querySelectorAll('.plugin-remove').forEach(btn => {
        btn.addEventListener('click', function() {
            const pluginId = this.dataset.plugin;
            const pluginName = this.dataset.name;
            
            if (confirm(`Remove "${pluginName}" plugin?`)) {
                removePlugin(pluginId);
            }
        });
    });
    
    // Update plugin
    document.querySelectorAll('.plugin-update').forEach(btn => {
        btn.addEventListener('click', function() {
            const pluginId = this.dataset.plugin;
            const pluginName = this.dataset.name;
            
            if (confirm(`Update "${pluginName}" to latest version?`)) {
                updatePlugin(pluginId);
            }
        });
    });
    
    // Toggle plugin
    document.querySelectorAll('.plugin-toggle').forEach(btn => {
        btn.addEventListener('click', function() {
            const pluginId = this.dataset.plugin;
            const enabled = this.checked;
            
            togglePlugin(pluginId, enabled);
        });
    });
}

// Load installed plugins
function loadInstalledPlugins() {
    fetch('/api/plugins/installed')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.plugins) {
                updatePluginList(data.plugins);
            }
        })
        .catch(console.error);
}

// Check for plugin updates
function checkPluginUpdates() {
    fetch('/api/plugins/updates')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.updates.length > 0) {
                showUpdateNotification(data.updates);
            }
        })
        .catch(console.error);
}

// Install plugin
function installPlugin(pluginId) {
    const btn = document.querySelector(`[data-plugin="${pluginId}"]`);
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="loading"></span> Installing...';
    btn.disabled = true;
    
    fetch(`/api/plugins/${pluginId}/install`, {
        method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('success', `Plugin "${data.plugin.name}" installed successfully`);
            
            // Update UI
            updatePluginCard(pluginId, 'installed');
            
            // Reload page after 2 seconds
            setTimeout(() => location.reload(), 2000);
        } else {
            showNotification('error', `Installation failed: ${data.error}`);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    })
    .catch(error => {
        showNotification('error', `Network error: ${error.message}`);
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

// Remove plugin
function removePlugin(pluginId) {
    fetch(`/api/plugins/${pluginId}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('success', 'Plugin removed successfully');
            
            // Remove from UI
            const card = document.querySelector(`.plugin-card[data-id="${pluginId}"]`);
            if (card) {
                card.style.animation = 'plugin-load 0.6s ease-out reverse';
                setTimeout(() => card.remove(), 600);
            }
        } else {
            showNotification('error', `Removal failed: ${data.error}`);
        }
    });
}

// Update plugin
function updatePlugin(pluginId) {
    const btn = document.querySelector(`[data-plugin="${pluginId}"] .plugin-update`);
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="loading"></span> Updating...';
    
    fetch(`/api/plugins/${pluginId}/update`, {
        method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('success', `Plugin updated to v${data.plugin.version}`);
            btn.innerHTML = 'Updated';
            btn.disabled = true;
            
            // Update version display
            const versionSpan = document.querySelector(`[data-plugin="${pluginId}"] .plugin-version`);
            if (versionSpan) {
                versionSpan.textContent = `v${data.plugin.version}`;
            }
        } else {
            showNotification('error', `Update failed: ${data.error}`);
            btn.innerHTML = originalText;
        }
    });
}

// Toggle plugin
function togglePlugin(pluginId, enabled) {
    fetch(`/api/plugins/${pluginId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('success', 
                `Plugin ${enabled ? 'enabled' : 'disabled'} successfully`);
            
            // Update UI
            const statusBadge = document.querySelector(`[data-plugin="${pluginId}"] .plugin-status`);
            if (statusBadge) {
                statusBadge.className = `plugin-status ${enabled ? 'active' : 'disabled'}`;
                statusBadge.textContent = enabled ? 'Active' : 'Disabled';
            }
        } else {
            showNotification('error', `Operation failed: ${data.error}`);
            
            // Revert toggle
            const toggle = document.querySelector(`[data-plugin="${pluginId}"] .plugin-toggle`);
            if (toggle) {
                toggle.checked = !enabled;
            }
        }
    });
}

// Update plugin list UI
function updatePluginList(plugins) {
    const container = document.getElementById('pluginsContainer');
    if (!container) return;
    
    // Clear existing plugins
    const existingPlugins = container.querySelectorAll('.plugin-card');
    existingPlugins.forEach(plugin => plugin.remove());
    
    // Add new plugins
    plugins.forEach(plugin => {
        const pluginCard = createPluginCard(plugin);
        container.appendChild(pluginCard);
    });
}

// Create plugin card HTML
function createPluginCard(plugin) {
    const card = document.createElement('div');
    card.className = 'plugin-card';
    card.dataset.id = plugin.id;
    card.dataset.name = plugin.name;
    card.dataset.description = plugin.description;
    card.dataset.category = plugin.category;
    card.dataset.tags = plugin.tags?.join(',') || '';
    
    card.innerHTML = `
        <div class="plugin-icon">${plugin.icon || '🧩'}</div>
        
        <div class="plugin-status ${plugin.enabled ? 'active' : 'disabled'}">
            ${plugin.enabled ? 'Active' : 'Disabled'}
        </div>
        
        <h3 class="plugin-name">${plugin.name}</h3>
        
        <p class="plugin-description">${plugin.description}</p>
        
        <div class="plugin-meta">
            <span class="plugin-tag">v${plugin.version}</span>
            <span class="plugin-tag">${plugin.author}</span>
            <span class="plugin-tag">${plugin.category}</span>
        </div>
        
        ${plugin.dependencies && plugin.dependencies.length > 0 ? `
            <div class="plugin-dependencies">
                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                    Dependencies:
                </div>
                <div class="dependency-list">
                    ${plugin.dependencies.map(dep => `
                        <span class="dependency-badge">${dep}</span>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <div class="plugin-actions">
            ${plugin.installed ? `
                <button class="btn btn-sm btn-secondary plugin-toggle" 
                        data-plugin="${plugin.id}"
                        style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" class="plugin-toggle-checkbox" 
                           ${plugin.enabled ? 'checked' : ''}
                           style="margin: 0;">
                    <span>${plugin.enabled ? 'Disable' : 'Enable'}</span>
                </button>
                
                <button class="btn btn-sm btn-primary" 
                        onclick="window.location.href='/plugins/${plugin.id}'">
                    ⚙️ Configure
                </button>
                
                ${plugin.hasUpdate ? `
                    <button class="btn btn-sm btn-warning plugin-update" 
                            data-plugin="${plugin.id}"
                            data-name="${plugin.name}">
                        🔄 Update
                    </button>
                ` : ''}
                
                <button class="btn btn-sm btn-danger plugin-remove" 
                        data-plugin="${plugin.id}"
                        data-name="${plugin.name}">
                    🗑️ Remove
                </button>
            ` : `
                <button class="btn btn-sm btn-primary plugin-install" 
                        data-plugin="${plugin.id}"
                        data-name="${plugin.name}">
                    📥 Install
                </button>
                
                <button class="btn btn-sm btn-secondary" 
                        onclick="previewPlugin('${plugin.id}')">
                    👁️ Preview
                </button>
            `}
        </div>
    `;
    
    return card;
}

// Initialize plugin marketplace
function initPluginMarketplace() {
    // Load marketplace plugins
    fetch('/api/plugins/marketplace')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.plugins) {
                // Could implement marketplace display here
            }
        });
}

// Show update notification
function showUpdateNotification(updates) {
    if (updates.length === 0) return;
    
    const updateCount = updates.length;
    const pluginNames = updates.map(u => u.name).join(', ');
    
    const notification = showNotification('warning', 
        `${updateCount} plugin${updateCount > 1 ? 's' : ''} have updates available: ${pluginNames}`,
        'Plugin Updates Available'
    );
    
    // Add update all button to notification
    const updateAllBtn = document.createElement('button');
    updateAllBtn.className = 'btn btn-sm btn-primary';
    updateAllBtn.textContent = 'Update All';
    updateAllBtn.style.marginLeft = '1rem';
    updateAllBtn.onclick = () => {
        updateAllPlugins(updates);
        notification.remove();
    };
    
    notification.querySelector('.notification-content').appendChild(updateAllBtn);
}

// Update all plugins
function updateAllPlugins(updates) {
    showNotification('info', 'Updating all plugins...', 'Plugin Updates');
    
    const updatePromises = updates.map(plugin => 
        fetch(`/api/plugins/${plugin.id}/update`, { method: 'POST' })
            .then(res => res.json())
    );
    
    Promise.allSettled(updatePromises)
        .then(results => {
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
            const failed = results.filter(r => r.status === 'rejected' || !r.value?.success);
            
            if (failed.length === 0) {
                showNotification('success', 
                    `Successfully updated ${successful.length} plugins`,
                    'Updates Complete'
                );
                setTimeout(() => location.reload(), 2000);
            } else {
                showNotification('warning',
                    `Updated ${successful.length} plugins, ${failed.length} failed`,
                    'Partial Update'
                );
            }
        });
}

// Export functions to global scope
window.PluginSystem = {
    installPlugin,
    removePlugin,
    updatePlugin,
    togglePlugin,
    loadInstalledPlugins,
    checkPluginUpdates
};
