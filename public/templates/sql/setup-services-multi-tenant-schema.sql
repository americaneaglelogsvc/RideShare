-- Setup Services Multi-tenant Database Schema
-- Phase 1B: Critical Competitive Gap Implementation (Medium Impact, Low Effort)

-- Tenant-specific onboarding and setup configurations
CREATE TABLE IF NOT EXISTS tenant_setup_services (
    tenant_id VARCHAR(50) PRIMARY KEY,
    onboarding_package ENUM('basic', 'professional', 'enterprise', 'custom') DEFAULT 'basic',
    dedicated_specialist BOOLEAN DEFAULT FALSE,
    specialist_name VARCHAR(100),
    specialist_email VARCHAR(255),
    specialist_phone VARCHAR(20),
    setup_status ENUM('not_started', 'in_progress', 'completed', 'on_hold') DEFAULT 'not_started',
    setup_start_date TIMESTAMP,
    estimated_completion_date TIMESTAMP,
    actual_completion_date TIMESTAMP,
    setup_progress INT DEFAULT 0, -- 0-100 percentage
    success_metrics JSON,
    custom_requirements JSON,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Onboarding tasks and milestones
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    task_description TEXT,
    task_category ENUM('initial_setup', 'configuration', 'integration', 'training', 'testing', 'launch') NOT NULL,
    task_type ENUM('automated', 'manual', 'specialist_required', 'customer_action') NOT NULL,
    estimated_duration_hours INT DEFAULT 0,
    actual_duration_hours INT DEFAULT 0,
    task_status ENUM('pending', 'in_progress', 'completed', 'blocked', 'skipped') DEFAULT 'pending',
    assigned_to ENUM('system', 'specialist', 'customer', 'admin') DEFAULT 'system',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    dependencies JSON, -- Task IDs that must be completed first
    completion_notes TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_status (tenant_id, task_status),
    INDEX idx_category_priority (task_category, priority),
    INDEX idx_assigned_to (assigned_to, due_date)
);

-- Implementation timeline and milestones
CREATE TABLE IF NOT EXISTS implementation_timeline (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    phase_name VARCHAR(255) NOT NULL,
    phase_description TEXT,
    phase_number INT NOT NULL,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    duration_days INT,
    phase_status ENUM('not_started', 'in_progress', 'completed', 'delayed') DEFAULT 'not_started',
    milestones JSON, -- Array of milestone objects
    deliverables JSON, -- Array of deliverable objects
    risks_mitigations JSON,
    progress_percentage INT DEFAULT 0,
    actual_start_date TIMESTAMP,
    actual_end_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_phase (tenant_id, phase_number),
    INDEX idx_status_dates (phase_status, start_date, end_date)
);

-- Specialist assignments and availability
CREATE TABLE IF NOT EXISTS setup_specialists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    specialist_name VARCHAR(100) NOT NULL,
    specialist_email VARCHAR(255) NOT NULL,
    specialist_phone VARCHAR(20),
    specialist_photo_url VARCHAR(500),
    bio TEXT,
    expertise_areas JSON, -- Array of expertise areas
    languages JSON, -- Array of supported languages
    timezone VARCHAR(50),
    max_concurrent_clients INT DEFAULT 5,
    current_assignments INT DEFAULT 0,
    availability_status ENUM('available', 'busy', 'unavailable') DEFAULT 'available',
    rating DECIMAL(3,2) DEFAULT 0,
    completed_setups INT DEFAULT 0,
    average_setup_time_hours DECIMAL(5,2),
    specialties TEXT,
    certifications JSON,
    hire_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_availability (availability_status, current_assignments),
    INDEX idx_rating (rating DESC, completed_setups DESC)
);

-- Specialist-tenant assignments
CREATE TABLE IF NOT EXISTS specialist_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    specialist_id INT NOT NULL,
    assignment_status ENUM('assigned', 'in_progress', 'completed', 'cancelled') DEFAULT 'assigned',
    assignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estimated_completion_date TIMESTAMP,
    actual_completion_date TIMESTAMP,
    assignment_notes TEXT,
    customer_satisfaction_rating INT CHECK (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5),
    specialist_notes TEXT,
    total_hours_worked DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (specialist_id) REFERENCES setup_specialists(id) ON DELETE CASCADE,
    INDEX idx_tenant_specialist (tenant_id, specialist_id),
    INDEX idx_specialist_status (specialist_id, assignment_status),
    INDEX idx_assignment_dates (assignment_date, estimated_completion_date)
);

-- Setup packages and pricing
CREATE TABLE IF NOT EXISTS setup_packages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    package_name VARCHAR(100) NOT NULL,
    package_tier ENUM('basic', 'professional', 'enterprise', 'custom') NOT NULL,
    package_description TEXT,
    package_price DECIMAL(10,2) NOT NULL,
    billing_type ENUM('one_time', 'monthly', 'quarterly') DEFAULT 'one_time',
    included_services JSON, -- Array of included services
    dedicated_specialist BOOLEAN DEFAULT FALSE,
    setup_hours_included INT DEFAULT 0,
    support_hours_included INT DEFAULT 0,
    training_sessions_included INT DEFAULT 0,
    success_guarantee BOOLEAN DEFAULT FALSE,
    guarantee_terms TEXT,
    implementation_timeline_days INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_package_tier (package_tier, is_active),
    INDEX idx_price (package_price)
);

-- Customer satisfaction and feedback
CREATE TABLE IF NOT EXISTS setup_feedback (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    specialist_id INT,
    feedback_type ENUM('setup_completion', 'milestone_completion', 'general') NOT NULL,
    overall_rating INT CHECK (overall_rating >= 1 AND overall_rating <= 5),
    specialist_rating INT CHECK (specialist_rating >= 1 AND overall_rating <= 5),
    process_rating INT CHECK (process_rating >= 1 AND process_rating <= 5),
    timeline_rating INT CHECK (timeline_rating >= 1 AND timeline_rating <= 5),
    feedback_text TEXT,
    would_recommend BOOLEAN,
    improvement_suggestions TEXT,
    feedback_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded BOOLEAN DEFAULT FALSE,
    response_text TEXT,
    response_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (specialist_id) REFERENCES setup_specialists(id) ON DELETE SET NULL,
    INDEX idx_tenant_feedback (tenant_id, feedback_date),
    INDEX idx_specialist_feedback (specialist_id, overall_rating)
);

-- Setup resources and documentation
CREATE TABLE IF NOT EXISTS setup_resources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    resource_name VARCHAR(255) NOT NULL,
    resource_type ENUM('guide', 'template', 'checklist', 'video', 'webinar', 'documentation') NOT NULL,
    resource_description TEXT,
    resource_url VARCHAR(500),
    resource_content TEXT,
    target_audience ENUM('customer', 'specialist', 'admin', 'all') DEFAULT 'all',
    package_tiers JSON, -- Array of applicable package tiers
    category ENUM('getting_started', 'configuration', 'integration', 'training', 'troubleshooting') NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    download_count INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_category (resource_type, category),
    INDEX idx_audience_language (target_audience, language),
    INDEX idx_rating (rating DESC, download_count DESC)
);

-- Success metrics tracking
CREATE TABLE IF NOT EXISTS setup_success_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    metric_type ENUM('time_to_value', 'customer_satisfaction', 'setup_completion_time', 'specialist_efficiency', 'revenue_impact') NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_unit VARCHAR(50), -- days, hours, percentage, dollars, etc.
    baseline_value DECIMAL(15,2),
    measurement_period VARCHAR(100),
    measurement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comparison_to_industry JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_metric (tenant_id, metric_type),
    INDEX idx_metric_type_date (metric_type, measurement_date)
);

-- Insert default setup packages
INSERT INTO setup_packages (package_name, package_tier, package_description, package_price, billing_type, included_services, dedicated_specialist, setup_hours_included, support_hours_included, training_sessions_included, success_guarantee, implementation_timeline_days) VALUES
('Basic Setup', 'basic', 'Self-service setup with basic documentation and email support', 0.00, 'one_time', '["getting_started_guide", "email_support", "basic_configuration"]', FALSE, 0, 5, 1, FALSE, 30),
('Professional Setup', 'professional', 'Guided setup with dedicated specialist and priority support', 499.00, 'one_time', '["dedicated_specialist", "priority_support", "advanced_configuration", "data_migration", "custom_branding"]', TRUE, 20, 20, 3, TRUE, 21),
('Enterprise Setup', 'enterprise', 'White-glove setup with premium specialist and comprehensive services', 1999.00, 'one_time', '["premium_specialist", "white_glove_support", "full_service_migration", "custom_integrations", "advanced_training", "success_manager"]', TRUE, 50, 50, 10, TRUE, 14),
('Custom Setup', 'custom', 'Tailored setup solution for enterprise requirements', 0.00, 'custom', '["custom_solution", "enterprise_consulting", "unlimited_hours", "custom_development"]', TRUE, 0, 0, 0, TRUE, 0)
ON DUPLICATE KEY UPDATE package_name = package_name;

-- Insert default onboarding tasks
INSERT INTO onboarding_tasks (tenant_id, task_name, task_description, task_category, task_type, estimated_duration_hours, priority, assigned_to) VALUES
('default', 'Account Setup', 'Create and configure tenant account', 'initial_setup', 'automated', 1, 'critical', 'system'),
('default', 'Branding Configuration', 'Set up custom branding and colors', 'configuration', 'customer_action', 2, 'medium', 'customer'),
('default', 'Payment Setup', 'Configure payment processing and billing', 'configuration', 'specialist_required', 3, 'high', 'specialist'),
('default', 'Driver Onboarding', 'Set up driver registration and verification', 'configuration', 'customer_action', 4, 'medium', 'customer'),
('default', 'Vehicle Configuration', 'Configure vehicle types and pricing', 'configuration', 'customer_action', 2, 'medium', 'customer'),
('default', 'Integration Setup', 'Set up third-party integrations', 'integration', 'specialist_required', 8, 'medium', 'specialist'),
('default', 'Staff Training', 'Train administrative staff', 'training', 'specialist_required', 4, 'medium', 'specialist'),
('default', 'Testing & QA', 'Comprehensive system testing', 'testing', 'customer_action', 6, 'high', 'customer'),
('default', 'Launch Preparation', 'Prepare for go-live', 'launch', 'specialist_required', 2, 'critical', 'specialist'),
('default', 'Go-Live Support', 'Monitor and support during launch', 'launch', 'specialist_required', 8, 'critical', 'specialist')
ON DUPLICATE KEY UPDATE task_name = task_name;

-- Insert default setup specialist
INSERT INTO setup_specialists (specialist_name, specialist_email, specialist_phone, bio, expertise_areas, languages, timezone, max_concurrent_clients, rating, completed_setups, average_setup_time_hours) VALUES
('John Smith', 'john.smith@uwd.com', '+1-555-0123', 'Experienced implementation specialist with 5+ years in transportation technology', '["rideshare", "taxi", "limo", "shuttle", "integrations"]', '["English", "Spanish"]', 'America/New_York', 8, 4.8, 127, 18.5)
ON DUPLICATE KEY UPDATE specialist_name = specialist_name;

-- Insert default setup resources
INSERT INTO setup_resources (resource_name, resource_type, resource_description, resource_content, target_audience, package_tiers, category) VALUES
('Getting Started Guide', 'guide', 'Comprehensive guide to setting up your UWD platform', '# Getting Started with UWD\n\nThis guide will help you set up your transportation platform...', 'customer', '["basic", "professional", "enterprise"]', 'getting_started'),
('Configuration Checklist', 'checklist', 'Complete checklist for platform configuration', '- [ ] Account setup\n- [ ] Branding configuration\n- [ ] Payment setup...', 'customer', '["professional", "enterprise"]', 'configuration'),
('Integration Guide', 'guide', 'Step-by-step guide for third-party integrations', '# Integration Guide\n\nThis guide covers...', 'specialist', '["professional", "enterprise"]', 'integration')
ON DUPLICATE KEY UPDATE resource_name = resource_name;

-- Create indexes for performance optimization
CREATE INDEX idx_setup_services_tenant ON tenant_setup_services(tenant_id);
CREATE INDEX idx_onboarding_tasks_tenant ON onboarding_tasks(tenant_id);
CREATE INDEX idx_implementation_timeline_tenant ON implementation_timeline(tenant_id);
CREATE INDEX idx_specialist_assignments_tenant ON specialist_assignments(tenant_id);
CREATE INDEX idx_setup_feedback_tenant ON setup_feedback(tenant_id);
CREATE INDEX idx_success_metrics_tenant ON setup_success_metrics(tenant_id);
