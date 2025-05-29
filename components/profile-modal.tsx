'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, User, Palette, Save } from 'lucide-react'
import { EmojiPicker } from '@/components/emoji-picker'
import { toast } from 'sonner'

type UserProfile = {
  fullName: string
  emojiAvatar: string
  backgroundColor: string
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

export function ProfileModal({ isOpen, onClose, isFirstTime = false }: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile>({
    fullName: '',
    emojiAvatar: '😀',
    backgroundColor: 'from-blue-50 to-purple-50'
  })
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

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
      let userPrefs = { emoji_avatar: '😀', background_color: 'from-blue-50 to-purple-50' }
      
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
        backgroundColor: userPrefs.background_color || 'from-blue-50 to-purple-50'
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
        }),
      })

      // Update user name (if Clerk allows it)
      const nameResponse = await fetch('/api/user-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: profile.fullName,
        }),
      })

      if (prefsResponse.ok) {
        toast.success('Profile updated successfully!')
        onClose()
      } else {
        throw new Error('Failed to update preferences')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setProfile(prev => ({ ...prev, emojiAvatar: emoji }))
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
              <div className={`w-20 h-20 rounded-full mx-auto mb-2 flex items-center justify-center bg-gradient-to-br ${profile.backgroundColor} border-2 ${
                BACKGROUND_COLORS.find(bg => bg.value === profile.backgroundColor)?.border || 'border-blue-200'
              }`}>
                <span className="text-3xl">{profile.emojiAvatar}</span>
              </div>
              <p className="font-medium text-gray-900">{profile.fullName || 'Your Name'}</p>
            </div>

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

            {/* Emoji Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose Your Avatar
              </label>
              <div className="flex justify-center">
                <EmojiPicker
                  currentEmoji={profile.emojiAvatar}
                  onEmojiSelect={handleEmojiSelect}
                  size="lg"
                />
              </div>
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