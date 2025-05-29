'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquare, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Block } from '@/lib/supabase'

type DocumentViewProps = {
  explorationId: string
  title: string
}

export function DocumentView({ explorationId, title }: DocumentViewProps) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [commenting, setCommenting] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    // Load initial blocks
    loadBlocks()

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`exploration:${explorationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'blocks',
          filter: `exploration_id=eq.${explorationId}`,
        },
        (payload) => {
          setBlocks((current) => [...current, payload.new as Block])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [explorationId])

  const loadBlocks = async () => {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('exploration_id', explorationId)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error loading blocks:', error)
      return
    }

    setBlocks(data || [])
  }

  const handleComment = async (blockId: string) => {
    if (!commentText.trim()) return

    const { error } = await supabase
      .from('comments')
      .insert({
        block_id: blockId,
        content: commentText,
      })

    if (error) {
      console.error('Error posting comment:', error)
      return
    }

    setCommentText('')
    setCommenting(null)
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">{title}</h1>
        
        {blocks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No blocks pushed yet. Highlight text in your chat and press Cmd+Enter to add blocks.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="bg-white rounded-lg p-4 shadow-sm border highlight-animation"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>User</span>
                    <span>•</span>
                    <span>{new Date(block.created_at).toLocaleString()}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCommenting(block.id)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
                
                <p className="whitespace-pre-wrap">{block.content}</p>
                
                {commenting === block.id && (
                  <div className="mt-4 space-y-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full p-2 border rounded-md resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleComment(block.id)}
                      >
                        Post
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCommenting(null)
                          setCommentText('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 