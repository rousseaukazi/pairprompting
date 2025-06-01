'use client'

import { useState, useEffect } from 'react'
import { DocumentView } from '@/components/exploration/document-view'
import { ChatPanel } from '@/components/exploration/chat-panel'
import { Button } from '@/components/ui/button'
import { Share2, Menu, ChevronDown } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ProfileModal } from '@/components/profile-modal'
import { UserAvatar } from '@/components/user-avatar'
import type { Exploration } from '@/lib/supabase'

type ExplorationClientProps = {
  exploration: Exploration
  userId: string
}

type ExplorationWithRole = Exploration & {
  role: string
}

export function ExplorationClient({ exploration, userId }: ExplorationClientProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [sharingLoading, setSharingLoading] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [userInfo, setUserInfo] = useState<{ fullName: string; emojiAvatar: string; backgroundColor?: string } | null>(null)
  const [showExplorationDropdown, setShowExplorationDropdown] = useState(false)
  const [userExplorations, setUserExplorations] = useState<ExplorationWithRole[]>([])
  const [profileUpdateKey, setProfileUpdateKey] = useState(0)
  const router = useRouter()

  // Load user info and preferences
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        // Get user preferences (includes display name)
        const prefsResponse = await fetch('/api/user-preferences')
        const prefsData = await prefsResponse.json()
        
        // Get user info from Clerk (for fallback)
        const userResponse = await fetch('/api/user-info')
        const userData = await userResponse.json()
        
        setUserInfo({
          fullName: prefsData.display_name || userData.fullName || 'User',
          emojiAvatar: prefsData.emoji_avatar || '😀',
          backgroundColor: prefsData.background_color
        })
      } catch (error) {
        console.error('Error loading user info:', error)
      }
    }

    loadUserInfo()
  }, [])

  // Load user explorations
  useEffect(() => {
    const loadExplorations = async () => {
      try {
        const response = await fetch('/api/explorations')
        if (response.ok) {
          const data = await response.json()
          setUserExplorations(data.explorations || [])
        }
      } catch (error) {
        console.error('Error loading explorations:', error)
      }
    }

    loadExplorations()
  }, [])

  // Handle click outside for exploration dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.exploration-dropdown')) {
        setShowExplorationDropdown(false)
      }
    }

    if (showExplorationDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showExplorationDropdown])

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

  const handleExplorationChange = (explorationId: string) => {
    setShowExplorationDropdown(false)
    router.push(`/e/${explorationId}`)
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
            
            {/* Exploration Dropdown */}
            <div className="relative exploration-dropdown">
              <button
                onClick={() => setShowExplorationDropdown(!showExplorationDropdown)}
                className="flex items-center gap-2 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-md transition-colors"
              >
                {exploration.title}
                <ChevronDown className={`w-4 h-4 transition-transform ${showExplorationDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showExplorationDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="py-2 max-h-80 overflow-y-auto">
                    {userExplorations.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">No explorations yet</div>
                    ) : (
                      userExplorations.map((exp) => (
                        <button
                          key={exp.id}
                          onClick={() => handleExplorationChange(exp.id)}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                            exp.id === exploration.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                          }`}
                        >
                          <div className="font-medium">{exp.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {exp.role === 'owner' ? 'Owner' : 'Member'}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {/* Profile button as emoji avatar */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="relative group"
              title="Profile"
            >
              <UserAvatar 
                user={userInfo} 
                size="md" 
                showName={false}
                isLoading={!userInfo}
                className="group-hover:scale-105 transition-transform"
              />
            </button>
            
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
            key={`doc-${profileUpdateKey}`}
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

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false)
          // Refresh user info after closing
          Promise.all([
            fetch('/api/user-preferences').then(r => r.json()),
            fetch('/api/user-info').then(r => r.json())
          ]).then(([prefsData, userData]) => {
            setUserInfo({
              fullName: prefsData.display_name || userData.fullName || 'User',
              emojiAvatar: prefsData.emoji_avatar || '😀',
              backgroundColor: prefsData.background_color
            })
            // Trigger DocumentView re-render to pick up new sort order
            setProfileUpdateKey(prev => prev + 1)
          }).catch(console.error)
        }}
      />
    </div>
  )
} 