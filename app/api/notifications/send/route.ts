import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getClerkUsers } from '@/lib/clerk-users'
import { sendBulkNotificationEmails, NotificationEmailData } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Check for internal API key (for server-to-server calls)
    const authHeader = request.headers.get('authorization')
    const isInternalCall = authHeader === `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`
    
    // If not an internal call, require user authentication
    if (!isInternalCall) {
      const { userId } = await auth()
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const { notificationIds } = await request.json()

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'Notification IDs are required' }, { status: 400 })
    }

    // Get notifications with related data
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
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: 'No notifications to send' })
    }

    // For comment notifications, we need to get the comment content
    const commentNotifications = notifications.filter(n => n.type === 'new_comment')
    let comments: any[] = []
    
    if (commentNotifications.length > 0) {
      const { data: commentsData } = await supabaseAdmin
        .from('comments')
        .select('id, content, author_id, block_id, created_at')
        .in('block_id', commentNotifications.map(n => n.block_id))
        .order('created_at', { ascending: false })

      comments = commentsData || []
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

      return {
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
    }).filter(email => email.to) // Only send to users with valid email addresses

    if (emailNotifications.length === 0) {
      return NextResponse.json({ message: 'No valid email addresses found' })
    }

    // Send emails
    const results = await sendBulkNotificationEmails(emailNotifications)

    // Mark notifications as processed (optional - you might want to track email status)
    await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .in('id', notificationIds)

    return NextResponse.json({
      message: 'Notifications processed',
      successful: results.successful,
      failed: results.failed,
      total: emailNotifications.length
    })

  } catch (error) {
    console.error('Send notifications API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 