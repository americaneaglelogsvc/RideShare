/**
 * GA4 Analytics Loader — CANONICAL §10 "GA4 tags on all public pages"
 * 
 * Loads Google Analytics only after cookie consent is granted.
 * Reads measurement ID from <meta name="ga-measurement-id"> tag.
 * Consent state is stored in the 'cookie_consent' cookie.
 */
(function() {
  'use strict';

  var CONSENT_COOKIE = 'cookie_consent';
  var GA_META = document.querySelector('meta[name="ga-measurement-id"]');
  var MEASUREMENT_ID = GA_META ? GA_META.getAttribute('content') : null;

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }

  function loadGA4() {
    if (!MEASUREMENT_ID || MEASUREMENT_ID === 'G-XXXXXXXXXX') return;

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', MEASUREMENT_ID, {
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure'
    });
  }

  function showConsentBanner() {
    if (document.getElementById('urway-consent-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'urway-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1a1a2e;color:#fff;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;font-family:Inter,system-ui,sans-serif;font-size:14px;box-shadow:0 -2px 12px rgba(0,0,0,0.3);';

    banner.innerHTML = 
      '<p style="margin:0;flex:1;min-width:200px;">We use cookies to improve your experience and analyze site traffic. By clicking "Accept", you consent to our use of cookies. <a href="/public/privacy.html" style="color:#93c5fd;text-decoration:underline;">Privacy Policy</a></p>' +
      '<div style="display:flex;gap:8px;">' +
        '<button id="consent-reject" style="padding:8px 20px;border:1px solid #6b7280;border-radius:6px;background:transparent;color:#fff;cursor:pointer;font-size:14px;">Reject</button>' +
        '<button id="consent-accept" style="padding:8px 20px;border:none;border-radius:6px;background:#3b82f6;color:#fff;cursor:pointer;font-weight:600;font-size:14px;">Accept</button>' +
      '</div>';

    document.body.appendChild(banner);

    document.getElementById('consent-accept').addEventListener('click', function() {
      setCookie(CONSENT_COOKIE, 'accepted', 365);
      banner.remove();
      loadGA4();
    });

    document.getElementById('consent-reject').addEventListener('click', function() {
      setCookie(CONSENT_COOKIE, 'rejected', 365);
      banner.remove();
    });
  }

  // Main logic
  var consent = getCookie(CONSENT_COOKIE);
  if (consent === 'accepted') {
    loadGA4();
  } else if (!consent) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showConsentBanner);
    } else {
      showConsentBanner();
    }
  }
  // If 'rejected', do nothing — no GA4, no banner
})();
