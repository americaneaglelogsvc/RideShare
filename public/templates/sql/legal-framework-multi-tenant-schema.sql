-- Professional Legal Framework Multi-tenant Database Schema
-- Phase 1B: Critical Competitive Gap Implementation (High Impact, Low Effort)

-- Tenant-specific legal templates and configurations
CREATE TABLE IF NOT EXISTS tenant_legal_templates (
    tenant_id VARCHAR(50) PRIMARY KEY,
    ip_protection_terms TEXT,
    liability_clauses TEXT,
    sla_terms TEXT,
    privacy_policy TEXT,
    payment_processor_terms TEXT,
    data_processing_agreement TEXT,
    termination_clauses TEXT,
    indemnification_clauses TEXT,
    limitation_of_liability TEXT,
    custom_agreements JSON,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Legal document versions and history
CREATE TABLE IF NOT EXISTS legal_document_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    document_type ENUM('terms_of_service', 'privacy_policy', 'sla', 'dpa', 'payment_terms') NOT NULL,
    version_number VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    effective_date TIMESTAMP NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    change_summary TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_document_type (tenant_id, document_type),
    INDEX idx_effective_date (effective_date)
);

-- Service Level Agreements (SLAs) per tenant
CREATE TABLE IF NOT EXISTS tenant_sla_configs (
    tenant_id VARCHAR(50) PRIMARY KEY,
    uptime_percentage DECIMAL(5,2) DEFAULT 99.9,
    response_time_ms INT DEFAULT 500,
    resolution_time_hours INT DEFAULT 24,
    credit_percentage DECIMAL(5,2) DEFAULT 10,
    maintenance_window JSON,
    support_hours JSON,
    escalation_procedures TEXT,
    breach_notification_hours INT DEFAULT 4,
    custom_sla_terms TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- SLA breach tracking and credits
CREATE TABLE IF NOT EXISTS sla_breach_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    breach_type ENUM('uptime', 'response_time', 'resolution_time', 'maintenance') NOT NULL,
    breach_start TIMESTAMP NOT NULL,
    breach_end TIMESTAMP,
    duration_minutes INT,
    impact_description TEXT,
    credit_calculated DECIMAL(10,2),
    credit_applied BOOLEAN DEFAULT FALSE,
    notification_sent BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_breach_type (tenant_id, breach_type),
    INDEX idx_breach_start (breach_start)
);

-- Payment processor integration configurations
CREATE TABLE IF NOT EXISTS tenant_payment_configs (
    tenant_id VARCHAR(50) PRIMARY KEY,
    payment_processor ENUM('stripe', 'paypal', 'square', 'adyen') NOT NULL DEFAULT 'stripe',
    stripe_account_id VARCHAR(255),
    stripe_public_key VARCHAR(255),
    stripe_secret_key_encrypted TEXT,
    fee_percentage DECIMAL(5,2) DEFAULT 2.9,
    fixed_fee DECIMAL(10,2) DEFAULT 0.30,
    chargeback_fee DECIMAL(10,2) DEFAULT 15.00,
    dispute_resolution_terms TEXT,
    refund_policy TEXT,
    chargeback_monitoring BOOLEAN DEFAULT TRUE,
    fraud_detection BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Compliance tracking and certifications
CREATE TABLE IF NOT EXISTS tenant_compliance_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    compliance_type ENUM('gdpr', 'ccpa', 'pci_dss', 'soc2', 'hipaa', 'custom') NOT NULL,
    certification_status ENUM('compliant', 'non_compliant', 'in_progress', 'exempt') NOT NULL,
    last_audit_date TIMESTAMP,
    next_audit_date TIMESTAMP,
    audit_report_url VARCHAR(500),
    compliance_officer VARCHAR(100),
    compliance_notes TEXT,
    evidence_documents JSON,
    certifications JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_compliance (tenant_id, compliance_type),
    INDEX idx_audit_dates (last_audit_date, next_audit_date)
);

-- Legal document signatures and acknowledgments
CREATE TABLE IF NOT EXISTS legal_document_signatures (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    document_type ENUM('terms_of_service', 'privacy_policy', 'sla', 'dpa', 'payment_terms') NOT NULL,
    document_version VARCHAR(20) NOT NULL,
    signatory_type ENUM('tenant_admin', 'customer', 'driver', 'partner') NOT NULL,
    signatory_id VARCHAR(255) NOT NULL,
    signatory_name VARCHAR(255) NOT NULL,
    signatory_email VARCHAR(255),
    signature_ip VARCHAR(45),
    signature_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signature_method ENUM('electronic', 'clickwrap', 'typed') NOT NULL,
    acceptance_status ENUM('accepted', 'declined', 'withdrawn') NOT NULL,
    withdrawal_timestamp TIMESTAMP NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_document_signatory (tenant_id, document_type, signatory_type),
    INDEX idx_signature_timestamp (signature_timestamp)
);

-- Legal alerts and notifications
CREATE TABLE IF NOT EXISTS legal_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    alert_type ENUM('slabreach', 'compliance_due', 'document_expiry', 'regulatory_change', 'security_incident') NOT NULL,
    alert_level ENUM('info', 'warning', 'critical') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_required BOOLEAN DEFAULT FALSE,
    action_deadline TIMESTAMP,
    action_taken BOOLEAN DEFAULT FALSE,
    action_taken_by VARCHAR(100),
    action_taken_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_alert_type (tenant_id, alert_type),
    INDEX idx_alert_level (alert_level),
    INDEX idx_action_deadline (action_deadline)
);

-- Insert default legal templates for new tenants
INSERT INTO tenant_legal_templates (tenant_id, ip_protection_terms, liability_clauses, sla_terms, privacy_policy, payment_processor_terms) VALUES
('default', 
    'All intellectual property rights, including trademarks, copyrights, and trade secrets, remain the property of the tenant. UWD provides a license to use the platform but does not transfer ownership of any intellectual property.',
    'UWD liability is limited to the fees paid by the tenant in the preceding 3 months. UWD is not liable for indirect, consequential, or punitive damages.',
    'UWD guarantees 99.9% uptime, with credits for downtime exceeding 0.1%. Response time guaranteed within 500ms for API calls.',
    'We collect and process personal data in accordance with applicable privacy laws. Data is used to provide and improve our services.',
    'Payment processing is handled through Stripe. All payment terms and conditions are governed by Stripe''s service agreement.'
) ON DUPLICATE KEY UPDATE tenant_id = tenant_id;

-- Insert default SLA configuration
INSERT INTO tenant_sla_configs (tenant_id, uptime_percentage, response_time_ms, resolution_time_hours, credit_percentage) VALUES
('default', 99.9, 500, 24, 10.0)
ON DUPLICATE KEY UPDATE tenant_id = tenant_id;

-- Insert default payment configuration
INSERT INTO tenant_payment_configs (tenant_id, payment_processor, fee_percentage, fixed_fee, chargeback_fee) VALUES
('default', 'stripe', 2.9, 0.30, 15.00)
ON DUPLICATE KEY UPDATE tenant_id = tenant_id;

-- Create indexes for performance optimization
CREATE INDEX idx_legal_templates_tenant ON tenant_legal_templates(tenant_id);
CREATE INDEX idx_sla_configs_tenant ON tenant_sla_configs(tenant_id);
CREATE INDEX idx_payment_configs_tenant ON tenant_payment_configs(tenant_id);
CREATE INDEX idx_compliance_records_tenant ON tenant_compliance_records(tenant_id);
CREATE INDEX idx_document_signatures_tenant ON legal_document_signatures(tenant_id);
CREATE INDEX idx_legal_alerts_tenant ON legal_alerts(tenant_id);
