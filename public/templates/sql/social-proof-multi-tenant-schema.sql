-- Enhanced Social Proof Multi-tenant Database Schema
-- Phase 1B: Critical Competitive Gap Implementation (High Impact, Low Effort)

-- Tenant-specific social proof data and configurations
CREATE TABLE IF NOT EXISTS tenant_social_proof (
    tenant_id VARCHAR(50) PRIMARY KEY,
    customer_count INT DEFAULT 0,
    total_rides INT DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    featured_testimonial_count INT DEFAULT 0,
    customer_logos_enabled BOOLEAN DEFAULT TRUE,
    success_metrics_enabled BOOLEAN DEFAULT TRUE,
    live_counter_enabled BOOLEAN DEFAULT TRUE,
    industry_segmentation_enabled BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Customer testimonials and case studies
CREATE TABLE IF NOT EXISTS customer_testimonials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_company VARCHAR(255),
    customer_role VARCHAR(100),
    customer_photo_url VARCHAR(500),
    customer_logo_url VARCHAR(500),
    testimonial_text TEXT NOT NULL,
    testimonial_type ENUM('text', 'video', 'audio') DEFAULT 'text',
    testimonial_url VARCHAR(500), -- For video/audio testimonials
    rating INT CHECK (rating >= 1 AND rating <= 5),
    featured BOOLEAN DEFAULT FALSE,
    industry_segment VARCHAR(100),
    location VARCHAR(100),
    date_collected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metrics JSON, -- ROI, growth metrics, etc.
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approval_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_featured (tenant_id, featured),
    INDEX idx_tenant_industry (tenant_id, industry_segment),
    INDEX idx_status_approval (status, approval_date)
);

-- Customer logos and partnerships
CREATE TABLE IF NOT EXISTS customer_partnerships (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_logo_url VARCHAR(500) NOT NULL,
    company_website VARCHAR(500),
    partnership_type ENUM('customer', 'partner', 'integrator', 'reseller') NOT NULL,
    industry_segment VARCHAR(100),
    partnership_start_date TIMESTAMP,
    partnership_status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
    case_study_url VARCHAR(500),
    featured BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_partnership (tenant_id, partnership_type),
    INDEX idx_featured_order (featured, display_order)
);

-- Success metrics and ROI data
CREATE TABLE IF NOT EXISTS customer_success_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    metric_type ENUM('revenue_growth', 'cost_savings', 'efficiency_improvement', 'customer_satisfaction', 'fleet_utilization', 'driver_retention') NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_unit VARCHAR(50), -- %, $, hours, etc.
    baseline_value DECIMAL(15,2),
    measurement_period VARCHAR(100), -- "6 months", "Q1 2024", etc.
    calculation_method TEXT,
    verification_status ENUM('verified', 'self_reported', 'estimated') DEFAULT 'self_reported',
    supporting_documents JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_customer_metric (tenant_id, customer_id, metric_type),
    INDEX idx_metric_type (metric_type, verification_status)
);

-- Industry-specific success stories
CREATE TABLE IF NOT EXISTS industry_success_stories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    industry_segment VARCHAR(100) NOT NULL,
    story_title VARCHAR(255) NOT NULL,
    story_summary TEXT NOT NULL,
    story_content TEXT,
    customer_name VARCHAR(255),
    challenges_solved TEXT,
    solution_implemented TEXT,
    results_achieved TEXT,
    roi_metrics JSON,
    before_after_metrics JSON,
    media_urls JSON, -- Images, videos, case study PDFs
    featured BOOLEAN DEFAULT FALSE,
    published_date TIMESTAMP,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_industry (tenant_id, industry_segment),
    INDEX idx_published_featured (published_date, featured)
);

-- Live customer counter data
CREATE TABLE IF NOT EXISTS live_customer_metrics (
    tenant_id VARCHAR(50) PRIMARY KEY,
    active_customers INT DEFAULT 0,
    total_bookings_today INT DEFAULT 0,
    total_bookings_week INT DEFAULT 0,
    total_bookings_month INT DEFAULT 0,
    active_drivers INT DEFAULT 0,
    completed_rides_today INT DEFAULT 0,
    revenue_today DECIMAL(15,2) DEFAULT 0,
    revenue_week DECIMAL(15,2) DEFAULT 0,
    revenue_month DECIMAL(15,2) DEFAULT 0,
    average_rating_today DECIMAL(3,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Social proof display configurations
CREATE TABLE IF NOT EXISTS social_proof_display_config (
    tenant_id VARCHAR(50) PRIMARY KEY,
    show_customer_counter BOOLEAN DEFAULT TRUE,
    show_testimonials BOOLEAN DEFAULT TRUE,
    show_customer_logos BOOLEAN DEFAULT TRUE,
    show_success_metrics BOOLEAN DEFAULT TRUE,
    show_industry_stories BOOLEAN DEFAULT TRUE,
    counter_animation_speed INT DEFAULT 2000, -- milliseconds
    testimonial_rotation_speed INT DEFAULT 5000,
    logo_display_count INT DEFAULT 12,
    metrics_display_period ENUM('real_time', 'daily', 'weekly') DEFAULT 'real_time',
    featured_testimonial_count INT DEFAULT 3,
    custom_css JSON,
    display_rules JSON,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Social proof analytics and engagement
CREATE TABLE IF NOT EXISTS social_proof_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    event_type ENUM('testimonial_view', 'logo_click', 'counter_view', 'metric_click', 'story_view') NOT NULL,
    element_id VARCHAR(255), -- testimonial_id, partnership_id, etc.
    user_type ENUM('visitor', 'customer', 'prospect') DEFAULT 'visitor',
    session_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer_url VARCHAR(500),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_event_type (tenant_id, event_type),
    INDEX idx_timestamp (timestamp),
    INDEX idx_element_id (element_id)
);

-- Insert default social proof configuration for new tenants
INSERT INTO tenant_social_proof (tenant_id, customer_count, total_rides, average_rating, featured_testimonial_count) VALUES
('default', 50, 10000, 4.5, 3)
ON DUPLICATE KEY UPDATE tenant_id = tenant_id;

-- Insert default display configuration
INSERT INTO social_proof_display_config (tenant_id, show_customer_counter, show_testimonials, show_customer_logos, show_success_metrics, featured_testimonial_count) VALUES
('default', TRUE, TRUE, TRUE, TRUE, 3)
ON DUPLICATE KEY UPDATE tenant_id = tenant_id;

-- Insert default live metrics
INSERT INTO live_customer_metrics (tenant_id, active_customers, total_bookings_today, active_drivers, completed_rides_today, average_rating_today) VALUES
('default', 50, 150, 25, 140, 4.6)
ON DUPLICATE KEY UPDATE tenant_id = tenant_id;

-- Create indexes for performance optimization
CREATE INDEX idx_social_proof_tenant ON tenant_social_proof(tenant_id);
CREATE INDEX idx_testimonials_tenant ON customer_testimonials(tenant_id);
CREATE INDEX idx_partnerships_tenant ON customer_partnerships(tenant_id);
CREATE INDEX idx_success_metrics_tenant ON customer_success_metrics(tenant_id);
CREATE INDEX idx_industry_stories_tenant ON industry_success_stories(tenant_id);
CREATE INDEX idx_live_metrics_tenant ON live_customer_metrics(tenant_id);
CREATE INDEX idx_display_config_tenant ON social_proof_display_config(tenant_id);
CREATE INDEX idx_analytics_tenant ON social_proof_analytics(tenant_id);
