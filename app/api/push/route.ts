import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { explorationId, content, position } = await request.json()

    if (!explorationId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Create the block
    const { data: block, error } = await supabaseAdmin
      .from('blocks')
      .insert({
        exploration_id: explorationId,
        author_id: userId,
        content,
        position: position || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating block:', error)
      return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })
    }

    // Get all users in this exploration for notifications
    const { data: members } = await supabaseAdmin
      .from('memberships')
      .select('user_id')
      .eq('exploration_id', explorationId)
      .neq('user_id', userId)

    // Queue notifications for other members
    if (members && members.length > 0) {
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert(
          members.map(member => ({
            user_id: member.user_id,
            exploration_id: explorationId,
            block_id: block.id,
            type: 'new_block',
            read: false,
          }))
        )

      if (notifError) {
        console.error('Error creating notifications:', notifError)
      }
    }

    return NextResponse.json({ block })
  } catch (error) {
    console.error('Push API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 