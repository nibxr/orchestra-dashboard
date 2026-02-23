# Database Migration Instructions

## Add Figma Access Token Column

This migration adds the `figma_access_token` column to the `team` table to store Figma personal access tokens for each team member.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/20260215_add_figma_access_token.sql`
4. Click "Run" to execute the migration

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

### Option 3: Manual SQL Execution

Run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE public.team
ADD COLUMN IF NOT EXISTS figma_access_token TEXT;

COMMENT ON COLUMN public.team.figma_access_token IS 'Personal Figma access token for importing frames from Figma files';
```

### Verification

After running the migration, verify it worked by running:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'team' AND column_name = 'figma_access_token';
```

You should see:
- column_name: `figma_access_token`
- data_type: `text`
