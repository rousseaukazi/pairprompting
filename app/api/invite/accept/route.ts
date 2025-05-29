import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Find the invite and check if it's valid
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('invites')
      .select('exploration_id, expires_at')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
    }

    // Check if invite has expired
    const now = new Date()
    const expiresAt = new Date(invite.expires_at)
    if (now > expiresAt) {
      return NextResponse.json({ error: 'Invite link has expired' }, { status: 400 })
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabaseAdmin
      .from('memberships')
      .select('user_id')
      .eq('exploration_id', invite.exploration_id)
      .eq('user_id', userId)
      .single()

    if (existingMembership) {
      // User is already a member, just return the exploration ID
      return NextResponse.json({ explorationId: invite.exploration_id, alreadyMember: true })
    }

    // Add user as a member
    const { error: membershipError } = await supabaseAdmin
      .from('memberships')
      .insert({
        exploration_id: invite.exploration_id,
        user_id: userId,
        role: 'member',
      })

    if (membershipError) {
      console.error('Error creating membership:', membershipError)
      return NextResponse.json({ error: 'Failed to join exploration' }, { status: 500 })
    }

    // Create a chat for the new user
    const { error: chatError } = await supabaseAdmin
      .from('chats')
      .insert({
        exploration_id: invite.exploration_id,
        user_id: userId,
        messages: [],
      })

    if (chatError) {
      console.error('Error creating chat:', chatError)
      // Don't fail the request if chat creation fails
    }

    return NextResponse.json({ explorationId: invite.exploration_id, alreadyMember: false })
  } catch (error) {
    console.error('Accept invite API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 