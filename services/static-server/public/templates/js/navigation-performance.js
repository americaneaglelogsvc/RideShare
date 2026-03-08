/**
 * Navigation Performance Optimization System
 * Caching, debouncing, and performance utilities for navigation rendering
 */

window.NAVIGATION_PERFORMANCE = {
  // Cache for rendered navigation HTML
  cache: new Map(),
  
  // Get cached navigation HTML
  getCachedNavigation: function(cacheKey) {
    return this.cache.get(cacheKey);
  },
  
  // Set cached navigation HTML
  setCachedNavigation: function(cacheKey, html) {
    this.cache.set(cacheKey, html);
  },
  
  // Generate cache key based on context
  generateCacheKey: function(pageType, activeLink, pathname) {
    return `${pageType}-${activeLink}-${pathname}`;
  },
  
  // Clear cache (useful for development)
  clearCache: function() {
    this.cache.clear();
  },
  
  // Debounce function for performance optimization
  debounce: function(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },
  
  // Throttle function for resize events
  throttle: function(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  // Performance monitoring
  measureRenderTime: function(renderFunction, cacheKey) {
    const startTime = performance.now();
    const result = renderFunction();
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Log performance in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log(`Navigation render time for ${cacheKey}: ${renderTime.toFixed(2)}ms`);
    }
    
    return result;
  },
  
  // Check if browser supports modern features
  checkBrowserSupport: function() {
    return {
      intersectionObserver: 'IntersectionObserver' in window,
      mutationObserver: 'MutationObserver' in window,
      cssGrid: CSS.supports('display', 'grid'),
      cssCustomProperties: CSS.supports('color', 'var(--test)'),
      es6Features: (window.Promise && window.Map && window.Set)
    };
  },
  
  // Optimize Lucide icon creation
  optimizeIconCreation: function() {
    // Batch icon creation to reduce layout thrashing
    if (typeof lucide !== 'undefined') {
      // Use requestAnimationFrame for smooth rendering
      requestAnimationFrame(() => {
        lucide.createIcons();
      });
    }
  }
};
