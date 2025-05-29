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

const DEFAULT_SYSTEM_PROMPT = `You are PairPrompting AI, a collaborative exploration assistant. 
You help users explore topics deeply and generate insights. 
Your responses should be thoughtful, well-structured, and encourage further exploration.
When appropriate, highlight key insights that might be worth sharing with collaborators.`

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