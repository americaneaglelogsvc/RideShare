import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * CookieConsentMiddleware — CANONICAL §4.7 "Cookie consent is a hard gate"
 *
 * Checks for a `cookie_consent` cookie before allowing tracking scripts.
 * Sets `res.locals.cookieConsentGranted` for downstream template rendering.
 *
 * The consent banner HTML snippet must be injected into all public pages.
 * The POST /consent/cookies endpoint records consent and sets the cookie.
 */
@Injectable()
export class CookieConsentMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const consentCookie = this.parseCookies(req)['cookie_consent'];
    (res as any).locals = (res as any).locals || {};
    (res as any).locals.cookieConsentGranted = consentCookie === 'accepted';
    next();
  }

  private parseCookies(req: Request): Record<string, string> {
    const cookieHeader = req.headers.cookie || '';
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(pair => {
      const [key, ...val] = pair.trim().split('=');
      if (key) cookies[key.trim()] = val.join('=').trim();
    });
    return cookies;
  }
}

/**
 * Cookie consent banner HTML snippet — inject at bottom of <body> in all public pages.
 * Compliant with GDPR/CCPA. Blocks GA/tracking until consent granted.
 */
export const COOKIE_CONSENT_BANNER_HTML = `
<!-- Cookie Consent Banner — CANONICAL §4.7 -->
<div id="cookie-consent-banner" style="display:none;position:fixed;bottom:0;left:0;right:0;background:#1a1a2e;color:#fff;padding:16px 24px;z-index:9999;font-family:system-ui,sans-serif;box-shadow:0 -2px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
  <p style="margin:0;flex:1;min-width:280px;font-size:14px;line-height:1.5;">
    We use cookies to improve your experience, analyze site traffic, and serve personalized content.
    By clicking "Accept", you consent to our use of cookies.
    <a href="/privacy" style="color:#60a5fa;text-decoration:underline;">Privacy Policy</a>
  </p>
  <div style="display:flex;gap:8px;">
    <button onclick="setCookieConsent('rejected')" style="padding:8px 20px;border:1px solid #9ca3af;background:transparent;color:#fff;border-radius:6px;cursor:pointer;font-size:14px;">Decline</button>
    <button onclick="setCookieConsent('accepted')" style="padding:8px 20px;border:none;background:#3b82f6;color:#fff;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;">Accept</button>
  </div>
</div>
<script>
(function(){
  var consent = document.cookie.split(';').find(function(c){return c.trim().startsWith('cookie_consent=')});
  if(!consent){
    document.getElementById('cookie-consent-banner').style.display='flex';
  } else if(consent.trim()==='cookie_consent=accepted'){
    loadAnalytics();
  }
})();
function setCookieConsent(value){
  document.cookie='cookie_consent='+value+';path=/;max-age=31536000;SameSite=Lax';
  document.getElementById('cookie-consent-banner').style.display='none';
  if(value==='accepted') loadAnalytics();
  fetch('/consent/cookies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:value})}).catch(function(){});
}
function loadAnalytics(){
  if(window.__gaLoaded) return;
  window.__gaLoaded=true;
  var mid=document.querySelector('meta[name="ga-measurement-id"]');
  if(!mid) return;
  var id=mid.getAttribute('content');
  if(!id) return;
  var s=document.createElement('script');
  s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+id;
  document.head.appendChild(s);
  s.onload=function(){
    window.dataLayer=window.dataLayer||[];
    function gtag(){dataLayer.push(arguments);}
    gtag('js',new Date());gtag('config',id);
  };
}
</script>
`;
