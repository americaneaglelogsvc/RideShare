# System Map (Expected) — BlackRavenia RideShare

This map is a governance guide for the agentic AI to locate and validate implementation evidence.

## Apps (User-facing)
- Rider Web App (Rider)
- Driver App (Driver) — Progressive Web App (PWA) or native
- Tenant Console (Dispatcher, Tenant Owner)
- Platform Console (Super Admin, Platform Staff)
- Tenant Microsites (Public per tenant)
- Platform Public Site (Tenant acquisition marketing)

## Services (Logical)
- Identity and Access Service (Authentication, Role-Based Access Control (RBAC))
- Dispatch Service (Offers, ring/hop, GrabBoard, scheduled dispatch)
- Pricing Service (quotes, surge, fees, policy precedence)
- Policy Service (region policies, overrides, propagation)
- Payments Connector Service (PaySurity integration; Fluidpay/Argyle behind PaySurity)
- Messaging Service (in-app chat, retention, audit)
- Notification Service (Email via Google Workspace (Gmail), Push via Firebase Cloud Messaging (FCM), optional SMS provider)
- Compliance Service (documents, Optical Character Recognition (OCR), expiry gating, background checks)
- Analytics/Reporting Service (tenant and platform dashboards)
- Microsite/SEO Service (tenant microsites, sitemap, robots, JSON-LD (JavaScript Object Notation for Linked Data))

## Data stores (Google-first)
- PostgreSQL (PostgreSQL) — Google Cloud SQL (Cloud SQL)
- Object storage — Google Cloud Storage (GCS) (documents, images)
- Cache / pub-sub for policy propagation — Redis (Redis) via Google Cloud Memorystore (or Google Pub/Sub as alternative)

## Required “Evidence” mapping
Every implemented capability must map to:
- UI route/screen
- API endpoint
- DB migration/table
- Tests
- CI workflow
