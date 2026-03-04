# Launch Waiver — Phase 16 Native Mobile Apps

**Document Type**: Requirement Deferral Waiver  
**Date**: 2026-03-03  
**Version**: 1.0

---

## Deferred Requirements

| Req ID | Title | Phase |
|--------|-------|-------|
| DRV-MOB-0001 | Driver mobile app (iOS + Android) | 16 |
| RID-MOB-0001 | Rider mobile app (iOS + Android) | 16 |
| DRV-APP-SYNC-010 | Driver cross-device sync | 16 |
| RIDE-APP-SYNC-010 | Rider cross-device sync | 16 |

**Coverage Impact**: 4 of 74 total req_ids → 94.6% coverage at launch (70/74)

---

## Rationale

These 4 requirements are deferred for the following reasons:

1. **Native build infrastructure**: Requires Apple Developer Account ($99/yr), Google Play Developer Account ($25), and a macOS machine for iOS builds — not available in the current development environment.

2. **Web apps serve as functional MVP**: Both the rider web app (11 pages) and driver web app (10 pages) are fully responsive and mobile-optimized, providing complete functionality through the mobile browser.

3. **No feature gap**: All backend services, APIs, and data flows that mobile apps would consume are already implemented and tested. The native apps would be a presentation-layer addition, not a feature addition.

4. **React Native readiness**: The existing React + TypeScript codebase and shared service layer are designed for straightforward migration to React Native.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| User experience gap vs. native apps | Medium | Progressive Web App (PWA) capabilities can bridge the gap |
| Push notification limitations in browser | Low | FCM web push supported; native push is incremental improvement |
| Offline support limited in web | Low | Service workers can provide basic offline caching |
| App store discoverability | Medium | Direct distribution via web URL; app store listing planned for Phase 16 |

---

## Post-Launch Plan

| Milestone | Target | Duration |
|-----------|--------|----------|
| React Native project setup | T+2 weeks | 1 week |
| Shared service layer extraction | T+3 weeks | 1 week |
| Driver app native port | T+5 weeks | 2 weeks |
| Rider app native port | T+7 weeks | 2 weeks |
| Cross-device sync | T+8 weeks | 1 week |
| App Store / Play Store submission | T+9 weeks | 1 week |
| **Phase 16 complete (100% coverage)** | **T+10 weeks** | — |

---

## Acceptance

By signing below, stakeholders acknowledge that the UrWay Dispatch platform will launch with 70/74 requirements met (94.6%), with the 4 native mobile requirements deferred to Phase 16 post-launch.

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Engineering Lead | | | |
| Executive Sponsor | | | |
