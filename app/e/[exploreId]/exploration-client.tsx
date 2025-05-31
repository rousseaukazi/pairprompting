'use client'

import { useState } from 'react'
import { DocumentView } from '@/components/exploration/document-view'
import { ChatPanel } from '@/components/exploration/chat-panel'
import { Button } from '@/components/ui/button'
import { Share2, Menu } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { toast } from 'sonner'
import type { Exploration } from '@/lib/supabase'

type ExplorationClientProps = {
  exploration: Exploration
  userId: string
}

export function ExplorationClient({ exploration, userId }: ExplorationClientProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [sharingLoading, setSharingLoading] = useState(false)

  const handlePushBlock = async (content: string) => {
    try {
      const response = await fetch('/api/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          explorationId: exploration.id,
          content,
          position: 0, // You could make this dynamic based on current blocks
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to push block')
      }

      // The document view will update automatically via real-time subscription
    } catch (error) {
      console.error('Error pushing block:', error)
      toast.error('Failed to push block')
    }
  }

  const handleShare = async () => {
    if (sharingLoading) return

    setSharingLoading(true)

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ explorationId: exploration.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate invite link')
      }

      const { token } = await response.json()
      const shareUrl = `${window.location.origin}/invite/${token}`
      
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Invite link copied to clipboard!')
    } catch (error) {
      console.error('Error generating invite:', error)
      toast.error('Failed to generate invite link')
    } finally {
      setSharingLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="font-semibold">{exploration.title}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={sharingLoading}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              {sharingLoading ? 'Generating...' : 'Share'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Document */}
        <div className={`w-full md:w-1/2 border-r ${showMobileMenu ? 'hidden md:block' : 'block'}`}>
          <DocumentView
            explorationId={exploration.id}
            title={exploration.title}
          />
        </div>

        {/* Right panel - Chat */}
        <div className={`w-full md:w-1/2 ${showMobileMenu ? 'block' : 'hidden md:block'}`}>
          <ChatPanel
            explorationId={exploration.id}
            onHighlight={handlePushBlock}
          />
        </div>
      </div>
    </div>
  )
} 