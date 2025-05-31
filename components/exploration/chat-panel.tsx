'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2, ArrowUpRight, Highlighter, Check } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isMobile } from '@/lib/utils'

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

type ChatPanelProps = {
  explorationId: string
  onHighlight?: (text: string) => void
}

export function ChatPanel({ explorationId, onHighlight }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedText, setSelectedText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [highlightMode, setHighlightMode] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history on initialization
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch('/api/chat/load', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ explorationId }),
        })

        if (response.ok) {
          const { messages: chatHistory } = await response.json()
          setMessages(chatHistory || [])
        } else {
          console.error('Failed to load chat history')
        }
      } catch (error) {
        console.error('Error loading chat history:', error)
      } finally {
        setInitialLoading(false)
      }
    }

    loadChatHistory()
  }, [explorationId])

  // Simple selection detector - only detects, doesn't interfere
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()
      
      if (text && text.length > 0) {
        setSelectedText(text)
      } else {
        setSelectedText('')
      }
    }

    // Use a debounced version to avoid excessive calls
    let timeoutId: NodeJS.Timeout
    const debouncedHandler = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleSelectionChange, 100)
    }

    document.addEventListener('selectionchange', debouncedHandler)
    return () => {
      document.removeEventListener('selectionchange', debouncedHandler)
      clearTimeout(timeoutId)
    }
  }, [])

  // Global keyboard listener for Cmd+Enter - only when text is selected
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && selectedText && onHighlight) {
        // Don't interfere if user is typing in textarea
        if (document.activeElement === textareaRef.current) {
          return
        }
        
        e.preventDefault()
        onHighlight(selectedText)
        setSelectedText('')
        window.getSelection()?.removeAllRanges()
        toast.success('Block pushed to document!')
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown, { capture: true })
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true })
  }, [onHighlight, selectedText])

  // Manage overlay canvas lifecycle
  useLayoutEffect(() => {
    if (highlightMode) {
      // create canvas if not exists
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas')
        canvas.style.position = 'fixed'
        canvas.style.top = '0'
        canvas.style.left = '0'
        canvas.style.width = '100vw'
        canvas.style.height = '100vh'
        canvas.style.zIndex = '9999'
        canvas.style.pointerEvents = 'none'
        canvasRef.current = canvas
        document.body.appendChild(canvas)
      }
      const canvas = canvasRef.current!
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgb(255, 235, 59)' // yellow
      ctx.globalAlpha = 0.3 // 30% opacity
      ctx.lineWidth = 20

      let drawing = false

      const onPointerDown = (e: PointerEvent) => {
        drawing = true
        ctx.beginPath()
        ctx.moveTo(e.clientX, e.clientY)
      }
      const onPointerMove = (e: PointerEvent) => {
        if (!drawing) return
        ctx.lineTo(e.clientX, e.clientY)
        ctx.stroke()
      }
      const onPointerUp = () => {
        drawing = false
      }

      canvas.style.pointerEvents = 'auto'
      canvas.addEventListener('pointerdown', onPointerDown)
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)

      return () => {
        canvas.style.pointerEvents = 'none'
        canvas.removeEventListener('pointerdown', onPointerDown)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }
    }
  }, [highlightMode])

  // Start highlight mode
  const startHighlight = () => {
    document.body.classList.add('highlight-cursor')
    setHighlightMode(true)
  }

  // Finish highlight mode -> push block
  const finishHighlight = () => {
    if (!highlightMode) return
    console.log('=== Finish Highlight Debug ===')
    const canvas = canvasRef.current
    let selectedText = ''
    if (canvas) {
      const dpr = window.devicePixelRatio || 1
      const ctx = canvas.getContext('2d')!
      const assistantElems = Array.from(document.querySelectorAll('[data-role="assistant"]')) as HTMLElement[]
      console.log('Assistant elements found:', assistantElems.length)
      
      // Check which parts of each assistant message were highlighted
      assistantElems.forEach(bubble => {
        const fullText = bubble.innerText
        // Track word positions instead of just word text
        const highlightedRanges: Array<{start: number, end: number, word: string}> = []
        
        // Get all text nodes in the bubble
        const walker = document.createTreeWalker(
          bubble,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              // Skip empty text nodes and code blocks
              if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT
              if (node.parentElement?.closest('pre, code')) return NodeFilter.FILTER_REJECT
              return NodeFilter.FILTER_ACCEPT
            }
          }
        )
        
        // Track position in the full text
        let globalTextPosition = 0
        
        let textNode: Node | null
        while (textNode = walker.nextNode()) {
          const text = textNode.textContent || ''
          
          // Find where this text node appears in the full text
          const nodeStartPos = fullText.indexOf(text, globalTextPosition)
          if (nodeStartPos === -1) continue
          
          const range = document.createRange()
          
          // Split text into words and check each one
          const words = text.split(/(\s+)/)
          let currentPos = 0
          
          words.forEach(word => {
            if (!word.trim()) {
              currentPos += word.length
              return
            }
            
            // Create range for this word
            try {
              range.setStart(textNode!, currentPos)
              range.setEnd(textNode!, currentPos + word.length)
              const wordRect = range.getBoundingClientRect()
              
              // Check if this word intersects with paint
              let hasHighlight = false
              
              // Sample many points across the word to catch any intersection
              const samples: number[][] = []
              const step = 3 // sample every 3 pixels
              
              // Sample along the entire width and height of the word
              for (let x = wordRect.left; x <= wordRect.right; x += step) {
                for (let y = wordRect.top; y <= wordRect.bottom; y += step) {
                  samples.push([x, y])
                }
              }
              
              // Also sample the exact corners and center
              samples.push(
                [wordRect.left, wordRect.top],
                [wordRect.right, wordRect.top],
                [wordRect.left, wordRect.bottom],
                [wordRect.right, wordRect.bottom],
                [wordRect.left + wordRect.width / 2, wordRect.top + wordRect.height / 2]
              )
              
              for (const [x, y] of samples) {
                const pixelData = ctx.getImageData(Math.floor(x * dpr), Math.floor(y * dpr), 1, 1).data
                if (pixelData[3] > 0) {
                  hasHighlight = true
                  break
                }
              }
              
              if (hasHighlight) {
                const wordStart = nodeStartPos + currentPos
                const wordEnd = wordStart + word.length
                highlightedRanges.push({start: wordStart, end: wordEnd, word: word.trim()})
              }
            } catch (e) {
              // Range API can fail on some edge cases
              console.warn('Range error for word:', word, e)
            }
            
            currentPos += word.length
          })
          
          globalTextPosition = nodeStartPos + text.length
        }
        
        // Now find complete sentences that contain highlighted words
        if (highlightedRanges.length > 0) {
          console.log('Highlighted ranges:', highlightedRanges)
          console.log('Full bubble text:', fullText)
          
          // Split text into sentences, treating headers and newlines as boundaries
          const sentences: Array<{text: string, start: number, end: number}> = []
          
          // First split by double newlines to separate paragraphs/sections
          const lines = fullText.split('\n')
          let currentPos = 0
          
          lines.forEach(line => {
            const trimmedLine = line.trim()
            if (!trimmedLine) {
              currentPos += line.length + 1 // +1 for the newline
              return
            }
            
            // Check if this is a header (ends with :)
            if (trimmedLine.endsWith(':')) {
              sentences.push({
                text: trimmedLine,
                start: currentPos,
                end: currentPos + line.length
              })
            } else {
              // Split line into sentences by punctuation
              const sentenceRegex = /[^.!?]*[.!?]+/g
              let match
              let lastEnd = 0
              
              while ((match = sentenceRegex.exec(line)) !== null) {
                const sentenceText = match[0].trim()
                if (sentenceText) {
                  sentences.push({
                    text: sentenceText,
                    start: currentPos + match.index,
                    end: currentPos + match.index + match[0].length
                  })
                  lastEnd = match.index + match[0].length
                }
              }
              
              // Handle text without ending punctuation
              if (lastEnd < line.length) {
                const remaining = line.substring(lastEnd).trim()
                if (remaining) {
                  sentences.push({
                    text: remaining,
                    start: currentPos + lastEnd,
                    end: currentPos + line.length
                  })
                }
              }
            }
            
            currentPos += line.length + 1 // +1 for the newline
          })
          
          console.log('Detected sentences:', sentences)
          
          // Check which sentences contain highlighted words
          sentences.forEach(sentence => {
            const hasHighlight = highlightedRanges.some(range => 
              range.start >= sentence.start && range.end <= sentence.end
            )
            
            if (hasHighlight) {
              console.log('Including sentence:', sentence.text)
              selectedText += sentence.text + ' '
            }
          })
        }
      })
    }

    selectedText = selectedText.trim()
    console.log('Selected text:', selectedText)

    // clear and remove canvas
    if (canvas) {
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    if (selectedText && onHighlight) {
      onHighlight(selectedText)
      toast.success('Block pushed to document!')
    }
    // remove canvas overlay after timeout
    if (canvas) {
      canvas.remove()
      canvasRef.current = null
    }
    document.body.classList.remove('highlight-cursor')
    setHighlightMode(false)
  }

  // Desktop: listen for Shift key
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !highlightMode) {
        startHighlight()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && highlightMode) {
        finishHighlight()
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [highlightMode])

  // Pointer move to mark assistant messages
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!highlightMode) return
      const node = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      if (!node) return
      const bubble = node.closest('[data-role="assistant"]') as HTMLElement | null
      if (!bubble) return
      // Find smallest element inside bubble to highlight (paragraph, span, code, etc.)
      let target: HTMLElement | null = node.nodeType === Node.TEXT_NODE ? node.parentElement as HTMLElement : node
      if (target && !target.classList.contains('assistant-highlighted')) {
        target.classList.add('assistant-highlighted')
      }
    }
    window.addEventListener('pointermove', handleMove)
    return () => window.removeEventListener('pointermove', handleMove)
  }, [highlightMode])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      timestamp: new Date().toISOString()
    }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    // keep focus so user can continue typing
    textareaRef.current?.focus()
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          explorationId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let assistantMessage = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              // Final message with timestamp
              const finalAssistantMessage: Message = {
                role: 'assistant',
                content: assistantMessage,
                timestamp: new Date().toISOString()
              }
              setMessages([...newMessages, finalAssistantMessage])
              continue
            }
            
            try {
              const parsed = JSON.parse(data)
              assistantMessage += parsed.content
              // Show streaming response without timestamp yet
              setMessages([...newMessages, { role: 'assistant', content: assistantMessage }])
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to send message')
      // Remove the user message on error
      setMessages(messages)
    } finally {
      setLoading(false)
      // Re-focus the textarea so the user can keep typing
      textareaRef.current?.focus()
    }
  }

  const handlePushBlock = () => {
    if (selectedText && onHighlight) {
      onHighlight(selectedText)
      setSelectedText('')
      window.getSelection()?.removeAllRanges()
      toast.success('Block pushed to document!')
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // When streaming ends, ensure textarea regains focus
  useEffect(() => {
    if (!loading) {
      textareaRef.current?.focus()
    }
  }, [loading])

  if (initialLoading) {
    return (
      <div className="flex flex-col h-full bg-background rounded-lg border border-border">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading chat history...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border border-border">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Start a conversation with AI to explore topics...</p>
          </div>
        ) : (
          messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`assistant-bubble max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
                data-role={message.role}
                data-index={i}
                data-message-role={message.role}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-p:mb-3 prose-p:leading-relaxed prose-strong:text-gray-900 prose-em:text-gray-700 prose-code:text-gray-800 prose-code:bg-gray-200 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-ul:mb-3 prose-ol:mb-3 prose-li:mb-1 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-hr:my-4 prose-table:my-4 prose-thead:bg-gray-50 prose-th:border prose-th:border-gray-300 prose-th:px-3 prose-th:py-2 prose-th:font-semibold prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-2">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
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
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
                {message.timestamp && (
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        {selectedText && (
          <div className="mb-2 p-2 bg-primary/10 rounded flex items-center justify-between">
            <p className="text-sm text-primary">Selected text • Press Cmd+Enter to push</p>
            <Button
              size="sm"
              onClick={handlePushBlock}
              className="gap-1"
            >
              <ArrowUpRight className="w-3 h-3" />
              Push Block
            </Button>
          </div>
        )}
        <div className="flex gap-2 items-center">
          {/* Mobile highlight toggle */}
          {isMobile() && (
            <Button
              type="button"
              size="icon"
              variant={highlightMode ? 'secondary' : 'ghost'}
              onClick={() => {
                if (highlightMode) {
                  finishHighlight()
                } else {
                  startHighlight()
                }
              }}
            >
              {highlightMode ? <Check className="w-4 h-4" /> : <Highlighter className="w-4 h-4" />}
            </Button>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type your message..."
            className="flex-1 resize-none rounded-md bg-card text-foreground border border-border p-2 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            rows={1}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 