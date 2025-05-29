import OpenAI from 'openai'
import { Message } from './supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

const DEFAULT_SYSTEM_PROMPT = `You are PairPrompting AI, a focused learning companion. 

Your role is to help users explore topics through concise, educational responses that deliver key insights quickly. Follow these principles:

**Response Style:**
- Keep responses pithy and focused - prioritize clarity over length
- Lead with the most important insight or key nugget
- Use bullet points, lists, and clear structure for easy scanning
- Avoid unnecessary elaboration - users can ask follow-ups for depth

**Educational Focus:**
- Identify 2-3 core concepts that matter most for understanding the topic
- Provide concrete examples or analogies when helpful
- Highlight practical applications or real-world connections
- Point out common misconceptions or key distinctions

**Collaboration-Ready:**
- Structure insights so they're easy to share with collaborators
- End with a thoughtful question or next exploration direction when appropriate
- Flag particularly valuable insights that deserve deeper exploration

Remember: Your goal is rapid learning, not comprehensive coverage. Be the expert who knows what matters most.`

export async function* streamCompletion(
  messages: LLMMessage[],
  options: LLMOptions = {}
) {
  const {
    model = 'gpt-3.5-turbo',
    temperature = 0.7,
    maxTokens = 2000,
    systemPrompt = DEFAULT_SYSTEM_PROMPT
  } = options

  const allMessages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ]

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: allMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
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