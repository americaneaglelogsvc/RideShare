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

### 🟢 Completed Features
- ✅ Project architecture and monorepo setup
- ✅ Database schema with Supabase integration
- ✅ User authentication (riders, drivers, admins)
- ✅ Driver onboarding workflow
- ✅ Real-time ride offer system
- ✅ Trip lifecycle management
- ✅ Earnings tracking and dashboard
- ✅ Airport queue management
- ✅ Basic payment processing structure
- ✅ Responsive web applications
- ✅ API Gateway with Swagger documentation

### 🟡 In Progress
- 🔄 Fluidpay payment integration
- 🔄 Advanced dispatch algorithms
- 🔄 Real-time location tracking
- 🔄 Enterprise account management
- 🔄 Comprehensive error handling

### 🔴 Planned Features
- ❌ Native mobile applications (iOS/Android)
- ❌ Google Maps integration
- ❌ SMS/Email notifications
- ❌ Background check integration
- ❌ Advanced analytics and reporting
- ❌ Multi-language support
- ❌ Comprehensive testing suite

## Requirements Coverage

> **Legend**: ✅ Implemented | 🔄 Partially Implemented | ❌ Not Implemented

### Authentication & User Management
| Requirement | Status | Notes |
|-------------|--------|-------|
| AUTH-001: User Registration | ✅ | Email/password registration with Supabase Auth |
| AUTH-002: User Authentication | ✅ | Secure login with session management |
| AUTH-003: Role-Based Access Control | ✅ | Driver, Rider, Admin roles implemented |

### Rider Functionality
| Requirement | Status | Notes |
|-------------|--------|-------|
| RIDER-001: Trip Booking | 🔄 | Basic booking flow, needs mapping integration |
| RIDER-002: Vehicle Selection | ✅ | Multiple categories available |
| RIDER-003: Payment Processing | 🔄 | Fluidpay integration in progress |
| RIDER-004: Real-time Tracking | 🔄 | Database structure ready, needs frontend |
| RIDER-005: Trip History & Receipts | ✅ | Complete trip history with receipts |

### Driver Functionality
| Requirement | Status | Notes |
|-------------|--------|-------|
| DRIVER-001: Driver Onboarding | 🔄 | UI complete, document verification pending |
| DRIVER-002: Trip Management | ✅ | Full trip lifecycle implemented |
| DRIVER-003: Earnings Management | ✅ | Detailed earnings tracking and payouts |
| DRIVER-004: Status Management | ✅ | Online/offline status with location |
| DRIVER-005: Airport Queue System | ✅ | Queue management for airport pickups |

### Administrative Functionality
| Requirement | Status | Notes |
|-------------|--------|-------|
| ADMIN-001: Platform Monitoring | 🔄 | Basic dashboard, needs real-time metrics |
| ADMIN-002: User Management | 🔄 | User viewing, needs management actions |
| ADMIN-003: Financial Management | 🔄 | Revenue tracking, needs detailed reporting |
| ADMIN-004: Quality Assurance | ❌ | Quality metrics system not implemented |

### Enterprise Features
| Requirement | Status | Notes |
|-------------|--------|-------|
| ENT-001: Corporate Accounts | 🔄 | Database schema ready, UI pending |
| ENT-002: Bulk Booking | ❌ | Not implemented |

### Integration Requirements
| Requirement | Status | Notes |
|-------------|--------|-------|
| INT-001: Payment Gateway Integration | 🔄 | Fluidpay service created, testing needed |
| INT-002: Mapping & Navigation | ❌ | Ready for Google Maps integration |
| INT-003: Communication Services | ❌ | SMS/Email services not integrated |
| INT-004: Background Check Services | ❌ | Third-party integration pending |

### Performance Requirements
| Requirement | Status | Notes |
|-------------|--------|-------|
| PERF-001: Response Time | 🔄 | Good for current load, needs optimization |
| PERF-002: Scalability | 🔄 | Architecture supports scaling, needs testing |
| PERF-003: Availability | 🔄 | Basic redundancy, needs production setup |

### Security Requirements
| Requirement | Status | Notes |
|-------------|--------|-------|
| SEC-001: Data Protection | ✅ | Supabase provides encryption and security |
| SEC-002: Privacy Compliance | 🔄 | Basic privacy controls, needs GDPR compliance |
| SEC-003: Payment Security | 🔄 | Fluidpay handles PCI compliance |

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