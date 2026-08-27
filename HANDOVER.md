# Project Handover Guide - News-Web

## Critical Security Actions (DO IMMEDIATELY)

### 1. Change Default Admin Credentials
The seed file creates a default admin user with credentials from environment variables:
- Default email: `admin@newsroom.local` (or `ADMIN_EMAIL` env var)
- Default password: `admin123` (or `ADMIN_PASSWORD` env var)

**ACTION REQUIRED:**
```bash
# Set secure admin credentials in .env
ADMIN_EMAIL=your-secure-email@domain.com
ADMIN_PASSWORD=your-very-strong-password-here
```

Then run:
```bash
npm run db:seed
```

### 2. Change Auth Secret
The application uses a default auth secret that MUST be changed in production:

**ACTION REQUIRED:**
```bash
# Generate a secure random secret (32+ characters)
AUTH_SECRET=your-very-secure-random-secret-key-minimum-32-characters
```

### 3. Secure Database Connection
Ensure your `DATABASE_URL` uses a strong password and SSL connection.

## Project Overview

**News-Web** is a complete Bengali news platform built with Next.js 15, featuring:
- News publishing with rich text editing
- Breaking news system
- Category-based organization (Alipurduar, Dooars, North Bengal)
- Admin panel with comprehensive management
- User engagement features (comments, bookmarks, push notifications)
- Monetization (Google AdSense, custom ads)
- RSS feed ingestion system

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Custom JWT with TOTP (2FA)
- **Monitoring**: Sentry
- **Testing**: Vitest

## Key Files & Directories

```
News-Web/
├── src/
│   ├── app/              # Next.js pages and API routes
│   ├── components/       # React components
│   ├── lib/             # Utility libraries
│   ├── hooks/           # Custom React hooks
│   └── types/           # TypeScript definitions
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Database seeding script
├── public/              # Static assets
├── scripts/             # Utility scripts (backup, etc.)
└── tests/              # Test files
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure all required variables (see DEPLOYMENT.md).

### 3. Database Setup
```bash
# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 4. Development Server
```bash
npm run dev
```

### 5. Production Build
```bash
npm run build
npm run start
```

## Admin Panel Access

- **URL**: `/admin`
- **Default credentials**: (See Critical Security Actions above)
- **Features**: Article management, user management, analytics, settings, etc.

## Important Features

### Content Management
- **Articles**: Create, edit, publish, schedule articles
- **Categories**: Manage news categories and subcategories
- **Regions**: Geographic classification (Alipurduar, Dooars, etc.)
- **Media**: Image upload and management
- **Breaking News**: Time-limited priority news

### User Features
- **Comments**: User comments on articles
- **Bookmarks**: Save articles for later
- **Newsletter**: Email subscriptions
- **Push Notifications**: Web push notifications
- **Live Streams**: Video journalism integration

### Monetization
- **Google AdSense**: Integrated ad slots
- **Custom Ads**: Manage advertisement placements
- **Ad Requests**: User advertisement requests

### RSS Ingestion
- **Sources**: Add RSS feed sources
- **Auto-publishing**: Configure automatic publishing
- **Deduplication**: Automatic duplicate detection

## Database Schema Overview

Key models:
- **User**: Admin users with roles (OWNER, ADMIN, EDITOR, REPORTER)
- **Article**: News articles with categories, regions, tags
- **Category/Subcategory**: Content classification
- **Region**: Geographic classification
- **LiveStream**: Video journalism streams
- **Advertisement**: Ad management
- **PushSubscription**: Notification subscriptions

## API Endpoints

### Public APIs
- `/api/v1/news/latest` - Latest news
- `/api/v1/news/trending` - Trending news
- `/api/v1/categories` - Categories list
- `/api/v1/weather` - Weather data
- `/api/v1/market/quotes` - Market data

### Admin APIs
- `/api/v1/admin/*` - Admin management endpoints
- Authentication required via JWT tokens

## Common Tasks

### Add New Article
1. Login to admin panel
2. Go to Articles → Create New
3. Fill in title, content, category, region
4. Set publish date or schedule
5. Publish

### Add RSS Source
1. Go to Admin → Sources
2. Add new RSS feed URL
3. Configure category and auto-publish settings
4. Test and activate

### Manage Users
1. Go to Admin → Users
2. Create new users with appropriate roles
3. Configure permissions

### Configure Ads
1. Go to Admin → Ads
2. Create advertisement
3. Set placement, schedule, and pricing
4. Manage ad requests from users

## Troubleshooting

### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Database Issues
```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name migration_name
```

### Environment Issues
- Ensure all required env variables are set
- Check DATABASE_URL is correct
- Verify AUTH_SECRET is set

## Performance Optimization

- Images are automatically optimized by Next.js
- Static pages are cached with revalidation
- API responses use appropriate cache headers
- Database queries are optimized with indexes

## Security Features

- JWT-based authentication
- TOTP (2FA) for admin accounts
- Password hashing with bcrypt
- Session management with expiration
- CSRF protection
- XSS protection
- SQL injection prevention (Prisma)

## Monitoring & Logging

- **Sentry**: Error tracking and performance monitoring
- **Application logs**: Server-side logging
- **Audit logs**: Admin actions logged in database

## Backup Strategy

```bash
# Manual backup
node scripts/backup.mjs

# Recommended: Set up automated daily backups via cron
```

## Support & Maintenance

### Regular Tasks
- Monitor server logs
- Check database performance
- Review Sentry error reports
- Update dependencies regularly
- Monitor disk space

### Updates
```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit
```

## Contact & Resources

- **Deployment Guide**: See DEPLOYMENT.md
- **Environment Variables**: See DEPLOYMENT.md
- **Database Schema**: See prisma/schema.prisma
- **API Documentation**: See src/app/api/ directory

## Post-Handover Checklist

- [ ] Change default admin credentials
- [ ] Change AUTH_SECRET
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Configure error monitoring (Sentry)
- [ ] Set up database backups
- [ ] Test all admin functionality
- [ ] Verify email sending (newsletter)
- [ ] Test push notifications
- [ ] Configure AdSense (if using)
- [ ] Set up analytics tracking
- [ ] Review and update contact information
- [ ] Test RSS feed ingestion
- [ ] Verify all environment variables
- [ ] Run production build test
- [ ] Deploy to production environment

## Notes

- The project uses TypeScript for type safety
- All admin routes are protected with authentication
- The application supports both Bengali and English content
- Mobile-responsive design with bottom navigation
- Dark mode support included
- Service worker for offline support