'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Smile } from 'lucide-react'

const EMOJI_OPTIONS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
  '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦',
  '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
  '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿',
  '💀', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '🎃',
  '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🐶',
  '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁',
  '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧',
  '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗'
]

type EmojiPickerProps = {
  currentEmoji?: string
  onEmojiSelect: (emoji: string) => void
  size?: 'sm' | 'md' | 'lg'
}

export function EmojiPicker({ currentEmoji = '😀', onEmojiSelect, size = 'md' }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  }

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`${sizeClasses[size]} rounded-full p-0 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 hover:border-blue-300`}
      >
        <span className="text-lg">{currentEmoji}</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Picker */}
          <div className="absolute top-full mt-2 right-0 z-[9999] bg-white border rounded-lg shadow-xl p-4 w-80 max-h-64 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b">
              <Smile className="w-4 h-4" />
              <span className="text-sm font-medium">Choose your emoji</span>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className={`w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-lg transition-colors ${
                    emoji === currentEmoji ? 'bg-blue-100 ring-2 ring-blue-300' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
} 