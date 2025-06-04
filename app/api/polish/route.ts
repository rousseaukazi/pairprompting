import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { context, content } = await request.json()

    if (!context && !content) {
      return NextResponse.json({ error: 'No content to polish' }, { status: 400 })
    }

    console.log('🤖 Polishing content with AI...')
    
    const systemPrompt = `You are an expert editor who creates clear, concise, and well-structured content.

Your task is to rewrite and consolidate the provided text according to these guidelines:

For Questions/Context:
- If multiple questions are provided (numbered or separated), merge them into ONE clear, comprehensive question
- Identify the core intent and create a single, well-crafted question that captures all aspects
- Remove redundancy while preserving all unique aspects

For Content/Answers:
- Consolidate related points and remove redundancy
- Create a coherent, flowing response rather than disconnected bullets
- Use clear structure with headings if needed
- Make it scannable with strategic use of:
  - **Bold** for key concepts
  - Bullet points for lists
  - Short paragraphs for readability
- Preserve technical accuracy and important details
- Aim for 30-50% reduction in length while keeping all key information
- IMPORTANT: Preserve any citations in the format [1], [2], etc. Do not remove or modify citation numbers

General Rules:
- Fix any grammar, spelling, or formatting issues
- Maintain a professional yet approachable tone
- Preserve any existing HTML formatting like <strong>, <em>, <u> tags
- Keep citation numbers [1], [2], [3] etc. exactly as they appear
- Create a response that feels like it was written as one cohesive piece, not assembled from parts`

    const userPrompt = `Please consolidate and rewrite the following:

${context ? `Context/Questions: "${context}"` : ''}
${content ? `\nContent/Answers: "${content}"` : ''}

Return a JSON object with the consolidated, rewritten versions:
{
  "context": "single, clear question that captures all aspects (or null if no context)",
  "content": "consolidated, well-structured content"
}`

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`)
    }

    const completion = await response.json()
    const messageContent = completion.choices[0].message.content || '{}'
    
    // Parse the JSON response
    let result
    try {
      result = JSON.parse(messageContent)
    } catch (e) {
      console.error('Failed to parse JSON response:', messageContent)
      result = { context, content }
    }
    
    return NextResponse.json({
      context: result.context || context,
      content: result.content || content
    })
  } catch (error) {
    console.error('Polish API error:', error)
    return NextResponse.json({ error: 'Failed to polish content' }, { status: 500 })
  }
} 