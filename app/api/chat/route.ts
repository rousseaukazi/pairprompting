import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { streamCompletion } from '@/lib/llm'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, explorationId } = await request.json()

    if (!messages || !explorationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user has access to this exploration
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('exploration_id', explorationId)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create a streaming response
    const encoder = new TextEncoder()
    let assistantMessage = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamCompletion(messages)) {
            assistantMessage += chunk
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`))
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          
          // Save the complete conversation after streaming is done
          const updatedMessages = [...messages, { 
            role: 'assistant', 
            content: assistantMessage,
            timestamp: new Date().toISOString()
          }]

          const { error } = await supabaseAdmin
            .from('chats')
            .upsert({
              exploration_id: explorationId,
              user_id: userId,
              messages: updatedMessages,
              updated_at: new Date().toISOString()
            })

          if (error) {
            console.error('Error updating chat:', error)
          }
          
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 