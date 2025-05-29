'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Smile, Search } from 'lucide-react'

const EMOJI_DATA = [
  { emoji: '😀', keywords: ['happy', 'smile', 'face', 'joy', 'grin'] },
  { emoji: '😃', keywords: ['happy', 'smile', 'face', 'joy', 'grin', 'open'] },
  { emoji: '😄', keywords: ['happy', 'smile', 'face', 'joy', 'grin', 'eyes'] },
  { emoji: '😁', keywords: ['happy', 'smile', 'face', 'joy', 'grin', 'teeth'] },
  { emoji: '😆', keywords: ['happy', 'laugh', 'smile', 'face', 'joy'] },
  { emoji: '😅', keywords: ['happy', 'laugh', 'smile', 'face', 'sweat', 'nervous'] },
  { emoji: '🤣', keywords: ['laugh', 'happy', 'joy', 'tears', 'rolling'] },
  { emoji: '😂', keywords: ['laugh', 'happy', 'joy', 'tears', 'cry'] },
  { emoji: '🙂', keywords: ['smile', 'happy', 'face', 'slight'] },
  { emoji: '🙃', keywords: ['smile', 'face', 'upside', 'down', 'silly'] },
  { emoji: '😉', keywords: ['wink', 'face', 'flirt', 'playful'] },
  { emoji: '😊', keywords: ['smile', 'happy', 'face', 'blush', 'shy'] },
  { emoji: '😇', keywords: ['smile', 'face', 'angel', 'innocent', 'halo'] },
  { emoji: '🥰', keywords: ['love', 'heart', 'face', 'smile', 'hearts'] },
  { emoji: '😍', keywords: ['love', 'heart', 'face', 'eyes', 'star'] },
  { emoji: '🤩', keywords: ['excited', 'star', 'eyes', 'face', 'wow'] },
  { emoji: '😘', keywords: ['kiss', 'love', 'face', 'heart', 'blow'] },
  { emoji: '😗', keywords: ['kiss', 'face', 'whistle', 'pucker'] },
  { emoji: '😚', keywords: ['kiss', 'face', 'closed', 'eyes'] },
  { emoji: '😙', keywords: ['kiss', 'face', 'smile', 'slight'] },
  { emoji: '😋', keywords: ['yummy', 'tongue', 'face', 'delicious', 'taste'] },
  { emoji: '😛', keywords: ['tongue', 'face', 'playful', 'silly'] },
  { emoji: '😜', keywords: ['tongue', 'face', 'wink', 'playful', 'silly'] },
  { emoji: '🤪', keywords: ['crazy', 'wild', 'face', 'silly', 'goofy'] },
  { emoji: '😝', keywords: ['tongue', 'face', 'closed', 'eyes', 'silly'] },
  { emoji: '🤑', keywords: ['money', 'face', 'dollar', 'rich', 'greedy'] },
  { emoji: '🤗', keywords: ['hug', 'face', 'hands', 'embrace', 'warm'] },
  { emoji: '🤭', keywords: ['face', 'hand', 'cover', 'mouth', 'giggle'] },
  { emoji: '🤫', keywords: ['quiet', 'face', 'finger', 'lips', 'shush'] },
  { emoji: '🤔', keywords: ['thinking', 'face', 'hand', 'chin', 'consider'] },
  { emoji: '🤐', keywords: ['quiet', 'face', 'zipper', 'mouth', 'sealed'] },
  { emoji: '🤨', keywords: ['face', 'eyebrow', 'suspicious', 'skeptical'] },
  { emoji: '😐', keywords: ['face', 'neutral', 'blank', 'expressionless'] },
  { emoji: '😑', keywords: ['face', 'expressionless', 'blank', 'meh'] },
  { emoji: '😶', keywords: ['face', 'quiet', 'silent', 'mouth', 'no'] },
  { emoji: '😏', keywords: ['face', 'smirk', 'sly', 'smug', 'knowing'] },
  { emoji: '😒', keywords: ['face', 'unamused', 'unhappy', 'meh', 'annoyed'] },
  { emoji: '🙄', keywords: ['face', 'eyes', 'roll', 'annoyed', 'frustrated'] },
  { emoji: '😬', keywords: ['face', 'grimace', 'awkward', 'nervous', 'teeth'] },
  { emoji: '🤥', keywords: ['face', 'lie', 'pinocchio', 'nose', 'dishonest'] },
  { emoji: '😌', keywords: ['face', 'relieved', 'peaceful', 'content', 'calm'] },
  { emoji: '😔', keywords: ['face', 'sad', 'dejected', 'sorry', 'pensive'] },
  { emoji: '😪', keywords: ['face', 'sleepy', 'tired', 'yawn', 'exhausted'] },
  { emoji: '🤤', keywords: ['face', 'drool', 'sleep', 'saliva', 'dream'] },
  { emoji: '😴', keywords: ['face', 'sleep', 'tired', 'zzz', 'snore'] },
  { emoji: '😷', keywords: ['face', 'mask', 'sick', 'doctor', 'medical'] },
  { emoji: '🤒', keywords: ['face', 'sick', 'thermometer', 'fever', 'ill'] },
  { emoji: '🤕', keywords: ['face', 'hurt', 'bandage', 'injured', 'head'] },
  { emoji: '🤢', keywords: ['face', 'sick', 'nausea', 'green', 'disgusted'] },
  { emoji: '🤮', keywords: ['face', 'sick', 'vomit', 'throw', 'up'] },
  { emoji: '🤧', keywords: ['face', 'sick', 'sneeze', 'tissue', 'cold'] },
  { emoji: '🥵', keywords: ['face', 'hot', 'heat', 'sweat', 'temperature'] },
  { emoji: '🥶', keywords: ['face', 'cold', 'freeze', 'blue', 'temperature'] },
  { emoji: '🥴', keywords: ['face', 'woozy', 'drunk', 'dizzy', 'confused'] },
  { emoji: '😵', keywords: ['face', 'dizzy', 'unconscious', 'confused', 'spiral'] },
  { emoji: '🤯', keywords: ['face', 'mind', 'blown', 'explosion', 'shocked'] },
  { emoji: '🤠', keywords: ['face', 'cowboy', 'hat', 'western', 'country'] },
  { emoji: '🥳', keywords: ['face', 'party', 'celebrate', 'hat', 'birthday'] },
  { emoji: '😎', keywords: ['face', 'cool', 'sunglasses', 'awesome', 'confident'] },
  { emoji: '🤓', keywords: ['face', 'nerd', 'glasses', 'smart', 'geek'] },
  { emoji: '🧐', keywords: ['face', 'monocle', 'curious', 'inspect', 'examine'] },
  { emoji: '😕', keywords: ['face', 'confused', 'sad', 'disappointed', 'frown'] },
  { emoji: '😟', keywords: ['face', 'worried', 'concerned', 'anxious', 'sad'] },
  { emoji: '🙁', keywords: ['face', 'sad', 'frown', 'disappointed', 'unhappy'] },
  { emoji: '😮', keywords: ['face', 'surprised', 'shocked', 'gasp', 'open'] },
  { emoji: '😯', keywords: ['face', 'surprised', 'hushed', 'shocked', 'quiet'] },
  { emoji: '😲', keywords: ['face', 'surprised', 'shocked', 'astonished', 'amazed'] },
  { emoji: '😳', keywords: ['face', 'flushed', 'embarrassed', 'shy', 'surprised'] },
  { emoji: '🥺', keywords: ['face', 'pleading', 'puppy', 'dog', 'eyes', 'cute'] },
  { emoji: '😦', keywords: ['face', 'frowning', 'open', 'mouth', 'surprised'] },
  { emoji: '😧', keywords: ['face', 'anguished', 'surprised', 'shocked', 'worried'] },
  { emoji: '😨', keywords: ['face', 'fearful', 'scared', 'surprised', 'shocked'] },
  { emoji: '😰', keywords: ['face', 'anxious', 'sweat', 'nervous', 'worried'] },
  { emoji: '😥', keywords: ['face', 'sad', 'relieved', 'disappointed', 'sweat'] },
  { emoji: '😢', keywords: ['face', 'sad', 'cry', 'tear', 'unhappy'] },
  { emoji: '😭', keywords: ['face', 'cry', 'sob', 'tears', 'bawling'] },
  { emoji: '😱', keywords: ['face', 'scream', 'fear', 'scared', 'shocked'] },
  { emoji: '😖', keywords: ['face', 'confounded', 'frustrated', 'confused', 'x'] },
  { emoji: '😣', keywords: ['face', 'persevering', 'struggling', 'effort', 'hard'] },
  { emoji: '😞', keywords: ['face', 'disappointed', 'sad', 'dejected', 'let', 'down'] },
  { emoji: '😓', keywords: ['face', 'downcast', 'sweat', 'cold', 'disappointed'] },
  { emoji: '😩', keywords: ['face', 'weary', 'tired', 'frustrated', 'fed', 'up'] },
  { emoji: '😫', keywords: ['face', 'tired', 'frustrated', 'fed', 'up', 'exhausted'] },
  { emoji: '🥱', keywords: ['face', 'yawn', 'tired', 'sleepy', 'bored'] },
  { emoji: '😤', keywords: ['face', 'huffing', 'angry', 'frustrated', 'steaming'] },
  { emoji: '😡', keywords: ['face', 'angry', 'mad', 'red', 'furious'] },
  { emoji: '😠', keywords: ['face', 'angry', 'mad', 'frustrated', 'grumpy'] },
  { emoji: '🤬', keywords: ['face', 'swearing', 'cursing', 'angry', 'symbols'] },
  { emoji: '😈', keywords: ['face', 'devil', 'evil', 'purple', 'horns'] },
  { emoji: '👿', keywords: ['face', 'devil', 'angry', 'imp', 'red'] },
  { emoji: '💀', keywords: ['skull', 'death', 'dead', 'bones', 'scary'] },
  { emoji: '💩', keywords: ['poop', 'pile', 'brown', 'smiling', 'funny'] },
  { emoji: '🤡', keywords: ['clown', 'face', 'funny', 'circus', 'joke'] },
  { emoji: '👹', keywords: ['ogre', 'monster', 'red', 'mask', 'scary'] },
  { emoji: '👺', keywords: ['goblin', 'red', 'mask', 'angry', 'japanese'] },
  { emoji: '👻', keywords: ['ghost', 'spirit', 'halloween', 'boo', 'white'] },
  { emoji: '👽', keywords: ['alien', 'ufo', 'extraterrestrial', 'space', 'green'] },
  { emoji: '👾', keywords: ['alien', 'monster', 'game', 'invader', 'pixel'] },
  { emoji: '🤖', keywords: ['robot', 'face', 'machine', 'artificial', 'intelligence'] },
  { emoji: '🎃', keywords: ['pumpkin', 'halloween', 'jack', 'lantern', 'orange'] },
  { emoji: '😺', keywords: ['cat', 'happy', 'smile', 'face', 'grinning'] },
  { emoji: '😸', keywords: ['cat', 'happy', 'smile', 'face', 'grin', 'joy'] },
  { emoji: '😹', keywords: ['cat', 'happy', 'tears', 'joy', 'laugh'] },
  { emoji: '😻', keywords: ['cat', 'love', 'heart', 'eyes', 'smitten'] },
  { emoji: '😼', keywords: ['cat', 'wry', 'smirk', 'ironic', 'smile'] },
  { emoji: '😽', keywords: ['cat', 'kiss', 'lips', 'face'] },
  { emoji: '🙀', keywords: ['cat', 'weary', 'surprised', 'shocked', 'scream'] },
  { emoji: '😿', keywords: ['cat', 'crying', 'tear', 'sad', 'face'] },
  { emoji: '😾', keywords: ['cat', 'pouting', 'grumpy', 'angry', 'face'] },
  { emoji: '🐶', keywords: ['dog', 'puppy', 'pet', 'animal', 'cute'] },
  { emoji: '🐱', keywords: ['cat', 'kitten', 'pet', 'animal', 'cute'] },
  { emoji: '🐭', keywords: ['mouse', 'rodent', 'animal', 'small', 'cute'] },
  { emoji: '🐹', keywords: ['hamster', 'pet', 'rodent', 'animal', 'cute'] },
  { emoji: '🐰', keywords: ['rabbit', 'bunny', 'pet', 'animal', 'cute'] },
  { emoji: '🦊', keywords: ['fox', 'animal', 'red', 'clever', 'wild'] },
  { emoji: '🐻', keywords: ['bear', 'animal', 'brown', 'wild', 'strong'] },
  { emoji: '🐼', keywords: ['panda', 'bear', 'animal', 'black', 'white'] },
  { emoji: '🐨', keywords: ['koala', 'bear', 'animal', 'australia', 'cute'] },
  { emoji: '🐯', keywords: ['tiger', 'animal', 'wild', 'stripes', 'big', 'cat'] },
  { emoji: '🦁', keywords: ['lion', 'animal', 'wild', 'mane', 'king'] },
  { emoji: '🐮', keywords: ['cow', 'animal', 'farm', 'milk', 'moo'] },
  { emoji: '🐷', keywords: ['pig', 'animal', 'farm', 'pink', 'snout'] },
  { emoji: '🐸', keywords: ['frog', 'animal', 'green', 'amphibian', 'ribbit'] },
  { emoji: '🐵', keywords: ['monkey', 'animal', 'primate', 'banana', 'funny'] },
  { emoji: '🙈', keywords: ['monkey', 'see', 'no', 'evil', 'eyes', 'hands'] },
  { emoji: '🙉', keywords: ['monkey', 'hear', 'no', 'evil', 'ears', 'hands'] },
  { emoji: '🙊', keywords: ['monkey', 'speak', 'no', 'evil', 'mouth', 'hands'] },
  { emoji: '🐒', keywords: ['monkey', 'animal', 'primate', 'banana', 'tail'] },
  { emoji: '🐔', keywords: ['chicken', 'bird', 'farm', 'animal', 'poultry'] },
  { emoji: '🐧', keywords: ['penguin', 'bird', 'animal', 'black', 'white'] },
  { emoji: '🐦', keywords: ['bird', 'animal', 'fly', 'tweet', 'generic'] },
  { emoji: '🐤', keywords: ['baby', 'chick', 'bird', 'yellow', 'cute'] },
  { emoji: '🐣', keywords: ['hatching', 'chick', 'bird', 'baby', 'egg'] },
  { emoji: '🐥', keywords: ['front', 'facing', 'baby', 'chick', 'bird'] },
  { emoji: '🦆', keywords: ['duck', 'bird', 'animal', 'water', 'quack'] },
  { emoji: '🦅', keywords: ['eagle', 'bird', 'animal', 'fly', 'strong'] },
  { emoji: '🦉', keywords: ['owl', 'bird', 'animal', 'wise', 'night'] },
  { emoji: '🦇', keywords: ['bat', 'animal', 'vampire', 'night', 'fly'] },
  { emoji: '🐺', keywords: ['wolf', 'animal', 'wild', 'howl', 'pack'] },
  { emoji: '🐗', keywords: ['boar', 'pig', 'animal', 'wild', 'tusks'] }
]

const EMOJI_OPTIONS = EMOJI_DATA.map(item => item.emoji)

type EmojiPickerProps = {
  currentEmoji?: string
  onEmojiSelect: (emoji: string) => void
  size?: 'sm' | 'md' | 'lg'
}

export function EmojiPicker({ currentEmoji = '😀', onEmojiSelect, size = 'md' }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredEmojis = useMemo(() => {
    if (!searchTerm.trim()) {
      return EMOJI_DATA
    }
    
    const search = searchTerm.toLowerCase()
    return EMOJI_DATA.filter(item => 
      item.keywords.some(keyword => keyword.includes(search)) ||
      item.emoji.includes(search)
    )
  }, [searchTerm])

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  }

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    setIsOpen(false)
    setSearchTerm('')
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
            onClick={() => {
              setIsOpen(false)
              setSearchTerm('')
            }}
          />
          
          {/* Picker */}
          <div className="absolute top-full mt-2 right-0 z-[9999] bg-white border rounded-lg shadow-xl p-4 w-80 max-h-80 flex flex-col">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b">
              <Smile className="w-4 h-4" />
              <span className="text-sm font-medium">Choose your emoji</span>
            </div>
            
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search emojis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                autoFocus
              />
            </div>
            
            {/* Emoji Grid */}
            <div className="flex-1 overflow-y-auto">
              {filteredEmojis.length > 0 ? (
                <div className="grid grid-cols-8 gap-2">
                  {filteredEmojis.map((item) => (
                    <button
                      key={item.emoji}
                      onClick={() => handleEmojiClick(item.emoji)}
                      className={`w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-lg transition-colors ${
                        item.emoji === currentEmoji ? 'bg-blue-100 ring-2 ring-blue-300' : ''
                      }`}
                      title={item.keywords.slice(0, 3).join(', ')}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No emojis found for "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
} 