import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all explorations where user is a member
    const { data: memberships, error: memberError } = await supabaseAdmin
      .from('memberships')
      .select('exploration_id, role')
      .eq('user_id', userId)

    if (memberError) {
      console.error('Error fetching memberships:', memberError)
      return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 })
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ explorations: [] })
    }

    // Get exploration details
    const explorationIds = memberships.map(m => m.exploration_id)
    const { data: explorations, error: exploreError } = await supabaseAdmin
      .from('explorations')
      .select('*')
      .in('id', explorationIds)
      .order('created_at', { ascending: false })

    if (exploreError) {
      console.error('Error fetching explorations:', exploreError)
      return NextResponse.json({ error: 'Failed to fetch explorations' }, { status: 500 })
    }

    // Combine with membership roles
    const explorationsWithRoles = explorations?.map(exploration => ({
      ...exploration,
      role: memberships.find(m => m.exploration_id === exploration.id)?.role || 'member'
    })) || []

    return NextResponse.json({ explorations: explorationsWithRoles })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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