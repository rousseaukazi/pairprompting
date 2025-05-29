# PairPrompting.ai

The best place to explore topics and share insights from your AI conversations with friends.

## Features

- **Collaborative Exploration**: Create explorations and invite friends with a simple link
- **Independent AI Chats**: Each person gets their own AI conversation
- **Push Key Insights**: Highlight text and press Cmd+Enter to share with the group
- **Real-time Collaboration**: See updates instantly as friends push new blocks
- **Comments & Engagement**: Comment on shared insights to build knowledge together

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Vercel Edge Functions
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **AI**: OpenAI API
- **Real-time**: Supabase Realtime

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd pairprompting-ai
npm install
```

### 2. Set up Clerk

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your API keys from the Clerk dashboard

### 3. Set up Supabase

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Run the SQL schema in `supabase/schema.sql` in the SQL editor
4. Copy your API keys from Settings > API

### 4. Set up OpenAI

1. Get your API key from [platform.openai.com](https://platform.openai.com)

### 5. Configure environment variables

Create a `.env.local` file in the root directory:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# WebSocket (for development)
NEXT_PUBLIC_WS_URL=ws://localhost:1234
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Usage

1. **Sign up/Sign in**: Create an account or sign in
2. **Create Exploration**: Click "New Exploration" and give it a title
3. **Share**: Use the share button to copy the invite link
4. **Chat**: Start chatting with AI in your personal chat panel
5. **Push Insights**: Highlight any AI response text and press Cmd+Enter
6. **Collaborate**: See pushed blocks appear in real-time, add comments

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables in Vercel's dashboard
4. Deploy!

### Production Considerations

- Enable Supabase Row Level Security policies
- Set up proper CORS headers for your domain
- Configure rate limiting for API endpoints
- Set up monitoring and error tracking (e.g., Sentry)
- Implement proper backup strategies

## Architecture Notes

- **Edge Functions**: Chat streaming runs on Vercel Edge for low latency
- **Real-time Sync**: Blocks sync via Supabase Realtime subscriptions
- **Auth Flow**: Clerk handles all authentication with Next.js middleware
- **Type Safety**: Full TypeScript coverage with strict mode

## Future Enhancements

- Voice chat integration
- Export to Notion/Markdown
- AI-powered summaries of explorations
- Mobile app
- Custom AI models per exploration

## Contributing

Pull requests are welcome! Please ensure:
- Code follows the existing style
- Tests are added for new features
- Documentation is updated

## License

MIT
