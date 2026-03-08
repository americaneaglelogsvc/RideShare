/**
 * Advanced Navigation Renderer System
 * Dynamic navigation rendering with context awareness and progressive enhancement
 */

// Main navigation renderer function
function renderNavigation(containerId, currentPath) {
  const config = window.GLOBAL_NAVIGATION;
  const context = window.PAGE_CONTEXT.detectPageType(currentPath);
  const activeLink = window.PAGE_CONTEXT.getActiveLink(currentPath);
  
  // Generate cache key
  const cacheKey = window.NAVIGATION_PERFORMANCE.generateCacheKey(context, activeLink, currentPath);
  
  // Check cache first
  const cachedHTML = window.NAVIGATION_PERFORMANCE.getCachedNavigation(cacheKey);
  if (cachedHTML) {
    document.getElementById(containerId).innerHTML = cachedHTML;
    window.NAVIGATION_PERFORMANCE.optimizeIconCreation();
    return;
  }
  
  // Generate new navigation HTML
  const html = window.NAVIGATION_PERFORMANCE.measureRenderTime(() => {
    if (context === "special") {
      return renderSpecialNavigation(config, currentPath);
    } else {
      return renderStandardNavigation(config, currentPath, activeLink, context);
    }
  }, cacheKey);
  
  // Cache the result
  window.NAVIGATION_PERFORMANCE.setCachedNavigation(cacheKey, html);
  
  // Render to DOM
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = html;
    window.NAVIGATION_PERFORMANCE.optimizeIconCreation();
  }
}

// Render standard navigation for most pages
function renderStandardNavigation(config, currentPath, activeLink, context) {
  const cta = window.PAGE_CONTEXT.getCTA(context);
  
  return `
    <nav class="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <!-- Brand Logo -->
          <a href="${config.brand.url}" class="flex items-center space-x-3 group">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center transform transition-transform group-hover:scale-105">
              <i data-lucide="${config.brand.icon}" class="w-6 h-6 text-white"></i>
            </div>
            <div>
              <span class="font-bold text-xl text-gray-900">${config.brand.name}</span>
              <div class="text-xs text-gray-500 font-medium">${config.brand.tagline}</div>
            </div>
          </a>
          
          <!-- Desktop Navigation with Responsive Fix -->
          <div class="hidden lg:flex items-center space-x-6">
            ${renderNavLinks(config.primaryLinks, activeLink)}
            ${renderCTA(cta)}
          </div>
          
          <!-- Tablet/Mobile Menu Button -->
          <button id="mobileMenuBtn" class="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Toggle mobile menu" aria-expanded="false">
            <i data-lucide="menu" class="w-6 h-6 text-gray-700"></i>
          </button>
        </div>
        
        <!-- Mobile Navigation -->
        <div id="mobileMenu" class="hidden lg:hidden py-4 border-t border-gray-200">
          <div class="flex flex-col space-y-3">
            ${renderMobileNavLinks(config.primaryLinks, activeLink)}
            ${renderMobileCTA(cta)}
          </div>
        </div>
      </div>
    </nav>
  `;
}

// Render simplified navigation for special/demo pages
function renderSpecialNavigation(config, currentPath) {
  const badge = window.PAGE_CONTEXT.getSpecialPageBadge(currentPath);
  
  return `
    <nav class="bg-white shadow-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <a href="${config.brand.url}" class="flex items-center space-x-2">
            <i data-lucide="${config.brand.icon}" class="w-8 h-8 text-blue-600"></i>
            <span class="text-xl font-bold text-gray-900">${config.brand.name}</span>
          </a>
          <div class="flex items-center space-x-4">
            ${renderSpecialPageBadge(badge)}
            <a href="${config.brand.url}" class="text-blue-600 hover:text-blue-700 font-medium transition-colors">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </nav>
  `;
}

// Render navigation links with active states
function renderNavLinks(links, activeLink) {
  return links
    .sort((a, b) => a.order - b.order)
    .map(link => {
      const isActive = link.url === activeLink;
      const activeClass = isActive ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600 font-medium transition-colors";
      const ariaCurrent = isActive ? 'aria-current="page"' : '';
      
      return `
        <a href="${link.url}" class="${activeClass}" ${ariaCurrent}>
          ${link.label}
        </a>
      `;
    }).join('');
}

// Render mobile navigation links
function renderMobileNavLinks(links, activeLink) {
  return links
    .sort((a, b) => a.order - b.order)
    .map(link => {
      const isActive = link.url === activeLink;
      const activeClass = isActive ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors";
      const ariaCurrent = isActive ? 'aria-current="page"' : '';
      
      return `
        <a href="${link.url}" class="${activeClass}" ${ariaCurrent}>
          ${link.label}
        </a>
      `;
    }).join('');
}

// Render CTA button
function renderCTA(cta) {
  const style = window.GLOBAL_NAVIGATION.ctaStyles[cta.style];
  const iconHtml = cta.icon ? `<i data-lucide="${cta.icon}" class="${style.iconClass}"></i>` : '';
  
  return `
    <button onclick="window.location.href='${cta.url}'" 
            class="${style.bgClass} ${style.textClass} ${style.paddingClass} ${style.roundedClass} ${style.transitionClass} font-semibold flex items-center">
      ${iconHtml}
      ${cta.text}
    </button>
  `;
}

// Render mobile CTA button
function renderMobileCTA(cta) {
  const style = window.GLOBAL_NAVIGATION.ctaStyles[cta.style];
  const iconHtml = cta.icon ? `<i data-lucide="${cta.icon}" class="${style.iconClass}"></i>` : '';
  
  return `
    <button onclick="window.location.href='${cta.url}'" 
            class="${style.bgClass} ${style.textClass} ${style.paddingClass} ${style.roundedClass} ${style.transitionClass} font-semibold flex items-center justify-center">
      ${iconHtml}
      ${cta.text}
    </button>
  `;
}

// Render special page badge
function renderSpecialPageBadge(badge) {
  const pulseClass = badge.pulse ? 'pulse-dot' : '';
  
  return `
    <div class="flex items-center space-x-2">
      <div class="w-2 h-2 bg-${badge.color}-500 rounded-full ${pulseClass}"></div>
      <span class="text-sm text-${badge.color}-600 font-medium">${badge.text}</span>
    </div>
  `;
}

// Mobile menu functionality
function initializeMobileMenu() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', toggleMobileMenu);
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
        closeMobileMenu();
      }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileMenu();
    });
    
    // Handle resize with debouncing
    window.addEventListener('resize', 
      window.NAVIGATION_PERFORMANCE.debounce(() => {
        if (window.innerWidth >= 768) {
          closeMobileMenu();
        }
      }, 250)
    );
  }
}

function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  const menuBtn = document.getElementById('mobileMenuBtn');
  
  if (mobileMenu) {
    mobileMenu.classList.toggle('hidden');
    
    // Update ARIA attributes
    const isExpanded = !mobileMenu.classList.contains('hidden');
    menuBtn.setAttribute('aria-expanded', isExpanded);
    
    // Animate menu icon
    const icon = menuBtn.querySelector('i');
    if (icon) {
      icon.setAttribute('data-lucide', isExpanded ? 'x' : 'menu');
      window.NAVIGATION_PERFORMANCE.optimizeIconCreation();
    }
  }
}

function closeMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  const menuBtn = document.getElementById('mobileMenuBtn');
  
  if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
    mobileMenu.classList.add('hidden');
    menuBtn.setAttribute('aria-expanded', 'false');
    
    // Reset menu icon
    const icon = menuBtn.querySelector('i');
    if (icon) {
      icon.setAttribute('data-lucide', 'menu');
      window.NAVIGATION_PERFORMANCE.optimizeIconCreation();
    }
  }
}

// Add CSS for pulse animation
const pulseCSS = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.1); }
  }
  .pulse-dot {
    animation: pulse 2s infinite;
  }
`;

// Inject pulse CSS if not already present
if (!document.querySelector('#navigation-pulse-styles')) {
  const style = document.createElement('style');
  style.id = 'navigation-pulse-styles';
  style.textContent = pulseCSS;
  document.head.appendChild(style);
}

// Initialize navigation and footer when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const currentPath = window.PAGE_CONTEXT.normalizePathname(window.location.pathname);
  
  // Render navigation
  renderNavigation('global-navigation', currentPath);
  initializeMobileMenu();
  
  // Render footer with context
  if (typeof renderFooterWithContext === 'function') {
    renderFooterWithContext('global-footer', currentPath);
  }
});

// Handle client-side routing (if applicable)
window.addEventListener('popstate', function() {
  const currentPath = window.PAGE_CONTEXT.normalizePathname(window.location.pathname);
  renderNavigation('global-navigation', currentPath);
  
  // Update footer on route change
  if (typeof renderFooterWithContext === 'function') {
    renderFooterWithContext('global-footer', currentPath);
  }
});

// Handle navigation after dynamic content changes
window.addEventListener('navigation-update', function() {
  const currentPath = window.PAGE_CONTEXT.normalizePathname(window.location.pathname);
  renderNavigation('global-navigation', currentPath);
  
  // Update footer on navigation update
  if (typeof renderFooterWithContext === 'function') {
    renderFooterWithContext('global-footer', currentPath);
  }
});

// Make functions globally available
window.renderNavigation = renderNavigation;
window.initializeMobileMenu = initializeMobileMenu;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
