'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, User, Palette, Save, ArrowUp, ArrowDown } from 'lucide-react'
import { EmojiPicker } from '@/components/emoji-picker'
import { toast } from 'sonner'

type UserProfile = {
  fullName: string
  emojiAvatar: string
  backgroundColor: string
  blockSortOrder: 'chrono' | 'reverse_chrono'
}

type ProfileModalProps = {
  isOpen: boolean
  onClose: () => void
  isFirstTime?: boolean
}

const BACKGROUND_COLORS = [
  { name: 'Blue', value: 'from-blue-50 to-purple-50', border: 'border-blue-200' },
  { name: 'Green', value: 'from-green-50 to-emerald-50', border: 'border-green-200' },
  { name: 'Purple', value: 'from-purple-50 to-pink-50', border: 'border-purple-200' },
  { name: 'Orange', value: 'from-orange-50 to-red-50', border: 'border-orange-200' },
  { name: 'Teal', value: 'from-teal-50 to-cyan-50', border: 'border-teal-200' },
  { name: 'Rose', value: 'from-rose-50 to-pink-50', border: 'border-rose-200' },
  { name: 'Indigo', value: 'from-indigo-50 to-blue-50', border: 'border-indigo-200' },
  { name: 'Gray', value: 'from-gray-50 to-slate-50', border: 'border-gray-200' }
]

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
  '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏',
  '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
  '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
  '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨',
  '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱',
  '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '💩', '🤡', '👹', '👺', '👻',
  '👽', '👾', '🤖', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨',
  '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦉'
]

export function ProfileModal({ isOpen, onClose, isFirstTime = false }: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile>({
    fullName: '',
    emojiAvatar: '😀',
    backgroundColor: 'from-blue-50 to-purple-50',
    blockSortOrder: 'reverse_chrono'
  })
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Load current profile
  useEffect(() => {
    if (isOpen) {
      loadProfile()
    }
  }, [isOpen])

  const loadProfile = async () => {
    try {
      setInitialLoading(true)
      
      // Get user preferences
      const prefsResponse = await fetch('/api/user-preferences')
      let userPrefs = { 
        emoji_avatar: '😀', 
        background_color: 'from-blue-50 to-purple-50',
        block_sort_order: 'reverse_chrono' 
      }
      
      if (prefsResponse.ok) {
        userPrefs = await prefsResponse.json()
      }

      // Get user info from Clerk
      const userResponse = await fetch('/api/user-info')
      let userInfo = { fullName: 'User' }
      
      if (userResponse.ok) {
        userInfo = await userResponse.json()
      }

      setProfile({
        fullName: userInfo.fullName || 'User',
        emojiAvatar: userPrefs.emoji_avatar || '😀',
        backgroundColor: userPrefs.background_color || 'from-blue-50 to-purple-50',
        blockSortOrder: (userPrefs.block_sort_order as 'chrono' | 'reverse_chrono') || 'reverse_chrono'
      })
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile.fullName.trim()) {
      toast.error('Please enter your name')
      return
    }

    setLoading(true)
    
    try {
      // Update user preferences
      const prefsResponse = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emoji_avatar: profile.emojiAvatar,
          background_color: profile.backgroundColor,
          block_sort_order: profile.blockSortOrder,
        }),
      })

      if (!prefsResponse.ok) {
        throw new Error('Failed to update preferences')
      }

      // Note: Clerk doesn't allow updating user names via API, so we can only show success
      // In a real app, you might store the display name in your own database
      toast.success('Profile updated successfully!')
      onClose()
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setProfile(prev => ({ ...prev, emojiAvatar: emoji }))
    setShowEmojiPicker(false)
  }

  const handleBackgroundSelect = (bgColor: string) => {
    setProfile(prev => ({ ...prev, backgroundColor: bgColor }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={!isFirstTime ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {isFirstTime ? 'Welcome! Set up your profile' : 'Edit Profile'}
          </h2>
          {!isFirstTime && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {initialLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Preview */}
            <div className="text-center">
              <div className="relative inline-block">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`w-20 h-20 rounded-full mx-auto mb-2 flex items-center justify-center bg-gradient-to-br ${profile.backgroundColor} border-2 ${
                    BACKGROUND_COLORS.find(bg => bg.value === profile.backgroundColor)?.border || 'border-blue-200'
                  } hover:scale-105 transition-transform cursor-pointer`}
                  title="Click to change emoji"
                >
                  <span className="text-3xl">{profile.emojiAvatar}</span>
                </button>
              </div>
              <p className="font-medium text-gray-900">{profile.fullName || 'Your Name'}</p>
              <p className="text-xs text-gray-500 mt-1">Click avatar to change emoji</p>
            </div>

            {/* Emoji Picker Overlay */}
            {showEmojiPicker && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-[100]" 
                  onClick={() => setShowEmojiPicker(false)}
                />
                
                {/* Emoji Picker positioned in center of screen */}
                <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none">
                  <div className="pointer-events-auto bg-white border rounded-lg shadow-2xl p-4 w-80 max-h-[400px] flex flex-col">
                    <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b">
                      <span className="text-sm font-medium">Choose your emoji</span>
                      <button
                        onClick={() => setShowEmojiPicker(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Emoji Grid */}
                    <div className="flex-1 overflow-y-auto">
                      <div className="grid grid-cols-8 gap-2">
                        {EMOJI_LIST.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleEmojiSelect(emoji)}
                            className={`w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-lg transition-colors ${
                              emoji === profile.emojiAvatar ? 'bg-blue-100 ring-2 ring-blue-300' : ''
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Your Name
              </label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus={isFirstTime}
              />
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Palette className="w-4 h-4 inline mr-1" />
                Avatar Background
              </label>
              <div className="grid grid-cols-4 gap-3">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => handleBackgroundSelect(color.value)}
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${color.value} border-2 ${
                      profile.backgroundColor === color.value 
                        ? 'ring-2 ring-primary ring-offset-2' 
                        : color.border
                    } hover:scale-110 transition-transform`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Block Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Block Feed Order
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setProfile(prev => ({ ...prev, blockSortOrder: 'reverse_chrono' }))}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 transition-all ${
                    profile.blockSortOrder === 'reverse_chrono'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>Latest First</span>
                </button>
                <button
                  onClick={() => setProfile(prev => ({ ...prev, blockSortOrder: 'chrono' }))}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 transition-all ${
                    profile.blockSortOrder === 'chrono'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <ArrowDown className="w-4 h-4" />
                  <span>Oldest First</span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Choose how blocks appear in your document feed
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              {!isFirstTime && (
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button 
                onClick={handleSave} 
                disabled={loading || !profile.fullName.trim()}
                className={`gap-2 ${isFirstTime ? 'flex-1' : 'flex-1'}`}
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : isFirstTime ? 'Complete Setup' : 'Save Changes'}
              </Button>
            </div>

            {isFirstTime && (
              <p className="text-xs text-gray-500 text-center">
                You can always change these settings later
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 