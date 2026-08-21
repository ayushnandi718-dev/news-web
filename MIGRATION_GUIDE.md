# Database Migration Guide

## Overview
This guide covers the migration from SQLite to PostgreSQL and the schema enhancements for geographic classification and content hierarchy.

## Prerequisites

1. **PostgreSQL Installation**
   - Install PostgreSQL 14+ on your system
   - Create a database for the application
   - Note the connection string

2. **Environment Configuration**
   - Update `.env` with PostgreSQL connection string
   - Example: `DATABASE_URL="postgresql://user:password@localhost:5432/newsdb"`

## Migration Steps

### Step 1: Backup Existing Data (if any)

```bash
# If you have existing SQLite data
cp prisma/dev.db prisma/dev.db.backup
```

### Step 2: Update Environment Variables

Update your `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/newsdb"
AUTH_SECRET="generate-a-long-random-secret"
NEWSROOM_TZ="Asia/Kolkata"
INGEST_ENABLED="true"
INGEST_RUN_ON_START="false"
```

### Step 3: Install PostgreSQL Client Library

```bash
npm install pg
```

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

### Step 5: Create Database Migration

```bash
npx prisma migrate dev --name init_enhanced_schema
```

This will:
- Switch from SQLite to PostgreSQL
- Create all new tables and relationships
- Add indexes for performance

### Step 6: Seed Initial Data

```bash
npm run db:seed
```

This will:
- Create default admin user (admin@newsroom.local / admin123)
- Create all categories with proper hierarchy
- Create sports subcategories (Cricket, Football, Tennis, etc.)
- Create data subcategories (Weather, Stock Market, Gold, etc.)
- Create special subcategories (Explainers, Opinion, etc.)
- Create geographic regions (Alipurduar, North Bengal, etc.)

### Step 7: Verify Migration

```bash
# Check database connection
npx prisma db push

# View database in Prisma Studio
npx prisma studio
```

## Schema Changes Summary

### New Models

1. **Subcategory**
   - Hierarchical categorization under main categories
   - Used for Sports, Data, and Special sections

2. **Region**
   - Geographic hierarchy (Town → District → Division → State → Country)
   - Alipurduar-specific regions with sub-locations
   - North Bengal districts
   - Priority-based ranking

3. **ArticleRevision**
   - Track article changes over time
   - Support for editorial workflow

4. **Correction**
   - Track corrections to published articles
   - Maintain editorial integrity

### Enhanced Article Model

**New Fields:**
- `subcategoryId` - Link to subcategory
- `regionId` - Link to geographic region
- `editorId` - Track editor who approved/modified
- `geographicPriority` - Priority for geographic ranking
- `geographicScope` - LOCAL, REGIONAL, STATE, NATIONAL, INTERNATIONAL
- `district`, `state`, `country` - Geographic classification
- `readingTimeMinutes` - Estimated reading time
- `sourceNotes` - Editorial notes about sources
- `seoTitle`, `seoDescription` - SEO optimization
- `ogImage` - Open Graph image

**New Indexes:**
- Geographic queries (regionId, district, state, country)
- Editorial workflow (editorId)
- Combined queries for performance

### Enhanced Category Model

**New Fields:**
- `type` - STANDARD, SPORTS, DATA, SPECIAL
- `parentId` - Support for category hierarchy
- `children` - Subcategories

## Data Seeding Details

### Categories Created

**Main Categories:**
- Breaking (priority: 100)
- Alipurduar (priority: 95)
- North Bengal (priority: 90)
- West Bengal (priority: 85)
- India (priority: 80)
- World (priority: 75)
- Politics (priority: 70)
- Business (priority: 65)
- Sports (priority: 60) - SPORTS type
- Entertainment (priority: 55)
- Technology (priority: 50)
- Education (priority: 45)
- Health (priority: 40)
- Science (priority: 35)
- Lifestyle (priority: 30)
- Data (priority: 25) - DATA type
- Videos (priority: 20)
- Special (priority: 15) - SPECIAL type

### Sports Subcategories

- Cricket, Football, Tennis, Other Sports
- Live, Results, Schedule

### Data Subcategories

- Weather, Stock Market, Gold, Silver, Fuel

### Special Subcategories

- Explainers, Opinion, Web Stories, E-paper

### Geographic Regions

**Alipurduar Division:**
- Alipurduar Town, Falakata, Madarihat, Kalchini, Kumargram, Birpara

**North Bengal Division:**
- Cooch Behar, Jalpaiguri, Darjeeling, Kalimpong, Siliguri
- Uttar Dinajpur, Dakshin Dinajpur, Malda

**State/Country:**
- West Bengal, India, World

## Post-Migration Tasks

### 1. Update Application Code

The following files need updates to handle new fields:

- **API Routes:** Update article creation/update endpoints
- **CMS:** Add region/subcategory selection
- **Frontend:** Display geographic information
- **Feeds:** Include geographic filtering

### 2. Update Validation Schemas

Validation schemas have been updated to include:
- Geographic fields
- SEO fields
- Subcategory selection
- Region selection

### 3. Update Freshness Engine

The freshness engine now includes:
- Geographic priority scoring
- Geographic scope weighting
- Enhanced ranking algorithm

### 4. Test thoroughly

- Test article creation with new fields
- Test geographic filtering
- Test category/subcategory hierarchy
- Test freshness scoring with geographic data

## Rollback Plan

If issues occur:

```bash
# Drop PostgreSQL database
psql -U user -d postgres -c "DROP DATABASE newsdb;"

# Restore SQLite (if needed)
# Update .env back to SQLite
# DATABASE_URL="file:./dev.db"

# Restore from backup
cp prisma/dev.db.backup prisma/dev.db
```

## Troubleshooting

### Connection Issues

```
Error: P1001: Can't reach database server
```
- Verify PostgreSQL is running
- Check connection string format
- Ensure database exists

### Migration Conflicts

```
Error: P3005: The database schema is not empty
```
- Drop existing tables in PostgreSQL
- Or use `npx prisma migrate reset`

### Permission Issues

```
Error: Permission denied for database
```
- Ensure user has CREATE, CONNECT, TEMPORARY permissions
- Check PostgreSQL user permissions

## Production Deployment

For production:

1. Use managed PostgreSQL (Supabase, Neon, AWS RDS)
2. Set strong passwords and secrets
3. Enable SSL connections
4. Configure connection pooling
5. Set up automated backups
6. Monitor database performance

## Next Steps

After migration:

1. Test all application features
2. Update admin CMS to use new fields
3. Implement geographic filtering in frontend
4. Add region-based navigation
5. Update SEO implementation with new fields
6. Monitor performance with new indexes