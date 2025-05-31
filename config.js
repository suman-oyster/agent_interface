const CONFIG = {
    // Same API URL as HQ portal
    API_URL: 'https://script.google.com/macros/s/AKfycbxPXL5nZxBSI3yGnSTGoPnl1oNKpm3Eo37SqPQGgVzUQ-JtZWg8WSkWjneNypY0vz0/exec',
    
    // Same password as HQ
    PASSWORD: 'oysterHQ2025',
    
    // Agent-specific settings
    REFRESH_INTERVAL: 60000,
    
    // Agent-specific storage keys (different from HQ)
    STORAGE_KEYS: {
        LOGIN_STATUS: 'oyster_agent_logged_in',
        CURRENT_USER: 'oyster_agent_current_user',
        CACHED_DATA: 'oyster_agent_cached_data'
    }
};

const UTILS = {
    formatTime(date) {
        if (!date) return 'Unknown';
        const now = new Date();
        const questionTime = new Date(date);
        const diffMs = now - questionTime;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return questionTime.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getPriorityInfo(priority) {
        const priorities = {
            'P0': { emoji: '🚨', color: '#e74c3c' },
            'P1': { emoji: '🟠', color: '#f39c12' },
            'P2': { emoji: '🟡', color: '#3498db' },
            'P3': { emoji: '🟢', color: '#27ae60' },
            'P4': { emoji: '⚪', color: '#95a5a6' },
            'P5': { emoji: '⚫', color: '#bdc3c7' }
        };
        return priorities[priority] || priorities['P3'];
    },

    showToast(message, type = 'success') {
        const toast = document.getElementById(type === 'error' ? 'error-toast' : 'success-toast');
        const messageEl = toast.querySelector('span');
        
        messageEl.textContent = message;
        toast.style.display = 'flex';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    },

    parseThread(threadText) {
        if (!threadText) return [];
        
        const messages = [];
        const lines = threadText.split('\n');
        
        for (const line of lines) {
            const match = line.match(/^\[(.+?)\] (.+?): (.+)$/);
            if (match) {
                messages.push({
                    timestamp: match[1],
                    author: match[2],
                    content: match[3]
                });
            }
        }
        
        return messages;
    }
};
