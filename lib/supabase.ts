import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase environment variables are not set. Please check your .env.local file.')
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client with service role key
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase // Fallback to regular client if service key is not available

// Database types
export type Exploration = {
  id: string
  title: string
  owner_id: string
  created_at: string
  updated_at: string
}

export type Block = {
  id: string
  exploration_id: string
  author_id: string
  content: string
  position: number
  created_at: string
}

export type Comment = {
  id: string
  block_id: string
  author_id: string
  content: string
  created_at: string
}

export type Chat = {
  id: string
  exploration_id: string
  user_id: string
  messages: Message[]
  created_at: string
  updated_at: string
}

export type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export type Membership = {
  exploration_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
} 