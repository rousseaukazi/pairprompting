'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@clerk/nextjs'
import { UserAvatar } from '@/components/user-avatar'
import { MoreHorizontal, Edit, Trash2, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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

  // Edit/Delete state
  const [editingBlock, setEditingBlock] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editBlockContent, setEditBlockContent] = useState('')
  const [editBlockContext, setEditBlockContext] = useState('')
  const [editCommentContent, setEditCommentContent] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    type: 'block' | 'comment'
    loading: boolean
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'block',
    loading: false
  })

  // Helper function to render plain text with citations
  const renderTextWithCitations = (content: string) => {
    // Split the content by citation patterns
    const parts = content.split(/(\[\d+\](?:\([^)]+\))?)/g)
    
    return parts.map((part, index) => {
      // Check if this is a citation with URL
      const citationWithUrlMatch = part.match(/^\[(\d+)\]\(([^)]+)\)$/)
      if (citationWithUrlMatch) {
        const [, num, url] = citationWithUrlMatch
        
        // Parse metadata from URL hash parameters
        let metadata = { url, title: undefined as string | undefined, date: undefined as string | undefined }
        try {
          const urlObj = new URL(url, window.location.origin)
          const hashParams = new URLSearchParams(urlObj.hash.slice(1))
          metadata.url = urlObj.origin + urlObj.pathname + urlObj.search
          if (hashParams.has('title')) {
            metadata.title = hashParams.get('title') || undefined
          }
          if (hashParams.has('date')) {
            metadata.date = hashParams.get('date') || undefined
          }
        } catch (e) {
          metadata.url = url
        }
        
        return (
          <span key={index} className="inline-flex items-center relative citation-hover">
            <a
              href={metadata.url}
              target="_blank"
              rel="noopener noreferrer"
              className="citation-pill inline-flex items-center justify-center ml-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-blue-100 rounded-full hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors duration-200 no-underline"
              onClick={(e) => {
                // Ensure we're navigating to the clean URL
                e.preventDefault()
                window.open(metadata.url, '_blank', 'noopener,noreferrer')
              }}
            >
              {num}
            </a>
            
            {/* Enhanced hover preview */}
            <span className="citation-tooltip absolute bottom-full left-0 mb-2 opacity-0 invisible transition-all duration-200 z-50 pointer-events-none">
              <span className="bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80 max-w-sm block">
                {/* Title */}
                {metadata.title && (
                  <span 
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block truncate"
                  >
                    {metadata.title}
                  </span>
                )}
                
                {/* Domain and date */}
                <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span className="text-blue-600 dark:text-blue-400">
                    {(() => {
                      try {
                        return new URL(metadata.url).hostname.replace('www.', '')
                      } catch {
                        return 'Source'
                      }
                    })()}
                  </span>
                  {metadata.date && (
                    <>
                      <span>•</span>
                      <span>
                        {(() => {
                          try {
                            const date = new Date(metadata.date)
                            const now = new Date()
                            const diffTime = Math.abs(now.getTime() - date.getTime())
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                            
                            if (diffDays === 0) return 'Today'
                            if (diffDays === 1) return 'Yesterday'
                            if (diffDays < 7) return `${diffDays} days ago`
                            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
                            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
                            
                            return date.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                            })
                          } catch {
                            return metadata.date
                          }
                        })()}
                      </span>
                    </>
                  )}
                </span>
                
                {/* Preview text or fallback */}
                <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed block">
                  {metadata.title ? (
                    <span className="italic">Click to read the full article</span>
                  ) : (
                    <span>Source {num}</span>
                  )}
                </span>
              </span>
            </span>
          </span>
        )
      }
      
      // Check if this is a plain citation
      const plainCitationMatch = part.match(/^\[(\d+)\]$/)
      if (plainCitationMatch) {
        const [, num] = plainCitationMatch
        return (
          <span
            key={index}
            className="inline-flex items-center justify-center ml-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-blue-100 rounded-full"
          >
            {num}
          </span>
        )
      }
      
      // Regular text - preserve line breaks
      return part.split('\n').map((line, lineIndex) => (
        <span key={`${index}-${lineIndex}`}>
          {lineIndex > 0 && <br />}
          {line}
        </span>
      ))
    })
  }

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
          console.log('Received real-time block insert:', payload)
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
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blocks',
          filter: `exploration_id=eq.${explorationId}`,
        },
        (payload) => {
          console.log('Received real-time block update:', payload)
          const updatedBlock = payload.new as BlockWithComments
          setBlocks((current) => 
            current.map(block => 
              block.id === updatedBlock.id 
                ? { ...block, content: updatedBlock.content, context: updatedBlock.context }
                : block
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'blocks',
          filter: `exploration_id=eq.${explorationId}`,
        },
        (payload) => {
          console.log('Received real-time block delete:', payload)
          const deletedBlock = payload.old as BlockWithComments
          setBlocks((current) => current.filter(block => block.id !== deletedBlock.id))
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
          console.log('Received real-time comment insert:', payload)
          const newComment = payload.new as Comment
          
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments',
        },
        (payload) => {
          console.log('Received real-time comment update:', payload)
          const updatedComment = payload.new as Comment
          setBlocks((current) => 
            current.map(block => ({
              ...block,
              comments: block.comments?.map(comment => 
                comment.id === updatedComment.id 
                  ? { ...comment, content: updatedComment.content }
                  : comment
              ) || []
            }))
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
        },
        (payload) => {
          console.log('Received real-time comment delete:', payload)
          const deletedComment = payload.old as Comment
          setBlocks((current) => 
            current.map(block => ({
              ...block,
              comments: block.comments?.filter(comment => comment.id !== deletedComment.id) || []
            }))
          )
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

  // Block edit/delete handlers
  const handleEditBlock = (block: BlockWithComments) => {
    setEditingBlock(block.id)
    setEditBlockContent(block.content)
    setEditBlockContext(block.context || '')
  }

  const handleDeleteBlock = (blockId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Block',
      message: 'Are you sure you want to delete this block? This will also delete all comments associated with it.',
      type: 'block',
      loading: false,
      onConfirm: () => confirmDeleteBlock(blockId)
    })
  }

  const confirmDeleteBlock = async (blockId: string) => {
    setConfirmDialog(prev => ({ ...prev, loading: true }))

    try {
      const response = await fetch(`/api/blocks/${blockId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete block')
      }

      // Optimistically remove the block
      setBlocks(current => current.filter(block => block.id !== blockId))
      toast.success('Block deleted successfully')
      
      setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }))
    } catch (error) {
      console.error('Error deleting block:', error)
      toast.error('Failed to delete block')
      setConfirmDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const handleSaveBlock = async () => {
    if (!editingBlock || !editBlockContent.trim()) return

    try {
      const response = await fetch(`/api/blocks/${editingBlock}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editBlockContent.trim(),
          context: editBlockContext.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update block')
      }

      const { block: updatedBlock } = await response.json()

      // Optimistically update the block
      setBlocks(current => 
        current.map(block => 
          block.id === editingBlock 
            ? { ...block, content: updatedBlock.content, context: updatedBlock.context }
            : block
        )
      )

      toast.success('Block updated successfully')
      setEditingBlock(null)
      setEditBlockContent('')
      setEditBlockContext('')
    } catch (error) {
      console.error('Error updating block:', error)
      toast.error('Failed to update block')
    }
  }

  // Comment edit/delete handlers
  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment.id)
    setEditCommentContent(comment.content)
  }

  const handleDeleteComment = (commentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment?',
      type: 'comment',
      loading: false,
      onConfirm: () => confirmDeleteComment(commentId)
    })
  }

  const confirmDeleteComment = async (commentId: string) => {
    setConfirmDialog(prev => ({ ...prev, loading: true }))

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete comment')
      }

      // Optimistically remove the comment
      setBlocks(current => 
        current.map(block => ({
          ...block,
          comments: block.comments?.filter(comment => comment.id !== commentId) || []
        }))
      )

      toast.success('Comment deleted successfully')
      setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }))
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast.error('Failed to delete comment')
      setConfirmDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const handleSaveComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editCommentContent.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update comment')
      }

      const { comment: updatedComment } = await response.json()

      // Optimistically update the comment
      setBlocks(current => 
        current.map(block => ({
          ...block,
          comments: block.comments?.map(comment => 
            comment.id === commentId 
              ? { ...comment, content: updatedComment.content }
              : comment
          ) || []
        }))
      )

      toast.success('Comment updated successfully')
      setEditingComment(null)
      setEditCommentContent('')
    } catch (error) {
      console.error('Error updating comment:', error)
      toast.error('Failed to update comment')
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
                className={`bg-card rounded-lg p-4 shadow-sm border border-border transition-all duration-500 group ${
                  newBlockIds.has(block.id) 
                    ? sortOrder === 'reverse_chrono' 
                      ? 'animate-slide-in-top ring-2 ring-primary ring-opacity-50' 
                      : 'animate-slide-in-bottom ring-2 ring-primary ring-opacity-50'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <UserAvatar 
                      user={users[block.author_id] || null} 
                      size="sm" 
                      isLoading={!users[block.author_id]}
                    />
                  </div>
                  
                  {/* Block overflow menu */}
                  {(block.author_id === userId) && (
                    <DropdownMenu
                      trigger={
                        <button className="opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded transition-all">
                          <MoreHorizontal className="w-4 h-4 text-gray-500" />
                        </button>
                      }
                      className="block-dropdown group"
                    >
                      <DropdownMenuItem onClick={() => handleEditBlock(block)}>
                        <Edit className="w-3 h-3 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteBlock(block.id)}
                        destructive
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenu>
                  )}
                </div>
                
                {/* Display context if available */}
                {block.context && (
                  <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      {block.context}
                    </p>
                  </div>
                )}
                
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {renderTextWithCitations(block.content)}
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
                      <div key={comment.id} className="bg-muted rounded p-3 group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <UserAvatar 
                              user={users[comment.author_id] || null} 
                              size="sm" 
                              isLoading={!users[comment.author_id]}
                            />
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                          
                          {/* Comment overflow menu */}
                          {comment.author_id === userId && (
                            <DropdownMenu
                              trigger={
                                <button className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded transition-all">
                                  <MoreHorizontal className="w-3 h-3 text-gray-500" />
                                </button>
                              }
                            >
                              <DropdownMenuItem onClick={() => handleEditComment(comment)}>
                                <Edit className="w-3 h-3 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteComment(comment.id)}
                                destructive
                              >
                                <Trash2 className="w-3 h-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenu>
                          )}
                        </div>
                        
                        {editingComment === comment.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              className="w-full p-2 text-sm bg-background border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleSaveComment(comment.id)}
                                disabled={!editCommentContent.trim()}
                              >
                                Save
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setEditingComment(null)
                                  setEditCommentContent('')
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-foreground">{comment.content}</p>
                        )}
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
      
      {/* Block Edit Modal */}
      {editingBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50" 
            onClick={() => {
              setEditingBlock(null)
              setEditBlockContent('')
              setEditBlockContext('')
            }}
          />
          
          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-900 shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Edit Block</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setEditingBlock(null)
                  setEditBlockContent('')
                  setEditBlockContext('')
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Context input field */}
            <div className="mb-4">
              <label htmlFor="edit-context" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What question/comment triggered this response?
              </label>
              <textarea
                id="edit-context"
                value={editBlockContext}
                onChange={(e) => setEditBlockContext(e.target.value)}
                placeholder="Enter the question or comment that led to this response..."
                className="w-full p-3 bg-card text-foreground border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                rows={2}
              />
            </div>

            <div className="flex-1 overflow-y-auto mb-4">
              <textarea
                value={editBlockContent}
                onChange={(e) => setEditBlockContent(e.target.value)}
                className="w-full h-full min-h-[300px] p-4 bg-card text-foreground border border-border focus:outline-none focus:border-gray-400 resize-none"
                placeholder="Edit your block content..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingBlock(null)
                  setEditBlockContent('')
                  setEditBlockContext('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleSaveBlock}
                className="flex-1"
                disabled={!editBlockContent.trim()}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        destructive
        loading={confirmDialog.loading}
      />
    </div>
  )
} 