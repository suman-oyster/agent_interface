// Main App Class
class AgentPortalApp {
    constructor() {
        this.currentFilter = 'all';
        this.questions = [];
        this.hqTeam = [];
        this.agents = [];
        this.currentUser = null;
        this.refreshTimer = null;
        this.currentQuestion = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkLoginStatus();
        this.setupAutoRefresh();
    }
    
    // Authentication
    checkLoginStatus() {
        const isLoggedIn = localStorage.getItem(CONFIG.STORAGE_KEYS.LOGIN_STATUS) === 'true';
        const savedUser = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
        
        if (isLoggedIn && savedUser) {
            this.currentUser = savedUser;
            this.showApp();
            this.loadData();
        } else if (isLoggedIn && !savedUser) {
            this.showUserSelection();
        } else {
            this.showLogin();
        }
    }
    
    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('user-selection-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'none';
        document.getElementById('password').focus();
    }
    
    showUserSelection() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('user-selection-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
        this.renderUserButtons();
    }
    
    showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('user-selection-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        this.updateUserHeader();
    }
    
    renderUserButtons() {
        const container = document.getElementById('user-buttons');
        container.innerHTML = this.agents.map(name => 
            `<button class="user-btn" onclick="app.setCurrentUser('${name}')">${name}</button>`
        ).join('');
    }
    
    setCurrentUser(userName) {
        this.currentUser = userName;
        localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER, userName);
        localStorage.setItem(CONFIG.STORAGE_KEYS.LOGIN_STATUS, 'true');
        this.showApp();
        this.loadData();
        UTILS.showToast(`Welcome, ${userName}!`);
    }
    
    updateUserHeader() {
        const headerContent = document.querySelector('.header-content h1');
        headerContent.innerHTML = `🏠 Oyster Agent Portal <span class="user-indicator">${this.currentUser}</span>`;
    }
    
    handleLogin(password) {
        if (password === CONFIG.PASSWORD) {
            this.loadTeamData().then(() => {
                this.showUserSelection();
            });
            document.getElementById('login-error').style.display = 'none';
            return true;
        } else {
            document.getElementById('login-error').style.display = 'block';
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
            return false;
        }
    }
    
    handleLogout() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.LOGIN_STATUS);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.CACHED_DATA);
        this.currentUser = null;
        this.showLogin();
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }
    
    // Data Loading
    async loadTeamData() {
        try {
            const data = await this.loadWithJsonp(`${CONFIG.API_URL}?action=getAgentData`);
            if (data.success) {
                this.hqTeam = data.hqTeam || ['Nick', 'Minal', 'Sarju', 'Anyone'];
                this.agents = data.agents || ['Amit', 'Ankit', 'Ankita'];
                this.populateHQDropdown();
            }
        } catch (error) {
            console.error('Error loading team data:', error);
            this.hqTeam = ['Nick', 'Minal', 'Sarju', 'Anyone'];
            this.agents = ['Amit', 'Ankit', 'Ankita'];
            this.populateHQDropdown();
        }
    }
    
    async loadData() {
        try {
            this.showLoading(true);
            
            const data = await this.loadWithJsonp(`${CONFIG.API_URL}?action=getAgentData`);
            
            if (data.success) {
                this.questions = data.questions || [];
                this.hqTeam = data.hqTeam || this.hqTeam;
                this.agents = data.agents || this.agents;
                
                this.populateHQDropdown();
                this.renderQuestions();
                this.updateStats();
                this.updateLastUpdated();
                
                // Cache data
                localStorage.setItem(CONFIG.STORAGE_KEYS.CACHED_DATA, JSON.stringify(this.questions));
                
                UTILS.showToast('Data loaded successfully');
            } else {
                throw new Error(data.error || 'Failed to load data');
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.loadCachedData();
            UTILS.showToast('Failed to load data. Showing cached data.', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    loadCachedData() {
        const cached = localStorage.getItem(CONFIG.STORAGE_KEYS.CACHED_DATA);
        if (cached) {
            try {
                this.questions = JSON.parse(cached);
                this.renderQuestions();
                this.updateStats();
            } catch (error) {
                console.error('Error loading cached data:', error);
                this.questions = [];
                this.renderQuestions();
            }
        }
    }
    
    loadWithJsonp(url) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
            
            window[callbackName] = function(data) {
                resolve(data);
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
                delete window[callbackName];
            };
            
            const script = document.createElement('script');
            script.src = url + '&callback=' + callbackName;
            script.onerror = function() {
                reject(new Error('Failed to load data'));
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
                delete window[callbackName];
            };
            
            document.head.appendChild(script);
        });
    }
    
    populateHQDropdown() {
        const select = document.getElementById('directed-to');
        const currentOptions = Array.from(select.options).map(opt => opt.value);
        
        // Add HQ team members if not already present
        this.hqTeam.forEach(member => {
            if (!currentOptions.includes(member)) {
                const option = document.createElement('option');
                option.value = member;
                option.textContent = member;
                select.appendChild(option);
            }
        });
    }
    
    // Filtering
    filterQuestions(questions) {
        switch (this.currentFilter) {
            case 'my-questions':
                return questions.filter(q => q.askedBy === this.currentUser);
            case 'pending':
                return questions.filter(q => 
                    q.askedBy === this.currentUser && 
                    (!q.finalResponse || q.finalResponse.trim() === '') &&
                    q.thread && q.thread.includes('HQ Team:')
                );
            case 'answered':
                return questions.filter(q => 
                    q.askedBy === this.currentUser && 
                    q.finalResponse && q.finalResponse.trim() !== ''
                );
            default:
                return questions;
        }
    }
    
    // UI Rendering
    renderQuestions() {
        const container = document.getElementById('questions-content');
        const noQuestionsEl = document.getElementById('no-questions');
        
        const filteredQuestions = this.filterQuestions(this.questions);
        
        if (filteredQuestions.length === 0) {
            container.innerHTML = '';
            noQuestionsEl.style.display = 'block';
            return;
        }
        
        noQuestionsEl.style.display = 'none';
        
        // Sort by priority and timestamp
        filteredQuestions.sort((a, b) => {
            const timeA = new Date(a.timestamp || 0);
            const timeB = new Date(b.timestamp || 0);
            return timeB - timeA;
        });
        
        container.innerHTML = filteredQuestions.map(question => this.renderQuestionCard(question)).join('');
    }
    
    renderQuestionCard(question) {
        const priorityInfo = UTILS.getPriorityInfo(question.priority);
        const timeAgo = UTILS.formatTime(question.timestamp);
        const hasResponse = question.finalResponse && question.finalResponse.trim() !== '';
        const hasHQMessage = question.thread && question.thread.includes('HQ Team:');
        const needsResponse = hasHQMessage && !hasResponse;
        
        let statusBadge;
        let statusClass;
        
        if (hasResponse) {
            statusBadge = '<span class="status-badge answered">✅ Answered</span>';
            statusClass = 'answered';
        } else if (needsResponse) {
            statusBadge = '<span class="status-badge more-info">🔄 Response Needed</span>';
            statusClass = 'more-info';
        } else {
            statusBadge = '<span class="status-badge new">⏳ Pending</span>';
            statusClass = 'new';
        }
        
        const summary = question.question && question.question.length > 100 
            ? question.question.substring(0, 100) + '...'
            : question.question || 'No question text';
        
        return `
            <div class="question-card priority-${question.priority?.toLowerCase()}" onclick="app.openQuestion('${question.id}')">
                <div class="question-meta">
                    <div class="question-badges">
                        <span class="priority-badge ${question.priority?.toLowerCase()}">${priorityInfo.emoji} ${question.priority}</span>
                        ${statusBadge}
                    </div>
                    <span>⏰ ${timeAgo}</span>
                </div>
                <div class="question-title">📍 ${question.property || 'Unknown Property'}</div>
                <div class="question-preview">${summary}</div>
                ${needsResponse ? '<div style="color: #f39c12; font-weight: 600; font-size: 12px; margin-top: 8px;">⚠️ HQ is asking for more information</div>' : ''}
            </div>
        `;
    }
    
    updateStats() {
        const myQuestions = this.questions.filter(q => q.askedBy === this.currentUser);
        const pending = myQuestions.filter(q => 
            (!q.finalResponse || q.finalResponse.trim() === '') &&
            q.thread && q.thread.includes('HQ Team:')
        );
        const answered = myQuestions.filter(q => 
            q.finalResponse && q.finalResponse.trim() !== ''
        );
        
        document.getElementById('my-questions-count').textContent = myQuestions.length;
        document.getElementById('pending-count').textContent = pending.length;
        document.getElementById('answered-count').textContent = answered.length;
    }
    
    updateLastUpdated() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        document.getElementById('last-updated').textContent = timeStr;
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        const content = document.getElementById('questions-content');
        
        if (show) {
            loading.style.display = 'block';
            content.style.display = 'none';
        } else {
            loading.style.display = 'none';
            content.style.display = 'block';
        }
    }
    
    // Question Detail Modal
    openQuestion(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (!question) {
            UTILS.showToast('Question not found', 'error');
            return;
        }
        
        this.currentQuestion = question;
        this.renderQuestionDetail(question);
        document.getElementById('question-modal').style.display = 'flex';
    }
    
    renderQuestionDetail(question) {
        const priorityInfo = UTILS.getPriorityInfo(question.priority);
        const timeFormatted = new Date(question.timestamp).toLocaleString('en-GB');
        const thread = UTILS.parseThread(question.thread);
        const hasResponse = question.finalResponse && question.finalResponse.trim() !== '';
        const hasHQMessage = thread.some(msg => msg.author.includes('HQ Team'));
        const needsResponse = hasHQMessage && !hasResponse;
        
        document.getElementById('modal-title').textContent = `${priorityInfo.emoji} ${question.priority} - ${question.property}`;
        
        const detailsHtml = `
            <div class="question-detail">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px;">
                    <div><strong>📍 Property:</strong> ${question.property || 'Not specified'}</div>
                    <div><strong>👤 Asked by:</strong> ${question.askedBy || 'Unknown'}</div>
                    <div><strong>⏰ Time:</strong> ${timeFormatted}</div>
                    <div><strong>🎯 Directed to:</strong> ${question.directedTo || 'Anyone'}</div>
                    ${question.fixfloId ? `<div><strong>🎫 Fixflo:</strong> ${question.fixfloId}</div>` : ''}
                </div>
                <div style="margin-top: 15px;"><strong>Question:</strong><br>${question.question || 'No question text provided'}</div>
                ${hasResponse ? `<div style="margin-top: 15px; padding: 10px; background: #d5f4e6; border-radius: 8px;"><strong>✅ Final Answer:</strong><br>${question.finalResponse}</div>` : ''}
            </div>
        `;
        
        document.getElementById('question-details').innerHTML = detailsHtml;
        this.renderThread(thread);
        
        // Show response form if HQ is asking for more info and no final answer yet
        const responseForm = document.getElementById('response-form');
        if (needsResponse) {
            responseForm.style.display = 'block';
            document.getElementById('thread-response').value = '';
        } else {
            responseForm.style.display = 'none';
        }
    }
    
    renderThread(messages) {
        if (messages.length === 0) {
            document.getElementById('thread-content').innerHTML = '<p style="color: #7f8c8d; font-style: italic;">No conversation yet.</p>';
            return;
        }
        
        const threadHtml = messages.map(msg => {
            const isHQ = msg.author.includes('HQ Team') || this.hqTeam.some(name => name !== 'Anyone' && msg.author.includes(name));
            const messageClass = isHQ ? 'hq-message' : '';
            
            return `
                <div class="thread-message ${messageClass}">
                    <div class="thread-meta">${msg.timestamp} - ${msg.author}</div>
                    <div class="thread-content">${msg.content}</div>
                </div>
            `;
        }).join('');
        
        document.getElementById('thread-content').innerHTML = threadHtml;
    }
    
    closeModal() {
        document.getElementById('question-modal').style.display = 'none';
        this.currentQuestion = null;
    }
    
    // Form Submission
    async submitQuestion() {
        const form = document.getElementById('question-form');
        const formData = new FormData(form);
        
        const questionData = {
            property: document.getElementById('property').value.trim(),
            fixfloId: document.getElementById('fixflo-id').value.trim(),
            priority: document.getElementById('priority').value,
            question: document.getElementById('question').value.trim(),
            directedTo: document.getElementById('directed-to').value,
            askedBy: this.currentUser
        };
        
        // Validate required fields
        if (!questionData.property || !questionData.priority || !questionData.question || !questionData.directedTo) {
            UTILS.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'submitQuestion',
                    ...questionData
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                UTILS.showToast('Question submitted successfully!');
                form.reset();
                this.loadData(); // Refresh questions
            } else {
                throw new Error(data.error || 'Failed to submit question');
            }
            
        } catch (error) {
            console.error('Error submitting question:', error);
            UTILS.showToast('Failed to submit question', 'error');
        }
    }
    
    async submitThreadResponse() {
        if (!this.currentQuestion) return;
        
        const responseText = document.getElementById('thread-response').value.trim();
        
        if (!responseText) {
            UTILS.showToast('Please enter a response', 'error');
            return;
        }
        
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'respondToThread',
                    questionId: this.currentQuestion.id,
                    message: responseText,
                    agentName: this.currentUser
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                UTILS.showToast('Response sent successfully!');
                this.closeModal();
                this.loadData();
            } else {
                throw new Error(data.error || 'Failed to send response');
            }
            
        } catch (error) {
            console.error('Error sending response:', error);
            UTILS.showToast('Failed to send response', 'error');
        }
    }
    
    clearForm() {
        document.getElementById('question-form').reset();
    }
    
    // Event Listeners
    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            this.handleLogin(password);
        });
        
        // Header controls
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadData();
        });
        
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                this.renderQuestions();
            });
        });
        
        // Question form
        document.getElementById('question-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitQuestion();
        });
        
        document.getElementById('clear-form').addEventListener('click', () => {
            this.clearForm();
        });
        
        // Modal controls
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('question-modal').addEventListener('click', (e) => {
            if (e.target.id === 'question-modal') {
                this.closeModal();
            }
        });
        
        // Thread response
        document.getElementById('submit-response-btn').addEventListener('click', () => {
            this.submitThreadResponse();
        });
        
        document.getElementById('cancel-response-btn').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Toast close buttons
        document.querySelectorAll('.toast-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.toast').style.display = 'none';
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }
    
    setupAutoRefresh() {
        this.refreshTimer = setInterval(() => {
            this.loadData();
        }, CONFIG.REFRESH_INTERVAL);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AgentPortalApp();
});
</script>
