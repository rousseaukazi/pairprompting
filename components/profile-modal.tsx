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

const EMOJI_DATA = [
  // Faces & Emotions
  { emoji: '😀', keywords: ['happy', 'smile', 'face', 'joy', 'grin'] },
  { emoji: '😃', keywords: ['happy', 'smile', 'face', 'joy', 'grin', 'open'] },
  { emoji: '😄', keywords: ['happy', 'smile', 'face', 'joy', 'grin', 'eyes'] },
  { emoji: '😁', keywords: ['happy', 'smile', 'face', 'joy', 'grin', 'teeth'] },
  { emoji: '😆', keywords: ['happy', 'laugh', 'smile', 'face', 'joy'] },
  { emoji: '😅', keywords: ['happy', 'laugh', 'smile', 'face', 'sweat', 'nervous'] },
  { emoji: '🤣', keywords: ['laugh', 'happy', 'joy', 'tears', 'rolling', 'lol', 'rofl'] },
  { emoji: '😂', keywords: ['laugh', 'happy', 'joy', 'tears', 'cry', 'lol'] },
  { emoji: '🙂', keywords: ['smile', 'happy', 'face', 'slight'] },
  { emoji: '🙃', keywords: ['smile', 'face', 'upside', 'down', 'silly'] },
  { emoji: '😉', keywords: ['wink', 'face', 'flirt', 'playful'] },
  { emoji: '😊', keywords: ['smile', 'happy', 'face', 'blush', 'shy'] },
  { emoji: '😇', keywords: ['smile', 'face', 'angel', 'innocent', 'halo'] },
  { emoji: '🥰', keywords: ['love', 'heart', 'face', 'smile', 'hearts', 'adore'] },
  { emoji: '😍', keywords: ['love', 'heart', 'face', 'eyes', 'star', 'crush'] },
  { emoji: '🤩', keywords: ['excited', 'star', 'eyes', 'face', 'wow', 'amazing'] },
  { emoji: '😘', keywords: ['kiss', 'love', 'face', 'heart', 'blow', 'xoxo'] },
  { emoji: '😗', keywords: ['kiss', 'face', 'whistle', 'pucker'] },
  { emoji: '😚', keywords: ['kiss', 'face', 'closed', 'eyes'] },
  { emoji: '😙', keywords: ['kiss', 'face', 'smile', 'slight'] },
  { emoji: '😋', keywords: ['yummy', 'tongue', 'face', 'delicious', 'taste', 'food'] },
  { emoji: '😛', keywords: ['tongue', 'face', 'playful', 'silly'] },
  { emoji: '😜', keywords: ['tongue', 'face', 'wink', 'playful', 'silly', 'joke'] },
  { emoji: '🤪', keywords: ['crazy', 'wild', 'face', 'silly', 'goofy', 'weird'] },
  { emoji: '😝', keywords: ['tongue', 'face', 'closed', 'eyes', 'silly'] },
  { emoji: '🤑', keywords: ['money', 'face', 'dollar', 'rich', 'greedy', 'cash'] },
  { emoji: '🤗', keywords: ['hug', 'face', 'hands', 'embrace', 'warm', 'hugs'] },
  { emoji: '🤭', keywords: ['face', 'hand', 'cover', 'mouth', 'giggle', 'oops'] },
  { emoji: '🤫', keywords: ['quiet', 'face', 'finger', 'lips', 'shush', 'shh', 'secret'] },
  { emoji: '🤔', keywords: ['thinking', 'face', 'hand', 'chin', 'consider', 'hmm'] },
  { emoji: '🤐', keywords: ['quiet', 'face', 'zipper', 'mouth', 'sealed', 'lips'] },
  { emoji: '🤨', keywords: ['face', 'eyebrow', 'suspicious', 'skeptical', 'doubt'] },
  { emoji: '😐', keywords: ['face', 'neutral', 'blank', 'expressionless', 'meh'] },
  { emoji: '😑', keywords: ['face', 'expressionless', 'blank', 'meh', 'annoyed'] },
  { emoji: '😶', keywords: ['face', 'quiet', 'silent', 'mouth', 'no', 'speechless'] },
  { emoji: '😏', keywords: ['face', 'smirk', 'sly', 'smug', 'knowing'] },
  { emoji: '😒', keywords: ['face', 'unamused', 'unhappy', 'meh', 'annoyed'] },
  { emoji: '🙄', keywords: ['face', 'eyes', 'roll', 'annoyed', 'frustrated'] },
  { emoji: '😬', keywords: ['face', 'grimace', 'awkward', 'nervous', 'teeth', 'cringe'] },
  { emoji: '🤥', keywords: ['face', 'lie', 'pinocchio', 'nose', 'dishonest'] },
  { emoji: '😌', keywords: ['face', 'relieved', 'peaceful', 'content', 'calm'] },
  { emoji: '😔', keywords: ['face', 'sad', 'dejected', 'sorry', 'pensive'] },
  { emoji: '😪', keywords: ['face', 'sleepy', 'tired', 'yawn', 'exhausted'] },
  { emoji: '🤤', keywords: ['face', 'drool', 'sleep', 'saliva', 'dream', 'hungry'] },
  { emoji: '😴', keywords: ['face', 'sleep', 'tired', 'zzz', 'snore'] },
  { emoji: '😷', keywords: ['face', 'mask', 'sick', 'doctor', 'medical', 'covid'] },
  { emoji: '🤒', keywords: ['face', 'sick', 'thermometer', 'fever', 'ill'] },
  { emoji: '🤕', keywords: ['face', 'hurt', 'bandage', 'injured', 'head'] },
  { emoji: '🤢', keywords: ['face', 'sick', 'nausea', 'green', 'disgusted'] },
  { emoji: '🤮', keywords: ['face', 'sick', 'vomit', 'throw', 'up', 'puke'] },
  { emoji: '🤧', keywords: ['face', 'sick', 'sneeze', 'tissue', 'cold', 'achoo'] },
  { emoji: '🥵', keywords: ['face', 'hot', 'heat', 'sweat', 'temperature', 'warm'] },
  { emoji: '🥶', keywords: ['face', 'cold', 'freeze', 'blue', 'temperature', 'frozen'] },
  { emoji: '🥴', keywords: ['face', 'woozy', 'drunk', 'dizzy', 'confused'] },
  { emoji: '😵', keywords: ['face', 'dizzy', 'unconscious', 'confused', 'spiral'] },
  { emoji: '🤯', keywords: ['face', 'mind', 'blown', 'explosion', 'shocked', 'explode'] },
  { emoji: '🤠', keywords: ['face', 'cowboy', 'hat', 'western', 'country', 'yeehaw'] },
  { emoji: '🥳', keywords: ['face', 'party', 'celebrate', 'hat', 'birthday', 'fun'] },
  { emoji: '😎', keywords: ['face', 'cool', 'sunglasses', 'awesome', 'confident'] },
  { emoji: '🤓', keywords: ['face', 'nerd', 'glasses', 'smart', 'geek', 'study'] },
  { emoji: '🧐', keywords: ['face', 'monocle', 'curious', 'inspect', 'examine'] },
  { emoji: '😕', keywords: ['face', 'confused', 'sad', 'disappointed', 'frown'] },
  { emoji: '😟', keywords: ['face', 'worried', 'concerned', 'anxious', 'sad'] },
  { emoji: '🙁', keywords: ['face', 'sad', 'frown', 'disappointed', 'unhappy'] },
  { emoji: '😮', keywords: ['face', 'surprised', 'shocked', 'gasp', 'open', 'oh'] },
  { emoji: '😯', keywords: ['face', 'surprised', 'hushed', 'shocked', 'quiet'] },
  { emoji: '😲', keywords: ['face', 'surprised', 'shocked', 'astonished', 'amazed'] },
  { emoji: '😳', keywords: ['face', 'flushed', 'embarrassed', 'shy', 'surprised', 'blush'] },
  { emoji: '🥺', keywords: ['face', 'pleading', 'puppy', 'dog', 'eyes', 'cute', 'please'] },
  { emoji: '😦', keywords: ['face', 'frowning', 'open', 'mouth', 'surprised'] },
  { emoji: '😧', keywords: ['face', 'anguished', 'surprised', 'shocked', 'worried'] },
  { emoji: '😨', keywords: ['face', 'fearful', 'scared', 'surprised', 'shocked'] },
  { emoji: '😰', keywords: ['face', 'anxious', 'sweat', 'nervous', 'worried'] },
  { emoji: '😥', keywords: ['face', 'sad', 'relieved', 'disappointed', 'sweat'] },
  { emoji: '😢', keywords: ['face', 'sad', 'cry', 'tear', 'unhappy'] },
  { emoji: '😭', keywords: ['face', 'cry', 'sob', 'tears', 'bawling', 'sad'] },
  { emoji: '😱', keywords: ['face', 'scream', 'fear', 'scared', 'shocked', 'horror'] },
  { emoji: '😖', keywords: ['face', 'confounded', 'frustrated', 'confused', 'x'] },
  { emoji: '😣', keywords: ['face', 'persevering', 'struggling', 'effort', 'hard'] },
  { emoji: '😞', keywords: ['face', 'disappointed', 'sad', 'dejected', 'let', 'down'] },
  { emoji: '😓', keywords: ['face', 'downcast', 'sweat', 'cold', 'disappointed'] },
  { emoji: '😩', keywords: ['face', 'weary', 'tired', 'frustrated', 'fed', 'up'] },
  { emoji: '😫', keywords: ['face', 'tired', 'frustrated', 'fed', 'up', 'exhausted'] },
  { emoji: '🥱', keywords: ['face', 'yawn', 'tired', 'sleepy', 'bored'] },
  { emoji: '😤', keywords: ['face', 'huffing', 'angry', 'frustrated', 'steaming', 'triumph'] },
  { emoji: '😡', keywords: ['face', 'angry', 'mad', 'red', 'furious', 'rage'] },
  { emoji: '😠', keywords: ['face', 'angry', 'mad', 'frustrated', 'grumpy'] },
  { emoji: '🤬', keywords: ['face', 'swearing', 'cursing', 'angry', 'symbols', 'swear'] },
  { emoji: '😈', keywords: ['face', 'devil', 'evil', 'purple', 'horns', 'smile'] },
  { emoji: '👿', keywords: ['face', 'devil', 'angry', 'imp', 'red', 'horns'] },
  { emoji: '💀', keywords: ['skull', 'death', 'dead', 'bones', 'scary', 'skeleton'] },
  { emoji: '💩', keywords: ['poop', 'pile', 'brown', 'smiling', 'funny', 'poo'] },
  { emoji: '🤡', keywords: ['clown', 'face', 'funny', 'circus', 'joke'] },
  { emoji: '👹', keywords: ['ogre', 'monster', 'red', 'mask', 'scary', 'japanese'] },
  { emoji: '👺', keywords: ['goblin', 'red', 'mask', 'angry', 'japanese', 'tengu'] },
  { emoji: '👻', keywords: ['ghost', 'spirit', 'halloween', 'boo', 'white', 'spooky'] },
  { emoji: '👽', keywords: ['alien', 'ufo', 'extraterrestrial', 'space', 'green'] },
  { emoji: '👾', keywords: ['alien', 'monster', 'game', 'invader', 'pixel', 'arcade'] },
  { emoji: '🤖', keywords: ['robot', 'face', 'machine', 'artificial', 'intelligence', 'ai'] },
  { emoji: '😺', keywords: ['cat', 'happy', 'smile', 'face', 'grinning'] },
  { emoji: '😸', keywords: ['cat', 'happy', 'smile', 'face', 'grin', 'joy'] },
  { emoji: '😹', keywords: ['cat', 'happy', 'tears', 'joy', 'laugh'] },
  { emoji: '😻', keywords: ['cat', 'love', 'heart', 'eyes', 'smitten'] },
  { emoji: '😼', keywords: ['cat', 'wry', 'smirk', 'ironic', 'smile'] },
  { emoji: '😽', keywords: ['cat', 'kiss', 'lips', 'face'] },
  { emoji: '🙀', keywords: ['cat', 'weary', 'surprised', 'shocked', 'scream'] },
  { emoji: '😿', keywords: ['cat', 'crying', 'tear', 'sad', 'face'] },
  { emoji: '😾', keywords: ['cat', 'pouting', 'grumpy', 'angry', 'face'] },
  
  // People & Body
  { emoji: '👋', keywords: ['hand', 'wave', 'hello', 'goodbye', 'hi', 'bye'] },
  { emoji: '🤚', keywords: ['hand', 'raised', 'back', 'stop', 'high', 'five'] },
  { emoji: '🖐', keywords: ['hand', 'fingers', 'splayed', 'five', 'stop'] },
  { emoji: '✋', keywords: ['hand', 'raised', 'stop', 'high', 'five'] },
  { emoji: '🖖', keywords: ['vulcan', 'salute', 'spock', 'star', 'trek'] },
  { emoji: '👌', keywords: ['ok', 'okay', 'perfect', 'hand', 'sign'] },
  { emoji: '🤌', keywords: ['pinched', 'fingers', 'italian', 'hand', 'gesture'] },
  { emoji: '✌️', keywords: ['victory', 'peace', 'hand', 'sign', 'two'] },
  { emoji: '🤞', keywords: ['fingers', 'crossed', 'luck', 'hope', 'wish'] },
  { emoji: '🤟', keywords: ['love', 'you', 'hand', 'sign', 'ily'] },
  { emoji: '🤘', keywords: ['rock', 'on', 'horns', 'hand', 'metal'] },
  { emoji: '🤙', keywords: ['call', 'me', 'hand', 'shaka', 'hang', 'loose'] },
  { emoji: '👈', keywords: ['point', 'left', 'hand', 'finger', 'direction'] },
  { emoji: '👉', keywords: ['point', 'right', 'hand', 'finger', 'direction'] },
  { emoji: '👆', keywords: ['point', 'up', 'hand', 'finger', 'direction'] },
  { emoji: '🖕', keywords: ['middle', 'finger', 'hand', 'flip', 'off'] },
  { emoji: '👇', keywords: ['point', 'down', 'hand', 'finger', 'direction'] },
  { emoji: '☝️', keywords: ['point', 'up', 'hand', 'finger', 'one'] },
  { emoji: '👍', keywords: ['thumbs', 'up', 'good', 'yes', 'approve', 'like'] },
  { emoji: '👎', keywords: ['thumbs', 'down', 'bad', 'no', 'disapprove', 'dislike'] },
  { emoji: '✊', keywords: ['fist', 'raised', 'power', 'strength', 'punch'] },
  { emoji: '👊', keywords: ['fist', 'bump', 'punch', 'attack', 'hit'] },
  { emoji: '🤛', keywords: ['fist', 'left', 'bump', 'punch'] },
  { emoji: '🤜', keywords: ['fist', 'right', 'bump', 'punch'] },
  { emoji: '👏', keywords: ['clap', 'hands', 'applause', 'congratulations', 'bravo'] },
  { emoji: '🙌', keywords: ['raise', 'hands', 'celebration', 'hooray', 'praise'] },
  { emoji: '👐', keywords: ['open', 'hands', 'hug', 'jazz', 'hands'] },
  { emoji: '🤲', keywords: ['palms', 'up', 'prayer', 'cupped', 'hands'] },
  { emoji: '🤝', keywords: ['handshake', 'deal', 'agreement', 'meeting'] },
  { emoji: '🙏', keywords: ['pray', 'hands', 'please', 'hope', 'thanks', 'namaste'] },
  { emoji: '💪', keywords: ['muscle', 'flex', 'strong', 'arm', 'power', 'gym'] },
  { emoji: '🦾', keywords: ['mechanical', 'arm', 'prosthetic', 'strong', 'robot'] },
  { emoji: '🦿', keywords: ['mechanical', 'leg', 'prosthetic', 'robot'] },
  { emoji: '🦵', keywords: ['leg', 'kick', 'limb', 'body'] },
  { emoji: '🦶', keywords: ['foot', 'kick', 'stomp', 'body'] },
  { emoji: '👂', keywords: ['ear', 'hear', 'listen', 'sound', 'body'] },
  { emoji: '🦻', keywords: ['ear', 'hearing', 'aid', 'accessibility', 'deaf'] },
  { emoji: '👃', keywords: ['nose', 'smell', 'sniff', 'body', 'face'] },
  { emoji: '🧠', keywords: ['brain', 'smart', 'intelligent', 'think', 'mind'] },
  { emoji: '🫀', keywords: ['heart', 'organ', 'anatomical', 'cardio', 'body'] },
  { emoji: '🫁', keywords: ['lungs', 'breathe', 'organ', 'respiratory', 'body'] },
  { emoji: '🦷', keywords: ['tooth', 'teeth', 'dental', 'dentist', 'mouth'] },
  { emoji: '🦴', keywords: ['bone', 'skeleton', 'body', 'skull'] },
  { emoji: '👀', keywords: ['eyes', 'look', 'see', 'watch', 'stare'] },
  { emoji: '👁', keywords: ['eye', 'look', 'see', 'watch', 'single'] },
  { emoji: '👅', keywords: ['tongue', 'taste', 'lick', 'mouth', 'out'] },
  { emoji: '👄', keywords: ['mouth', 'lips', 'kiss', 'speak', 'talk'] },
  { emoji: '🫦', keywords: ['bite', 'lip', 'nervous', 'flirt', 'sexy'] },
  
  // Add more categories following the same pattern...
  // For brevity, I'll add just a few more examples from other categories
  
  // Animals
  { emoji: '🐶', keywords: ['dog', 'puppy', 'pet', 'animal', 'cute', 'face'] },
  { emoji: '🐱', keywords: ['cat', 'kitten', 'pet', 'animal', 'cute', 'face'] },
  { emoji: '🦊', keywords: ['fox', 'animal', 'nature', 'face', 'clever'] },
  { emoji: '🐻', keywords: ['bear', 'animal', 'nature', 'face', 'teddy'] },
  { emoji: '🐼', keywords: ['panda', 'animal', 'nature', 'china', 'cute'] },
  
  // Food
  { emoji: '🍕', keywords: ['pizza', 'food', 'italian', 'cheese', 'slice'] },
  { emoji: '🍔', keywords: ['burger', 'food', 'hamburger', 'fast', 'food'] },
  { emoji: '🍟', keywords: ['fries', 'food', 'french', 'fast', 'food'] },
  { emoji: '🌮', keywords: ['taco', 'food', 'mexican', 'meat'] },
  { emoji: '☕', keywords: ['coffee', 'drink', 'hot', 'caffeine', 'morning'] },
  
  // Objects & Activities
  { emoji: '⚽', keywords: ['soccer', 'ball', 'football', 'sport', 'game'] },
  { emoji: '🏀', keywords: ['basketball', 'ball', 'sport', 'game', 'hoop'] },
  { emoji: '🎮', keywords: ['game', 'controller', 'video', 'play', 'console'] },
  { emoji: '💻', keywords: ['computer', 'laptop', 'work', 'tech', 'device'] },
  { emoji: '📱', keywords: ['phone', 'mobile', 'smartphone', 'call', 'text'] },
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
  const [isMac, setIsMac] = useState(true)
  const [emojiSearch, setEmojiSearch] = useState('')

  // Detect platform
  useEffect(() => {
    setIsMac(typeof window !== 'undefined' && navigator.platform.includes('Mac'))
  }, [])

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
        block_sort_order: 'reverse_chrono',
        display_name: null 
      }
      
      if (prefsResponse.ok) {
        userPrefs = await prefsResponse.json()
      }

      // Get user info from Clerk (for fallback)
      const userResponse = await fetch('/api/user-info')
      let userInfo = { fullName: 'User' }
      
      if (userResponse.ok) {
        userInfo = await userResponse.json()
      }

      setProfile({
        fullName: userPrefs.display_name || userInfo.fullName || 'User',
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
      // Update user preferences including display name
      const prefsResponse = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emoji_avatar: profile.emojiAvatar,
          background_color: profile.backgroundColor,
          block_sort_order: profile.blockSortOrder,
          display_name: profile.fullName.trim(),
        }),
      })

      if (!prefsResponse.ok) {
        throw new Error('Failed to update preferences')
      }

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

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close (unless first time setup)
      if (e.key === 'Escape' && !isFirstTime) {
        e.preventDefault()
        onClose()
      }
      
      // Cmd/Ctrl + Enter to save
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (!loading && profile.fullName.trim()) {
          handleSave()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isFirstTime, loading, profile.fullName, onClose, handleSave])

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
                  onClick={() => {
                    setShowEmojiPicker(false)
                    setEmojiSearch('')
                  }}
                />
                
                {/* Emoji Picker positioned in center of screen */}
                <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none">
                  <div className="pointer-events-auto bg-white border rounded-lg shadow-2xl p-4 w-96 max-h-[500px] flex flex-col">
                    <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b">
                      <span className="text-sm font-medium">Choose your emoji</span>
                      <button
                        onClick={() => {
                          setShowEmojiPicker(false)
                          setEmojiSearch('')
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Search Input */}
                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="Search emojis..."
                        value={emojiSearch}
                        onChange={(e) => setEmojiSearch(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                    </div>
                    
                    {/* Emoji Grid with custom scrollbar */}
                    <div 
                      className="flex-1 overflow-y-auto scrollbar-hide hover:scrollbar-default"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarGutter: 'stable',
                      }}
                    >
                      <div className="grid grid-cols-10 gap-1 pb-2">
                        {EMOJI_DATA
                          .filter(emoji => {
                            if (!emojiSearch) return true
                            const searchLower = emojiSearch.toLowerCase()
                            return emoji.keywords.some(keyword => 
                              keyword.toLowerCase().includes(searchLower)
                            )
                          })
                          .map((emoji) => (
                            <button
                              key={emoji.emoji}
                              onClick={() => {
                                handleEmojiSelect(emoji.emoji)
                                setEmojiSearch('')
                              }}
                              className={`w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-xl transition-colors ${
                                emoji.emoji === profile.emojiAvatar ? 'bg-blue-100 ring-2 ring-blue-300' : ''
                              }`}
                            >
                              {emoji.emoji}
                            </button>
                          ))}
                      </div>
                      {emojiSearch && EMOJI_DATA.filter(emoji => {
                        const searchLower = emojiSearch.toLowerCase()
                        return emoji.keywords.some(keyword => 
                          keyword.toLowerCase().includes(searchLower)
                        )
                      }).length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No emojis found for "{emojiSearch}"
                        </div>
                      )}
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
            <div className="space-y-3">
              <div className="flex gap-3">
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
              
              {!isFirstTime && (
                <div className="flex justify-center gap-4 text-xs text-gray-500">
                  <span>Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 font-mono">{isMac ? '⌘' : 'Ctrl'}</kbd><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 font-mono">↵</kbd> to save</span>
                  <span>Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 font-mono">Esc</kbd> to cancel</span>
                </div>
              )}
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