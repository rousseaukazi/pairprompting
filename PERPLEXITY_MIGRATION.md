# Migration Guide: OpenAI to Perplexity AI

This guide details the changes made to migrate from OpenAI to Perplexity AI for web search capabilities.

## Changes Made

### 1. Updated Dependencies
- Removed `openai` package from `package.json`
- No new dependencies needed (using fetch API directly)

### 2. Code Changes

#### `/lib/llm.ts`
- Removed OpenAI SDK import and initialization
- Implemented Perplexity API using fetch
- Updated default model from `gpt-3.5-turbo` to `sonar`
- Enhanced system prompt to mention web search capabilities
- Implemented proper streaming support for Perplexity's SSE format

#### `/app/api/polish/route.ts`
- Removed OpenAI SDK import
- Implemented Perplexity API call using fetch
- Changed model from `gpt-4o-mini` to `sonar`
- Added error handling for JSON parsing

### 3. Environment Variables
Replace in your `.env.local`:
```
# Old
OPENAI_API_KEY=sk-...

# New
PERPLEXITY_API_KEY=pplx-...
```

### 4. Documentation Updates
- Updated README.md
- Updated setup-guide.md
- Updated DEPLOYMENT.md

## Getting Your Perplexity API Key

1. Go to [perplexity.ai](https://www.perplexity.ai/settings/api)
2. Sign up or log in to your account
3. Navigate to API settings
4. Generate a new API key
5. Copy the key (starts with `pplx-`)

## Available Perplexity Models

- `sonar` - Fast, efficient model with web search (recommended)
- `sonar-pro` - More powerful model with enhanced capabilities

## Benefits of Migration

1. **Web Search Integration**: Responses can include real-time information from the web
2. **Current Information**: No knowledge cutoff - access to latest data
3. **Source Citations**: Can provide sources for information
4. **Cost Effective**: Competitive pricing with web search included

## Testing the Migration

After updating your environment variables, test the integration:

1. Start the development server: `npm run dev`
2. Create a new exploration
3. Ask a question about current events or recent information
4. The AI should be able to provide up-to-date information

## Rollback Instructions

If you need to rollback to OpenAI:

1. Run `npm install openai`
2. Revert the changes in `/lib/llm.ts` and `/app/api/polish/route.ts`
3. Update your environment variables back to `OPENAI_API_KEY`

## Support

For Perplexity API documentation, visit: https://docs.perplexity.ai/ 