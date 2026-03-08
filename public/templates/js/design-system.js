/**
 * Dynamic Design System Configuration
 * Modern theme management with functional color tokens
 */

window.DESIGN_SYSTEM = {
  themes: {
    elegance: {
      name: "Elegance Theme",
      displayName: "Elegance",
      description: "Luxury transportation experience",
      colors: {
        primary: "#d4a017",
        secondary: "#0f172a", 
        accent: "#f59e0b",
        surface: "#fef3c7",
        text: "#1f2937",
        textLight: "#6b7280"
      },
      gradient: "linear-gradient(135deg, #d4a017 0%, #f59e0b 100%)",
      icon: "🏆"
    },
    modernDark: {
      name: "Modern Dark Theme",
      displayName: "Modern Dark",
      description: "Professional contemporary design",
      colors: {
        primary: "#1a1a1a",
        secondary: "#ffffff",
        accent: "#3b82f6", 
        surface: "#f3f4f6",
        text: "#111827",
        textLight: "#9ca3af"
      },
      gradient: "linear-gradient(135deg, #1a1a1a 0%, #3b82f6 100%)",
      icon: "🚀"
    }
  },
  
  // Current active theme
  currentTheme: 'elegance',
  
  // Apply theme to document
  applyTheme: function(themeKey) {
    const theme = this.themes[themeKey];
    if (!theme) return;
    
    const root = document.documentElement;
    
    // Set CSS variables
    for (const [key, value] of Object.entries(theme.colors)) {
      root.style.setProperty(`--brand-${key}`, value);
    }
    
    // Set gradient
    root.style.setProperty('--brand-gradient', theme.gradient);
    
    // Update current theme
    this.currentTheme = themeKey;
    
    // Update dynamic labels
    this.updateThemeLabels(theme.displayName);
    
    // Update theme switcher buttons
    this.updateThemeSwitchers(themeKey);
    
    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      setTimeout(() => lucide.createIcons(), 100);
    }
  },
  
  // Update theme labels dynamically
  updateThemeLabels: function(themeName) {
    // Update "Live Experience" header
    const headers = document.querySelectorAll('[data-theme-header]');
    headers.forEach(header => {
      header.textContent = `Live ${themeName} Experience`;
    });
    
    // Update any other dynamic labels
    const labels = document.querySelectorAll('[data-theme-label]');
    labels.forEach(label => {
      label.textContent = themeName;
    });
  },
  
  // Update theme switcher button states
  updateThemeSwitchers: function(activeThemeKey) {
    const buttons = document.querySelectorAll('[data-theme-switcher]');
    buttons.forEach(button => {
      const buttonTheme = button.getAttribute('data-theme-switcher');
      if (buttonTheme === activeThemeKey) {
        // Add active styles
        button.classList.add('ring-2', 'ring-offset-2', 'ring-blue-500');
      } else {
        // Remove active styles
        button.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-500');
      }
    });
  },
  
  // Copy design tokens to clipboard
  copyDesignTokens: function() {
    const theme = this.themes[this.currentTheme];
    const tokens = {
      theme: theme.name,
      colors: theme.colors,
      gradient: theme.gradient
    };
    
    const tokensJSON = JSON.stringify(tokens, null, 2);
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(tokensJSON).then(() => {
        this.showCopyFeedback();
      });
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = tokensJSON;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showCopyFeedback();
    }
  },
  
  // Show copy feedback
  showCopyFeedback: function() {
    const button = document.querySelector('[data-copy-tokens]');
    if (button) {
      const originalText = button.textContent;
      button.textContent = '✓ Copied!';
      button.classList.add('bg-green-600', 'text-white');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('bg-green-600', 'text-white');
      }, 2000);
    }
  },
  
  // Initialize theme system
  init: function() {
    // Apply default theme
    this.applyTheme(this.currentTheme);
    
    // Add event listeners to theme switchers
    const switchers = document.querySelectorAll('[data-theme-switcher]');
    switchers.forEach(switcher => {
      switcher.addEventListener('click', () => {
        const themeKey = switcher.getAttribute('data-theme-switcher');
        this.applyTheme(themeKey);
      });
    });
    
    // Add copy tokens functionality
    const copyButton = document.querySelector('[data-copy-tokens]');
    if (copyButton) {
      copyButton.addEventListener('click', () => {
        this.copyDesignTokens();
      });
    }
  }
};
