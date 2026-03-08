// Enhanced Social Proof Service for UWD
// Multi-tenant Architecture Implementation

class SocialProofService {
    constructor(tenantId) {
        this.tenantId = tenantId;
        this.apiEndpoint = '/api/v1/social-proof';
    }

    // Initialize social proof for tenant
    async initializeSocialProof(config) {
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
            console.error('Failed to initialize social proof:', error);
            throw error;
        }
    }

    // Get social proof overview
    async getSocialProofOverview() {
        try {
            const response = await fetch(`${this.apiEndpoint}/overview`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get social proof overview:', error);
            throw error;
        }
    }

    // Get customer testimonials
    async getTestimonials(featured = false, industry = null, limit = null) {
        try {
            const params = new URLSearchParams();
            if (featured) params.append('featured', 'true');
            if (industry) params.append('industry', industry);
            if (limit) params.append('limit', limit);
            
            const response = await fetch(`${this.apiEndpoint}/testimonials?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get testimonials:', error);
            throw error;
        }
    }

    // Add customer testimonial
    async addTestimonial(testimonialData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/testimonials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(testimonialData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to add testimonial:', error);
            throw error;
        }
    }

    // Update testimonial
    async updateTestimonial(testimonialId, testimonialData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/testimonials/${testimonialId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(testimonialData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update testimonial:', error);
            throw error;
        }
    }

    // Get customer partnerships/logos
    async getCustomerPartnerships(partnershipType = null, featured = false) {
        try {
            const params = new URLSearchParams();
            if (partnershipType) params.append('partnership_type', partnershipType);
            if (featured) params.append('featured', 'true');
            
            const response = await fetch(`${this.apiEndpoint}/partnerships?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get customer partnerships:', error);
            throw error;
        }
    }

    // Add customer partnership
    async addCustomerPartnership(partnershipData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/partnerships`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(partnershipData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to add customer partnership:', error);
            throw error;
        }
    }

    // Get success metrics
    async getSuccessMetrics(customerId = null, metricType = null) {
        try {
            const params = new URLSearchParams();
            if (customerId) params.append('customer_id', customerId);
            if (metricType) params.append('metric_type', metricType);
            
            const response = await fetch(`${this.apiEndpoint}/metrics?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get success metrics:', error);
            throw error;
        }
    }

    // Add success metric
    async addSuccessMetric(metricData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/metrics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(metricData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to add success metric:', error);
            throw error;
        }
    }

    // Get industry success stories
    async getIndustrySuccessStories(industry = null, featured = false) {
        try {
            const params = new URLSearchParams();
            if (industry) params.append('industry', industry);
            if (featured) params.append('featured', 'true');
            
            const response = await fetch(`${this.apiEndpoint}/stories?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get industry success stories:', error);
            throw error;
        }
    }

    // Add industry success story
    async addIndustrySuccessStory(storyData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/stories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(storyData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to add industry success story:', error);
            throw error;
        }
    }

    // Get live customer metrics
    async getLiveCustomerMetrics() {
        try {
            const response = await fetch(`${this.apiEndpoint}/live-metrics`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get live customer metrics:', error);
            throw error;
        }
    }

    // Update live customer metrics
    async updateLiveCustomerMetrics(metricsData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/live-metrics`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(metricsData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update live customer metrics:', error);
            throw error;
        }
    }

    // Get display configuration
    async getDisplayConfiguration() {
        try {
            const response = await fetch(`${this.apiEndpoint}/display-config`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get display configuration:', error);
            throw error;
        }
    }

    // Update display configuration
    async updateDisplayConfiguration(configData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/display-config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(configData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update display configuration:', error);
            throw error;
        }
    }

    // Track social proof analytics
    async trackAnalytics(eventType, elementId, userType = 'visitor') {
        try {
            const response = await fetch(`${this.apiEndpoint}/analytics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify({
                    event_type: eventType,
                    element_id: elementId,
                    user_type: userType,
                    session_id: this.getSessionId(),
                    referrer_url: document.referrer
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to track analytics:', error);
        }
    }

    // Get social proof analytics
    async getSocialProofAnalytics(startDate, endDate, eventType = null) {
        try {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate
            });
            
            if (eventType) params.append('event_type', eventType);
            
            const response = await fetch(`${this.apiEndpoint}/analytics/report?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get social proof analytics:', error);
            throw error;
        }
    }

    // Generate social proof report
    async generateSocialProofReport(reportType, startDate, endDate) {
        try {
            const response = await fetch(`${this.apiEndpoint}/reports/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify({
                    report_type: reportType,
                    start_date: startDate,
                    end_date: endDate
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to generate social proof report:', error);
            throw error;
        }
    }

    // Helper method to get session ID
    getSessionId() {
        let sessionId = sessionStorage.getItem('social_proof_session');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('social_proof_session', sessionId);
        }
        return sessionId;
    }
}

// Social Proof Dashboard Manager
class SocialProofDashboardManager {
    constructor() {
        this.tenantId = this.getCurrentTenantId();
        this.socialProofService = new SocialProofService(this.tenantId);
        this.overview = {};
        this.testimonials = [];
        this.partnerships = [];
        this.successMetrics = [];
        this.stories = [];
        this.liveMetrics = {};
        this.displayConfig = {};
        
        this.init();
    }

    getCurrentTenantId() {
        return window.location.pathname.includes('/tenant/') ? 
            window.location.pathname.split('/')[2] : 'default';
    }

    async init() {
        await this.loadSocialProofOverview();
        await this.loadTestimonials();
        await this.loadCustomerPartnerships();
        await this.loadSuccessMetrics();
        await this.loadIndustryStories();
        await this.loadLiveMetrics();
        await this.loadDisplayConfiguration();
        this.setupEventListeners();
        this.startLiveUpdates();
    }

    async loadSocialProofOverview() {
        try {
            this.overview = await this.socialProofService.getSocialProofOverview();
            this.renderOverviewSection();
        } catch (error) {
            console.error('Failed to load social proof overview:', error);
        }
    }

    async loadTestimonials() {
        try {
            this.testimonials = await this.socialProofService.getTestimonials(true, null, 10);
            this.renderTestimonialsSection();
        } catch (error) {
            console.error('Failed to load testimonials:', error);
        }
    }

    async loadCustomerPartnerships() {
        try {
            this.partnerships = await this.socialProofService.getCustomerPartnerships('customer', true);
            this.renderPartnershipsSection();
        } catch (error) {
            console.error('Failed to load customer partnerships:', error);
        }
    }

    async loadSuccessMetrics() {
        try {
            this.successMetrics = await this.socialProofService.getSuccessMetrics();
            this.renderSuccessMetricsSection();
        } catch (error) {
            console.error('Failed to load success metrics:', error);
        }
    }

    async loadIndustryStories() {
        try {
            this.stories = await this.socialProofService.getIndustrySuccessStories(null, true);
            this.renderIndustryStoriesSection();
        } catch (error) {
            console.error('Failed to load industry stories:', error);
        }
    }

    async loadLiveMetrics() {
        try {
            this.liveMetrics = await this.socialProofService.getLiveCustomerMetrics();
            this.renderLiveMetricsSection();
        } catch (error) {
            console.error('Failed to load live metrics:', error);
        }
    }

    async loadDisplayConfiguration() {
        try {
            this.displayConfig = await this.socialProofService.getDisplayConfiguration();
            this.renderDisplayConfigSection();
        } catch (error) {
            console.error('Failed to load display configuration:', error);
        }
    }

    renderOverviewSection() {
        const overviewContainer = document.getElementById('social-proof-overview');
        if (!overviewContainer) return;

        overviewContainer.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Total Customers</h3>
                    <p class="text-3xl font-bold text-blue-600">${this.overview.customer_count || 0}</p>
                    <p class="text-sm text-gray-600">Active customers</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Total Rides</h3>
                    <p class="text-3xl font-bold text-green-600">${this.overview.total_rides || 0}</p>
                    <p class="text-sm text-gray-600">Completed rides</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Average Rating</h3>
                    <p class="text-3xl font-bold text-purple-600">${this.overview.average_rating || 0}</p>
                    <p class="text-sm text-gray-600">Out of 5 stars</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Testimonials</h3>
                    <p class="text-3xl font-bold text-orange-600">${this.overview.featured_testimonial_count || 0}</p>
                    <p class="text-sm text-gray-600">Featured testimonials</p>
                </div>
            </div>
        `;
    }

    renderTestimonialsSection() {
        const testimonialsContainer = document.getElementById('testimonials-section');
        if (!testimonialsContainer) return;

        testimonialsContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Customer Testimonials</h3>
                    <button onclick="socialProofDashboard.addTestimonial()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Testimonial
                    </button>
                </div>
                <div class="space-y-4">
                    ${this.testimonials.map(testimonial => `
                        <div class="border rounded-lg p-4">
                            <div class="flex justify-between items-start mb-2">
                                <div class="flex items-center">
                                    ${testimonial.customer_photo_url ? `
                                        <img src="${testimonial.customer_photo_url}" alt="${testimonial.customer_name}" class="w-12 h-12 rounded-full mr-3">
                                    ` : ''}
                                    <div>
                                        <h4 class="font-medium">${testimonial.customer_name}</h4>
                                        <p class="text-sm text-gray-600">${testimonial.customer_role || ''}</p>
                                        ${testimonial.customer_company ? `<p class="text-sm text-gray-500">${testimonial.customer_company}</p>` : ''}
                                    </div>
                                </div>
                                <div class="flex items-center">
                                    <div class="flex text-yellow-400 mr-2">
                                        ${Array(5).fill(0).map((_, i) => 
                                            `<i class="fas fa-star ${i < testimonial.rating ? '' : 'text-gray-300'}"></i>`
                                        ).join('')}
                                    </div>
                                    ${testimonial.featured ? '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Featured</span>' : ''}
                                </div>
                            </div>
                            <p class="text-gray-700 mb-2">${testimonial.testimonial_text}</p>
                            ${testimonial.industry_segment ? `<span class="text-sm text-blue-600">${testimonial.industry_segment}</span>` : ''}
                            ${testimonial.metrics ? `
                                <div class="mt-2 text-sm text-gray-600">
                                    ${Object.entries(testimonial.metrics).map(([key, value]) => `${key}: ${value}`).join(' | ')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderPartnershipsSection() {
        const partnershipsContainer = document.getElementById('partnerships-section');
        if (!partnershipsContainer) return;

        partnershipsContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Customer Logos</h3>
                    <button onclick="socialProofDashboard.addPartnership()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Customer
                    </button>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${this.partnerships.map(partnership => `
                        <div class="border rounded-lg p-3 text-center">
                            ${partnership.company_logo_url ? `
                                <img src="${partnership.company_logo_url}" alt="${partnership.company_name}" class="w-full h-16 object-contain mb-2">
                            ` : ''}
                            <p class="text-sm font-medium">${partnership.company_name}</p>
                            ${partnership.industry_segment ? `<p class="text-xs text-gray-500">${partnership.industry_segment}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderSuccessMetricsSection() {
        const metricsContainer = document.getElementById('success-metrics-section');
        if (!metricsContainer) return;

        metricsContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Success Metrics</h3>
                    <button onclick="socialProofDashboard.addSuccessMetric()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Metric
                    </button>
                </div>
                <div class="space-y-3">
                    ${this.successMetrics.slice(0, 10).map(metric => `
                        <div class="flex justify-between items-center p-3 border rounded">
                            <div>
                                <span class="font-medium">${metric.customer_name || 'Anonymous'}</span>
                                <span class="text-sm text-gray-500 ml-2">${metric.metric_type.replace('_', ' ').toUpperCase()}</span>
                            </div>
                            <div class="text-right">
                                <span class="text-lg font-bold text-green-600">${metric.metric_value}${metric.metric_unit || ''}</span>
                                ${metric.baseline_value ? `
                                    <span class="text-sm text-gray-500">from ${metric.baseline_value}${metric.metric_unit || ''}</span>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderIndustryStoriesSection() {
        const storiesContainer = document.getElementById('industry-stories-section');
        if (!storiesContainer) return;

        storiesContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Industry Success Stories</h3>
                    <button onclick="socialProofDashboard.addIndustryStory()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Story
                    </button>
                </div>
                <div class="space-y-4">
                    ${this.stories.map(story => `
                        <div class="border rounded-lg p-4">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="font-medium">${story.story_title}</h4>
                                    <p class="text-sm text-gray-600">${story.industry_segment}</p>
                                    ${story.customer_name ? `<p class="text-sm text-blue-600">${story.customer_name}</p>` : ''}
                                </div>
                                ${story.featured ? '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Featured</span>' : ''}
                            </div>
                            <p class="text-gray-700 mb-2">${story.story_summary}</p>
                            ${story.roi_metrics ? `
                                <div class="text-sm text-gray-600">
                                    ${Object.entries(story.roi_metrics).map(([key, value]) => `${key}: ${value}`).join(' | ')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderLiveMetricsSection() {
        const liveMetricsContainer = document.getElementById('live-metrics-section');
        if (!liveMetricsContainer) return;

        liveMetricsContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Live Customer Metrics</h3>
                    <button onclick="socialProofDashboard.updateLiveMetrics()" class="btn-secondary">
                        <i class="fas fa-sync-alt mr-2"></i>Update
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="text-center p-4 border rounded-lg">
                        <div class="text-2xl font-bold text-blue-600" id="live-customers">${this.liveMetrics.active_customers || 0}</div>
                        <div class="text-sm text-gray-600">Active Customers</div>
                    </div>
                    <div class="text-center p-4 border rounded-lg">
                        <div class="text-2xl font-bold text-green-600" id="live-bookings">${this.liveMetrics.total_bookings_today || 0}</div>
                        <div class="text-sm text-gray-600">Bookings Today</div>
                    </div>
                    <div class="text-center p-4 border rounded-lg">
                        <div class="text-2xl font-bold text-purple-600" id="live-rating">${this.liveMetrics.average_rating_today || 0}</div>
                        <div class="text-sm text-gray-600">Average Rating</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderDisplayConfigSection() {
        const configContainer = document.getElementById('display-config-section');
        if (!configContainer) return;

        configContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Display Configuration</h3>
                    <button onclick="socialProofDashboard.editDisplayConfig()" class="btn-primary">
                        <i class="fas fa-edit mr-2"></i>Edit Config
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="border rounded-lg p-3">
                        <h4 class="font-medium text-gray-900">Display Options</h4>
                        <div class="mt-2 space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" ${this.displayConfig.show_customer_counter ? 'checked' : ''} class="mr-2">
                                <span class="text-sm">Show Customer Counter</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" ${this.displayConfig.show_testimonials ? 'checked' : ''} class="mr-2">
                                <span class="text-sm">Show Testimonials</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" ${this.displayConfig.show_customer_logos ? 'checked' : ''} class="mr-2">
                                <span class="text-sm">Show Customer Logos</span>
                            </label>
                        </div>
                    </div>
                    <div class="border rounded-lg p-3">
                        <h4 class="font-medium text-gray-900">Animation Settings</h4>
                        <div class="mt-2 space-y-2">
                            <div class="text-sm">
                                <span class="font-medium">Counter Speed:</span> ${this.displayConfig.counter_animation_speed || 2000}ms
                            </div>
                            <div class="text-sm">
                                <span class="font-medium">Testimonial Rotation:</span> ${this.displayConfig.testimonial_rotation_speed || 5000}ms
                            </div>
                            <div class="text-sm">
                                <span class="font-medium">Logo Display Count:</span> ${this.displayConfig.logo_display_count || 12}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const refreshBtn = document.querySelector('[onclick="refreshSocialProofData()"]');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refreshAllData();
        }
    }

    startLiveUpdates() {
        // Update live metrics every 30 seconds
        setInterval(async () => {
            await this.loadLiveMetrics();
            this.updateLiveCounters();
        }, 30000);

        // Animate counters
        this.animateCounters();
    }

    animateCounters() {
        const counters = [
            { id: 'live-customers', target: this.liveMetrics.active_customers || 0 },
            { id: 'live-bookings', target: this.liveMetrics.total_bookings_today || 0 },
            { id: 'live-rating', target: this.liveMetrics.average_rating_today || 0 }
        ];

        counters.forEach(counter => {
            const element = document.getElementById(counter.id);
            if (element) {
                this.animateCounter(element, 0, counter.target, 2000);
            }
        });
    }

    animateCounter(element, start, end, duration) {
        const startTime = Date.now();
        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const value = Math.floor(start + (end - start) * progress);
            element.textContent = value.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    updateLiveCounters() {
        // Update live counter displays
        const customersElement = document.getElementById('live-customers');
        const bookingsElement = document.getElementById('live-bookings');
        const ratingElement = document.getElementById('live-rating');

        if (customersElement) {
            this.animateCounter(customersElement, parseInt(customersElement.textContent.replace(/,/g, '')), this.liveMetrics.active_customers || 0, 1000);
        }
        if (bookingsElement) {
            this.animateCounter(bookingsElement, parseInt(bookingsElement.textContent.replace(/,/g, '')), this.liveMetrics.total_bookings_today || 0, 1000);
        }
        if (ratingElement) {
            ratingElement.textContent = (this.liveMetrics.average_rating_today || 0).toFixed(1);
        }
    }

    async refreshAllData() {
        await Promise.all([
            this.loadSocialProofOverview(),
            this.loadTestimonials(),
            this.loadCustomerPartnerships(),
            this.loadSuccessMetrics(),
            this.loadIndustryStories(),
            this.loadLiveMetrics(),
            this.loadDisplayConfiguration()
        ]);
    }

    addTestimonial() {
        // Implementation for adding testimonials
        console.log('Add testimonial functionality');
    }

    addPartnership() {
        // Implementation for adding partnerships
        console.log('Add partnership functionality');
    }

    addSuccessMetric() {
        // Implementation for adding success metrics
        console.log('Add success metric functionality');
    }

    addIndustryStory() {
        // Implementation for adding industry stories
        console.log('Add industry story functionality');
    }

    updateLiveMetrics() {
        // Implementation for updating live metrics
        console.log('Update live metrics functionality');
    }

    editDisplayConfig() {
        // Implementation for editing display configuration
        console.log('Edit display configuration functionality');
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

// Initialize Social Proof dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('social-proof-dashboard')) {
        window.socialProofDashboard = new SocialProofDashboardManager();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SocialProofService, SocialProofDashboardManager };
}
