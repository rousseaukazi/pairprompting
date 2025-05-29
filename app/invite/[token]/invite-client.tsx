'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignedIn, SignedOut, SignUpButton, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Users, Clock, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

type InviteInfo = {
  explorationId: string
  title: string
  ownerId: string
  expiresAt: string
}

type InviteClientProps = {
  token: string
  inviteInfo: InviteInfo
  isAuthenticated: boolean
}

export function InviteClient({ token, inviteInfo, isAuthenticated }: InviteClientProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAcceptInvite = async () => {
    if (loading) return

    setLoading(true)

    try {
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept invite')
      }

      const { explorationId, alreadyMember } = await response.json()
      
      if (alreadyMember) {
        toast.success('Welcome back! Redirecting to exploration...')
      } else {
        toast.success('Successfully joined exploration!')
      }
      
      router.push(`/e/${explorationId}`)
    } catch (error) {
      console.error('Error accepting invite:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to accept invite')
      setLoading(false)
    }
  }

  const formatExpiresAt = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 0) return 'Expired'
    if (diffDays === 1) return 'Expires in 1 day'
    return `Expires in ${diffDays} days`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're Invited!
          </h1>
          <p className="text-gray-600">
            Join this collaborative AI exploration
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-lg mb-2">{inviteInfo.title}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Clock className="w-4 h-4" />
            <span>{formatExpiresAt(inviteInfo.expiresAt)}</span>
          </div>
          <p className="text-sm text-gray-600">
            Explore topics with AI and share insights with your collaborators
          </p>
        </div>

        <SignedOut>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center mb-4">
              Sign up or sign in to join this exploration
            </p>
            <SignUpButton mode="modal">
              <Button className="w-full" size="lg">
                Sign Up to Join
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button variant="outline" className="w-full" size="lg">
                Sign In
              </Button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <Button
            onClick={handleAcceptInvite}
            disabled={loading}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? (
              'Joining...'
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Join Exploration
              </>
            )}
          </Button>
        </SignedIn>

        <div className="mt-6 pt-6 border-t">
          <p className="text-xs text-gray-500 text-center">
            By joining, you'll be able to chat with AI and collaborate on shared insights
          </p>
        </div>
      </div>
    </div>
  )
} 