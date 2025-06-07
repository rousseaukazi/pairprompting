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

    const blockId = params.id

    // Verify the user owns this block or has access to the exploration
    const { data: block, error: blockError } = await supabaseAdmin
      .from('blocks')
      .select('id, author_id, exploration_id')
      .eq('id', blockId)
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
    if (block.author_id !== userId && (!membership || membership.role !== 'owner')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the block (comments will be cascade deleted due to foreign key constraint)
    const { error: deleteError } = await supabaseAdmin
      .from('blocks')
      .delete()
      .eq('id', blockId)

    if (deleteError) {
      console.error('Error deleting block:', deleteError)
      return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete block API error:', error)
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

    const blockId = params.id
    const { content, context } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Verify the user owns this block or has access to the exploration
    const { data: block, error: blockError } = await supabaseAdmin
      .from('blocks')
      .select('id, author_id, exploration_id')
      .eq('id', blockId)
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
    if (block.author_id !== userId && (!membership || membership.role !== 'owner')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update the block
    const { data: updatedBlock, error: updateError } = await supabaseAdmin
      .from('blocks')
      .update({
        content: content.trim(),
        context: context || null,
      })
      .eq('id', blockId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating block:', updateError)
      return NextResponse.json({ error: 'Failed to update block' }, { status: 500 })
    }

    return NextResponse.json({ block: updatedBlock })
  } catch (error) {
    console.error('Edit block API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 