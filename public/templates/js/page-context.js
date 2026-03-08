/**
 * Page Context Detection System
 * Automatically detects page type and determines appropriate navigation behavior
 */

window.PAGE_CONTEXT = {
  detectPageType: function(pathname) {
    const specialPages = window.GLOBAL_NAVIGATION.specialPages;
    
    // Check if this is a special page
    if (specialPages.includes(pathname)) {
      return "special";
    }
    
    // Check for homepage
    if (pathname === "/" || pathname === "/index.html") {
      return "homepage";
    }
    
    // Check for specific page types
    if (pathname.includes("pricing")) {
      return "pricing";
    }
    
    if (pathname.includes("platform")) {
      return "platform";
    }
    
    // Default to standard page
    return "default";
  },
  
  getActiveLink: function(pathname) {
    const links = window.GLOBAL_NAVIGATION.primaryLinks;
    
    // Handle root path
    if (pathname === "/" || pathname === "/index.html") {
      return "/";
    }
    
    // Find exact match
    const exactMatch = links.find(link => link.url === pathname);
    if (exactMatch) return exactMatch.url;
    
    // Find partial match (for pages like /tenant/goldravenia/)
    const partialMatch = links.find(link => {
      const linkPath = link.url.replace('.html', '');
      return pathname.includes(linkPath) && linkPath !== '/';
    });
    
    return partialMatch ? partialMatch.url : "";
  },
  
  getSpecialPageBadge: function(pathname) {
    const badges = window.GLOBAL_NAVIGATION.specialPageBadges;
    return badges[pathname] || { text: "Demo", color: "blue", pulse: false };
  },
  
  getCTA: function(pageType) {
    const ctas = window.GLOBAL_NAVIGATION.ctas;
    return ctas[pageType] || ctas.default;
  },
  
  // Helper function to get current pathname
  getCurrentPathname: function() {
    return window.location.pathname;
  },
  
  // Normalize pathname for consistent matching
  normalizePathname: function(pathname) {
    // Remove trailing slash for consistency
    if (pathname !== '/' && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    return pathname;
  }
};
