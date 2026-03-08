/**
 * Universal Footer Renderer System
 * Dynamic footer rendering with consistent branding and layout
 */

// Main footer renderer function
function renderFooter(containerId) {
  const config = window.GLOBAL_FOOTER;
  const container = document.getElementById(containerId);
  
  if (!container) return;
  
  container.innerHTML = `
    <footer class="bg-gray-900 text-white py-12">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <!-- Brand Section -->
          <div class="col-span-1 md:col-span-1">
            <div class="flex items-center space-x-2 mb-4">
              <i data-lucide="server" class="w-8 h-8 text-yellow-400"></i>
              <div>
                <span class="font-bold text-xl">${config.brand.name}</span>
                <div class="text-xs text-gray-400">${config.brand.tagline}</div>
              </div>
            </div>
            <p class="text-gray-400 text-sm mb-4">
              Complete white-label infrastructure platform for transportation operators.
            </p>
            <div class="flex space-x-3">
              ${config.social.map(social => `
                <a href="${social.url}" class="text-gray-400 hover:text-yellow-400 transition-colors" aria-label="${social.icon}">
                  <i data-lucide="${social.icon}" class="w-5 h-5"></i>
                </a>
              `).join('')}
            </div>
          </div>
          
          <!-- Footer Sections -->
          ${config.sections.map(section => `
            <div class="col-span-1">
              <h3 class="font-semibold text-lg mb-4">${section.title}</h3>
              <ul class="space-y-2">
                ${section.links.map(link => `
                  <li>
                    <a href="${link.url}" class="text-gray-400 hover:text-white transition-colors text-sm">
                      ${link.label}
                    </a>
                  </li>
                `).join('')}
              </ul>
            </div>
          `).join('')}
          
        </div>
        
        <!-- Bottom Bar -->
        <div class="border-t border-gray-800 mt-8 pt-8">
          <div class="flex flex-col md:flex-row justify-between items-center">
            <p class="text-gray-400 text-sm mb-4 md:mb-0">
              ${config.brand.copyright}
            </p>
            <div class="flex space-x-6 text-sm">
              ${config.links.map(link => `
                <a href="${link.url}" class="text-gray-400 hover:text-white transition-colors">
                  ${link.label}
                </a>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </footer>
  `;
  
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Simplified footer for special pages (demo/utility pages)
function renderSimpleFooter(containerId) {
  const config = window.GLOBAL_FOOTER;
  const container = document.getElementById(containerId);
  
  if (!container) return;
  
  container.innerHTML = `
    <footer class="bg-gray-900 text-white py-8">
      <div class="max-w-7xl mx-auto px-6 text-center">
        <div class="flex items-center justify-center space-x-2 mb-4">
          <i data-lucide="server" class="w-6 h-6 text-yellow-400"></i>
          <span class="font-bold text-lg">${config.brand.name}</span>
        </div>
        <p class="text-gray-400 text-sm">
          ${config.brand.copyright}
        </p>
        <div class="flex justify-center space-x-6 mt-4 text-sm">
          ${config.links.slice(0, 3).map(link => `
            <a href="${link.url}" class="text-gray-400 hover:text-white transition-colors">
              ${link.label}
            </a>
          `).join('')}
        </div>
      </div>
    </footer>
  `;
  
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Footer context detection
function renderFooterWithContext(containerId, pathname) {
  const specialPages = window.GLOBAL_NAVIGATION.specialPages;
  
  if (specialPages.includes(pathname)) {
    renderSimpleFooter(containerId);
  } else {
    renderFooter(containerId);
  }
}

// Make functions globally available
window.renderFooter = renderFooter;
window.renderSimpleFooter = renderSimpleFooter;
window.renderFooterWithContext = renderFooterWithContext;
