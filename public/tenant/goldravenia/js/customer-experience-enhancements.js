// GoldRavenia Tenant Site Enhancements
// Customer-focused features for tenant microsite

document.addEventListener('DOMContentLoaded', function() {
    // Initialize customer testimonial carousel
    initializeTestimonialCarousel();
    
    // Initialize live chat functionality
    initializeLiveChat();
    
    // Track customer interactions
    trackCustomerEngagement();
    
    // Initialize trust signals
    initializeTrustSignals();
});

function initializeTestimonialCarousel() {
    const testimonials = [
        {
            name: "James Davidson",
            role: "CEO, Davidson Capital",
            content: "GoldRavenia has been our exclusive transportation partner for 3 years. Their punctuality and professionalism are unmatched.",
            rating: 5,
            avatar: "JD"
        },
        {
            name: "Sarah Chen", 
            role: "Event Coordinator, Luxe Events",
            content: "We trust GoldRavenia with our most VIP clients. Their attention to detail and discreet service makes every event flawless.",
            rating: 5,
            avatar: "SC"
        },
        {
            name: "Michael Rodriguez",
            role: "Partner, Sterling Law Firm", 
            content: "As a frequent business traveler, I rely on GoldRavenia for all my airport transfers. Their drivers are professional and the vehicles are immaculate.",
            rating: 5,
            avatar: "MR"
        }
    ];
    
    let currentIndex = 0;
    const testimonialContainer = document.querySelector('.testimonial-carousel');
    
    if (testimonialContainer) {
        // Auto-rotate testimonials
        setInterval(() => {
            currentIndex = (currentIndex + 1) % testimonials.length;
            updateTestimonial(testimonials[currentIndex]);
        }, 8000);
    }
}

function updateTestimonial(testimonial) {
    const testimonialContainer = document.querySelector('.testimonial-carousel');
    if (!testimonialContainer) return;
    
    testimonialContainer.innerHTML = `
        <div class="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div class="flex items-center mb-4">
                <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mr-3">
                    <span class="text-white font-bold">${testimonial.avatar}</span>
                </div>
                <div>
                    <h4 class="font-semibold text-white">${testimonial.name}</h4>
                    <p class="text-sm text-gray-400">${testimonial.role}</p>
                </div>
            </div>
            <div class="flex mb-3">
                <span class="text-yellow-400">${'★'.repeat(testimonial.rating)}</span>
            </div>
            <p class="text-gray-300">"${testimonial.content}"</p>
        </div>
    `;
}

function initializeLiveChat() {
    // Create live chat modal
    const chatModal = document.createElement('div');
    chatModal.id = 'live-chat-modal';
    chatModal.className = 'fixed bottom-20 right-4 w-80 h-96 bg-white rounded-lg shadow-2xl hidden z-50';
    chatModal.innerHTML = `
        <div class="bg-brand-primary text-black p-4 rounded-t-lg flex justify-between items-center">
            <h3 class="font-semibold">GoldRavenia Support</h3>
            <button onclick="closeLiveChat()" class="text-black hover:text-gray-700">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
        <div class="p-4 h-64 overflow-y-auto">
            <div class="space-y-3">
                <div class="bg-gray-100 rounded-lg p-3">
                    <p class="text-sm text-gray-600">Hi! I'm Sarah from GoldRavenia. How can I help you today?</p>
                </div>
            </div>
        </div>
        <div class="p-4 border-t">
            <div class="flex space-x-2">
                <input type="text" id="chat-input" placeholder="Type your message..." 
                       class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <button onclick="sendChatMessage()" class="bg-brand-primary text-black px-4 py-2 rounded-lg hover:opacity-90">
                    <i data-lucide="send" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(chatModal);
}

function openLiveChat() {
    const chatModal = document.getElementById('live-chat-modal');
    if (chatModal) {
        chatModal.classList.remove('hidden');
        trackEvent('live_chat_opened');
    }
}

function closeLiveChat() {
    const chatModal = document.getElementById('live-chat-modal');
    if (chatModal) {
        chatModal.classList.add('hidden');
    }
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (message) {
        // Add user message to chat
        const chatContainer = document.querySelector('.space-y-3');
        const userMessage = document.createElement('div');
        userMessage.className = 'bg-brand-primary text-black rounded-lg p-3 ml-auto max-w-xs';
        userMessage.innerHTML = `<p class="text-sm">${message}</p>`;
        chatContainer.appendChild(userMessage);
        
        // Clear input
        input.value = '';
        
        // Simulate response
        setTimeout(() => {
            const response = document.createElement('div');
            response.className = 'bg-gray-100 rounded-lg p-3 max-w-xs';
            response.innerHTML = `<p class="text-sm text-gray-600">Thank you for your message! Our team will respond shortly. For immediate assistance, please call +1-312-555-GOLD.</p>`;
            chatContainer.appendChild(response);
            
            // Scroll to bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 1000);
        
        trackEvent('live_chat_message_sent');
    }
}

function trackCustomerEngagement() {
    // Track page views
    trackEvent('page_view', {
        page: window.location.pathname,
        tenant: 'goldravenia'
    });
    
    // Track button clicks
    const bookingButtons = document.querySelectorAll('button');
    bookingButtons.forEach(button => {
        button.addEventListener('click', function() {
            trackEvent('button_click', {
                button_text: this.textContent,
                button_type: this.className
            });
        });
    });
    
    // Track form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            trackEvent('form_submission', {
                form_id: this.id || 'unknown_form'
            });
        });
    });
    
    // Track time on page
    let startTime = Date.now();
    window.addEventListener('beforeunload', function() {
        const timeOnPage = Math.floor((Date.now() - startTime) / 1000);
        trackEvent('time_on_page', {
            duration_seconds: timeOnPage
        });
    });
}

function initializeTrustSignals() {
    // Animate trust metrics on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateTrustMetrics();
                observer.unobserve(entry.target);
            }
        });
    });
    
    const trustSection = document.querySelector('.grid.md\\:grid-cols-2.lg\\:grid-cols-4');
    if (trustSection) {
        observer.observe(trustSection);
    }
}

function animateTrustMetrics() {
    const metrics = [
        { element: '.text-4xl', target: 15, suffix: '+', label: 'Years of Excellence' },
        { element: '.text-4xl', target: 50000, suffix: '+', label: 'Happy Clients' },
        { element: '.text-4xl', target: 200, suffix: '+', label: 'Corporate Partners' },
        { element: '.text-4xl', target: 4.9, suffix: '/5', label: 'Average Rating' }
    ];
    
    metrics.forEach((metric, index) => {
        const elements = document.querySelectorAll(metric.element);
        if (elements[index]) {
            animateCounter(elements[index], metric.target, metric.suffix);
        }
    });
}

function animateCounter(element, target, suffix = '') {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 30);
}

function trackEvent(eventName, data = {}) {
    // Track customer engagement for tenant analytics
    fetch('/api/v1/tenant/analytics/track', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': 'goldravenia'
        },
        body: JSON.stringify({
            event: eventName,
            data: {
                ...data,
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                referrer: document.referrer
            }
        })
    }).catch(error => {
        console.error('Failed to track event:', error);
    });
}

// Handle Enter key in chat input
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.id === 'chat-input') {
        sendChatMessage();
    }
});

// Initialize Lucide icons for dynamically created content
document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                lucide.createIcons();
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
