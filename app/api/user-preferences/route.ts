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
      .select('emoji_avatar, background_color, block_sort_order, display_name')
      .eq('user_id', userId)
      .single()

    if (error) {
      // If no preferences exist, create default ones
      const { data: newPrefs, error: createError } = await supabaseAdmin
        .from('user_preferences')
        .insert({
          user_id: userId,
          emoji_avatar: '😀',
          background_color: 'from-blue-50 to-purple-50',
          block_sort_order: 'reverse_chrono',
          display_name: null,
        })
        .select('emoji_avatar, background_color, block_sort_order, display_name')
        .single()

      if (createError) {
        console.error('Error creating user preferences:', createError)
        return NextResponse.json({ error: 'Failed to get preferences' }, { status: 500 })
      }

      return NextResponse.json({ 
        emoji_avatar: newPrefs.emoji_avatar,
        background_color: newPrefs.background_color,
        block_sort_order: newPrefs.block_sort_order,
        display_name: newPrefs.display_name
      })
    }

    return NextResponse.json({ 
      emoji_avatar: preferences.emoji_avatar,
      background_color: preferences.background_color || 'from-blue-50 to-purple-50',
      block_sort_order: preferences.block_sort_order || 'reverse_chrono',
      display_name: preferences.display_name
    })
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

    const { emoji_avatar, background_color, block_sort_order, display_name } = await request.json()

    if (!emoji_avatar && !background_color && !block_sort_order && display_name === undefined) {
      return NextResponse.json({ error: 'At least one preference is required' }, { status: 400 })
    }

    // Build the update object dynamically
    const updateData: any = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    }

    if (emoji_avatar) {
      updateData.emoji_avatar = emoji_avatar
    }

    if (background_color) {
      updateData.background_color = background_color
    }

    if (block_sort_order) {
      updateData.block_sort_order = block_sort_order
    }

    if (display_name !== undefined) {
      updateData.display_name = display_name
    }

    const { data: preferences, error } = await supabaseAdmin
      .from('user_preferences')
      .upsert(updateData)
      .select('emoji_avatar, background_color, block_sort_order, display_name')
      .single()

    if (error) {
      console.error('Error updating user preferences:', error)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({ 
      emoji_avatar: preferences.emoji_avatar,
      background_color: preferences.background_color,
      block_sort_order: preferences.block_sort_order,
      display_name: preferences.display_name
    })
  } catch (error) {
    console.error('User preferences API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 