-- App Store Optimization (ASO) Multi-tenant Database Schema
-- Phase 1A: Critical Competitive Gap Implementation

-- Tenant-specific ASO data and configuration
CREATE TABLE IF NOT EXISTS tenant_aso_data (
    tenant_id VARCHAR(50) PRIMARY KEY,
    app_store_keywords JSON,
    conversion_tracking BOOLEAN DEFAULT FALSE,
    review_management BOOLEAN DEFAULT FALSE,
    competitor_analysis JSON,
    app_store_optimization_score DECIMAL(5,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- App Store performance tracking
CREATE TABLE IF NOT EXISTS app_store_performance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    platform ENUM('ios', 'android') NOT NULL,
    date DATE NOT NULL,
    downloads INT DEFAULT 0,
    impressions INT DEFAULT 0,
    conversions INT DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    ranking_position INT,
    keyword_rankings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_platform_date (tenant_id, platform, date),
    INDEX idx_date_performance (date)
);

-- App Store review management
CREATE TABLE IF NOT EXISTS app_store_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    platform ENUM('ios', 'android') NOT NULL,
    review_id VARCHAR(255) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    reviewer_name VARCHAR(255),
    review_date TIMESTAMP,
    response_text TEXT,
    response_date TIMESTAMP,
    status ENUM('pending', 'responded', 'flagged', 'resolved') DEFAULT 'pending',
    sentiment_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_platform_status (tenant_id, platform, status),
    INDEX idx_review_date (review_date)
);

-- A/B testing for app store assets
CREATE TABLE IF NOT EXISTS app_store_ab_tests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    platform ENUM('ios', 'android') NOT NULL,
    asset_type ENUM('icon', 'screenshots', 'description', 'keywords') NOT NULL,
    variant_a JSON,
    variant_b JSON,
    test_status ENUM('draft', 'running', 'completed', 'paused') DEFAULT 'draft',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    sample_size_a INT DEFAULT 0,
    sample_size_b INT DEFAULT 0,
    conversion_rate_a DECIMAL(5,2) DEFAULT 0,
    conversion_rate_b DECIMAL(5,2) DEFAULT 0,
    statistical_significance BOOLEAN DEFAULT FALSE,
    winning_variant ENUM('a', 'b', 'inconclusive'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_test_status (tenant_id, test_status)
);

-- Keyword performance tracking
CREATE TABLE IF NOT EXISTS keyword_performance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    platform ENUM('ios', 'android') NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    ranking_position INT,
    search_volume INT,
    competition_level ENUM('low', 'medium', 'high'),
    estimated_traffic INT,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_keyword_date (tenant_id, keyword, date),
    INDEX idx_keyword_performance (keyword, date)
);

-- Competitor app analysis
CREATE TABLE IF NOT EXISTS competitor_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    competitor_name VARCHAR(255) NOT NULL,
    platform ENUM('ios', 'android') NOT NULL,
    app_name VARCHAR(255),
    app_category VARCHAR(100),
    current_ranking INT,
    estimated_downloads INT,
    rating DECIMAL(3,2),
    review_count INT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    analysis_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_competitor (tenant_id, competitor_name)
);

-- ASO automation rules
CREATE TABLE IF NOT EXISTS aso_automation_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    trigger_condition JSON NOT NULL,
    action_type ENUM('keyword_optimization', 'review_response', 'competitor_alert', 'performance_report') NOT NULL,
    action_parameters JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_executed TIMESTAMP,
    execution_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_active_rules (tenant_id, is_active)
);

-- Insert default ASO configuration for new tenants
INSERT INTO tenant_aso_data (tenant_id, app_store_keywords, conversion_tracking, review_management, competitor_analysis) VALUES
('default', 
    '{"primary": ["rideshare", "taxi", "transportation"], "secondary": ["car service", "airport transfer", "corporate travel"], "long_tail": ["luxury transportation", "professional drivers", "reliable rides"]}',
    TRUE, 
    TRUE, 
    '{"competitors": ["Uber", "Lyft", "local_taxi_companies"], "tracking_enabled": true}'
) ON DUPLICATE KEY UPDATE tenant_id = tenant_id;

-- Create indexes for performance optimization
CREATE INDEX idx_aso_performance_tenant ON app_store_performance(tenant_id, date DESC);
CREATE INDEX idx_reviews_tenant_platform ON app_store_reviews(tenant_id, platform, status);
CREATE INDEX idx_ab_tests_tenant_status ON app_store_ab_tests(tenant_id, test_status);
CREATE INDEX idx_keywords_tenant_platform ON keyword_performance(tenant_id, platform, keyword);
CREATE INDEX idx_automation_rules_active ON aso_automation_rules(is_active, last_executed);
