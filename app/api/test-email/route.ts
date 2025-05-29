import { NextRequest, NextResponse } from 'next/server'
import { sendNotificationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Send a test email
    const result = await sendNotificationEmail({
      to: email,
      recipientName: 'Test User',
      senderName: 'Test Sender',
      senderEmoji: '🧪',
      explorationTitle: 'Test Exploration',
      explorationId: 'test-id',
      type: 'new_block',
      content: 'This is a test notification to verify email functionality is working.',
      blockId: 'test-block-id'
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully',
      result 
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 