-- Email Marketing Automation Database Schema
-- Phase 1 Implementation: US Market Email Marketing Suite

-- Email campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject_en TEXT NOT NULL,
    content_en TEXT NOT NULL,
    campaign_type ENUM('welcome', 'retention', 'promotion', 'newsletter', 'booking_confirmation', 'driver_onboarding') NOT NULL,
    trigger_conditions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant_campaign (tenant_id, campaign_type),
    INDEX idx_active (is_active)
);

-- Email templates for US market
CREATE TABLE IF NOT EXISTS email_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_key VARCHAR(100) UNIQUE NOT NULL,
    subject_en TEXT NOT NULL,
    content_en TEXT NOT NULL,
    template_type ENUM('welcome', 'booking_confirmation', 'payment_receipt', 'driver_onboarding', 'promotional', 'retention') NOT NULL,
    variables JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customer segments for US market
CREATE TABLE IF NOT EXISTS customer_segments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    segment_type ENUM('new_customers', 'repeat_customers', 'high_value', 'inactive', 'corporate', 'all_customers') NOT NULL,
    conditions JSON NOT NULL,
    customer_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_segment (tenant_id, segment_type)
);

-- Email automation logs
CREATE TABLE IF NOT EXISTS email_automation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT,
    customer_id VARCHAR(50),
    tenant_id VARCHAR(50),
    email_type VARCHAR(100),
    status ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed') NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    opened_at TIMESTAMP NULL,
    clicked_at TIMESTAMP NULL,
    error_message TEXT NULL,
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_campaign_status (campaign_id, status),
    INDEX idx_customer_email (customer_id, sent_at),
    INDEX idx_tenant_analytics (tenant_id, sent_at, status)
);

-- Email campaign performance metrics
CREATE TABLE IF NOT EXISTS email_campaign_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    tenant_id VARCHAR(50) NOT NULL,
    total_sent INT DEFAULT 0,
    total_delivered INT DEFAULT 0,
    total_opened INT DEFAULT 0,
    total_clicked INT DEFAULT 0,
    total_bounced INT DEFAULT 0,
    total_failed INT DEFAULT 0,
    open_rate DECIMAL(5,2) DEFAULT 0,
    click_rate DECIMAL(5,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_campaign_metrics (campaign_id, calculated_at)
);

-- Insert default US market email templates
INSERT INTO email_templates (template_key, subject_en, content_en, template_type, variables) VALUES
('welcome_rider', 'Welcome to {{tenant_name}} - Your Ride Awaits!', '<h2>Welcome to {{tenant_name}}!</h2><p>Thank you for joining {{tenant_name}}. We''re excited to provide you with premium transportation services.</p><p>Get started with your first ride and enjoy a special welcome offer:</p><div style="background: #f0f0f0; padding: 15px; margin: 20px 0;"><h3>Special Offer: 20% off your first ride!</h3><p>Use code: WELCOME20</p><p>Valid for 30 days from signup</p></div><p>Download our app to book your first ride:</p><a href="{{app_store_url}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download App</a>', 'welcome', '{"tenant_name": "string", "app_store_url": "string"}'),

('welcome_driver', 'Welcome to {{tenant_name}} Driver Network!', '<h2>Welcome to the {{tenant_name}} Driver Team!</h2><p>We''re thrilled to have you join our network of professional drivers.</p><p>Next steps to get you on the road:</p><ol><li>Complete your profile verification</li><li>Upload required documents</li><li>Complete driver training</li><li>Start accepting rides</li></ol><p>Need help? Contact our driver support team at {{driver_support_email}}</p>', 'welcome', '{"tenant_name": "string", "driver_support_email": "string"}'),

('booking_confirmation', 'Your {{tenant_name}} Booking Confirmation', '<h2>Booking Confirmed!</h2><p>Your ride has been confirmed. Here are the details:</p><div style="background: #f9f9f9; padding: 15px; margin: 10px 0;"><p><strong>Booking ID:</strong> {{booking_id}}</p><p><strong>Pickup:</strong> {{pickup_address}}</p><p><strong>Dropoff:</strong> {{dropoff_address}}</p><p><strong>Date:</strong> {{booking_date}}</p><p><strong>Time:</strong> {{booking_time}}</p><p><strong>Driver:</strong> {{driver_name}}</p><p><strong>Vehicle:</strong> {{vehicle_type}} - {{vehicle_color}} ({{vehicle_plate}})</p><p><strong>Estimated Fare:</strong> ${{estimated_fare}}</p></div><p>Track your ride in real-time using our app.</p><a href="{{tracking_url}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Your Ride</a>', 'booking_confirmation', '{"tenant_name": "string", "booking_id": "string", "pickup_address": "string", "dropoff_address": "string", "booking_date": "string", "booking_time": "string", "driver_name": "string", "vehicle_type": "string", "vehicle_color": "string", "vehicle_plate": "string", "estimated_fare": "string", "tracking_url": "string"}'),

('promotional_offer', 'Special Offer from {{tenant_name}} - {{offer_title}}', '<h2>{{offer_title}}</h2><p>{{offer_description}}</p><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; margin: 20px 0; border-radius: 10px;"><h3 style="color: white;">{{discount_percentage}}% OFF</h3><p style="color: white;">{{offer_details}}</p><p style="color: white;">Use code: {{promo_code}}</p><p style="color: white;">Valid until: {{expiry_date}}</p></div><a href="{{booking_url}}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">Book Your Ride Now</a><p style="margin-top: 20px; font-size: 12px; color: #666;">Terms and conditions apply. Offer valid for {{validity_period}} from receipt of this email.</p>', 'promotional', '{"tenant_name": "string", "offer_title": "string", "offer_description": "string", "discount_percentage": "string", "offer_details": "string", "promo_code": "string", "expiry_date": "string", "booking_url": "string", "validity_period": "string"}'),

('retention_campaign', 'We Miss You at {{tenant_name}} - Special Welcome Back Offer', '<h2>We Miss You!</h2><p>It''s been a while since your last ride with {{tenant_name}}. We''d love to have you back!</p><div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center;"><h3>Welcome Back Offer</h3><p style="font-size: 24px; color: #28a745; font-weight: bold;">{{discount_percentage}}% OFF</p><p>Your next ride is on us!</p><p>Use code: WELCOMEBACK</p><p>Valid for 7 days</p></div><p>Book your ride today and experience the {{tenant_name}} difference:</p><ul><li>Professional, courteous drivers</li><li>Premium, well-maintained vehicles</li><li>Real-time ride tracking</li><li>24/7 customer support</li></ul><a href="{{booking_url}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">Book Your Welcome Back Ride</a>', 'retention', '{"tenant_name": "string", "discount_percentage": "string", "booking_url": "string"}');

-- Create default customer segments
INSERT INTO customer_segments (tenant_id, name, segment_type, conditions) VALUES
('default', 'All Customers', 'all_customers', '{}'),
('default', 'New Customers (Last 30 Days)', 'new_customers', '{"days_since_signup": 30}'),
('default', 'Repeat Customers', 'repeat_customers', '{"min_bookings": 2}'),
('default', 'High Value Customers', 'high_value', '{"total_spent": 500}'),
('default', 'Inactive Customers (30+ Days)', 'inactive', '{"days_since_last_booking": 30}'),
('default', 'Corporate Customers', 'corporate', '{"account_type": "corporate"}');

-- Create indexes for performance optimization
CREATE INDEX idx_email_logs_tenant_status ON email_automation_logs(tenant_id, status, sent_at);
CREATE INDEX idx_campaigns_tenant_active ON email_campaigns(tenant_id, is_active);
CREATE INDEX idx_segments_tenant_type ON customer_segments(tenant_id, segment_type);
