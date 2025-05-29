import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { explorationId } = await request.json()

    if (!explorationId) {
      return NextResponse.json({ error: 'Exploration ID is required' }, { status: 400 })
    }

    // Verify user has access to this exploration
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('exploration_id', explorationId)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the user's chat history
    const { data: chat, error } = await supabaseAdmin
      .from('chats')
      .select('messages')
      .eq('exploration_id', explorationId)
      .eq('user_id', userId)
      .single()

    if (error) {
      // If no chat exists, create one
      const { data: newChat, error: createError } = await supabaseAdmin
        .from('chats')
        .insert({
          exploration_id: explorationId,
          user_id: userId,
          messages: [],
        })
        .select('messages')
        .single()

      if (createError) {
        console.error('Error creating chat:', createError)
        return NextResponse.json({ error: 'Failed to load chat' }, { status: 500 })
      }

      return NextResponse.json({ messages: newChat.messages || [] })
    }

    return NextResponse.json({ messages: chat.messages || [] })
  } catch (error) {
    console.error('Load chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 