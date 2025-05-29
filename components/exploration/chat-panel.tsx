'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2, ArrowUpRight } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

  // Global keyboard listener for Cmd+Enter
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        const selection = window.getSelection()
        const text = selection?.toString().trim()
        
        if (text && onHighlight) {
          onHighlight(text)
          selection?.removeAllRanges()
          setSelectedText('')
          toast.success('Block pushed to document!')
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown, { capture: true })
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true })
  }, [onHighlight])

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
    }
  }

  // Handle text selection with improved reliability
  const handleTextSelection = (e: React.MouseEvent) => {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()
      
      if (text && text.length > 0) {
        setSelectedText(text)
      } else if (!text) {
        setSelectedText('')
      }
    }, 10)
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

  if (initialLoading) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg border">
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
    <div className="flex flex-col h-full bg-white rounded-lg border">
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
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-900 select-text'
                }`}
                onMouseUp={message.role === 'assistant' ? handleTextSelection : undefined}
                onMouseDown={message.role === 'assistant' ? () => setSelectedText('') : undefined}
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
                            <table className="min-w-full border-collapse border border-gray-300 bg-white rounded-lg shadow-sm">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                        tbody: ({ children }) => <tbody className="divide-y divide-gray-200">{children}</tbody>,
                        tr: ({ children }) => <tr className="hover:bg-gray-50">{children}</tr>,
                        th: ({ children }) => (
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-300 px-4 py-3 text-gray-700">
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
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        {selectedText && (
          <div className="mb-2 p-2 bg-blue-50 rounded flex items-center justify-between">
            <p className="text-sm text-blue-700">Selected text • Press Cmd+Enter to push</p>
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
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type your message..."
            className="flex-1 resize-none rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-primary"
            rows={1}
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 