# StorePilot

A production-ready multi-tenant SaaS for convenience store owners and operators.

## Overview

StorePilot is a modern web application built with Next.js 14, TypeScript, and Supabase. It provides convenience store owners with tools to manage multiple stores, locations, team members, and analytics.

## Features

### Authentication & Onboarding
- Email/password authentication with Supabase Auth
- Password reset functionality
- First-time user onboarding flow
- Protected routes with middleware

### Store Management
- Create and manage multiple stores
- Store settings (currency, timezone, date format)
- Store slug generation for URL-friendly identifiers
- Role-based access control

### Location Management
- Multiple locations per store
- Address, phone, and email management
- Location codes for easy reference

### Team & Members
- Invite members by email
- Role-based permissions (owner, admin, manager, staff)
- Pending invitation management
- Member role updates

### Dashboard & Analytics
- Dashboard overview with store metrics
- Analytics foundation (extensible for future features)
- Store switching dropdown

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Forms**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/storepilot.git
cd storepilot
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Database Setup

1. Create a new Supabase project
2. Run the schema SQL in the Supabase SQL Editor:
   - Go to `supabase/schema.sql`
   - Copy and execute in the Supabase dashboard

3. (Optional) Seed demo data:
   - Edit the user IDs in `supabase/seed.sql` to match your auth users
   - Run the seed SQL in the Supabase SQL Editor

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
storepilot/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── actions/            # Server Actions
│   │   ├── (auth)/             # Auth routes (login, signup)
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── onboarding/         # Onboarding flow
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   └── dashboard/          # Dashboard components
│   ├── lib/
│   │   ├── supabase/           # Supabase clients
│   │   ├── validations/        # Zod schemas
│   │   ├── database.types.ts   # Database types
│   │   └── utils.ts            # Utilities
│   └── middleware.ts           # Auth middleware
├── supabase/
│   ├── schema.sql              # Database schema
│   └── seed.sql                # Seed data
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## Database Schema

### Core Tables

- **profiles** - User profiles extending auth.users
- **stores** - Stores (tenant boundary)
- **store_locations** - Physical locations per store
- **store_members** - Memberships linking users to stores
- **invitations** - Pending invitations
- **store_settings** - Per-store configuration
- **audit_logs** - Activity audit trail
- **user_preferences** - Per-user UI preferences

### Row Level Security (RLS)

All tenant-aware tables have RLS policies enforcing:
- Users can only access their own profiles
- Store members can only access their stores
- Role-based permissions for modifications

## Role-Based Permissions

| Role   | Stores | Locations | Members | Settings |
|--------|--------|-----------|---------|----------|
| Owner  | CRUD   | CRUD      | Full    | Full     |
| Admin  | RU     | CRUD      | Manage* | Full     |
| Manager| R      | R         | R       | Read     |
| Staff  | R      | R         | R       | Read     |

*Admins cannot manage owners or other admins

## API Routes

All data operations use Next.js Server Actions:

- `auth.ts` - Authentication actions
- `stores.ts` - Store CRUD and location management
- `members.ts` - Member invitations and management

## Key Design Decisions

1. **Store as Tenant**: Each store is a tenant boundary. Users can belong to multiple stores.
2. **RLS Security**: Database-level security policies ensure tenant isolation
3. **Server Actions**: All mutations use server actions with Zod validation
4. **Role Hierarchy**: Owner > Admin > Manager > Staff with inheritance
5. **Soft Deletes**: Stores and locations use status flags for deletion

## Future Roadmap

- [ ] Inventory management
- [ ] Sales tracking
- [ ] Advanced analytics
- [ ] Staff scheduling
- [ ] Customer management
- [ ] Purchase ordering
- [ ] Mobile app
- [ ] POS integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[MIT](LICENSE)

## Support

For issues and feature requests, please use the GitHub issue tracker.
