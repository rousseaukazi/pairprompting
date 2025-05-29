import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkUsers } from '@/lib/clerk-users'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Invalid user IDs' }, { status: 400 })
    }

    // Get Clerk user info (names and emails)
    const clerkUsers = await getClerkUsers(userIds)

    // Get emoji avatars from user preferences
    const { data: preferences, error } = await supabaseAdmin
      .from('user_preferences')
      .select('user_id, emoji_avatar')
      .in('user_id', userIds)

    if (error) {
      console.error('Error fetching user preferences:', error)
    }

    // Combine the data
    const users = userIds.reduce((acc, userId) => {
      const clerkUser = clerkUsers[userId]
      const userPrefs = preferences?.find(p => p.user_id === userId)

      acc[userId] = {
        id: userId,
        fullName: clerkUser?.fullName || 'Unknown User',
        emojiAvatar: userPrefs?.emoji_avatar || '😀',
      }
      return acc
    }, {} as Record<string, { id: string; fullName: string; emojiAvatar: string }>)

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 