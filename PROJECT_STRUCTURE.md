# Project Structure

This document describes the clean, organized structure of the PolyMarket Dashboard project.

## Directory Structure

```
PolyMarketDashboard/
├── client/                    # Frontend React application
│   ├── src/                   # React source code
│   │   ├── components/        # React components
│   │   ├── pages/            # Page components
│   │   ├── lib/              # Client utilities
│   │   └── hooks/            # React hooks
│   ├── public/               # Static assets
│   ├── index.html            # HTML entry point
│   ├── vite.config.ts        # Vite configuration (CLIENT ONLY)
│   ├── tailwind.config.js    # Tailwind CSS config (CLIENT ONLY)
│   ├── postcss.config.js     # PostCSS config (CLIENT ONLY)
│   ├── tsconfig.json         # TypeScript config (CLIENT ONLY)
│   └── package.json          # Client dependencies
│
├── server/                    # Backend Express server
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # API routes
│   ├── storage.ts            # Storage utilities
│   ├── vite.ts               # Vite dev server integration (optional)
│   └── tsconfig.json         # TypeScript config (SERVER ONLY)
│
├── api/                       # Vercel serverless functions
│   ├── dashboard/            # Dashboard endpoints
│   ├── users/                # User endpoints
│   ├── utils/                # API utilities
│   └── vercel.json           # Vercel function config
│
├── shared/                    # Shared TypeScript types
│   └── schema.ts             # Zod schemas and types
│
├── public/                    # Production build output
│   ├── assets/               # Compiled JS/CSS
│   └── index.html            # Production HTML
│
├── tsconfig.json              # Root TypeScript config (API/shared only)
├── package.json              # Root dependencies & scripts
├── vercel.json               # Vercel deployment config
└── components.json           # shadcn/ui component config
```

## Configuration Files

### Client Configs (in `client/`)
- **`vite.config.ts`** - Vite bundler configuration
- **`tailwind.config.js`** - Tailwind CSS configuration
- **`postcss.config.js`** - PostCSS configuration
- **`tsconfig.json`** - TypeScript configuration for client

### Server Configs (in `server/`)
- **`tsconfig.json`** - TypeScript configuration for server (extends root)

### Root Configs
- **`tsconfig.json`** - TypeScript configuration for API/shared code only
- **`package.json`** - Root dependencies and scripts
- **`vercel.json`** - Vercel deployment configuration
- **`components.json`** - shadcn/ui component configuration

## Development Scripts

### From Root Directory

```bash
# Run both server and client in parallel
npm run dev

# Run only the backend server (port 3000)
npm run dev:server

# Run only the frontend client (port 5173)
npm run dev:client

# Build everything
npm run build

# Type checking
npm run check
```

### From Client Directory

```bash
# Run frontend dev server
cd client && npm run dev

# Build frontend
cd client && npm run build

# Clean Vite cache
cd client && npm run clean
```

## Key Principles

1. **Separation of Concerns**
   - Client configs live in `client/`
   - Server configs live in `server/`
   - Shared code lives in `shared/`
   - API code lives in `api/`

2. **No Duplicate Configs**
   - Each config file has a single, clear purpose
   - No conflicting configurations between root and subdirectories

3. **Clear Build Output**
   - Production builds go to `public/`
   - Development uses separate servers (client: 5173, server: 3000)

4. **TypeScript Configuration**
   - Root `tsconfig.json` only for API/shared
   - Client has its own `tsconfig.json`
   - Server extends root `tsconfig.json`

## Ports

- **3000** - Backend Express server (API + static files in production)
- **5173** - Frontend Vite dev server (development only)

## Important Notes

- The `server/vite.ts` file is optional and only used if you want Vite dev server integration
- The root `tsconfig.json` does NOT include client or server paths to avoid conflicts
- All client-specific configs (Vite, Tailwind, PostCSS) are in `client/` directory
- The `components.json` points to `client/tailwind.config.js` for shadcn/ui

