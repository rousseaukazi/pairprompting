# Deploying PairPrompting to Vercel

## Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com with GitHub)
- All environment variables ready

## Step 1: Push to GitHub

1. Create a new repository on GitHub (https://github.com/new)
   - Name: `pairprompting`
   - Keep it private if you want
   - Don't initialize with README (we already have one)

2. Add your GitHub repository as remote:
```bash
git remote add origin https://github.com/YOUR_USERNAME/pairprompting.git
```

3. Add all files and commit:
```bash
git add .
git commit -m "Initial commit - PairPrompting app"
```

4. Push to GitHub:
```bash
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)
1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Run in your project directory:
```bash
vercel
```

3. Follow the prompts:
   - Link to existing project? No
   - What's your project name? pairprompting
   - Which directory is your code in? ./
   - Want to override settings? No

### Option B: Using Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: (leave default)
   - Output Directory: (leave default)

## Step 3: Add Environment Variables

In Vercel Dashboard (https://vercel.com/YOUR_USERNAME/pairprompting/settings/environment-variables):

Add these environment variables:

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...

# WebSocket (optional)
NEXT_PUBLIC_WS_URL=ws://localhost:1234
```

**Important**: Add them for all environments (Production, Preview, Development)

## Step 4: Deploy

1. After adding env variables, trigger a redeploy:
   - Go to Deployments tab
   - Click the three dots on latest deployment
   - Click "Redeploy"

## Step 5: Set up Automatic Deployments

This is already configured! Vercel automatically:
- Deploys to production when you push to `main`
- Creates preview deployments for pull requests

## Step 6: Update Clerk for Production

1. In Clerk Dashboard, add your production URL:
   - Go to your app settings
   - Add `https://pairprompting.vercel.app` (or your custom domain)
   - Update redirect URLs

2. For production, you might want to:
   - Create a production Clerk instance
   - Update to production API keys in Vercel

## Custom Domain (Optional)

1. In Vercel project settings → Domains
2. Add your domain (e.g., pairprompting.ai)
3. Follow DNS configuration instructions

## Troubleshooting

- **500 errors**: Check environment variables are set correctly
- **Auth issues**: Ensure Clerk URLs are updated for production
- **Database issues**: Make sure Supabase allows connections from Vercel

## Monitoring

- View logs: Vercel Dashboard → Functions tab
- Check analytics: Vercel Dashboard → Analytics tab
- Set up error tracking: Consider adding Sentry

## Useful Commands

```bash
# View deployment status
vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Pull env variables locally
vercel env pull
``` 