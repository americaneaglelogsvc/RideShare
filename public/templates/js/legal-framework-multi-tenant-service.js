// Professional Legal Framework Service for UWD
// Multi-tenant Architecture Implementation

class LegalFrameworkService {
    constructor(tenantId) {
        this.tenantId = tenantId;
        this.apiEndpoint = '/api/v1/legal';
    }

    // Initialize legal framework for tenant
    async initializeLegalFramework(config) {
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
            console.error('Failed to initialize legal framework:', error);
            throw error;
        }
    }

    // Get legal templates
    async getLegalTemplates() {
        try {
            const response = await fetch(`${this.apiEndpoint}/templates`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get legal templates:', error);
            throw error;
        }
    }

    // Update legal templates
    async updateLegalTemplates(templateData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/templates`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(templateData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update legal templates:', error);
            throw error;
        }
    }

    // Get SLA configuration
    async getSLAConfiguration() {
        try {
            const response = await fetch(`${this.apiEndpoint}/sla`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get SLA configuration:', error);
            throw error;
        }
    }

    // Update SLA configuration
    async updateSLAConfiguration(slaData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/sla`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(slaData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update SLA configuration:', error);
            throw error;
        }
    }

    // Record SLA breach
    async recordSLABreach(breachData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/sla/breach`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(breachData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to record SLA breach:', error);
            throw error;
        }
    }

    // Get SLA breach records
    async getSLABreachRecords(startDate, endDate) {
        try {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate
            });
            
            const response = await fetch(`${this.apiEndpoint}/sla/breaches?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get SLA breach records:', error);
            throw error;
        }
    }

    // Get payment configuration
    async getPaymentConfiguration() {
        try {
            const response = await fetch(`${this.apiEndpoint}/payment`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get payment configuration:', error);
            throw error;
        }
    }

    // Update payment configuration
    async updatePaymentConfiguration(paymentData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/payment`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(paymentData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update payment configuration:', error);
            throw error;
        }
    }

    // Get compliance records
    async getComplianceRecords() {
        try {
            const response = await fetch(`${this.apiEndpoint}/compliance`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get compliance records:', error);
            throw error;
        }
    }

    // Update compliance records
    async updateComplianceRecords(complianceData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/compliance`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(complianceData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update compliance records:', error);
            throw error;
        }
    }

    // Get document signatures
    async getDocumentSignatures(documentType = null) {
        try {
            const params = new URLSearchParams();
            if (documentType) params.append('document_type', documentType);
            
            const response = await fetch(`${this.apiEndpoint}/signatures?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get document signatures:', error);
            throw error;
        }
    }

    // Sign legal document
    async signDocument(documentType, signatureData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/sign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify({
                    document_type: documentType,
                    ...signatureData
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to sign document:', error);
            throw error;
        }
    }

    // Get legal alerts
    async getLegalAlerts(alertType = null) {
        try {
            const params = new URLSearchParams();
            if (alertType) params.append('alert_type', alertType);
            
            const response = await fetch(`${this.apiEndpoint}/alerts?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get legal alerts:', error);
            throw error;
        }
    }

    // Create legal alert
    async createLegalAlert(alertData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/alerts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(alertData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to create legal alert:', error);
            throw error;
        }
    }

    // Generate legal report
    async generateLegalReport(reportType, startDate, endDate) {
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
            console.error('Failed to generate legal report:', error);
            throw error;
        }
    }

    // Check compliance status
    async checkComplianceStatus(complianceType) {
        try {
            const response = await fetch(`${this.apiEndpoint}/compliance/check/${complianceType}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to check compliance status:', error);
            throw error;
        }
    }
}

// Legal Framework Dashboard Manager
class LegalDashboardManager {
    constructor() {
        this.tenantId = this.getCurrentTenantId();
        this.legalService = new LegalFrameworkService(this.tenantId);
        this.legalTemplates = {};
        this.slaConfig = {};
        this.paymentConfig = {};
        this.complianceRecords = {};
        this.alerts = [];
        
        this.init();
    }

    getCurrentTenantId() {
        return window.location.pathname.includes('/tenant/') ? 
            window.location.pathname.split('/')[2] : 'default';
    }

    async init() {
        await this.loadLegalTemplates();
        await this.loadSLAConfiguration();
        await this.loadPaymentConfiguration();
        await this.loadComplianceRecords();
        await this.loadLegalAlerts();
        this.setupEventListeners();
    }

    async loadLegalTemplates() {
        try {
            this.legalTemplates = await this.legalService.getLegalTemplates();
            this.renderLegalTemplates();
        } catch (error) {
            console.error('Failed to load legal templates:', error);
        }
    }

    async loadSLAConfiguration() {
        try {
            this.slaConfig = await this.legalService.getSLAConfiguration();
            this.renderSLASection();
        } catch (error) {
            console.error('Failed to load SLA configuration:', error);
        }
    }

    async loadPaymentConfiguration() {
        try {
            this.paymentConfig = await this.legalService.getPaymentConfiguration();
            this.renderPaymentSection();
        } catch (error) {
            console.error('Failed to load payment configuration:', error);
        }
    }

    async loadComplianceRecords() {
        try {
            this.complianceRecords = await this.legalService.getComplianceRecords();
            this.renderComplianceSection();
        } catch (error) {
            console.error('Failed to load compliance records:', error);
        }
    }

    async loadLegalAlerts() {
        try {
            this.alerts = await this.legalService.getLegalAlerts();
            this.renderAlertsSection();
        } catch (error) {
            console.error('Failed to load legal alerts:', error);
        }
    }

    renderLegalTemplates() {
        const templatesContainer = document.getElementById('legal-templates-section');
        if (!templatesContainer) return;

        templatesContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Legal Templates</h3>
                    <button onclick="legalDashboard.editLegalTemplates()" class="btn-primary">
                        <i class="fas fa-edit mr-2"></i>Edit Templates
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="border rounded-lg p-3">
                        <h4 class="font-medium text-gray-900">IP Protection</h4>
                        <p class="text-sm text-gray-600 mt-1">${this.legalTemplates.ip_protection_terms ? 'Configured' : 'Not configured'}</p>
                    </div>
                    <div class="border rounded-lg p-3">
                        <h4 class="font-medium text-gray-900">Liability Clauses</h4>
                        <p class="text-sm text-gray-600 mt-1">${this.legalTemplates.liability_clauses ? 'Configured' : 'Not configured'}</p>
                    </div>
                    <div class="border rounded-lg p-3">
                        <h4 class="font-medium text-gray-900">Privacy Policy</h4>
                        <p class="text-sm text-gray-600 mt-1">${this.legalTemplates.privacy_policy ? 'Configured' : 'Not configured'}</p>
                    </div>
                    <div class="border rounded-lg p-3">
                        <h4 class="font-medium text-gray-900">Payment Terms</h4>
                        <p class="text-sm text-gray-600 mt-1">${this.legalTemplates.payment_processor_terms ? 'Configured' : 'Not configured'}</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderSLASection() {
        const slaContainer = document.getElementById('sla-section');
        if (!slaContainer) return;

        slaContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Service Level Agreement</h3>
                    <button onclick="legalDashboard.editSLAConfiguration()" class="btn-primary">
                        <i class="fas fa-edit mr-2"></i>Edit SLA
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="text-center p-4 border rounded-lg">
                        <div class="text-2xl font-bold text-green-600">${this.slaConfig.uptime_percentage || 99.9}%</div>
                        <div class="text-sm text-gray-600">Uptime Guarantee</div>
                    </div>
                    <div class="text-center p-4 border rounded-lg">
                        <div class="text-2xl font-bold text-blue-600">${this.slaConfig.response_time_ms || 500}ms</div>
                        <div class="text-sm text-gray-600">Response Time</div>
                    </div>
                    <div class="text-center p-4 border rounded-lg">
                        <div class="text-2xl font-bold text-purple-600">${this.slaConfig.resolution_time_hours || 24}h</div>
                        <div class="text-sm text-gray-600">Resolution Time</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPaymentSection() {
        const paymentContainer = document.getElementById('payment-section');
        if (!paymentContainer) return;

        paymentContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Payment Processing</h3>
                    <button onclick="legalDashboard.editPaymentConfiguration()" class="btn-primary">
                        <i class="fas fa-edit mr-2"></i>Edit Configuration
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="border rounded-lg p-3">
                        <h4 class="font-medium text-gray-900">Processor</h4>
                        <p class="text-sm text-gray-600 mt-1">${this.paymentConfig.payment_processor || 'Stripe'}</p>
                    </div>
                    <div class="border rounded-lg p-3">
                        <h4 class="font-medium text-gray-900">Processing Fee</h4>
                        <p class="text-sm text-gray-600 mt-1">${this.paymentConfig.fee_percentage || 2.9}% + $${this.paymentConfig.fixed_fee || 0.30}</p>
                    </div>
                    <div class="border rounded-lg p-3">
                        <h4 class="font-medium text-gray-900">Chargeback Fee</h4>
                        <p class="text-sm text-gray-600 mt-1">$${this.paymentConfig.chargeback_fee || 15.00}</p>
                    </div>
                    <div class="border rounded-lg p-3">
                        <h4 class="font-medium text-gray-900">Fraud Detection</h4>
                        <p class="text-sm text-gray-600 mt-1">${this.paymentConfig.fraud_detection ? 'Enabled' : 'Disabled'}</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderComplianceSection() {
        const complianceContainer = document.getElementById('compliance-section');
        if (!complianceContainer) return;

        complianceContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Compliance Status</h3>
                    <button onclick="legalDashboard.editComplianceRecords()" class="btn-primary">
                        <i class="fas fa-edit mr-2"></i>Edit Compliance
                    </button>
                </div>
                <div class="space-y-3">
                    ${this.complianceRecords.map(record => `
                        <div class="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                                <span class="font-medium">${record.compliance_type.toUpperCase()}</span>
                                <span class="ml-2 text-sm text-gray-500">Last audit: ${record.last_audit_date ? new Date(record.last_audit_date).toLocaleDateString() : 'Not audited'}</span>
                            </div>
                            <span class="px-2 py-1 rounded text-sm font-medium ${
                                record.certification_status === 'compliant' ? 'bg-green-100 text-green-800' :
                                record.certification_status === 'non_compliant' ? 'bg-red-100 text-red-800' :
                                record.certification_status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }">
                                ${record.certification_status.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderAlertsSection() {
        const alertsContainer = document.getElementById('alerts-section');
        if (!alertsContainer) return;

        const criticalAlerts = this.alerts.filter(alert => alert.alert_level === 'critical');
        const warningAlerts = this.alerts.filter(alert => alert.alert_level === 'warning');
        const infoAlerts = this.alerts.filter(alert => alert.alert_level === 'info');

        alertsContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Legal Alerts</h3>
                    <button onclick="legalDashboard.createLegalAlert()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Create Alert
                    </button>
                </div>
                <div class="space-y-3">
                    ${criticalAlerts.length > 0 ? `
                        <div class="border-l-4 border-red-500 p-3 bg-red-50">
                            <h4 class="font-medium text-red-800">Critical Alerts (${criticalAlerts.length})</h4>
                            ${criticalAlerts.slice(0, 3).map(alert => `
                                <div class="text-sm text-red-700 mt-1">
                                    <strong>${alert.title}</strong>: ${alert.message}
                                    ${alert.action_required ? ' <span class="font-medium">(Action Required)</span>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${warningAlerts.length > 0 ? `
                        <div class="border-l-4 border-yellow-500 p-3 bg-yellow-50">
                            <h4 class="font-medium text-yellow-800">Warnings (${warningAlerts.length})</h4>
                            ${warningAlerts.slice(0, 3).map(alert => `
                                <div class="text-sm text-yellow-700 mt-1">
                                    <strong>${alert.title}</strong>: ${alert.message}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${infoAlerts.length > 0 ? `
                        <div class="border-l-4 border-blue-500 p-3 bg-blue-50">
                            <h4 class="font-medium text-blue-800">Information (${infoAlerts.length})</h4>
                            ${infoAlerts.slice(0, 3).map(alert => `
                                <div class="text-sm text-blue-700 mt-1">
                                    <strong>${alert.title}</strong>: ${alert.message}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${this.alerts.length === 0 ? `
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-check-circle text-2xl mb-2"></i>
                            <p>No legal alerts at this time</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const refreshBtn = document.querySelector('[onclick="refreshLegalData()"]');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refreshAllData();
        }
    }

    async refreshAllData() {
        await Promise.all([
            this.loadLegalTemplates(),
            this.loadSLAConfiguration(),
            this.loadPaymentConfiguration(),
            this.loadComplianceRecords(),
            this.loadLegalAlerts()
        ]);
    }

    editLegalTemplates() {
        // Implementation for editing legal templates
        console.log('Edit legal templates functionality');
    }

    editSLAConfiguration() {
        // Implementation for editing SLA configuration
        console.log('Edit SLA configuration functionality');
    }

    editPaymentConfiguration() {
        // Implementation for editing payment configuration
        console.log('Edit payment configuration functionality');
    }

    editComplianceRecords() {
        // Implementation for editing compliance records
        console.log('Edit compliance records functionality');
    }

    createLegalAlert() {
        // Implementation for creating legal alerts
        console.log('Create legal alert functionality');
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

// Initialize Legal dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('legal-dashboard')) {
        window.legalDashboard = new LegalDashboardManager();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LegalFrameworkService, LegalDashboardManager };
}
