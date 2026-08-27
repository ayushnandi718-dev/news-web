# Deployment Guide - News-Web

## Environment Variables

### Required Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Site Identity
NEXT_PUBLIC_SITE_NAME_BN=ডুয়ার্সের খবর
NEXT_PUBLIC_SITE_NAME_EN=DOOARSER KHABAR
NEXT_PUBLIC_SITE_TAGLINE=আপনার এলাকার খবর, আপনার ভাষায়।
NEXT_PUBLIC_SITE_TWITTER=@duarserskhabar
SITE_URL=https://yourdomain.com

# Authentication Security (IMPORTANT: Change in production!)
AUTH_SECRET=your-random-32-character-secret-key
```

### Required for Initial Setup
```bash
# Admin User Creation (used in database seeding)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-admin-password
```

### Optional Variables
```bash
# Timezone
NEWSROOM_TZ=Asia/Kolkata

# Contact Information
NEXT_PUBLIC_CONTACT_EMAIL=newsroom@duarserskhabar.in
NEXT_PUBLIC_CONTACT_PHONE=
NEXT_PUBLIC_CONTACT_WHATSAPP=

# SEO Verification
GOOGLE_SITE_VERIFICATION=
YANDEX_VERIFICATION=

# Google AdSense
NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=pub-XXXXXXXXXXXXXXXX

# Sentry Error Tracking
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Weather API
OPENWEATHER_API_KEY=your-openweather-api-key

# News API
NEWS_API_KEY=your-newsapi-key

# Web Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:admin@yourdomain.com

# Email (Newsletter)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=newsroom@yourdomain.com

# RSS Ingestion System
INGEST_ENABLED=true
INGEST_RUN_ON_START=false

# Logging
LOG_LEVEL=info

# Development
ALLOW_INSECURE_COOKIES=true
NODE_ENV=development
NEXT_DIST_DIR=.next
CI=false
```

## Deployment Steps

### 1. Database Setup
```bash
# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 2. Build Application
```bash
npm run build
```

### 3. Start Production Server
```bash
npm run start
```

## Security Checklist

- [ ] Change `AUTH_SECRET` to a strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `DATABASE_URL` with strong password
- [ ] Remove `ALLOW_INSECURE_COOKIES=true` in production
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Configure Sentry for error tracking
- [ ] Review admin user credentials

## Database Backup

```bash
# Manual backup
node scripts/backup.mjs

# Automated backup (recommended)
# Set up cron job for daily backups
```

## Monitoring

- Application logs: Check server logs
- Error tracking: Sentry dashboard
- Database performance: Monitor slow queries
- Uptime monitoring: Set up external monitoring

## Performance Optimization

- Enable CDN for static assets
- Configure image optimization
- Set up caching headers
- Monitor bundle size
- Enable gzip compression