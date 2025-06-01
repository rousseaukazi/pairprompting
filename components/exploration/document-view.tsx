'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@clerk/nextjs'
import { UserAvatar } from '@/components/user-avatar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { Block, Comment } from '@/lib/supabase'

type BlockWithComments = Block & {
  comments?: Comment[]
}

type UserInfo = {
  fullName: string
  emojiAvatar: string
}

type DocumentViewProps = {
  explorationId: string
  title: string
}

export function DocumentView({ explorationId, title }: DocumentViewProps) {
  const [blocks, setBlocks] = useState<BlockWithComments[]>([])
  const [commenting, setCommenting] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [newBlockIds, setNewBlockIds] = useState<Set<string>>(new Set())
  const [users, setUsers] = useState<Record<string, UserInfo>>({})
  const [currentUserEmoji, setCurrentUserEmoji] = useState('😀')
  const [sortOrder, setSortOrder] = useState<'chrono' | 'reverse_chrono'>('reverse_chrono')
  const blocksEndRef = useRef<HTMLDivElement>(null)
  const { userId } = useAuth()

  // Fetch current user's emoji and sort preference
  useEffect(() => {
    const fetchCurrentUserPreferences = async () => {
      try {
        const response = await fetch('/api/user-preferences')
        if (response.ok) {
          const { emoji_avatar, block_sort_order } = await response.json()
          setCurrentUserEmoji(emoji_avatar || '😀')
          setSortOrder(block_sort_order || 'reverse_chrono')
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error)
      }
    }

    if (userId) {
      fetchCurrentUserPreferences()
    }
  }, [userId])

  // Fetch user information
  const fetchUsers = async (userIds: string[]) => {
    if (userIds.length === 0) return

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds }),
      })

      if (response.ok) {
        const { users: fetchedUsers } = await response.json()
        setUsers(fetchedUsers)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  // Fetch user information when blocks change
  useEffect(() => {
    const userIds = new Set<string>()
    
    // Collect all unique user IDs from blocks and comments
    blocks.forEach(block => {
      userIds.add(block.author_id)
      block.comments?.forEach(comment => {
        userIds.add(comment.author_id)
      })
    })

    if (userIds.size > 0) {
      fetchUsers(Array.from(userIds))
    }
  }, [blocks])

  useEffect(() => {
    // Load initial blocks
    loadBlocks()

    console.log('Setting up real-time subscriptions for exploration:', explorationId)

    // Subscribe to real-time updates for blocks
    const blocksChannel = supabase
      .channel(`exploration:${explorationId}:blocks`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'blocks',
          filter: `exploration_id=eq.${explorationId}`,
        },
        (payload) => {
          console.log('Received real-time block update:', payload)
          const newBlock = payload.new as BlockWithComments
          newBlock.comments = []
          setBlocks((current) => {
            // Check if block already exists to prevent duplicates
            if (current.some(b => b.id === newBlock.id)) {
              return current
            }
            // Sort by position to maintain order
            const updated = [...current, newBlock].sort((a, b) => a.position - b.position)
            return updated
          })
          
          // Track new blocks for animation
          setNewBlockIds((prev) => new Set([...prev, newBlock.id]))
          
          // Remove from new blocks after animation
          setTimeout(() => {
            setNewBlockIds((prev) => {
              const next = new Set(prev)
              next.delete(newBlock.id)
              return next
            })
          }, 2000)
          
          // Don't scroll - let the block animate in naturally
        }
      )
      .subscribe((status) => {
        console.log('Blocks channel subscription status:', status)
      })

    // Subscribe to real-time updates for comments
    const commentsChannel = supabase
      .channel(`exploration:${explorationId}:comments`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
        },
        (payload) => {
          console.log('Received real-time comment update:', payload)
          const newComment = payload.new as Comment
          
          // More efficient check - update the blocks state directly if block exists
          setBlocks((current) => {
            const blockExists = current.some(block => block.id === newComment.block_id)
            
            if (blockExists) {
              return current.map(block => {
                if (block.id === newComment.block_id) {
                  // Check if comment already exists to prevent duplicates
                  if (block.comments?.some(c => c.id === newComment.id)) {
                    return block
                  }
                  return {
                    ...block,
                    comments: [...(block.comments || []), newComment]
                  }
                }
                return block
              })
            }
            
            return current
          })
        }
      )
      .subscribe((status) => {
        console.log('Comments channel subscription status:', status)
      })

    return () => {
      console.log('Cleaning up real-time subscriptions')
      supabase.removeChannel(blocksChannel)
      supabase.removeChannel(commentsChannel)
    }
  }, [explorationId])

  const loadBlocks = async () => {
    const { data: blocksData, error: blocksError } = await supabase
      .from('blocks')
      .select('*')
      .eq('exploration_id', explorationId)
      .order('position', { ascending: true })

    if (blocksError) {
      console.error('Error loading blocks:', blocksError)
      return
    }

    console.log('Loaded blocks:', blocksData)

    // Load comments for all blocks
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .in('block_id', blocksData?.map(b => b.id) || [])
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Error loading comments:', commentsError)
    }

    // Combine blocks with their comments
    const blocksWithComments = (blocksData || []).map(block => ({
      ...block,
      comments: commentsData?.filter(c => c.block_id === block.id) || []
    }))

    setBlocks(blocksWithComments)
  }

  const handleComment = async (blockId: string) => {
    if (!commentText.trim() || !userId) return

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tempComment: Comment = {
      id: tempId,
      block_id: blockId,
      author_id: userId,
      content: commentText,
      created_at: new Date().toISOString()
    }

    // Optimistic update - add comment immediately
    setBlocks((current) => 
      current.map(block => {
        if (block.id === blockId) {
          return {
            ...block,
            comments: [...(block.comments || []), tempComment]
          }
        }
        return block
      })
    )

    // Clear the form
    const commentContent = commentText
    setCommentText('')
    setCommenting(null)

    try {
      // Save to database
      const { data, error } = await supabase
        .from('comments')
        .insert({
          block_id: blockId,
          author_id: userId,
          content: commentContent,
        })
        .select()
        .single()

      if (error) {
        console.error('Error posting comment:', error)
        // Remove the optimistic update on error
        setBlocks((current) => 
          current.map(block => {
            if (block.id === blockId) {
              return {
                ...block,
                comments: block.comments?.filter(c => c.id !== tempId) || []
              }
            }
            return block
          })
        )
        return
      }

      // Replace temp comment with real one from database
      if (data) {
        setBlocks((current) => 
          current.map(block => {
            if (block.id === blockId) {
              return {
                ...block,
                comments: block.comments?.map(c => 
                  c.id === tempId ? data : c
                ) || []
              }
            }
            return block
          })
        )

        // Create notifications for other members of the exploration
        try {
          // Get all members except the current user
          const { data: members } = await supabase
            .from('memberships')
            .select('user_id')
            .eq('exploration_id', explorationId)
            .neq('user_id', userId)

          if (members && members.length > 0) {
            // Create notifications
            const { data: notifications, error: notifError } = await supabase
              .from('notifications')
              .insert(
                members.map(member => ({
                  user_id: member.user_id,
                  exploration_id: explorationId,
                  block_id: blockId,
                  type: 'new_comment',
                  read: false,
                }))
              )
              .select('id')

            if (!notifError && notifications && notifications.length > 0) {
              // Trigger email notifications asynchronously
              const notificationIds = notifications.map(n => n.id)
              
              fetch('/api/notifications/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notificationIds }),
              }).catch(error => {
                console.error('Failed to trigger comment email notifications:', error)
              })
            }
          }
        } catch (error) {
          console.error('Error creating comment notifications:', error)
        }
      }
    } catch (error) {
      console.error('Unexpected error posting comment:', error)
      // Remove the optimistic update on unexpected error
      setBlocks((current) => 
        current.map(block => {
          if (block.id === blockId) {
            return {
              ...block,
              comments: block.comments?.filter(c => c.id !== tempId) || []
            }
          }
          return block
        })
      )
    }
  }

  const handleCommentKeyDown = (e: React.KeyboardEvent, blockId: string) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleComment(blockId)
    }
  }

  // Sort blocks based on user preference
  const sortedBlocks = [...blocks].sort((a, b) => {
    if (sortOrder === 'reverse_chrono') {
      // Latest first - higher position numbers first
      return b.position - a.position
    } else {
      // Oldest first - lower position numbers first
      return a.position - b.position
    }
  })

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="p-6">
        {blocks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No blocks pushed yet. Hold Shift and draw over text in your chat to highlight and push blocks.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedBlocks.map((block) => (
              <div
                key={block.id}
                className={`bg-card rounded-lg p-4 shadow-sm border border-border transition-all duration-500 ${
                  newBlockIds.has(block.id) 
                    ? sortOrder === 'reverse_chrono' 
                      ? 'animate-slide-in-top ring-2 ring-primary ring-opacity-50' 
                      : 'animate-slide-in-bottom ring-2 ring-primary ring-opacity-50'
                    : ''
                }`}
              >
                <div className="flex items-start mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <UserAvatar 
                      user={users[block.author_id] || null} 
                      size="sm" 
                      isLoading={!users[block.author_id]}
                    />
                  </div>
                </div>
                
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-p:mb-3 prose-p:leading-relaxed prose-strong:text-gray-900 prose-em:text-gray-700 prose-code:text-gray-800 prose-code:bg-gray-200 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-ul:mb-3 prose-ol:mb-3 prose-li:mb-1 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-hr:my-4">
                  {(() => {
                    console.log('Block content:', block.content)
                    return null
                  })()}
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                      br: () => <br className="mb-2" />,
                      ul: ({ children }) => <ul className="mb-3 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-3 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      h1: ({ children }) => <h1 className="mb-4 mt-6 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="mb-3 mt-5 first:mt-0">{children}</h2>,
                      h3: ({ children }) => <h3 className="mb-2 mt-4 first:mt-0">{children}</h3>,
                      blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-gray-300 pl-4 italic">{children}</blockquote>,
                      hr: () => <hr className="my-6 border-gray-300" />,
                      u: ({ children }) => <u className="underline">{children}</u>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border-collapse border border-border bg-card rounded-lg shadow-sm">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                      tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
                      tr: ({ children }) => <tr className="hover:bg-muted">{children}</tr>,
                      th: ({ children }) => (
                        <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-border px-4 py-3 text-foreground/80">
                          {children}
                        </td>
                      )
                    }}
                  >
                    {block.content}
                  </ReactMarkdown>
                </div>
                
                {/* Comment toggle link */}
                <div className="mt-2">
                  <button
                    onClick={() => setCommenting(commenting === block.id ? null : block.id)}
                    className="text-sm text-gray-500 hover:text-primary"
                  >
                    comment{block.comments && block.comments.length > 0 ? ` (${block.comments.length})` : ''}
                  </button>
                </div>
                
                {/* Display existing comments */}
                {block.comments && block.comments.length > 0 && (
                  <div className="mt-4 space-y-3 border-t pt-3">
                    {block.comments.map((comment) => (
                      <div key={comment.id} className="bg-muted rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <UserAvatar 
                            user={users[comment.author_id] || null} 
                            size="sm" 
                            isLoading={!users[comment.author_id]}
                          />
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {commenting === block.id && (
                  <div className="mt-4 space-y-2 border-t pt-3">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => handleCommentKeyDown(e, block.id)}
                      placeholder="Add a comment... (Cmd+Enter to post)"
                      className="w-full p-2 bg-card text-foreground border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleComment(block.id)}
                        disabled={!commentText.trim()}
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
            <div ref={blocksEndRef} />
          </div>
        )}
      </div>
    </div>
  )
} 