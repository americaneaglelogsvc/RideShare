/**
 * Global Navigation Configuration System
 * Single source of truth for all navigation across the UrWay Dispatch platform
 */

window.GLOBAL_NAVIGATION = {
  brand: {
    name: "UrWay Dispatch",
    tagline: "Infrastructure Platform",
    url: "/",
    icon: "server"
  },
  
  // Primary navigation for all standard pages
  primaryLinks: [
    { label: "About", url: "/about.html", order: 1, category: "info" },
    { label: "Platform", url: "/platform.html", order: 2, category: "product" },
    { label: "For Operators", url: "/for-operators.html", order: 3, category: "product" },
    { label: "Pricing", url: "/pricing.html", order: 4, category: "business" },
    { label: "Branding", url: "/branding-showcase.html", order: 5, category: "demo" },
    { label: "Live Demo", url: "/live-demo.html", order: 6, category: "demo" },
    { label: "ROI Calculator", url: "/roi-simulator.html", order: 7, category: "demo" },
    { label: "Contact", url: "/contact.html", order: 8, category: "business" }
  ],
  
  // Contextual CTA configurations
  ctas: {
    homepage: { 
      text: "Start Free Trial", 
      url: "/contact.html#demo-booking", 
      style: "primary",
      icon: "rocket"
    },
    default: { 
      text: "Request a Demo", 
      url: "/contact.html#demo-booking", 
      style: "primary",
      icon: "calendar"
    },
    pricing: { 
      text: "Get Started", 
      url: "/contact.html#demo-booking", 
      style: "success",
      icon: "arrow-right"
    },
    platform: { 
      text: "Book Demo", 
      url: "/contact.html#demo-booking", 
      style: "primary",
      icon: "calendar"
    }
  },
  
  // Special page configurations (demo/utility pages)
  specialPages: [
    "/branding-showcase.html",
    "/live-demo.html", 
    "/roi-simulator.html",
    "/tenant-onboarding.html",
    "/tenant-showcase.html",
    "/tenant-microsite-demo.html"
  ],
  
  // Special page badge configurations
  specialPageBadges: {
    "/branding-showcase.html": { text: "Branding Demo", color: "purple", pulse: false },
    "/live-demo.html": { text: "Live Demo", color: "green", pulse: true },
    "/roi-simulator.html": { text: "ROI Calculator", color: "orange", pulse: false },
    "/tenant-onboarding.html": { text: "Onboarding", color: "blue", pulse: false },
    "/tenant-showcase.html": { text: "Tenants", color: "indigo", pulse: false },
    "/tenant-microsite-demo.html": { text: "Microsite", color: "pink", pulse: false }
  },
  
  // CTA style configurations
  ctaStyles: {
    primary: {
      bgClass: "bg-blue-600 hover:bg-blue-700",
      textClass: "text-white",
      paddingClass: "px-6 py-2.5",
      roundedClass: "rounded-lg",
      transitionClass: "transition-all transform hover:scale-105 shadow-lg",
      iconClass: "w-4 h-4 mr-2"
    },
    success: {
      bgClass: "bg-green-600 hover:bg-green-700",
      textClass: "text-white",
      paddingClass: "px-6 py-2.5",
      roundedClass: "rounded-lg",
      transitionClass: "transition-all transform hover:scale-105 shadow-lg",
      iconClass: "w-4 h-4 mr-2"
    }
  }
};
