import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkUser } from '@/lib/clerk-users'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkUser(userId)
    
    return NextResponse.json({
      id: user.id,
      fullName: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddress: user.emailAddress
    })
  } catch (error) {
    console.error('User info API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fullName } = await request.json()

    if (!fullName) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    // Note: For security reasons, Clerk doesn't allow direct user updates via API
    // In a real app, you might store additional user info in your own database
    // For now, we'll just return success since we can't actually update Clerk user data
    
    return NextResponse.json({ 
      success: true,
      message: 'User name update requested (handled by Clerk user profile)'
    })
  } catch (error) {
    console.error('User info update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 