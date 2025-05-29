import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { explorationId } = await request.json()
    
    if (!explorationId) {
      return NextResponse.json({ error: 'explorationId is required' }, { status: 400 })
    }

    console.log('🧪 Testing block push notifications for exploration:', explorationId)

    // Simulate creating a block
    const testBlock = {
      id: 'test-block-' + Date.now(),
      exploration_id: explorationId,
      author_id: userId,
      content: 'Test block for debugging notifications',
      position: 0,
      created_at: new Date().toISOString()
    }

    console.log('📝 Simulated block:', testBlock)

    // Get all users in this exploration for notifications (excluding current user)
    const { data: members } = await supabaseAdmin
      .from('memberships')
      .select('user_id, role')
      .eq('exploration_id', explorationId)
      .neq('user_id', userId)

    console.log('👥 Found members to notify:', members?.length || 0, members)

    if (!members || members.length === 0) {
      return NextResponse.json({ 
        message: 'No other members to notify',
        explorationId,
        currentUser: userId,
        members: members || []
      })
    }

    // Create test notifications
    const { data: notifications, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert(
        members.map(member => ({
          user_id: member.user_id,
          exploration_id: explorationId,
          block_id: testBlock.id,
          type: 'new_block',
          read: false,
        }))
      )
      .select('id, user_id, type')

    if (notifError) {
      console.error('❌ Error creating test notifications:', notifError)
      return NextResponse.json({ error: 'Failed to create notifications', details: notifError }, { status: 500 })
    }

    console.log('✅ Created test notifications:', notifications)

    // Trigger email notifications
    if (notifications && notifications.length > 0) {
      const notificationIds = notifications.map(n => n.id)
      
      console.log('📧 Triggering email notifications for IDs:', notificationIds)
      
      try {
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`,
          },
          body: JSON.stringify({ notificationIds }),
        })

        const emailResult = await emailResponse.json()
        console.log('📧 Email API result:', emailResult)

        return NextResponse.json({
          message: 'Test block push notifications completed',
          explorationId,
          currentUser: userId,
          members,
          notifications,
          emailResponse: {
            status: emailResponse.status,
            result: emailResult
          }
        })

      } catch (emailError) {
        console.error('❌ Email notification failed:', emailError)
        return NextResponse.json({
          message: 'Notifications created but email failed',
          explorationId,
          members,
          notifications,
          emailError: emailError instanceof Error ? emailError.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({ message: 'No notifications to send' })

  } catch (error) {
    console.error('❌ Test block push error:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 