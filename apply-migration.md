# Database Migration Instructions

To add recurring events support, you need to apply the migration located at:
`supabase/migrations/20250726000000_add_recurrence_pattern.sql`

## Option 1: Using Supabase CLI (Recommended)

If you have Supabase CLI installed:

```bash
supabase db push
```

## Option 2: Manual Application via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250726000000_add_recurrence_pattern.sql`
4. Execute the SQL

## Option 3: Install Supabase CLI

```bash
npm install -g supabase
supabase login
supabase db push
```

## Migration Contents

The migration adds:
- `recurrence_pattern` TEXT column to `schedule_events` table
- Constraint to ensure consistency between `is_recurring` and `recurrence_pattern`
- Index for better query performance

After applying the migration, the recurring events feature will be fully functional.