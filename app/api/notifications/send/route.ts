import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getClerkUsers } from '@/lib/clerk-users'
import { sendBulkNotificationEmails, NotificationEmailData } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Email notification send API called')
    
    // Check for internal API key (for server-to-server calls)
    const authHeader = request.headers.get('authorization')
    const isInternalCall = authHeader === `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`
    
    console.log('🔐 Is internal call:', isInternalCall)
    
    // If not an internal call, require user authentication
    if (!isInternalCall) {
      const { userId } = await auth()
      
      if (!userId) {
        console.log('❌ Unauthorized: no userId')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      console.log('👤 Authenticated user:', userId)
    }

    const { notificationIds } = await request.json()
    console.log('📋 Processing notification IDs:', notificationIds)

    if (!notificationIds || !Array.isArray(notificationIds)) {
      console.log('❌ Invalid notification IDs')
      return NextResponse.json({ error: 'Notification IDs are required' }, { status: 400 })
    }

    // Get notifications with related data
    console.log('🔍 Fetching notifications from database...')
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select(`
        *,
        explorations (title),
        blocks (content, author_id)
      `)
      .in('id', notificationIds)
      .eq('read', false)

    if (error) {
      console.error('❌ Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    console.log('📝 Found notifications:', notifications?.length || 0)
    notifications?.forEach((notif, index) => {
      console.log(`  ${index + 1}. Type: ${notif.type}, User: ${notif.user_id}, Block: ${notif.block_id}`)
    })

    if (!notifications || notifications.length === 0) {
      console.log('⚠️ No notifications to send')
      return NextResponse.json({ message: 'No notifications to send' })
    }

    // For comment notifications, we need to get the comment content
    const commentNotifications = notifications.filter(n => n.type === 'new_comment')
    let comments: any[] = []
    
    if (commentNotifications.length > 0) {
      console.log('💬 Fetching comment data for', commentNotifications.length, 'notifications')
      const { data: commentsData } = await supabaseAdmin
        .from('comments')
        .select('id, content, author_id, block_id, created_at')
        .in('block_id', commentNotifications.map(n => n.block_id))
        .order('created_at', { ascending: false })

      comments = commentsData || []
      console.log('💬 Found comments:', comments.length)
    }

    // Get all unique user IDs (recipients and senders)
    const allUserIds = new Set<string>()
    notifications.forEach(notification => {
      allUserIds.add(notification.user_id) // recipient
      if (notification.type === 'new_block') {
        allUserIds.add(notification.blocks?.author_id) // block author
      } else if (notification.type === 'new_comment') {
        // For comments, find the latest comment for this block
        const latestComment = comments.find(c => c.block_id === notification.block_id)
        if (latestComment) {
          allUserIds.add(latestComment.author_id) // comment author
        }
      }
    })

    console.log('👥 Getting user data for user IDs:', Array.from(allUserIds))

    // Get user information
    const clerkUsers = await getClerkUsers(Array.from(allUserIds))
    console.log('📧 Clerk users retrieved:')
    Object.entries(clerkUsers).forEach(([userId, user]) => {
      console.log(`  ${userId}: ${user.fullName} (${user.emailAddress || 'NO EMAIL'})`)
    })

    // Get user preferences (emoji avatars)
    const { data: preferences } = await supabaseAdmin
      .from('user_preferences')
      .select('user_id, emoji_avatar')
      .in('user_id', Array.from(allUserIds))

    const userPrefs = preferences?.reduce((acc, pref) => {
      acc[pref.user_id] = pref
      return acc
    }, {} as Record<string, any>) || {}

    console.log('⚙️ User preferences loaded:', Object.keys(userPrefs).length, 'users')

    // Prepare email data
    const emailNotifications: NotificationEmailData[] = notifications.map(notification => {
      const recipient = clerkUsers[notification.user_id]
      
      let sender, content, senderPrefs
      
      if (notification.type === 'new_block') {
        sender = clerkUsers[notification.blocks?.author_id]
        senderPrefs = userPrefs[notification.blocks?.author_id]
        content = notification.blocks?.content || ''
      } else if (notification.type === 'new_comment') {
        // Find the latest comment for this block
        const latestComment = comments.find(c => c.block_id === notification.block_id)
        if (latestComment) {
          sender = clerkUsers[latestComment.author_id]
          senderPrefs = userPrefs[latestComment.author_id]
          content = latestComment.content
        }
      }

      const emailData = {
        to: recipient?.emailAddress || '',
        recipientName: recipient?.fullName || 'User',
        senderName: sender?.fullName || 'Someone',
        senderEmoji: senderPrefs?.emoji_avatar || '😀',
        explorationTitle: notification.explorations?.title || 'Exploration',
        explorationId: notification.exploration_id,
        type: notification.type as 'new_block' | 'new_comment',
        content: content || '',
        blockId: notification.block_id
      }

      console.log(`📧 Email prepared: ${emailData.to} (${emailData.type})`)
      return emailData
    }).filter(email => {
      const hasEmail = !!email.to
      if (!hasEmail) {
        console.log(`⚠️ Skipping email - no email address for recipient: ${email.recipientName}`)
      }
      return hasEmail
    })

    console.log('📮 Final email count:', emailNotifications.length)

    if (emailNotifications.length === 0) {
      console.log('❌ No valid email addresses found')
      return NextResponse.json({ message: 'No valid email addresses found' })
    }

    // Send emails
    console.log('📬 Sending emails...')
    const results = await sendBulkNotificationEmails(emailNotifications)
    console.log('✅ Email results:', results)

    // Mark notifications as processed
    await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .in('id', notificationIds)

    console.log('✅ Marked notifications as read')

    return NextResponse.json({
      message: 'Notifications processed',
      successful: results.successful,
      failed: results.failed,
      total: emailNotifications.length,
      debug: {
        notificationIds,
        notificationsFound: notifications.length,
        usersProcessed: Array.from(allUserIds).length,
        emailsPrepared: emailNotifications.length,
        emailAddresses: emailNotifications.map(e => e.to)
      }
    })

  } catch (error) {
    console.error('❌ Send notifications API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 