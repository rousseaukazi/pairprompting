import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const commentId = params.id

    // First get the comment and block info
    const { data: comment, error: commentError } = await supabaseAdmin
      .from('comments')
      .select('id, author_id, block_id')
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Then get the block's exploration_id
    const { data: block, error: blockError } = await supabaseAdmin
      .from('blocks')
      .select('exploration_id')
      .eq('id', comment.block_id)
      .single()

    if (blockError || !block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    // Check if user is the author or has access to the exploration
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('exploration_id', block.exploration_id)
      .eq('user_id', userId)
      .single()

    // Only allow deletion if user is the author or is the exploration owner
    if (comment.author_id !== userId && (!membership || membership.role !== 'owner')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the comment
    const { error: deleteError } = await supabaseAdmin
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete comment API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const commentId = params.id
    const { content } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // First get the comment and block info
    const { data: comment, error: commentError } = await supabaseAdmin
      .from('comments')
      .select('id, author_id, block_id')
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Then get the block's exploration_id
    const { data: block, error: blockError } = await supabaseAdmin
      .from('blocks')
      .select('exploration_id')
      .eq('id', comment.block_id)
      .single()

    if (blockError || !block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    // Check if user is the author or has access to the exploration
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('exploration_id', block.exploration_id)
      .eq('user_id', userId)
      .single()

    // Only allow editing if user is the author or is the exploration owner
    if (comment.author_id !== userId && (!membership || membership.role !== 'owner')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await supabaseAdmin
      .from('comments')
      .update({
        content: content.trim(),
      })
      .eq('id', commentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating comment:', updateError)
      return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
    }

    return NextResponse.json({ comment: updatedComment })
  } catch (error) {
    console.error('Edit comment API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 