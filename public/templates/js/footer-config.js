/**
 * Global Footer Configuration System
 * Single source of truth for all footer content across the UrWay Dispatch platform
 */

window.GLOBAL_FOOTER = {
  brand: {
    name: "UrWay Dispatch",
    tagline: "Infrastructure Platform",
    copyright: "© 2026 UrWay Dispatch. All rights reserved. A PaySurity vertical."
  },
  
  links: [
    { label: "Privacy Policy", url: "/privacy.html" },
    { label: "Terms of Service", url: "/terms.html" },
    { label: "Contact", url: "/contact.html" },
    { label: "FAQ", url: "/faq.html" }
  ],
  
  social: [
    { icon: "twitter", url: "#" },
    { icon: "linkedin", url: "#" },
    { icon: "github", url: "#" }
  ],
  
  sections: [
    {
      title: "Platform",
      links: [
        { label: "Features", url: "/platform.html" },
        { label: "Pricing", url: "/pricing.html" },
        { label: "For Operators", url: "/for-operators.html" }
      ]
    },
    {
      title: "Company", 
      links: [
        { label: "About", url: "/about.html" },
        { label: "Branding", url: "/branding-showcase.html" },
        { label: "Live Demo", url: "/live-demo.html" }
      ]
    },
    {
      title: "Resources",
      links: [
        { label: "ROI Calculator", url: "/roi-simulator.html" },
        { label: "Services", url: "/services.html" },
        { label: "Safety", url: "/safety.html" }
      ]
    }
  ]
};
