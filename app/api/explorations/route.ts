import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Create exploration
    const { data: exploration, error: exploreError } = await supabaseAdmin
      .from('explorations')
      .insert({
        title,
        owner_id: userId,
      })
      .select()
      .single()

    if (exploreError) {
      console.error('Error creating exploration:', exploreError)
      return NextResponse.json({ error: 'Failed to create exploration' }, { status: 500 })
    }

    // Create membership for owner
    const { error: memberError } = await supabaseAdmin
      .from('memberships')
      .insert({
        exploration_id: exploration.id,
        user_id: userId,
        role: 'owner',
      })

    if (memberError) {
      console.error('Error creating membership:', memberError)
      return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 })
    }

    // Create initial chat for the user
    const { error: chatError } = await supabaseAdmin
      .from('chats')
      .insert({
        exploration_id: exploration.id,
        user_id: userId,
        messages: [],
      })

    if (chatError) {
      console.error('Error creating chat:', chatError)
      return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
    }

    return NextResponse.json({ id: exploration.id })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 