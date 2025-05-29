# Production Setup Guide

## 1. Clerk Production Setup

### Create a Production Instance
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click "Create application"
3. Name it "PairPrompting Production"
4. Configure:
   - Sign-in options: Email, Google, etc.
   - Application name: PairPrompting
   - Brand color: Match your app

### Get Production Keys
1. In the new production app, go to "API Keys"
2. Copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_`)

### Configure Production URLs
In Clerk production app settings:
1. Go to "Domains"
2. Add:
   - `pairprompting.vercel.app`
   - `pairprompting.ai` (if using custom domain)
   - Any other production URLs

### Update Redirect URLs
In "Paths" settings, ensure these match:
```
Sign-in URL: /sign-in
Sign-up URL: /sign-up
After sign-in URL: /dashboard
After sign-up URL: /dashboard
```

## 2. Update Vercel Environment Variables

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → Settings → Environment Variables
3. Update these for **Production** environment only:

```bash
# Replace with production keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

Keep development keys for Preview and Development environments.

## 3. OpenAI Best Practices

For production, consider:
1. Set up usage limits in OpenAI dashboard
2. Monitor costs
3. Consider implementing rate limiting
4. Add usage tracking

## 4. Supabase Production Checklist

- [ ] Ensure connection pooling is enabled
- [ ] Set up proper database backups
- [ ] Review and optimize RLS policies
- [ ] Monitor database performance
- [ ] Set up alerts for errors

## 5. Security Checklist

- [ ] All API keys are in environment variables
- [ ] No secrets in code
- [ ] HTTPS enforced (Vercel does this)
- [ ] Rate limiting on API routes
- [ ] Input validation on all endpoints

## 6. Add Error Monitoring (Optional)

### Sentry Setup
1. Sign up at [sentry.io](https://sentry.io)
2. Create a Next.js project
3. Install Sentry:
```bash
npx @sentry/wizard@latest -i nextjs
```
4. Add Sentry DSN to Vercel env vars

## 7. Custom Domain Setup

If using pairprompting.ai:
1. In Vercel project → Settings → Domains
2. Add `pairprompting.ai`
3. Add DNS records:
   - A record: `@` → `76.76.21.21`
   - CNAME: `www` → `cname.vercel-dns.com`

## Quick Development/Production Toggle

For easy switching between dev/prod Clerk:

```typescript
// lib/clerk-config.ts
export const clerkConfig = {
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  secretKey: process.env.CLERK_SECRET_KEY!,
  // Auto-detect production
  production: process.env.NODE_ENV === 'production',
}
```

## Deployment Commands

```bash
# Deploy to production with prod env vars
vercel --prod

# Preview deployment with dev env vars  
vercel

# Force redeploy
vercel --force
``` 