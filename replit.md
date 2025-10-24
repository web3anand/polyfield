# Polymarket Dashboard

## Overview

A gamified dashboard application for Polymarket traders that visualizes trading performance, positions, and achievements. The application allows users to connect via their Polymarket username and view comprehensive trading analytics including PnL graphs, active positions, trading volume metrics, and achievement badges. The UI combines gaming aesthetics with modern fintech design principles, drawing inspiration from platforms like Steam, Robinhood, and DraftKings.

## User Preferences

Preferred communication style: Simple, everyday language.
Design aesthetic: Lighter.gg inspired - sleek dark theme, clean Inter typography, minimal design, sharp contrasts, professional trading interface.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript using Vite as the build tool
- Wouter for client-side routing
- TanStack Query (React Query) for data fetching and caching
- Shadcn UI components built on Radix UI primitives
- Tailwind CSS for styling with custom theme configuration
- Recharts for data visualization

**Design System:**
- Custom color scheme defined in CSS variables for both light and dark modes
- "New York" style variant from Shadcn UI
- Clean typography using Inter font family (lighter.gg aesthetic)
- Minimal card treatments with subtle borders and p-6 padding with hover-elevate
- Responsive grid layouts (3-column desktop, 2-column tablet, single-column mobile)
- Consistent spacing using Tailwind's spacing units (text-xl headings, text-xs uppercase labels)

**Component Structure:**
- Dashboard page as the main view with username connection flow
- Modular components for different data visualizations:
  - Achievement banner with badge carousel
  - PnL chart with time range filtering
  - Positions table showing active trades
  - Volume metrics with pie chart breakdown
  - Recent activity feed
  - Stat cards for quick metrics
- Loading skeleton states for progressive UI rendering
- Username input with search suggestions

**State Management:**
- React Query handles server state with infinite stale time and no automatic refetching
- Local component state for UI interactions
- Toast notifications for user feedback

### Backend Architecture

**Technology Stack:**
- Node.js with Express server
- TypeScript for type safety
- In-memory storage implementation (MemStorage class)
- Zod for runtime schema validation

**API Design:**
- RESTful endpoints under `/api` prefix
- Username-based dashboard data retrieval: `/api/dashboard/username/:username`
- User search functionality: `/api/users/search?q=:query&search_profiles=true`
- Polymarket Data API integration for fetching positions and trades
- Polymarket Gamma API integration for user search with profile lookup

**Data Flow:**
1. Client submits Polymarket username
2. Backend searches Gamma API (with `search_profiles=true`) to resolve username to proxy wallet address
3. Backend fetches trading data from Data API using wallet address (`user` parameter)
4. Backend transforms and aggregates data into dashboard format (handles field mappings: avgPrice, curPrice, cashPnl, title)
5. Client receives structured dashboard data and renders visualizations

**Error Handling:**
- Axios interceptors for API communication
- Graceful fallback to demo data when:
  - Username doesn't exist in Polymarket (USER_NOT_FOUND)
  - API returns 401/403/404 errors (authentication/authorization failures)
- Real users with no trading activity show actual empty state (not demo data)
- Network error propagation to client layer
- Request logging middleware with timing information and detailed debugging

### Database and Storage

**Current Implementation:**
- In-memory storage using Map data structure
- User entity with id and username fields
- No persistent storage (data cleared on server restart)

**Schema Design (shared/schema.ts):**
- Position: Trading positions with entry/current prices, PnL, and status
- Trade: Individual trade records with type, outcome, and profit
- PortfolioStats: Aggregated metrics like win rate, total volume, best/worst trades
- PnLDataPoint: Time-series data for chart visualization
- Achievement: Gamification badges with unlock status
- DashboardData: Composite type containing all dashboard information

**Database Architecture Note:**
The application uses Drizzle ORM with PostgreSQL configuration (drizzle.config.ts) but currently implements in-memory storage. The schema is defined using Zod for validation, allowing for future migration to persistent PostgreSQL storage without changing API contracts.

### External Dependencies

**Third-Party APIs:**
- **Polymarket Data API** (https://data-api.polymarket.com): Fetches user positions and trades using wallet addresses
  - `/positions?user=<address>` - Returns position data with fields: asset, title, conditionId, outcome, avgPrice, curPrice, size, cashPnl
  - `/trades?user=<address>&limit=100` - Returns trade history with fields: transactionHash, timestamp, title, side, outcome, price, size
- **Polymarket Gamma API** (https://gamma-api.polymarket.com): Resolves usernames to wallet addresses via public search endpoint
  - `/public-search?q=<username>&search_profiles=true` - Returns user profiles with proxyWallet addresses

**UI Component Libraries:**
- **Radix UI**: Unstyled, accessible component primitives (accordion, dialog, dropdown, tabs, toast, tooltip, etc.)
- **Recharts**: Chart library for PnL graphs and volume metrics visualization
- **Lucide React**: Icon library for UI elements

**Development Tools:**
- **Vite**: Build tool and development server
- **Replit Plugins**: Runtime error modal, cartographer, and dev banner for development environment
- **ESBuild**: Server-side bundling for production builds

**Styling and Utilities:**
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing
- **class-variance-authority**: Type-safe variant styling for components
- **clsx** and **tailwind-merge**: Conditional class name utilities

**Data Management:**
- **TanStack Query**: Async state management with caching
- **Axios**: HTTP client for external API requests
- **Zod**: Runtime type validation and schema definition
- **date-fns**: Date formatting and manipulation

**Fonts:**
- Google Fonts: Inter (400, 500, 600, 700) for all typography (lighter.gg clean aesthetic)