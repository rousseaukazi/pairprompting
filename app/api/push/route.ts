import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🚀 Block push API called by user:', userId)

    const { explorationId, content, position } = await request.json()

    if (!explorationId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('📝 Creating block for exploration:', explorationId)

    // Verify user has access to this exploration
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('exploration_id', explorationId)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      console.log('❌ Access denied for user:', userId, 'to exploration:', explorationId)
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
      console.error('❌ Error creating block:', error)
      return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })
    }

    console.log('✅ Block created successfully:', block.id)

    // Get all users in this exploration for notifications
    const { data: members } = await supabaseAdmin
      .from('memberships')
      .select('user_id')
      .eq('exploration_id', explorationId)
      .neq('user_id', userId)

    console.log('👥 Found members to notify:', members?.length || 0)

    // Queue notifications for other members
    if (members && members.length > 0) {
      console.log('📢 Creating notifications for members...')
      
      const { data: notifications, error: notifError } = await supabaseAdmin
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
        .select('id')

      if (notifError) {
        console.error('❌ Error creating notifications:', notifError)
      } else if (notifications && notifications.length > 0) {
        console.log('✅ Created', notifications.length, 'notifications:', notifications.map(n => n.id))
        
        // Trigger email notifications in the background
        try {
          const notificationIds = notifications.map(n => n.id)
          const emailUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send`
          const authKey = process.env.INTERNAL_API_KEY || 'internal'
          
          console.log('📧 Triggering email notifications...')
          console.log('📧 Email URL:', emailUrl)
          console.log('📧 Notification IDs:', notificationIds)
          
          // Send emails asynchronously (don't wait for completion to avoid blocking the response)
          const emailPromise = fetch(emailUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authKey}`,
            },
            body: JSON.stringify({ notificationIds }),
          }).then(async (response) => {
            console.log('📧 Email API response status:', response.status)
            const result = await response.json()
            console.log('📧 Email API response:', result)
            return result
          }).catch(error => {
            console.error('❌ Failed to trigger email notifications:', error)
            throw error
          })

          // Don't await this in production, but let's log it for debugging
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Development mode: waiting for email result...')
            try {
              const emailResult = await emailPromise
              console.log('✅ Email notification result:', emailResult)
            } catch (emailError) {
              console.error('❌ Email notification failed:', emailError)
            }
          }
          
        } catch (error) {
          console.error('❌ Error triggering email notifications:', error)
        }
      } else {
        console.log('⚠️ No notifications created')
      }
    } else {
      console.log('👤 No other members to notify')
    }

    return NextResponse.json({ block })
  } catch (error) {
    console.error('❌ Push API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 