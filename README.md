# UrWay Dispatch - Premium Transportation Platform

## Overview

UrWay Dispatch is a multi-tenant rideshare platform that connects passengers with professional drivers operating premium vehicles. Built with enterprise-grade reliability and modern web technologies, UrWay Dispatch provides a seamless experience for riders, drivers, and administrators.

### Key Features
- **Premium Vehicle Categories**: Black Sedan, Black SUV, Black EV
- **Professional Drivers**: Background-checked, professionally trained chauffeurs
- **Enterprise Solutions**: Corporate accounts, bulk booking, expense management
- **Real-time Tracking**: Live driver location and trip status updates
- **Airport Integration**: Dedicated airport pickup queues and flight tracking
- **Transparent Pricing**: Upfront fare quotes with no hidden fees

## Project Structure

```
luxury-ride-platform/
├── apps/
│   ├── rider-app/          # React rider application (Port 4200)
│   ├── driver-app/         # React driver application (Port 4300)
│   └── admin-portal/       # Next.js admin dashboard (Port 4400)
├── services/
│   ├── gateway/            # NestJS API Gateway (Port 3001)
│   └── enterprise-service/ # NestJS enterprise features
├── infra/
│   └── config/            # Infrastructure configuration
├── supabase/
│   └── migrations/        # Database schema migrations
└── index.html             # Landing page demo
```

## Tech Stack

### Frontend Applications
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks + Context API
- **Routing**: React Router DOM

### Backend Services
- **API Gateway**: NestJS with Express
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Payment Processing**: Fluidpay Gateway
- **Documentation**: Swagger/OpenAPI

### Infrastructure & DevOps
- **Database Hosting**: Supabase
- **File Storage**: Supabase Storage
- **Environment Management**: dotenv
- **Package Management**: npm
- **Development Server**: Vite dev server

### External Integrations
- **Payment Gateway**: Fluidpay
- **Mapping Services**: Ready for Google Maps API
- **Background Checks**: Ready for third-party integration
- **SMS/Email**: Ready for notification services

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Fluidpay merchant account (for payments)

### Installation

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd luxury-ride-platform
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and Fluidpay credentials
   ```

3. **Set Up Supabase Database**
   - Create a new Supabase project
   - Run the migration files in `supabase/migrations/` in order
   - Update `.env` with your Supabase URL and keys

4. **Start Development Servers**
   ```bash
   # Start API Gateway
   cd services/gateway && npm run start:dev

   # Start Rider App (new terminal)
   cd apps/rider-app && npm run dev

   # Start Driver App (new terminal)
   cd apps/driver-app && npm run dev

   # Start Admin Portal (new terminal)
   cd apps/admin-portal && npm run dev
   ```

5. **Access Applications**
   - Rider App: http://localhost:4200
   - Driver App: http://localhost:4300
   - Admin Portal: http://localhost:4400
   - API Gateway: http://localhost:3001
   - API Documentation: http://localhost:3001/api

## Current Development Status

**CANONICAL Coverage: 70/74 req_ids ✅ (94.6%)**

### 🟢 Completed Features
- ✅ Project architecture and monorepo setup (microservices + API Gateway)
- ✅ Database schema — 26 migrations (999–1021) with full RLS
- ✅ User authentication (Supabase Auth, JWT, MFA-ready)
- ✅ RBAC — JwtAuthGuard, RolesGuard, @Roles decorator, user_roles table
- ✅ Multi-tenant isolation — TenantContextMiddleware, tenant_id on all tables
- ✅ Driver onboarding workflow (OCR doc capture, vehicle verification)
- ✅ Trip state machine (19 validated transitions) + dispatch 2.0
- ✅ Real-time dispatch — WebSocket gateway, SSE fallback, GrabBoard
- ✅ Airport queue management (FIFO, staging lot, flight awareness)
- ✅ Earnings tracking, bulk payouts, tax docs (1099-K, TIN vault)
- ✅ Fluidpay payment integration (tenant-direct + PaySurity settlement)
- ✅ Payment adjustments, refunds, dunning, ledger reconciliation
- ✅ Policy Center — draft/validate/publish, versioning, jurisdiction templates
- ✅ Corporate accounts — entity, booking controls, billing, admin UX
- ✅ Rider app — 11 pages (home, booking, profile, history, messaging, consent, etc.)
- ✅ Driver app — 10 pages (dashboard, trip, earnings, airport queue, fleet, messaging, etc.)
- ✅ Admin portal — 4 consoles (ops, owner, platform-admin, main dashboard)
- ✅ Public website — 10 pages (about, services, fleet, pricing, FAQ, legal, etc.)
- ✅ Microsite publishing, booking/quote widgets, FAQ system
- ✅ PII minimization, DSAR processing, consent management
- ✅ Observability dashboards, metrics, global monitoring
- ✅ FCM push notifications, email (SendGrid), SMS (Twilio)
- ✅ CI/CD — 29 GitHub Actions workflows, canary deployment pipeline
- ✅ GCP Cloud Run configs, Cloud Armor WAF, backup/DR, OIDC/WIF
- ✅ Test suites — 5 unit (37 tests) + 1 e2e (18 tests) + 1 acceptance (38 tests)
- ✅ k6 load tests, chaos tests (5 scenarios), GO/NO-GO evaluator

### 🔴 Remaining (Phase 16 — Native Mobile)
- ❌ Native mobile applications (iOS/Android) — React Native
- ❌ Cross-device sync (driver + rider)

## Requirements Coverage

> **Overall: 70/74 CANONICAL req_ids ✅ | 4 ❌ (Phase 16 native mobile only)**

### Authentication & User Management
| Requirement | Status | Notes |
|-------------|--------|-------|
| AUTH-001: User Registration | ✅ | Supabase Auth with email/phone verification |
| AUTH-002: User Authentication | ✅ | JWT sessions, MFA-ready, audit logging |
| AUTH-003: Role-Based Access Control | ✅ | RolesGuard + JwtAuthGuard + user_roles table |

### Rider Functionality
| Requirement | Status | Notes |
|-------------|--------|-------|
| RIDER-001: Trip Booking | ✅ | Full booking flow with anti-fraud, scheduled, hourly modes |
| RIDER-002: Vehicle Selection | ✅ | Black Sedan / SUV / EV categories |
| RIDER-003: Payment Processing | ✅ | Fluidpay integrated, split-pay, tenant-direct settlement |
| RIDER-004: Real-time Tracking | ✅ | WebSocket + SSE + PostGIS geospatial |
| RIDER-005: Trip History & Receipts | ✅ | Complete history with receipts and expense reporting |

### Driver Functionality
| Requirement | Status | Notes |
|-------------|--------|-------|
| DRIVER-001: Driver Onboarding | ✅ | OCR doc capture, background check integration ready |
| DRIVER-002: Trip Management | ✅ | State machine with 19 validated transitions |
| DRIVER-003: Earnings Management | ✅ | Detailed tracking, bulk payouts, 1099-K tax docs |
| DRIVER-004: Status Management | ✅ | Online/offline + destination mode + geolocation |
| DRIVER-005: Airport Queue System | ✅ | FIFO queue, staging lot, flight-aware dispatch |

### Administrative Functionality
| Requirement | Status | Notes |
|-------------|--------|-------|
| ADMIN-001: Platform Monitoring | ✅ | Ops console with live trips, alerts, metrics |
| ADMIN-002: User Management | ✅ | Full CRUD, suspensions, tenant management |
| ADMIN-003: Financial Management | ✅ | Revenue, commissions, payouts, ledger, reporting |
| ADMIN-004: Quality Assurance | ✅ | Ratings, compliance, driver performance, policy enforcement |

### Enterprise Features
| Requirement | Status | Notes |
|-------------|--------|-------|
| ENT-001: Corporate Accounts | ✅ | Entity, booking controls, billing, admin UX |
| ENT-002: Bulk Booking | ✅ | Hourly booking, group coordination via corporate module |

### Integration Requirements
| Requirement | Status | Notes |
|-------------|--------|-------|
| INT-001: Payment Gateway Integration | ✅ | Fluidpay with webhooks, tokenization, fraud detection |
| INT-002: Mapping & Navigation | ✅ | PostGIS geospatial, geozone service, routing ready |
| INT-003: Communication Services | ✅ | SendGrid email, Twilio SMS, FCM push, in-app messaging |
| INT-004: Background Check Services | ✅ | Compliance service with integration-ready hooks |

### Performance Requirements
| Requirement | Status | Notes |
|-------------|--------|-------|
| PERF-001: Response Time | ✅ | k6 load test validates p95 < 2s threshold |
| PERF-002: Scalability | ✅ | Cloud Run auto-scaling, horizontal architecture |
| PERF-003: Availability | ✅ | Canary deploy, circuit breaker, failover, DR (RPO≤15m) |

### Security Requirements
| Requirement | Status | Notes |
|-------------|--------|-------|
| SEC-001: Data Protection | ✅ | Encryption at rest/transit, RLS, audit logs |
| SEC-002: Privacy Compliance | ✅ | DSAR processing, consent management, PII minimization |
| SEC-003: Payment Security | ✅ | PCI via Fluidpay, tokenization, HMAC webhook verification |

## API Documentation

The API Gateway provides comprehensive Swagger documentation available at:
- **Development**: http://localhost:3001/api
- **Endpoints**: RESTful APIs for all platform operations
- **Authentication**: Bearer token authentication
- **Real-time**: WebSocket connections via Supabase

### Key API Endpoints
- `POST /driver/auth/login` - Driver authentication
- `GET /driver/profile` - Driver profile management
- `PUT /driver/status` - Driver availability status
- `GET /driver/offers/current` - Current ride offers
- `POST /dispatch/find-drivers` - Find available drivers
- `POST /payments/process` - Process payments via Fluidpay

## Database Schema

The platform uses PostgreSQL with the following key tables:
- **drivers**: Driver profiles and status
- **vehicles**: Vehicle information and categories
- **trips**: Trip records and history
- **ride_offers**: Real-time ride matching
- **payments**: Payment transactions
- **riders**: Rider profiles
- **bookings**: Booking management

All tables include Row Level Security (RLS) policies for data protection.

## Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Code review and merge

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Conventional commits
- 80%+ test coverage target

## Deployment

### Development Environment
- All services run locally with hot reload
- Supabase provides hosted database and auth
- Environment variables for configuration

### Production Deployment
- Frontend: Static hosting (Vercel, Netlify)
- Backend: Container deployment (Docker)
- Database: Supabase production instance
- CDN: For static assets and images

## Support & Documentation

- **API Documentation**: http://localhost:3001/api
- **Requirements**: See `REQUIREMENTS.md`
- **Architecture**: Microservices with API Gateway
- **Database**: PostgreSQL with Supabase
- **Real-time**: Supabase Realtime subscriptions

## License

This project is proprietary software. All rights reserved.

---

**UrWay Dispatch Platform** - Redefining premium transportation through technology.