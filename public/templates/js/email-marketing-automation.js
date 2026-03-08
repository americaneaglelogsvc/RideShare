// Email Marketing Automation Service for UWD
// Phase 1 Implementation: US Market Email Marketing Suite

class EmailMarketingService {
    constructor(tenantId) {
        this.tenantId = tenantId;
        this.apiEndpoint = '/api/v1/email';
    }

    // US Market Email Templates
    static getUSEmailTemplates() {
        return {
            welcome_rider: {
                subject: "Welcome to {{tenant_name}} - Your Ride Awaits!",
                content: `
                    <h2>Welcome to {{tenant_name}}!</h2>
                    <p>Thank you for joining {{tenant_name}}. We're excited to provide you with premium transportation services.</p>
                    <p>Get started with your first ride and enjoy a special welcome offer:</p>
                    <div style="background: #f0f0f0; padding: 15px; margin: 20px 0;">
                        <h3>Special Offer: 20% off your first ride!</h3>
                        <p>Use code: WELCOME20</p>
                        <p>Valid for 30 days from signup</p>
                    </div>
                    <p>Download our app to book your first ride:</p>
                    <a href="{{app_store_url}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download App</a>
                `
            },
            
            welcome_driver: {
                subject: "Welcome to {{tenant_name}} Driver Network!",
                content: `
                    <h2>Welcome to the {{tenant_name}} Driver Team!</h2>
                    <p>We're thrilled to have you join our network of professional drivers.</p>
                    <p>Next steps to get you on the road:</p>
                    <ol>
                        <li>Complete your profile verification</li>
                        <li>Upload required documents</li>
                        <li>Complete driver training</li>
                        <li>Start accepting rides</li>
                    </ol>
                    <p>Need help? Contact our driver support team at {{driver_support_email}}</p>
                `
            },
            
            booking_confirmation: {
                subject: "Your {{tenant_name}} Booking Confirmation",
                content: `
                    <h2>Booking Confirmed!</h2>
                    <p>Your ride has been confirmed. Here are the details:</p>
                    <div style="background: #f9f9f9; padding: 15px; margin: 10px 0;">
                        <p><strong>Booking ID:</strong> {{booking_id}}</p>
                        <p><strong>Pickup:</strong> {{pickup_address}}</p>
                        <p><strong>Dropoff:</strong> {{dropoff_address}}</p>
                        <p><strong>Date:</strong> {{booking_date}}</p>
                        <p><strong>Time:</strong> {{booking_time}}</p>
                        <p><strong>Driver:</strong> {{driver_name}}</p>
                        <p><strong>Vehicle:</strong> {{vehicle_type}} - {{vehicle_color}} ({{vehicle_plate}})</p>
                        <p><strong>Estimated Fare:</strong> ${{estimated_fare}}</p>
                    </div>
                    <p>Track your ride in real-time using our app.</p>
                    <a href="{{tracking_url}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Your Ride</a>
                `
            },
            
            promotional_offer: {
                subject: "Special Offer from {{tenant_name}} - {{offer_title}}",
                content: `
                    <h2>{{offer_title}}</h2>
                    <p>{{offer_description}}</p>
                    
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; margin: 20px 0; border-radius: 10px;">
                        <h3 style="color: white;">{{discount_percentage}}% OFF</h3>
                        <p style="color: white;">{{offer_details}}</p>
                        <p style="color: white;">Use code: {{promo_code}}</p>
                        <p style="color: white;">Valid until: {{expiry_date}}</p>
                    </div>
                    
                    <a href="{{booking_url}}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">Book Your Ride Now</a>
                    
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">
                        Terms and conditions apply. Offer valid for {{validity_period}} from receipt of this email.
                    </p>
                `
            },
            
            retention_campaign: {
                subject: "We Miss You at {{tenant_name}} - Special Welcome Back Offer",
                content: `
                    <h2>We Miss You!</h2>
                    <p>It's been a while since your last ride with {{tenant_name}}. We'd love to have you back!</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center;">
                        <h3>Welcome Back Offer</h3>
                        <p style="font-size: 24px; color: #28a745; font-weight: bold;">{{discount_percentage}}% OFF</p>
                        <p>Your next ride is on us!</p>
                        <p>Use code: WELCOMEBACK</p>
                        <p>Valid for 7 days</p>
                    </div>
                    
                    <p>Book your ride today and experience the {{tenant_name}} difference:</p>
                    <ul>
                        <li>Professional, courteous drivers</li>
                        <li>Premium, well-maintained vehicles</li>
                        <li>Real-time ride tracking</li>
                        <li>24/7 customer support</li>
                    </ul>
                    
                    <a href="{{booking_url}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">Book Your Welcome Back Ride</a>
                `
            }
        };
    }

    // Personalize email content with customer data
    personalizeContent(template, customer) {
        return template
            .replace(/\{\{customer_name\}\}/g, customer.name || 'Valued Customer')
            .replace(/\{\{customer_email\}\}/g, customer.email || '')
            .replace(/\{\{tenant_name\}\}/g, customer.tenant_name || 'UWD Platform')
            .replace(/\{\{promo_code\}\}/g, this.generatePromoCode(customer.id));
    }

    // Generate unique promo codes
    generatePromoCode(customerId) {
        return `WELCOME${customerId.toString().slice(-4).toUpperCase()}`;
    }

    // Send email campaign
    async sendCampaign(campaignId, customerSegment) {
        try {
            const response = await fetch(`${this.apiEndpoint}/campaigns/${campaignId}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify({ customerSegment })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to send campaign:', error);
            throw error;
        }
    }

    // Create new email campaign
    async createCampaign(campaignData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/campaigns`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(campaignData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to create campaign:', error);
            throw error;
        }
    }
}

// Email Campaign Manager Frontend Component
class EmailCampaignManager {
    constructor() {
        this.tenantId = this.getCurrentTenantId();
        this.emailService = new EmailMarketingService(this.tenantId);
        this.campaigns = [];
        this.analytics = {};
        
        this.init();
    }

    getCurrentTenantId() {
        // Get tenant ID from current context
        return window.location.pathname.includes('/tenant/') ? 
            window.location.pathname.split('/')[2] : 'default';
    }

    async init() {
        await this.loadCampaigns();
        await this.loadAnalytics();
        this.setupEventListeners();
    }

    async loadCampaigns() {
        try {
            const response = await fetch('/api/v1/email/campaigns');
            this.campaigns = await response.json();
            this.renderCampaigns();
        } catch (error) {
            console.error('Failed to load campaigns:', error);
        }
    }

    async loadAnalytics() {
        try {
            const response = await fetch('/api/v1/email/analytics/overview');
            this.analytics = await response.json();
            this.updateStats();
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    renderCampaigns() {
        const tbody = document.getElementById('campaign-tbody');
        if (!tbody) return;

        tbody.innerHTML = this.campaigns.map(campaign => `
            <tr>
                <td>${campaign.name}</td>
                <td>${campaign.campaign_type}</td>
                <td><span class="status ${campaign.is_active ? 'active' : 'inactive'}">${campaign.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>${campaign.total_sent || 0}</td>
                <td>${campaign.open_rate || 0}%</td>
                <td>${campaign.click_rate || 0}%</td>
                <td>
                    <button onclick="emailCampaignManager.editCampaign(${campaign.id})" class="btn-secondary">Edit</button>
                    <button onclick="emailCampaignManager.viewAnalytics(${campaign.id})" class="btn-secondary">Analytics</button>
                    <button onclick="emailCampaignManager.sendCampaign(${campaign.id})" class="btn-primary">Send</button>
                </td>
            </tr>
        `).join('');
    }

    updateStats() {
        const totalSent = document.getElementById('total-sent');
        const openRate = document.getElementById('open-rate');
        const clickRate = document.getElementById('click-rate');
        const conversionRate = document.getElementById('conversion-rate');

        if (totalSent) totalSent.textContent = this.analytics.total_sent || 0;
        if (openRate) openRate.textContent = `${this.analytics.open_rate || 0}%`;
        if (clickRate) clickRate.textContent = `${this.analytics.click_rate || 0}%`;
        if (conversionRate) conversionRate.textContent = `${this.analytics.conversion_rate || 0}%`;
    }

    setupEventListeners() {
        // Create new campaign button
        const createBtn = document.querySelector('[onclick="createNewCampaign()"]');
        if (createBtn) {
            createBtn.onclick = () => this.showCreateCampaignModal();
        }
    }

    async sendCampaign(campaignId) {
        if (!confirm('Are you sure you want to send this campaign?')) return;

        try {
            const result = await this.emailService.sendCampaign(campaignId, 'all_customers');
            this.showSuccess(`Campaign sent! ${result.sent} emails sent, ${result.failed} failed`);
            await this.loadAnalytics();
        } catch (error) {
            this.showError('Error sending campaign: ' + error.message);
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
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

// Initialize email campaign manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('email-campaign-manager')) {
        window.emailCampaignManager = new EmailCampaignManager();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmailMarketingService, EmailCampaignManager };
}
