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

Response Style:
- Keep responses pithy and focused - prioritize clarity over length
- Lead with the most important insight or key nugget
- Use clear paragraphs and structure for easy scanning
- Avoid unnecessary elaboration - users can ask follow-ups for depth
- When relevant, include up-to-date information from web searches
- ALWAYS cite sources using inline references like [1], [2], [3] etc. immediately after the relevant statement

CRITICAL FORMATTING RULES - YOU MUST FOLLOW THESE:
- DO NOT use asterisks (*) for any purpose - no bold, no italic
- DO NOT use markdown formatting of any kind
- DO NOT use ** for bold text
- DO NOT use * for italic text  
- DO NOT use # for headers
- DO NOT use backticks for code
- DO NOT use any special formatting characters
- Write EVERYTHING as plain text only
- For emphasis, use CAPITAL LETTERS or write "Important:" before key points

Educational Focus:
- Identify 2-3 core concepts that matter most for understanding the topic
- Provide concrete examples or analogies when helpful
- Highlight practical applications or real-world connections
- Point out common misconceptions or key distinctions
- Incorporate current information when it enhances understanding

Citation Format:
- Use inline citations [1], [2], [3] etc. directly after statements that reference source material
- Example: "The inflation rate reached 2.4% in October 2024[1]."
- Do NOT include a separate sources section at the end
- Number citations sequentially as they appear in the text

Remember: Your goal is rapid learning, not comprehensive coverage. Be the expert who knows what matters most. Write everything as plain text without any special formatting characters.`

export async function* streamCompletion(
  messages: LLMMessage[],
  options: LLMOptions = {}
) {
  const {
    model = 'sonar',
    temperature = 0.3,
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
    let citationMetadata: Array<{url: string, title?: string, date?: string}> = []
    let contentBuffer = ''
    
    // Helper function to strip any markdown formatting that gets through
    const stripMarkdown = (text: string): string => {
      const originalText = text
      
      // Test case for debugging
      if (text.includes('**Other Contenders:**')) {
        console.log('Found exact pattern to strip:', text)
      }
      
      // First, handle complete bold patterns (including when followed by punctuation)
      text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '$1')  // Triple asterisks
      text = text.replace(/\*\*([^*]+)\*\*/g, '$1')      // Double asterisks
      
      // Handle italic (but not interfere with bold)
      text = text.replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, '$1')
      
      // Now handle incomplete/malformed patterns
      // Remove double asterisks at the beginning of text or after whitespace
      text = text.replace(/(^|\s)\*\*(\S)/g, '$1$2')
      // Remove double asterisks at the end of text or before punctuation
      text = text.replace(/(\S)\*\*($|[\s:,.!?])/g, '$1$2')
      
      // Clean up any remaining sequences of asterisks
      text = text.replace(/\*{2,}/g, '')  // Remove 2 or more asterisks in a row
      
      // Remove single asterisks at start of lines (lists)
      text = text.replace(/^\*\s/gm, '')
      
      // Remove code blocks
      text = text.replace(/```[\s\S]*?```/g, (match) => {
        const code = match.slice(3, -3).trim()
        return code
      })
      // Remove inline code
      text = text.replace(/`([^`]+)`/g, '$1')
      // Remove headers
      text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1')
      // Remove underscores used for emphasis
      text = text.replace(/__([^_]+)__/g, '$1')
      text = text.replace(/_([^_]+)_/g, '$1')
      
      if (originalText !== text && originalText.includes('**')) {
        console.log('Markdown stripped:', { original: originalText, cleaned: text })
      }
      
      return text
    }
    
    // Helper function to replace citation references with markdown links that include metadata
    const processCitations = (text: string, citations: string[], metadata: Array<{url: string, title?: string, date?: string}>): string => {
      // First strip any markdown formatting
      text = stripMarkdown(text)
      
      if (citations.length === 0) return text
      
      // Replace [1], [2], etc. with markdown links that include metadata as hash parameters
      return text.replace(/(\s?)\[(\d+)\]/g, (match, space, num) => {
        const index = parseInt(num) - 1
        if (index >= 0 && index < citations.length) {
          // Add a space if there isn't one already
          const prefix = space || ' '
          const meta = metadata[index] || { url: citations[index] }
          
          // Append metadata as URL hash parameters for the component to parse
          const metadataParams = new URLSearchParams()
          if (meta.title) metadataParams.set('title', meta.title)
          if (meta.date) metadataParams.set('date', meta.date)
          
          const urlWithMetadata = meta.url + (metadataParams.toString() ? '#' + metadataParams.toString() : '')
          
          return `${prefix}[${num}](${urlWithMetadata})`
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
              yield processCitations(contentBuffer, citations, citationMetadata)
              contentBuffer = ''
            }
            
            // Don't append sources section - we only want inline citations
            continue
          }
          if (!data) continue
          
          try {
            const parsed = JSON.parse(data)
            
            // Capture citations and search results from the first chunk
            if (parsed.citations && parsed.citations.length > 0 && citations.length === 0) {
              citations = parsed.citations
              
              // Also capture search results metadata if available
              if (parsed.search_results && Array.isArray(parsed.search_results)) {
                citationMetadata = parsed.search_results.map((result: any) => ({
                  url: result.url,
                  title: result.title,
                  date: result.date
                }))
              }
            }
            
            // Handle content from the delta
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              // Add to content buffer
              contentBuffer += content
              
              // Only process if we have enough content or a clear break point
              // Look for natural break points: end of sentence, paragraph, or citation
              const hasCompleteSentence = /[.!?]\s*$/.test(contentBuffer)
              const hasNewline = contentBuffer.includes('\n')
              const hasCitation = contentBuffer.includes('[') && contentBuffer.includes(']')
              
              if (hasCompleteSentence || hasNewline || hasCitation || contentBuffer.length > 200) {
                // Process and yield the buffered content
                const processed = processCitations(contentBuffer, citations, citationMetadata)
                yield processed
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
      yield processCitations(contentBuffer, citations, citationMetadata)
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