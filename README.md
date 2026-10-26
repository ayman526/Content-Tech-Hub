# TranslateHub - Enterprise Translation SaaS Platform

  ## 🎯 Overview

  A comprehensive multilingual translation platform with AI-powered translation, dual portals (Client & Linguist), smart routing, and subscription management.

  ## ✨ Key Features

  ### Client Portal
  - **Dashboard**: View order statistics, active projects, and recent activity
  - **Order Creation Wizard**: 3-step conversational interface for creating translation orders
  - **AI Translation**: Instant GPT-4 powered draft translations
  - **Order Management**: Track status, view details, manage projects
  - **Glossary System**: Define and manage custom terminology
  - **Subscription Tiers**: Basic, Professional, and Enterprise plans

  ### Linguist Portal
  - **Job Marketplace**: Browse available translation jobs matching your language pairs
  - **Smart Matching**: Automatic filtering based on linguist language capabilities
  - **Assignment Workflow**: Accept jobs, track progress, mark as complete
  - **Earnings Dashboard**: View completed jobs, ratings, and total earnings
  - **Active Projects**: Manage current assignments

  ### Admin Portal
  - **Analytics Dashboard**: Platform-wide statistics and metrics
  - **User Management**: View and manage all clients and linguists
  - **Order Oversight**: Monitor all translation orders
  - **Revenue Tracking**: Track platform earnings

  ## 🏗️ Architecture

  ### Database Schema (11 Tables)
  - `users` - User accounts with role-based access
  - `organizations` - Company/organization management
  - `linguist_profiles` - Linguist details, language pairs, ratings
  - `translation_orders` - Translation project details
  - `order_documents` - File attachments for orders
  - `assignments` - Job assignments to linguists
  - `translation_memory` - Previously translated segments
  - `glossaries` - Custom terminology definitions
  - `favorite_linguists` - Client's preferred translators
  - `subscriptions` - Subscription tier management
  - `sessions` - User session management

  ### Tech Stack
  - **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn UI
  - **Backend**: Express.js, TypeScript
  - **Database**: PostgreSQL with Drizzle ORM
  - **Auth**: Replit Auth
  - **AI**: OpenAI GPT-4 for translations
  - **Payments**: Stripe integration ready

  ## 🚀 Getting Started

  ### 1. Database Setup
  ```bash
  npx drizzle-kit push
  ```

  ### 2. Start the Application
  The app will start automatically. Access it at your Replit URL.

  ### 3. Create Test Users

  #### Option A: Via Database (Recommended for testing)
  After your first login, you can manually set user roles in the database:

  ```sql
  -- Make yourself an admin
  UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

  -- Or make yourself a linguist
  UPDATE users SET role = 'linguist' WHERE email = 'your-email@example.com';
  ```

  #### Option B: Via Profile Update Endpoint
  After login, you can update your role through the API.

  ### 4. Set Up a Linguist Profile

  For linguist users, create a profile with language pairs:

  ```javascript
  // Example language pairs format
  {
    "languagePairs": [
      { "source": "en", "target": "es" },
      { "source": "en", "target": "fr" }
    ],
    "specializations": ["legal", "medical"],
    "hourlyRate": "50.00"
  }
  ```

  ## 📖 User Flows

  ### Client Flow
  1. Sign in with Replit Auth
  2. View dashboard with order statistics
  3. Click "New Translation Order"
  4. Complete 3-step wizard:
     - Step 1: Project details (title, description)
     - Step 2: Language selection (source → target)
     - Step 3: Timeline & requirements (deadline, priority, instructions)
  5. Submit order
  6. Optional: Get AI-powered draft translation
  7. Wait for linguist assignment
  8. Track order status
  9. Receive completed translation

  ### Linguist Flow
  1. Sign in with Replit Auth (role: linguist)
  2. Create linguist profile with language pairs
  3. View dashboard with earnings and active jobs
  4. Browse available jobs matching language capabilities
  5. Accept a job
  6. Work on translation
  7. Mark as complete
  8. Earnings and stats automatically updated

  ### Admin Flow
  1. Sign in with Replit Auth (role: admin)
  2. View platform analytics
  3. Monitor all orders and users
  4. Manage order statuses
  5. Track platform revenue

  ## 🎨 Subscription Tiers

  ### Basic (Default)
  - Basic translation orders
  - Standard glossary access
  - Email support

  ### Professional
  - Everything in Basic
  - Translation memory access
  - Favorite linguists feature
  - Priority support
  - Advanced analytics

  ### Enterprise
  - Everything in Professional
  - API access
  - Custom workflows
  - Dedicated account manager
  - White-label options

  ## 🔑 Environment Variables

  The following are already configured:
  - `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key for translations
  - `DATABASE_URL` - PostgreSQL connection
  - `SESSION_SECRET` - Session encryption

  ## 📊 API Endpoints

  ### User Management
  - `GET /api/user/profile` - Get current user profile
  - `PATCH /api/user/profile` - Update user profile

  ### Orders
  - `POST /api/orders` - Create new order
  - `GET /api/orders` - List user's orders (role-based)
  - `GET /api/orders/:id` - Get order details
  - `PATCH /api/orders/:id/status` - Update order status
  - `POST /api/orders/:id/ai-translate` - Generate AI translation

  ### Linguist
  - `GET /api/linguists` - List all linguists
  - `POST /api/linguist/profile` - Create/update linguist profile
  - `GET /api/linguist/available-jobs` - Get matching jobs

  ### Assignments
  - `POST /api/assignments` - Create assignment
  - `PATCH /api/assignments/:id/accept` - Accept assignment
  - `PATCH /api/assignments/:id/complete` - Complete assignment

  ### Glossaries
  - `GET /api/glossaries` - List user glossaries
  - `POST /api/glossaries` - Create glossary entry
  - `DELETE /api/glossaries/:id` - Delete glossary entry

  ### Favorites
  - `GET /api/favorites` - List favorite linguists
  - `POST /api/favorites` - Add favorite linguist
  - `DELETE /api/favorites/:linguistId` - Remove favorite

  ### Admin
  - `GET /api/admin/stats` - Platform statistics
  - `GET /api/admin/users` - List all users

  ## 🌍 Supported Languages

  - English (en)
  - Spanish (es)
  - French (fr)
  - German (de)
  - Italian (it)
  - Portuguese (pt)
  - Chinese (zh)
  - Japanese (ja)
  - Korean (ko)
  - Arabic (ar)
  - Russian (ru)

  ## 🎯 Smart Linguist Routing

  The platform automatically:
  1. Matches orders to linguists based on language pairs
  2. Filters available jobs by linguist capabilities
  3. Shows only relevant jobs to each linguist
  4. Tracks linguist availability and workload

  ## 💡 Tips for Testing

  1. **Create Multiple Users**: Test with different roles (client, linguist, admin)
  2. **Set Up Language Pairs**: Linguists need language pairs to see jobs
  3. **Use AI Translation**: Test the GPT-4 powered translation feature
  4. **Try Different Priorities**: Test urgent, high, normal, low priorities
  5. **Test Subscription Features**: Try features locked to different tiers

  ## 🔄 Order Lifecycle

  1. **Submitted** - Client creates order
  2. **Assigned** - Admin or linguist accepts job
  3. **Accepted** - Linguist confirms assignment
  4. **In Progress** - Linguist working on translation
  5. **Completed** - Linguist finishes work
  6. **Delivered** - Admin marks as delivered to client

  ## 📈 Future Enhancements (Next Phase)

  Already planned for the next iteration:
  - Advanced translation memory with fuzzy matching
  - Real-time collaborative editing
  - Quality assurance workflow
  - Automated invoice generation
  - Multi-language UI support
  - Advanced analytics dashboard
  - Email notifications
  - API access for enterprise
  - CAT tool integration
  - Machine translation post-editing workflow

  ## 🛠️ Development

  The codebase is organized as:
  - `/client` - React frontend
  - `/server` - Express backend
  - `/shared` - Shared types and schema
  - `/server/routes.ts` - API endpoints
  - `/shared/schema.ts` - Database schema

  ## 🎉 You're Ready!

  Your enterprise translation platform is fully functional and ready for use. Sign in, explore the different portals based on your role, and start managing translations!
  