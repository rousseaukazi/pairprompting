import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: preferences, error } = await supabaseAdmin
      .from('user_preferences')
      .select('emoji_avatar')
      .eq('user_id', userId)
      .single()

    if (error) {
      // If no preferences exist, create default ones
      const { data: newPrefs, error: createError } = await supabaseAdmin
        .from('user_preferences')
        .insert({
          user_id: userId,
          emoji_avatar: '😀',
        })
        .select('emoji_avatar')
        .single()

      if (createError) {
        console.error('Error creating user preferences:', createError)
        return NextResponse.json({ error: 'Failed to get preferences' }, { status: 500 })
      }

      return NextResponse.json({ emoji_avatar: newPrefs.emoji_avatar })
    }

    return NextResponse.json({ emoji_avatar: preferences.emoji_avatar })
  } catch (error) {
    console.error('User preferences API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { emoji_avatar } = await request.json()

    if (!emoji_avatar) {
      return NextResponse.json({ error: 'Emoji avatar is required' }, { status: 400 })
    }

    const { data: preferences, error } = await supabaseAdmin
      .from('user_preferences')
      .upsert({
        user_id: userId,
        emoji_avatar,
        updated_at: new Date().toISOString(),
      })
      .select('emoji_avatar')
      .single()

    if (error) {
      console.error('Error updating user preferences:', error)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({ emoji_avatar: preferences.emoji_avatar })
  } catch (error) {
    console.error('User preferences API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 