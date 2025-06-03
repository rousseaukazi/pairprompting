# PairPrompting Setup Guide

## Quick Setup Steps

### 1. Claim your Clerk keys

Click this link to claim your development keys:
https://dashboard.clerk.com/apps/claim?token=hr7apor1tm2g14ubaolmnssascevgoo5ttvgimua

After claiming:
1. Go to your Clerk dashboard
2. Copy the "Publishable Key" and "Secret Key"

### 2. Create a Supabase project

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in:
   - Project name: `pairprompting`
   - Database password: (generate a strong one)
   - Region: Choose closest to you
4. Wait for project to be created

### 3. Set up Supabase database

1. In Supabase dashboard, go to "SQL Editor"
2. Copy and paste the entire contents of `supabase/schema.sql`
3. Click "Run" to create all tables

### 4. Get your API keys

From Supabase dashboard:
1. Go to Settings → API
2. Copy:
   - Project URL
   - anon public key
   - service_role key (under "Service role key - Secret")

### 5. Create your .env.local file

Create a file called `.env.local` in the root of pairprompting-ai folder:

```bash
# Clerk (from step 1)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY
CLERK_SECRET_KEY=sk_test_YOUR_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase (from step 4)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
PERPLEXITY_API_KEY=pplx-YOUR_PERPLEXITY_KEY

# WebSocket (leave as is)
NEXT_PUBLIC_WS_URL=ws://localhost:1234
```

### 6. Restart the dev server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Troubleshooting

- **500 errors**: Usually means environment variables are missing
- **Auth errors**: Make sure Clerk keys are correct
- **Database errors**: Ensure you ran the SQL schema in Supabase

Your app should now work at http://localhost:3001! 