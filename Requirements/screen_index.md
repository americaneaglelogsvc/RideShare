# Screen Index and Flow Registry — BlackRavenia RideShare

Each screen below must be implemented as an addressable route with:
- purpose
- inputs/outputs
- linked capabilities (by heading names in the canonical requirements doc)
- evidence links added by the agentic AI during status reporting

## Rider (End Customer)
- Auth (Sign up / Sign in)
- Request Ride (Book now)
- Schedule Ride (Reserve)
- Hourly Booking
- Quote Review and Confirm
- Active Trip (Live map: driver location + ETA refresh)
- In-app Messaging (with assigned driver)
- Rate Driver and Vehicle (cleanliness, friendliness + text)
- Trip History and Receipts
- Support / Report Issue
- Account and Payment Methods (via PaySurity tokenization)

## Driver
- Auth
- Driver Profile
- Vehicle Profile
- Document Capture (license/insurance/registration) with Optical Character Recognition (OCR) auto-fill + confirm
- Compliance Status (expiries, background check status)
- Go Online / Offline
- Offer Card (ring/hop)
- GrabBoard
- Navigation (Deep-link to Google Maps)
- Arrived / Wait Timer
- In-trip view
- Complete Trip
- Earnings / Unpaid Balance
- Payout History
- Early Payout Request
- Destination Mode
- Airport Queue (prequeue prompts, status)
- In-app Messaging (with rider)
- Rate Rider

## Tenant Ops / Dispatcher
- Live Ops Map (overlays: trips and drivers)
- Trip Board (Open/Assigned/Enroute/Exceptions)
- Manual Assign / Reassign
- Scheduled Ride Exceptions (unconfirmed, non-compliant drivers)
- Airport Queue Monitor
- Driver Management (CRUD + bulk)
- Vehicle Management (CRUD + bulk)
- Document Review/Approval
- Policies: Cancellation/Fees, Wait-time, Luggage, Stops, Gratuity, Surge (if enabled)
- Blacklists / Mutual-block rules
- Disputes and Refunds

## Tenant Owner
- Dashboard (KPIs)
- Pricing Rules
- Policy Configuration
- Fleet Overview
- Staff Management
- Exports and Reports
- Microsite Branding and SEO controls

## Platform Super Admin / Platform Staff
- Tenant Management (CRUD, deactivate)
- Feature Gates / Subscription controls
- Global Policy Center (Surge constraints, Destination defaults, Preferred Tier weights, Early payout fees)
- Kill Switch Console (tenant/driver/vehicle)
- Test Runner Console (trigger tests, view results)
- System Health (metrics, logs, alerts)
- Compliance Oversight Dashboard (expiring docs, background checks)
