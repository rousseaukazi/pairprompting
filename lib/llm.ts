import { Message } from './supabase'

export type LLMMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type LLMOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

const DEFAULT_SYSTEM_PROMPT = `You are PairPrompting AI, a focused learning companion with web search capabilities. 

Your role is to help users explore topics through concise, educational responses that deliver key insights quickly. You have access to real-time web information when needed. Follow these principles:

**Response Style:**
- Keep responses pithy and focused - prioritize clarity over length
- Lead with the most important insight or key nugget
- Use bullet points, lists, and clear structure for easy scanning
- Avoid unnecessary elaboration - users can ask follow-ups for depth
- When relevant, include up-to-date information from web searches
- ALWAYS cite sources using inline references like [1], [2], [3] etc. immediately after the relevant statement

**Educational Focus:**
- Identify 2-3 core concepts that matter most for understanding the topic
- Provide concrete examples or analogies when helpful
- Highlight practical applications or real-world connections
- Point out common misconceptions or key distinctions
- Incorporate current information when it enhances understanding

**Citation Format:**
- Use inline citations [1], [2], [3] etc. directly after statements that reference source material
- Example: "The inflation rate reached 2.4% in October 2024[1]."
- Do NOT include a separate sources section at the end
- Number citations sequentially as they appear in the text

Remember: Your goal is rapid learning, not comprehensive coverage. Be the expert who knows what matters most.`

export async function* streamCompletion(
  messages: LLMMessage[],
  options: LLMOptions = {}
) {
  const {
    model = 'sonar',
    temperature = 0.7,
    maxTokens = 2000,
    systemPrompt = DEFAULT_SYSTEM_PROMPT
  } = options

  const allMessages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ]

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
        return_citations: true,
        return_images: false,
        search_recency_filter: 'month'
      }),
    })

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No response body')
    }

    let buffer = ''
    let citations: string[] = []
    let contentBuffer = ''
    
    // Helper function to replace citation references with markdown links
    const processCitations = (text: string, citations: string[]): string => {
      if (citations.length === 0) return text
      
      // Replace [1], [2], etc. with markdown links, adding a space before if needed
      return text.replace(/(\s?)\[(\d+)\]/g, (match, space, num) => {
        const index = parseInt(num) - 1
        if (index >= 0 && index < citations.length) {
          // Add a space if there isn't one already
          const prefix = space || ' '
          return `${prefix}[${num}](${citations[index]})`
        }
        return match
      })
    }
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })
      
      // Process complete lines
      const lines = buffer.split('\n')
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            // Process any remaining content in the buffer
            if (contentBuffer) {
              yield processCitations(contentBuffer, citations)
              contentBuffer = ''
            }
            
            // Don't append sources section - we only want inline citations
            continue
          }
          if (!data) continue
          
          try {
            const parsed = JSON.parse(data)
            
            // Capture citations from the first chunk (they come at the top level)
            if (parsed.citations && parsed.citations.length > 0 && citations.length === 0) {
              citations = parsed.citations
            }
            
            // Handle content from the delta
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              // Add to content buffer
              contentBuffer += content
              
              // Check if we have a complete citation reference
              // Process and yield content up to the last complete citation or sentence
              const lastBracket = contentBuffer.lastIndexOf(']')
              if (lastBracket !== -1) {
                // Check if there's an incomplete citation after the last bracket
                const afterBracket = contentBuffer.substring(lastBracket + 1)
                if (!afterBracket.includes('[')) {
                  // Safe to process up to and including the last bracket
                  const toProcess = contentBuffer.substring(0, lastBracket + 1)
                  const processed = processCitations(toProcess, citations)
                  yield processed
                  contentBuffer = contentBuffer.substring(lastBracket + 1)
                }
              } else if (contentBuffer.length > 100 && !contentBuffer.includes('[')) {
                // If no brackets and buffer is getting long, process it
                yield processCitations(contentBuffer, citations)
                contentBuffer = ''
              }
            }
            
          } catch (e) {
            console.error('Failed to parse streaming data:', data, e)
          }
        }
      }
    }
    
    // Process any remaining data in the buffer
    if (buffer.trim()) {
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim()
        if (data && data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              contentBuffer += content
            }
          } catch (e) {
            console.error('Failed to parse final buffer:', buffer, e)
          }
        }
      }
    }
    
    // Process any remaining content
    if (contentBuffer) {
      yield processCitations(contentBuffer, citations)
    }
    
    // Don't show sources section - only inline citations
  } catch (error) {
    console.error('LLM streaming error:', error)
    throw error
  }
}

export async function getCompletion(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const chunks: string[] = []
  
  for await (const chunk of streamCompletion(messages, options)) {
    chunks.push(chunk)
  }
  
  return chunks.join('')
} 