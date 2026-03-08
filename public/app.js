/**
 * UrWay Dispatch - Modern Web 4.0 Application
 * Multi-tenant SaaS Platform with PWA capabilities
 */

// Modern JavaScript Module Pattern
class UrWayApp {
  constructor() {
    this.version = '2.0.0';
    this.tenant = this.detectTenant();
    this.theme = this.loadTheme();
    this.isOnline = navigator.onLine;
    this.installPrompt = null;
    this.swRegistration = null;
    
    this.init();
  }

  // Initialize Application
  async init() {
    console.log(`🚀 UrWay Dispatch v${this.version} - Initializing...`);
    
    // Set up tenant configuration
    this.setupTenant();
    
    // Initialize PWA features
    await this.initPWA();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize components
    this.initComponents();
    
    // Create tenant switcher (if not in white-label mode)
    const config = this.getTenantConfig(this.tenant);
    if (!config?.whiteLabel) {
      this.createTenantSwitcher();
    }
    
    // Track performance
    this.trackPerformance();
    
    // Show loading complete
    this.hideLoadingScreen();
    
    console.log('✅ UrWay Dispatch initialized successfully');
  }

  // Detect tenant from URL or localStorage
  detectTenant() {
    const urlParams = new URLSearchParams(window.location.search);
    const subdomain = window.location.hostname.split('.')[0];
    const pathSegment = window.location.pathname.split('/')[2]; // /tenant/{tenant}
    
    // Enhanced priority: subdomain > path segment > URL param > localStorage > default
    return (subdomain !== 'urwaydispatch' && subdomain !== 'www' ? subdomain : null) ||
           (window.location.pathname.startsWith('/tenant/') ? pathSegment : null) ||
           urlParams.get('tenant') ||
           localStorage.getItem('urway-tenant') ||
           'default';
  }

  // Get tenant configuration helper
  getTenantConfig(tenantId) {
    const tenantConfigs = {
      'default': { whiteLabel: false },
      'goldravenia': { whiteLabel: true },
      'blackravenia': { whiteLabel: true },
      'silverpeak': { whiteLabel: false },
      'metrofleet': { whiteLabel: false },
      'nightowl': { whiteLabel: false },
      'aerotransit': { whiteLabel: false },
      'corporateride': { whiteLabel: false },
      'greenwave': { whiteLabel: false },
      'legacyluxe': { whiteLabel: false },
      'urbanrush': { whiteLabel: false },
      'demo-tenant-a': { whiteLabel: false },
      'demo-tenant-b': { whiteLabel: false }
    };
    return tenantConfigs[tenantId] || tenantConfigs['default'];
  }

  // Setup tenant-specific configuration
  setupTenant() {
    const tenantConfigs = {
      'default': {
        name: 'UrWay Dispatch',
        logo: '/logo.svg',
        primaryColor: '#1e40af',
        accentColor: '#d4a017',
        theme: 'light'
      },
      'goldravenia': {
        name: 'GoldRavenia Luxury Transportation',
        logo: '../../assets/tenants/goldravenia-logo-winner.png',
        crest: '../../assets/tenants/goldravenia-crest.svg',
        icon: '../../assets/tenants/goldravenia-icon.svg',
        primaryColor: '#B69B60',
        accentColor: '#000000',
        backgroundColor: '#000000',
        surfaceColor: '#000000',
        textColor: '#FFFFFF',
        textSecondaryColor: '#E1E1E1',
        theme: 'dark',
        contactEmail: 'info@goldravenia.com',
        contactPhone: '+1-312-555-GOLD',
        address: 'Chicago North Shore, IL',
        tagline: 'Premium Black Car Service',
        description: 'Luxury transportation with professional chauffeurs',
        whiteLabel: true
      },
      'blackravenia': {
        name: 'BlackRavenia Premium SUV',
        logo: '/assets/tenants/blackravenia-logo.svg',
        primaryColor: '#1a1a1a',
        accentColor: '#d4af37',
        theme: 'light',
        contactEmail: 'reservations@blackravenia.com',
        contactPhone: '+1-312-555-BLACK',
        address: 'Chicago Metro Area, IL',
        tagline: 'Premium SUV Fleet Service',
        description: 'Spacious luxury SUV transportation',
        whiteLabel: true
      },
      'silverpeak': {
        name: 'SilverPeak Executive Chauffeur',
        logo: '/assets/tenants/silverpeak-logo.svg',
        primaryColor: '#6b7280',
        accentColor: '#c0c0c0',
        theme: 'light',
        contactEmail: 'booking@silverpeak.com',
        contactPhone: '+1-312-555-SILVER',
        address: 'Chicago Loop & Suburbs, IL',
        tagline: 'Executive Chauffeur Service',
        description: 'Professional executive transportation'
      },
      'metrofleet': {
        name: 'MetroFleet Transportation',
        logo: '/assets/tenants/metrofleet-logo.svg',
        primaryColor: '#2563eb',
        accentColor: '#f59e0b',
        theme: 'light',
        contactEmail: 'rides@metrofleet.com',
        contactPhone: '+1-312-555-METRO',
        address: 'Chicago, IL',
        tagline: 'City-Wide Rideshare',
        description: 'Reliable transportation throughout Chicago'
      },
      'nightowl': {
        name: 'NightOwl Late-Night Service',
        logo: '/assets/tenants/nightowl-logo.svg',
        primaryColor: '#7c3aed',
        accentColor: '#f472b6',
        theme: 'dark',
        contactEmail: 'late@nightowlrides.com',
        contactPhone: '+1-312-555-NIGHT',
        address: 'Chicago River North & Wicker Park',
        tagline: 'Late-Night Transportation',
        description: 'Safe rides when you need them most'
      },
      'aerotransit': {
        name: 'AeroTransit Airport Specialist',
        logo: '/assets/tenants/aerotransit-logo.svg',
        primaryColor: '#0ea5e9',
        accentColor: '#0f172a',
        theme: 'light',
        contactEmail: 'airport@aerotransit.com',
        contactPhone: '+1-312-555-AIRPORT',
        address: 'ORD + MDW Airport Corridors',
        tagline: 'Airport Transportation Experts',
        description: 'Specialized airport transfer services'
      },
      'corporateride': {
        name: 'CorporateRide Business Solutions',
        logo: '/assets/tenants/corporateride-logo.svg',
        primaryColor: '#1e293b',
        accentColor: '#22c55e',
        theme: 'light',
        contactEmail: 'business@corporateride.com',
        contactPhone: '+1-312-555-CORP',
        address: 'Chicago CBD & O\'Hare',
        tagline: 'B2B Corporate Transportation',
        description: 'Corporate travel management solutions'
      },
      'greenwave': {
        name: 'GreenWave Eco Transportation',
        logo: '/assets/tenants/greenwave-logo.svg',
        primaryColor: '#16a34a',
        accentColor: '#86efac',
        theme: 'light',
        contactEmail: 'green@greenwaveev.com',
        contactPhone: '+1-312-555-GREEN',
        address: 'Chicago Eco Zones',
        tagline: 'Eco-Friendly Rideshare',
        description: 'Sustainable electric vehicle transportation'
      },
      'legacyluxe': {
        name: 'LegacyLuxe Premium 24/7',
        logo: '/assets/tenants/legacyluxe-logo.svg',
        primaryColor: '#78350f',
        accentColor: '#fbbf24',
        theme: 'light',
        contactEmail: 'premium@legacyluxe.com',
        contactPhone: '+1-312-555-LEGACY',
        address: 'Chicagoland Luxury Corridor',
        tagline: '24/7 Premium Chauffeur',
        description: 'Around-the-clock luxury transportation'
      },
      'urbanrush': {
        name: 'UrbanRush Budget Transportation',
        logo: '/assets/tenants/urbanrush-logo.svg',
        primaryColor: '#dc2626',
        accentColor: '#fca5a5',
        theme: 'light',
        contactEmail: 'quick@urbanrush.com',
        contactPhone: '+1-312-555-RUSH',
        address: 'Chicago Neighborhoods',
        tagline: 'Budget Volume Rides',
        description: 'Affordable transportation for everyone'
      },
      'demo-tenant-a': {
        name: 'QuickRide',
        logo: '/tenants/demo-a/logo.svg',
        primaryColor: '#7c3aed',
        accentColor: '#ec4899',
        theme: 'light'
      },
      'demo-tenant-b': {
        name: 'CityTransport',
        logo: '/tenants/demo-b/logo.svg',
        primaryColor: '#059669',
        accentColor: '#f59e0b',
        theme: 'light'
      }
    };

    const config = tenantConfigs[this.tenant] || tenantConfigs['default'];
    
    // Apply tenant configuration
    this.applyTenantTheme(config);
    this.updateBranding(config);
    
    // Store tenant preference
    localStorage.setItem('urway-tenant', this.tenant);
    
    console.log(`🏢 Tenant: ${this.tenant} (${config.name})`);
  }

  // Apply tenant-specific theme
  applyTenantTheme(config) {
    const root = document.documentElement;
    
    // Add theme transition class
    document.body.classList.add('theme-transition');
    
    // Set tenant attribute for CSS theming
    root.setAttribute('data-tenant', this.tenant);
    
    // Set CSS custom properties (fallback for dynamic theming)
    root.style.setProperty('--brand-primary', config.primaryColor);
    root.style.setProperty('--brand-accent', config.accentColor);
    
    // Set theme attribute
    root.setAttribute('data-theme', config.theme);
    
    // Update meta tags
    this.updateMetaTags(config);
    
    // Apply white-label mode if enabled
    if (config.whiteLabel) {
      this.enableWhiteLabelMode();
    }
    
    // Remove transition class after theme is applied
    setTimeout(() => {
      document.body.classList.remove('theme-transition');
    }, 300);
  }

  // Update branding elements
  updateBranding(config) {
    // Update page title
    document.title = `${config.name} - Enterprise Rideshare Platform`;
    
    // Update logo if custom
    const logoElements = document.querySelectorAll('[data-brand-logo]');
    logoElements.forEach(el => {
      if (config.logo !== '/logo.svg') {
        el.src = config.logo;
      }
    });
    
    // Update brand name
    const nameElements = document.querySelectorAll('[data-brand-name]');
    nameElements.forEach(el => {
      el.textContent = config.name;
    });
    
    // Update contact information
    if (config.contactEmail) {
      const emailElements = document.querySelectorAll('[data-tenant-email]');
      emailElements.forEach(el => {
        el.textContent = config.contactEmail;
        el.href = `mailto:${config.contactEmail}`;
      });
    }
    
    if (config.contactPhone) {
      const phoneElements = document.querySelectorAll('[data-tenant-phone]');
      phoneElements.forEach(el => {
        el.textContent = config.contactPhone;
        el.href = `tel:${config.contactPhone.replace(/[^\d+]/g, '')}`;
      });
    }
    
    if (config.address) {
      const addressElements = document.querySelectorAll('[data-tenant-address]');
      addressElements.forEach(el => {
        el.textContent = config.address;
      });
    }
    
    if (config.tagline) {
      const taglineElements = document.querySelectorAll('[data-tenant-tagline]');
      taglineElements.forEach(el => {
        el.textContent = config.tagline;
      });
    }
    
    if (config.description) {
      const descriptionElements = document.querySelectorAll('[data-tenant-description]');
      descriptionElements.forEach(el => {
        el.textContent = config.description;
      });
    }
  }

  // Update meta tags for tenant
  updateMetaTags(config) {
    // Update theme color
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.content = config.primaryColor;
    }
    
    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.content = `${config.name} - Enterprise Rideshare Platform`;
    }
    
    // Update description meta tag
    if (config.description) {
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) {
        descMeta.content = config.description;
      }
    }
  }

  // Enable white-label mode
  enableWhiteLabelMode() {
    // Hide UrWay branding elements
    const urwayElements = document.querySelectorAll('[data-urway-brand]');
    urwayElements.forEach(el => {
      el.style.display = 'none';
    });

    // Show white-label elements
    const whiteLabelElements = document.querySelectorAll('[data-white-label]');
    whiteLabelElements.forEach(el => {
      el.style.display = '';
    });
    
    console.log('🏷️ White-label mode enabled');
  }

  // Create tenant switcher
  createTenantSwitcher() {
    const switcherHtml = `
      <div id="tenant-switcher" class="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-2 border theme-transition">
        <select id="tenant-selector" class="text-sm border rounded px-2 py-1 theme-transition">
          <option value="default">UrWay Dispatch</option>
          <option value="goldravenia">GoldRavenia</option>
          <option value="blackravenia">BlackRavenia</option>
          <option value="silverpeak">SilverPeak</option>
          <option value="metrofleet">MetroFleet</option>
          <option value="nightowl">NightOwl</option>
          <option value="aerotransit">AeroTransit</option>
          <option value="corporateride">CorporateRide</option>
          <option value="greenwave">GreenWave</option>
          <option value="legacyluxe">LegacyLuxe</option>
          <option value="urbanrush">UrbanRush</option>
        </select>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', switcherHtml);
    
    const selector = document.getElementById('tenant-selector');
    selector.value = this.tenant;
    
    selector.addEventListener('change', (e) => {
      this.switchTenant(e.target.value);
    });
  }

  // Switch tenant
  switchTenant(newTenant) {
    if (newTenant === this.tenant) return;

    // Update URL
    const url = new URL(window.location);
    if (newTenant === 'default') {
      url.searchParams.delete('tenant');
    } else {
      url.searchParams.set('tenant', newTenant);
    }
    
    // Apply new theme
    this.tenant = newTenant;
    this.setupTenant();
    
    // Update URL without page reload
    window.history.replaceState({}, '', url.toString());
    
    console.log(`🔄 Switched to tenant: ${newTenant}`);
  }

  // Initialize PWA features
  async initPWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('📡 Service Worker registered');
        
        // Check for updates
        this.swRegistration.addEventListener('updatefound', () => {
          const newWorker = this.swRegistration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateNotification();
            }
          });
        });
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }

    // Set up install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e;
      this.showInstallButton();
    });

    // Handle app installed
    window.addEventListener('appinstalled', () => {
      console.log('📱 App installed successfully');
      this.hideInstallButton();
      this.trackEvent('app_installed');
    });
  }

  // Setup event listeners
  setupEventListeners() {
    // Online/Offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateOnlineStatus();
      this.showNotification('Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateOnlineStatus();
      this.showNotification('Connection lost', 'warning');
    });

    // Page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.trackPageView();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleEscape();
      }
    });

    // Mobile menu
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
      mobileMenuButton.addEventListener('click', () => {
        this.toggleMobileMenu();
      });
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }

  // Initialize UI components
  initComponents() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Initialize tooltips
    this.initTooltips();

    // Initialize modals
    this.initModals();

    // Initialize forms
    this.initForms();

    // Initialize animations
    this.initAnimations();
  }

  // Mobile menu toggle
  toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    
    if (mobileMenu && mobileMenuButton) {
      const isHidden = mobileMenu.classList.contains('hidden');
      
      if (isHidden) {
        mobileMenu.classList.remove('hidden');
        mobileMenuButton.setAttribute('aria-expanded', 'true');
      } else {
        mobileMenu.classList.add('hidden');
        mobileMenuButton.setAttribute('aria-expanded', 'false');
      }
    }
  }

  // Theme toggle
  toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('urway-theme', newTheme);
    
    this.trackEvent('theme_changed', { theme: newTheme });
  }

  // Load saved theme
  loadTheme() {
    const savedTheme = localStorage.getItem('urway-theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    return savedTheme || systemTheme;
  }

  // Hide loading screen
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    
    if (loadingScreen && app) {
      // Immediate visibility for testing
      loadingScreen.style.display = 'none';
      app.classList.remove('loading');
      app.classList.add('loaded');
      
      console.log('🎯 Loading screen hidden, app visible');
    } else {
      console.error('❌ Loading screen or app element not found');
    }
  }

  // Show update notification
  showUpdateNotification() {
    this.showNotification('New version available! Click to refresh.', 'info', () => {
      window.location.reload();
    });
  }

  // Show install button
  showInstallButton() {
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => this.installApp());
    }
  }

  // Hide install button
  hideInstallButton() {
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  // Install PWA
  async installApp() {
    if (!this.installPrompt) return;
    
    const result = await this.installPrompt.prompt();
    const outcome = await result.userChoice;
    
    if (outcome === 'accepted') {
      console.log('📱 User accepted install prompt');
      this.trackEvent('install_accepted');
    } else {
      console.log('📱 User dismissed install prompt');
      this.trackEvent('install_dismissed');
    }
    
    this.installPrompt = null;
  }

  // Update online status
  updateOnlineStatus() {
    const statusElement = document.getElementById('online-status');
    if (statusElement) {
      statusElement.textContent = this.isOnline ? 'Online' : 'Offline';
      statusElement.setAttribute('data-status', this.isOnline ? 'online' : 'offline');
    }
  }

  // Show notification
  showNotification(message, type = 'info', action = null) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add action button if provided
    if (action) {
      const actionButton = document.createElement('button');
      actionButton.textContent = 'Refresh';
      actionButton.addEventListener('click', action);
      notification.appendChild(actionButton);
    }
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Track performance
  trackPerformance() {
    if ('performance' in window) {
      // Track page load time
      window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`⚡ Page load time: ${loadTime}ms`);
        
        // Track Core Web Vitals if available
        if ('web-vitals' in window) {
          // This would require the web-vitals library
          console.log('📊 Web Vitals tracking available');
        }
      });
    }
  }

  // Track events
  trackEvent(eventName, properties = {}) {
    console.log(`📈 Event: ${eventName}`, properties);
    
    // Send to analytics
    if (window.gtag) {
      gtag('event', eventName, properties);
    }
  }

  // Track page views
  trackPageView() {
    const page = window.location.pathname;
    console.log(`👁️ Page view: ${page}`);
    
    if (window.gtag) {
      gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: page,
        custom_map: { 'tenant': this.tenant }
      });
    }
  }

  // Initialize tooltips
  initTooltips() {
    // Simple tooltip implementation
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
      element.addEventListener('mouseenter', (e) => {
        this.showTooltip(e.target, e.target.getAttribute('data-tooltip'));
      });
      
      element.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });
  }

  // Show tooltip
  showTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
  }

  // Hide tooltip
  hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  // Initialize modals
  initModals() {
    const modalTriggers = document.querySelectorAll('[data-modal-trigger]');
    const modalCloses = document.querySelectorAll('[data-modal-close]');
    
    modalTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        const modalId = e.target.getAttribute('data-modal-trigger');
        this.openModal(modalId);
      });
    });
    
    modalCloses.forEach(close => {
      close.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        this.closeModal(modal);
      });
    });
  }

  // Open modal
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  // Close modal
  closeModal(modal) {
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  // Initialize forms
  initForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        this.handleFormSubmit(e);
      });
    });
  }

  // Handle form submission
  handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Loading...';
    submitButton.disabled = true;
    
    // Simulate form submission
    setTimeout(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
      this.showNotification('Form submitted successfully!', 'success');
      form.reset();
    }, 2000);
  }

  // Initialize animations
  initAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);
    
    // Observe elements with animation classes
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => observer.observe(el));
  }

  // Handle escape key
  handleEscape() {
    // Close any open modals
    const openModal = document.querySelector('.modal.active');
    if (openModal) {
      this.closeModal(openModal);
    }
    
    // Close mobile menu
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      this.toggleMobileMenu();
    }
  }

  // Public API
  getTenantInfo() {
    return {
      id: this.tenant,
      theme: this.theme,
      isOnline: this.isOnline,
      version: this.version
    };
  }

  // Switch tenant dynamically
  switchTenant(tenantId) {
    this.tenant = tenantId;
    this.setupTenant();
    this.trackEvent('tenant_switched', { tenant: tenantId });
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, initializing UrWay Dispatch...');
  
  // Remove no-js class
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');
  
  // Initialize the app
  window.urwayApp = new UrWayApp();
  
  // Make it globally available
  console.log('🎯 UrWay Dispatch ready!');
  
  // Debug tenant detection
  setTimeout(() => {
    console.log('🔍 Current tenant:', window.urwayApp.getCurrentTenant());
    console.log('🎨 Tenant config:', window.urwayApp.getTenantConfig(window.urwayApp.getCurrentTenant()));
  }, 1000);
});

// Handle errors gracefully
window.addEventListener('error', (e) => {
  console.error('❌ Application error:', e.error);
  // Track error if analytics available
  if (window.gtag) {
    gtag('event', 'exception', {
      description: e.error.message,
      fatal: false
    });
  }
});

// Export for module usage
export default UrWayApp;
