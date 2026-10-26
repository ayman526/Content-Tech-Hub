# Translation SaaS - Troubleshooting Guide

  ## ✅ FIXES APPLIED

  ### 1. React Query Setup
  - ✓ Created `client/src/lib/queryClient.ts`
  - ✓ Added QueryClientProvider to `client/src/main.tsx`
  - ✓ Configured default query options

  ### 2. Authentication Hook
  - ✓ Created `client/src/hooks/use-auth.ts`
  - ✓ Integrated with `/api/user/profile` endpoint
  - ✓ Provides user state, login, logout functions

  ### 3. Replit Auth Integration
  - ✓ Added `await setupAuth(app)` in `server/index.ts`
  - ✓ Called BEFORE registerRoutes (critical!)
  - ✓ Provides /api/login, /api/logout, /api/callback

  ### 4. Database Schema
  - ✓ Fixed auth storage to use unified users table
  - ✓ Added favoriteLinguistsRelations
  - ✓ All 11 tables properly configured

  ### 5. UI Components
  - ✓ Added Toaster component to App.tsx
  - ✓ Created not-found.tsx page
  - ✓ All page components verified

  ### 6. TypeScript Configuration
  - ✓ Path aliases configured (@shared/*, @/*)
  - ✓ Module resolution set correctly
  - ✓ ES modules configured in package.json

  ## 🔍 PRE-FLIGHT CHECK

  Run this command to verify everything is ready:

  ```bash
  tsx preflight-check.ts
  ```

  This will check:
  - Environment variables
  - Module imports
  - Critical files
  - Database connection

  ## 🚀 STARTUP SEQUENCE

  1. **Server starts**: `npm run dev` runs `tsx server/index.ts`
  2. **Database connects**: PostgreSQL connection via DATABASE_URL
  3. **Auth initializes**: setupAuth() configures Replit Auth
  4. **Routes register**: 35+ API endpoints activated
  5. **Vite dev server**: Client app served with HMR

  ## ⚠️ COMMON ISSUES & SOLUTIONS

  ### Issue: "Cannot find module '@shared/schema'"
  **Solution**: tsx should resolve this automatically from tsconfig.json paths
  - Verify tsconfig.json has paths configured
  - Check that shared/schema.ts exists
  - Try: `tsx --tsconfig tsconfig.json server/index.ts`

  ### Issue: "DATABASE_URL must be set"
  **Solution**: PostgreSQL is provisioned, but env var might not be loaded
  - Replit automatically provides DATABASE_URL
  - Check Secrets tab in Replit
  - Restart the Repl if needed

  ### Issue: "REPL_ID is undefined"
  **Solution**: REPL_ID is auto-provided by Replit platform
  - Only available when running ON Replit
  - For local dev, you'd need to mock auth or use a different auth method
  - This should work automatically on Replit

  ### Issue: "Module not found" errors
  **Solution**: Ensure all imports use correct paths
  - Server files: relative paths (`./routes`, `./db`)
  - Shared imports: use `@shared/*` alias
  - Client imports: use `@/*` alias or relative paths

  ### Issue: Vite errors or client won't load
  **Solution**: Check client/src/main.tsx
  - Verify React is imported
  - Confirm QueryClientProvider wraps App
  - Check that StrictMode is properly closed

  ## 📊 EXPECTED BEHAVIOR WHEN WORKING

  ### On Startup:
  ```
  ✓ Database connected
  ✓ Auth system initialized  
  ✓ Routes registered
  ✓ Server listening on port 5000
  ✓ Vite dev server ready
  ```

  ### On First Visit:
  1. Browser loads Vite dev client
  2. App.tsx renders
  3. useAuth() hook checks /api/user/profile
  4. Not authenticated → Shows LoginPage
  5. Click "Sign in with Replit" → Redirects to /api/login
  6. OAuth flow → Callback → User created in DB
  7. Redirected to / with session cookie
  8. useAuth() returns user with role
  9. Routes to appropriate portal (client/linguist/admin)

  ## 🎯 NEXT STEPS

  1. Run preflight check: `tsx preflight-check.ts`
  2. If checks pass, start the app: `npm run dev`
  3. If it fails, check the error message carefully
  4. Common first-run issues:
     - TypeScript compilation errors (check tsx output)
     - Database connection (verify DATABASE_URL)
     - Missing dependencies (run npm install)

  ## 🐛 DEBUGGING TIPS

  ### Get More Verbose Output:
  ```bash
  DEBUG=* npm run dev
  ```

  ### Check Specific Module:
  ```bash
  tsx --help  # Verify tsx is working
  tsx --tsconfig tsconfig.json -e "console.log('tsx works')"
  ```

  ### Test Database Connection:
  ```bash
  tsx -e "import {db} from './server/db.js'; console.log(await db.execute('SELECT 1'))"
  ```

  ### Test Path Resolution:
  ```bash
  tsx -e "import {users} from './shared/schema.js'; console.log(typeof users)"
  ```

  ## 📝 FILES MODIFIED

  - client/src/main.tsx (added QueryClientProvider, StrictMode)
  - client/src/lib/queryClient.ts (created)
  - client/src/hooks/use-auth.ts (created)
  - client/src/App.tsx (added Toaster)
  - client/src/pages/not-found.tsx (created)
  - server/index.ts (added setupAuth call)
  - server/replit_integrations/auth/storage.ts (fixed imports)
  - shared/schema.ts (added favoriteLinguistsRelations)
  - package.json (updated scripts)
  - tsconfig.server.json (created, might not be needed)
  - preflight-check.ts (created for debugging)

  ## 🔐 ENVIRONMENT VARIABLES

  Required (auto-provided by Replit):
  - DATABASE_URL ✓
  - SESSION_SECRET ✓
  - REPL_ID ✓ (auto)
  - AI_INTEGRATIONS_OPENAI_API_KEY ✓
  - AI_INTEGRATIONS_OPENAI_BASE_URL ✓

  Optional:
  - ISSUER_URL (defaults to https://replit.com/oidc)

  ## ✨ WHAT THIS APP DOES

  ### Client Portal:
  - Create translation orders
  - Upload documents
  - Select languages and expertise
  - Track order status
  - Browse and hire linguists
  - Manage subscription

  ### Linguist Portal:
  - View available jobs
  - Accept assignments
  - Upload translated documents
  - Track earnings
  - Update profile and rates

  ### Admin Portal:
  - View all orders and users
  - Monitor system health
  - Manage linguist approvals
  - Analytics dashboard

  ### AI Features:
  - Automatic translation using GPT-4
  - Translation memory matching
  - Glossary term detection
  - Quality scoring
  