import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { InviteClient } from './invite-client'

async function getInviteInfo(token: string) {
  // First get the invite
  const { data: invite, error } = await supabaseAdmin
    .from('invites')
    .select('exploration_id, expires_at')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return null
  }

  // Check if invite has expired
  const now = new Date()
  const expiresAt = new Date(invite.expires_at)
  if (now > expiresAt) {
    return null
  }

  // Get exploration details
  const { data: exploration, error: explorationError } = await supabaseAdmin
    .from('explorations')
    .select('title, owner_id')
    .eq('id', invite.exploration_id)
    .single()

  if (explorationError || !exploration) {
    return null
  }

  return {
    explorationId: invite.exploration_id,
    title: exploration.title,
    ownerId: exploration.owner_id,
    expiresAt: invite.expires_at,
  }
}

export default async function InvitePage({ 
  params 
}: { 
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const inviteInfo = await getInviteInfo(token)
  
  if (!inviteInfo) {
    notFound()
  }

  const { userId } = await auth()

  // If user is authenticated, check if they're already a member
  if (userId) {
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('user_id')
      .eq('exploration_id', inviteInfo.explorationId)
      .eq('user_id', userId)
      .single()

    if (membership) {
      // User is already a member, redirect to exploration
      redirect(`/e/${inviteInfo.explorationId}`)
    }
  }

  return (
    <InviteClient
      token={token}
      inviteInfo={inviteInfo}
      isAuthenticated={!!userId}
    />
  )
} 