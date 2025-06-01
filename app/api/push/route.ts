import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getClerkUsers } from '@/lib/clerk-users'
import { sendBulkNotificationEmails, NotificationEmailData } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🚀 Block push API called by user:', userId)

    const { explorationId, content, context, position } = await request.json()

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

    // Get the current highest position to determine the next position
    const { data: lastBlock } = await supabaseAdmin
      .from('blocks')
      .select('position')
      .eq('exploration_id', explorationId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = lastBlock ? lastBlock.position + 1 : 0

    // Create the block
    const { data: block, error } = await supabaseAdmin
      .from('blocks')
      .insert({
        exploration_id: explorationId,
        author_id: userId,
        content,
        context,
        position: nextPosition,
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
        
        // Send email notifications directly instead of making API call
        try {
          console.log('📧 Processing email notifications directly...')
          
          // Get notifications with related data (same as notification send API)
          const { data: fullNotifications, error: fetchError } = await supabaseAdmin
            .from('notifications')
            .select(`
              *,
              explorations (title),
              blocks (content, author_id)
            `)
            .in('id', notifications.map(n => n.id))
            .eq('read', false)

          if (fetchError) {
            console.error('❌ Error fetching notification details:', fetchError)
            return NextResponse.json({ block })
          }

          if (!fullNotifications || fullNotifications.length === 0) {
            console.log('⚠️ No notification details found')
            return NextResponse.json({ block })
          }

          // Get all unique user IDs (recipients and senders)
          const allUserIds = new Set<string>()
          fullNotifications.forEach(notification => {
            allUserIds.add(notification.user_id) // recipient
            if (notification.blocks?.author_id) {
              allUserIds.add(notification.blocks.author_id) // block author
            }
          })

          console.log('👥 Getting user data for:', Array.from(allUserIds))

          // Get user information
          const clerkUsers = await getClerkUsers(Array.from(allUserIds))
          
          // Get user preferences (emoji avatars)
          const { data: preferences } = await supabaseAdmin
            .from('user_preferences')
            .select('user_id, emoji_avatar')
            .in('user_id', Array.from(allUserIds))

          const userPrefs = preferences?.reduce((acc, pref) => {
            acc[pref.user_id] = pref
            return acc
          }, {} as Record<string, any>) || {}

          // Prepare email data
          const emailNotifications: NotificationEmailData[] = fullNotifications.map(notification => {
            const recipient = clerkUsers[notification.user_id]
            const sender = clerkUsers[notification.blocks?.author_id]
            const senderPrefs = userPrefs[notification.blocks?.author_id]

            return {
              to: recipient?.emailAddress || '',
              recipientName: recipient?.fullName || 'User',
              senderName: sender?.fullName || 'Someone',
              senderEmoji: senderPrefs?.emoji_avatar || '😀',
              explorationTitle: notification.explorations?.title || 'Exploration',
              explorationId: notification.exploration_id,
              type: 'new_block' as const,
              content: notification.blocks?.content || '',
              blockId: notification.block_id
            }
          }).filter(email => {
            const hasEmail = !!email.to
            if (!hasEmail) {
              console.log(`⚠️ Skipping email - no email address for recipient: ${email.recipientName}`)
            }
            return hasEmail
          })

          console.log('📮 Prepared', emailNotifications.length, 'emails')

          if (emailNotifications.length > 0) {
            // Send emails directly
            const results = await sendBulkNotificationEmails(emailNotifications)
            console.log('✅ Email results:', results)

            // Mark notifications as processed
            await supabaseAdmin
              .from('notifications')
              .update({ read: true })
              .in('id', notifications.map(n => n.id))
          }

        } catch (error) {
          console.error('❌ Error sending email notifications:', error)
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