// App Store Optimization (ASO) Service for UWD
// Multi-tenant Architecture Implementation

class AppStoreOptimizationService {
    constructor(tenantId) {
        this.tenantId = tenantId;
        this.apiEndpoint = '/api/v1/aso';
    }

    // Initialize ASO for tenant
    async initializeASO(config) {
        try {
            const response = await fetch(`${this.apiEndpoint}/initialize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(config)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to initialize ASO:', error);
            throw error;
        }
    }

    // Track app store performance
    async trackPerformance(platform, date, performanceData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/performance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify({
                    platform,
                    date,
                    ...performanceData
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to track performance:', error);
            throw error;
        }
    }

    // Get performance analytics
    async getPerformanceAnalytics(startDate, endDate, platform = null) {
        try {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate
            });
            
            if (platform) params.append('platform', platform);
            
            const response = await fetch(`${this.apiEndpoint}/analytics/performance?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get performance analytics:', error);
            throw error;
        }
    }

    // Manage app store reviews
    async getReviews(platform = null, status = null) {
        try {
            const params = new URLSearchParams();
            if (platform) params.append('platform', platform);
            if (status) params.append('status', status);
            
            const response = await fetch(`${this.apiEndpoint}/reviews?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get reviews:', error);
            throw error;
        }
    }

    // Respond to reviews
    async respondToReview(reviewId, responseText) {
        try {
            const response = await fetch(`${this.apiEndpoint}/reviews/${reviewId}/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify({
                    response_text: responseText
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to respond to review:', error);
            throw error;
        }
    }

    // Create A/B test
    async createABTest(testData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/ab-tests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(testData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to create A/B test:', error);
            throw error;
        }
    }

    // Get A/B test results
    async getABTestResults(testId = null) {
        try {
            const url = testId ? 
                `${this.apiEndpoint}/ab-tests/${testId}` : 
                `${this.apiEndpoint}/ab-tests`;
            
            const response = await fetch(url, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get A/B test results:', error);
            throw error;
        }
    }

    // Track keyword performance
    async trackKeywordPerformance(platform, keyword, date, performanceData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/keywords/performance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify({
                    platform,
                    keyword,
                    date,
                    ...performanceData
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to track keyword performance:', error);
            throw error;
        }
    }

    // Get keyword analytics
    async getKeywordAnalytics(startDate, endDate, platform = null) {
        try {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate
            });
            
            if (platform) params.append('platform', platform);
            
            const response = await fetch(`${this.apiEndpoint}/keywords/analytics?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get keyword analytics:', error);
            throw error;
        }
    }

    // Analyze competitors
    async analyzeCompetitors(competitorData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/competitors/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(competitorData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to analyze competitors:', error);
            throw error;
        }
    }

    // Get competitor analysis
    async getCompetitorAnalysis() {
        try {
            const response = await fetch(`${this.apiEndpoint}/competitors`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get competitor analysis:', error);
            throw error;
        }
    }

    // Create automation rule
    async createAutomationRule(ruleData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/automation/rules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(ruleData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to create automation rule:', error);
            throw error;
        }
    }

    // Get ASO score and recommendations
    async getASOScore() {
        try {
            const response = await fetch(`${this.apiEndpoint}/score`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get ASO score:', error);
            throw error;
        }
    }

    // Generate ASO report
    async generateASOReport(startDate, endDate) {
        try {
            const response = await fetch(`${this.apiEndpoint}/report/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify({
                    start_date: startDate,
                    end_date: endDate
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to generate ASO report:', error);
            throw error;
        }
    }
}

// ASO Dashboard Manager
class ASODashboardManager {
    constructor() {
        this.tenantId = this.getCurrentTenantId();
        this.asoService = new AppStoreOptimizationService(this.tenantId);
        this.performanceData = {};
        this.reviewData = {};
        this.keywordData = {};
        
        this.init();
    }

    getCurrentTenantId() {
        return window.location.pathname.includes('/tenant/') ? 
            window.location.pathname.split('/')[2] : 'default';
    }

    async init() {
        await this.loadPerformanceData();
        await this.loadReviewData();
        await this.loadKeywordData();
        this.setupEventListeners();
    }

    async loadPerformanceData() {
        try {
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            this.performanceData = await this.asoService.getPerformanceAnalytics(startDate, endDate);
            this.renderPerformanceCharts();
        } catch (error) {
            console.error('Failed to load performance data:', error);
        }
    }

    async loadReviewData() {
        try {
            this.reviewData = await this.asoService.getReviews();
            this.renderReviewSection();
        } catch (error) {
            console.error('Failed to load review data:', error);
        }
    }

    async loadKeywordData() {
        try {
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            this.keywordData = await this.asoService.getKeywordAnalytics(startDate, endDate);
            this.renderKeywordSection();
        } catch (error) {
            console.error('Failed to load keyword data:', error);
        }
    }

    renderPerformanceCharts() {
        // Implementation for performance charts
        const chartContainer = document.getElementById('performance-charts');
        if (!chartContainer) return;

        // Simple chart rendering (would use Chart.js or similar in production)
        chartContainer.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Total Downloads</h3>
                    <p class="text-3xl font-bold text-blue-600">${this.performanceData.totalDownloads || 0}</p>
                    <p class="text-sm text-gray-600">Last 30 days</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Conversion Rate</h3>
                    <p class="text-3xl font-bold text-green-600">${this.performanceData.averageConversionRate || 0}%</p>
                    <p class="text-sm text-gray-600">Average across platforms</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">ASO Score</h3>
                    <p class="text-3xl font-bold text-purple-600">${this.performanceData.asoScore || 0}/100</p>
                    <p class="text-sm text-gray-600">Current optimization score</p>
                </div>
            </div>
        `;
    }

    renderReviewSection() {
        const reviewContainer = document.getElementById('review-section');
        if (!reviewContainer) return;

        const pendingReviews = this.reviewData.filter(review => review.status === 'pending');
        
        reviewContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Recent Reviews</h3>
                    <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                        ${pendingReviews.length} Pending Response
                    </span>
                </div>
                <div class="space-y-3">
                    ${this.reviewData.slice(0, 5).map(review => `
                        <div class="border rounded-lg p-3">
                            <div class="flex justify-between items-start mb-2">
                                <div class="flex items-center">
                                    <div class="flex text-yellow-400">
                                        ${Array(5).fill(0).map((_, i) => 
                                            `<i class="fas fa-star ${i < review.rating ? '' : 'text-gray-300'}"></i>`
                                        ).join('')}
                                    </div>
                                    <span class="ml-2 font-medium">${review.reviewer_name}</span>
                                </div>
                                <span class="text-sm text-gray-500">${new Date(review.review_date).toLocaleDateString()}</span>
                            </div>
                            <p class="text-gray-700 mb-2">${review.review_text}</p>
                            ${review.status === 'pending' ? `
                                <button onclick="asoDashboard.respondToReview(${review.id})" class="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                                    Respond
                                </button>
                            ` : `
                                <span class="text-sm text-green-600">✓ Responded</span>
                            `}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderKeywordSection() {
        const keywordContainer = document.getElementById('keyword-section');
        if (!keywordContainer) return;

        keywordContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <h3 class="text-lg font-semibold mb-4">Keyword Performance</h3>
                <div class="space-y-2">
                    ${this.keywordData.slice(0, 10).map(keyword => `
                        <div class="flex justify-between items-center p-2 border rounded">
                            <div>
                                <span class="font-medium">${keyword.keyword}</span>
                                <span class="text-sm text-gray-500 ml-2">${keyword.platform.toUpperCase()}</span>
                            </div>
                            <div class="flex items-center space-x-4">
                                <span class="text-sm">Rank: #${keyword.ranking_position || '--'}</span>
                                <span class="text-sm">Traffic: ${keyword.estimated_traffic || '--'}</span>
                                <span class="text-sm font-medium ${keyword.competition_level === 'high' ? 'text-red-600' : keyword.competition_level === 'medium' ? 'text-yellow-600' : 'text-green-600'}">
                                    ${keyword.competition_level || '--'}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Setup event listeners for ASO dashboard interactions
        const refreshBtn = document.querySelector('[onclick="refreshASOData()"]');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refreshAllData();
        }
    }

    async refreshAllData() {
        await Promise.all([
            this.loadPerformanceData(),
            this.loadReviewData(),
            this.loadKeywordData()
        ]);
    }

    async respondToReview(reviewId) {
        const responseText = prompt('Enter your response:');
        if (responseText) {
            try {
                await this.asoService.respondToReview(reviewId, responseText);
                await this.loadReviewData();
                this.showNotification('Response sent successfully', 'success');
            } catch (error) {
                this.showNotification('Failed to send response', 'error');
            }
        }
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize ASO dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('aso-dashboard')) {
        window.asoDashboard = new ASODashboardManager();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppStoreOptimizationService, ASODashboardManager };
}
