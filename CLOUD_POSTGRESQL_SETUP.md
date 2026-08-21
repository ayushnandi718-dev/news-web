# Cloud PostgreSQL Setup Guide

## Recommended Cloud PostgreSQL Services

### 1. Supabase (Recommended - Free Tier Available)
- **URL:** https://supabase.com
- **Free Tier:** 500MB database, 1GB bandwidth
- **Pros:** Open source, real-time features, built-in auth
- **Setup Time:** ~5 minutes

### 2. Neon (Recommended - Serverless)
- **URL:** https://neon.tech
- **Free Tier:** 0.5GB storage, 300 hours compute
- **Pros:** Serverless, auto-scaling, branching
- **Setup Time:** ~3 minutes

### 3. Railway
- **URL:** https://railway.app
- **Free Tier:** $5 credit/month
- **Pros:** Simple UI, good for small projects
- **Setup Time:** ~5 minutes

### 4. PlanetScale
- **URL:** https://planetscale.com
- **Free Tier:** 5GB storage, 1 billion reads
- **Pros:** MySQL-compatible (not PostgreSQL), branching
- **Note:** MySQL-based, not PostgreSQL

## Quick Setup with Supabase

### Step 1: Create Account
1. Go to https://supabase.com
2. Sign up for a free account
3. Create a new project

### Step 2: Get Connection String
1. In your Supabase project, go to Settings → Database
2. Find "Connection string" → "URI"
3. Copy the connection string (looks like: `postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres`)

### Step 3: Update Environment Variables
Update your `.env` file:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
AUTH_SECRET="generate-a-long-random-secret"
NEWSROOM_TZ="Asia/Kolkata"
INGEST_ENABLED="true"
INGEST_RUN_ON_START="false"
```

### Step 4: Run Migration
```bash
npx prisma migrate dev --name init_enhanced_schema
npm run db:seed
```

## Quick Setup with Neon

### Step 1: Create Account
1. Go to https://neon.tech
2. Sign up for a free account
3. Create a new project

### Step 2: Get Connection String
1. In your Neon dashboard, find your project
2. Copy the connection string from the dashboard
3. Format: `postgresql://[user]:[password]@[ep-host].neon.tech/neondb?sslmode=require`

### Step 3: Update Environment Variables
```env
DATABASE_URL="postgresql://[user]:[password]@[ep-host].neon.tech/neondb?sslmode=require"
AUTH_SECRET="generate-a-long-random-secret"
NEWSROOM_TZ="Asia/Kolkata"
INGEST_ENABLED="true"
INGEST_RUN_ON_START="false"
```

### Step 4: Run Migration
```bash
npx prisma migrate dev --name init_enhanced_schema
npm run db:seed
```

## Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use strong passwords** - Generate random passwords
3. **Enable SSL** - Most cloud services require SSL
4. **Restrict access** - Use IP whitelisting if available
5. **Regular backups** - Enable automated backups

## Testing Connection

Test your connection before running migrations:

```bash
npx prisma db push
```

If successful, you should see:
```
✔ The database schema is synchronized
```

## Troubleshooting

### SSL Issues
If you get SSL errors, add `?sslmode=require` to your connection string

### Connection Timeout
- Check your internet connection
- Verify the connection string format
- Ensure the database is active (some services pause free databases)

### Permission Issues
- Ensure your database user has CREATE TABLE permissions
- Some cloud services require using the default postgres user

## Next Steps After Setup

1. Run the database migration
2. Seed the initial data
3. Test the application
4. Set up automated backups
5. Configure connection pooling for production

## Cost Monitoring

- **Supabase:** Monitor usage in dashboard
- **Neon:** Check compute hours and storage
- **Railway:** Monitor $5 credit usage
- Set up alerts for cost overruns