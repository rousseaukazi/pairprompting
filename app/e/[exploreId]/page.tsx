import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { ExplorationClient } from './exploration-client'

async function getExploration(exploreId: string, userId: string) {
  // Get exploration details
  const { data: exploration } = await supabaseAdmin
    .from('explorations')
    .select('*')
    .eq('id', exploreId)
    .single()

  if (!exploration) {
    return null
  }

  // Check if user has access
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('role')
    .eq('exploration_id', exploreId)
    .eq('user_id', userId)
    .single()

  if (!membership) {
    return null
  }

  return { exploration, membership }
}

export default async function ExplorationPage({ 
  params 
}: { 
  params: Promise<{ exploreId: string }>
}) {
  const { userId } = await auth()
  
  if (!userId) {
    notFound()
  }

  const { exploreId } = await params
  const data = await getExploration(exploreId, userId)
  
  if (!data) {
    notFound()
  }

  return (
    <ExplorationClient
      exploration={data.exploration}
      userId={userId}
    />
  )
} 