// UWD Main Site Email Marketing Integration
// Connects newsletter form to our email marketing automation system

document.addEventListener('DOMContentLoaded', function() {
    // Initialize email marketing service
    const emailService = new EmailMarketingService('uwd_main');
    
    // Handle newsletter form submission
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = newsletterForm.querySelector('input[type="email"]').value;
            const submitButton = newsletterForm.querySelector('button[type="submit"]');
            
            // Show loading state
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Subscribing...';
            submitButton.disabled = true;
            
            try {
                // Subscribe to email marketing list
                const result = await emailService.subscribeToList({
                    email: email,
                    list_name: 'transportation_business_insights',
                    source: 'uwd_main_site_newsletter',
                    tags: ['prospective_tenant', 'transportation_business']
                });
                
                // Show success message
                showNotification('Successfully subscribed! Check your email for confirmation.', 'success');
                
                // Reset form
                newsletterForm.reset();
                
                // Track conversion
                await emailService.trackConversion('newsletter_signup', {
                    email: email,
                    source: 'uwd_main_site',
                    conversion_type: 'email_marketing'
                });
                
            } catch (error) {
                console.error('Newsletter subscription failed:', error);
                showNotification('Subscription failed. Please try again.', 'error');
            } finally {
                // Restore button state
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    }
    
    // Track page views for email marketing analytics
    trackPageView();
    
    // Setup exit-intent popup for email capture
    setupExitIntentPopup();
});

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

async function trackPageView() {
    try {
        // Track page view for email marketing analytics
        await fetch('/api/v1/analytics/pageview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': 'uwd_main'
            },
            body: JSON.stringify({
                page: window.location.pathname,
                referrer: document.referrer,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error('Failed to track page view:', error);
    }
}

function setupExitIntentPopup() {
    let mouseLeft = false;
    let popupShown = false;
    
    document.addEventListener('mouseleave', function(e) {
        if (e.clientY <= 0 && !mouseLeft && !popupShown) {
            mouseLeft = true;
            showExitIntentPopup();
            popupShown = true;
        }
    });
    
    document.addEventListener('mouseenter', function() {
        mouseLeft = false;
    });
}

function showExitIntentPopup() {
    // Check if user is already subscribed
    if (localStorage.getItem('uwd_newsletter_subscribed')) {
        return;
    }
    
    // Create exit-intent popup
    const popup = document.createElement('div');
    popup.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    popup.innerHTML = `
        <div class="bg-white rounded-lg p-8 max-w-md mx-4">
            <div class="text-center mb-6">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">Before You Go...</h3>
                <p class="text-gray-600">Get exclusive transportation business insights delivered to your inbox</p>
            </div>
            
            <form id="exit-intent-form" class="space-y-4">
                <input type="email" placeholder="Enter your business email" required
                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <div class="flex space-x-3">
                    <button type="submit" class="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700">
                        Subscribe Now
                    </button>
                    <button type="button" onclick="closeExitIntentPopup()" class="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:bg-gray-50">
                        No Thanks
                    </button>
                </div>
            </form>
            
            <p class="text-xs text-gray-500 text-center mt-4">
                Join 500+ transportation operators. Unsubscribe anytime.
            </p>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Handle form submission
    const exitIntentForm = document.getElementById('exit-intent-form');
    exitIntentForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = exitIntentForm.querySelector('input[type="email"]').value;
        
        try {
            // Subscribe to email marketing list
            const emailService = new EmailMarketingService('uwd_main');
            await emailService.subscribeToList({
                email: email,
                list_name: 'transportation_business_insights',
                source: 'exit_intent_popup',
                tags: ['prospective_tenant', 'exit_intent']
            });
            
            // Mark as subscribed
            localStorage.setItem('uwd_newsletter_subscribed', 'true');
            
            // Show success and close popup
            showNotification('Successfully subscribed!', 'success');
            closeExitIntentPopup();
            
        } catch (error) {
            console.error('Exit intent subscription failed:', error);
            showNotification('Subscription failed. Please try again.', 'error');
        }
    });
}

function closeExitIntentPopup() {
    const popup = document.querySelector('.fixed.inset-0.bg-black');
    if (popup) {
        popup.remove();
    }
}

// Email Marketing Service Class (simplified version for main site)
class EmailMarketingService {
    constructor(tenantId) {
        this.tenantId = tenantId;
        this.apiEndpoint = '/api/v1/email-marketing';
    }
    
    async subscribeToList(subscriptionData) {
        const response = await fetch(`${this.apiEndpoint}/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            },
            body: JSON.stringify(subscriptionData)
        });
        
        if (!response.ok) {
            throw new Error('Subscription failed');
        }
        
        return response.json();
    }
    
    async trackConversion(conversionType, data) {
        const response = await fetch(`${this.apiEndpoint}/track-conversion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            },
            body: JSON.stringify({
                conversion_type: conversionType,
                data: data,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error('Conversion tracking failed');
        }
        
        return response.json();
    }
}
