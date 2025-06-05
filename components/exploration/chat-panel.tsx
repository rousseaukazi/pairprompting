'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2, ArrowUpRight, Highlighter, Check, X, Sparkles } from 'lucide-react'
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
  onHighlight?: (text: string, context?: string) => void
}

export function ChatPanel({ explorationId, onHighlight }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [highlightMode, setHighlightMode] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewContext, setReviewContext] = useState('')
  const [pushingBlock, setPushingBlock] = useState(false)
  const [polishingContent, setPolishingContent] = useState(false)
  const reviewEditorRef = useRef<HTMLDivElement | null>(null)
  const [showPolishTooltip, setShowPolishTooltip] = useState(false)

  // Helper function to convert markdown to HTML for contentEditable
  const markdownToHtml = (markdown: string): string => {
    let html = markdown
    
    // Process citations with URLs - make them non-editable
    html = html.replace(/\[(\d+)\]\(([^)]+)\)/g, (match: string, num: string, url: string) => {
      return `<span class="inline-flex items-center justify-center ml-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-blue-100 rounded-full" contenteditable="false" data-citation-url="${url.replace(/"/g, '&quot;')}">${num}</span>`
    })
    
    // Process plain citations - make them non-editable
    html = html.replace(/\[(\d+)\]/g, '<span class="inline-flex items-center justify-center ml-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-blue-100 rounded-full" contenteditable="false">$1</span>')
    
    // Process code blocks first (triple backticks)
    html = html.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
    
    // Process inline code (single backticks)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
    
    // Process headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
    
    // Process bold first (to handle **bold *italic* text**)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    
    // Process italic (but not if it's part of a bold marker)
    html = html.replace(/(?<![*])\*([^*]+)\*(?![*])/g, '<em>$1</em>')
    
    // Process line breaks in paragraphs
    const lines = html.split('\n')
    let inList = false
    let inBlockquote = false
    let processedLines = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Handle lists
      if (line.startsWith('- ')) {
        if (!inList) {
          processedLines.push('<ul>')
          inList = true
        }
        processedLines.push('<li>' + line.substring(2) + '</li>')
      }
      // Handle blockquotes
      else if (line.startsWith('> ')) {
        if (inList) {
          processedLines.push('</ul>')
          inList = false
        }
        processedLines.push('<blockquote>' + line.substring(2) + '</blockquote>')
      }
      // Handle other content
      else {
        if (inList) {
          processedLines.push('</ul>')
          inList = false
        }
        
        if (line && !line.startsWith('<')) {
          // Don't wrap if it's already an HTML tag
          processedLines.push('<p>' + line + '</p>')
        } else if (line) {
          processedLines.push(line)
        }
      }
    }
    
    // Close any open list
    if (inList) {
      processedLines.push('</ul>')
    }
    
    return processedLines.join('')
  }

  // Helper function to convert HTML from contentEditable to markdown
  const htmlToMarkdown = (html: string): string => {
    let content = html
    
    console.log('htmlToMarkdown input:', html)
    
    // First, handle citation spans with URLs - preserve the full citation format
    content = content.replace(/<span[^>]*data-citation-url="([^"]*)"[^>]*>(\d+)<\/span>/g, (match: string, url: string, num: string) => {
      const decodedUrl = url.replace(/&quot;/g, '"')
      return `[${num}](${decodedUrl})`
    })
    
    // Handle plain citation spans
    content = content.replace(/<span[^>]*class="[^"]*rounded-full[^"]*"[^>]*>(\d+)<\/span>/g, '[$1]')
    
    // Convert headers back
    content = content.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1')
    content = content.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1')
    content = content.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1')
    
    // Convert blockquotes back
    content = content.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1')
    
    // Convert strong/bold tags back to ** (handle both <strong> and <b>)
    content = content.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    content = content.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    
    // Convert em/italic tags back to * (handle both <em> and <i>)
    content = content.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    content = content.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    
    // Convert code tags back to backticks
    content = content.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    
    // Handle lists - convert li tags
    content = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    // Remove ul/ol tags
    content = content.replace(/<\/?[uo]l[^>]*>/gi, '')
    
    // Convert paragraphs to double newlines
    content = content.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    
    // Convert line breaks
    content = content.replace(/<br\s*\/?>/gi, '\n')
    
    // Remove any remaining div tags but keep their content
    content = content.replace(/<\/?div[^>]*>/gi, '')
    
    // Clean up any remaining HTML tags
    content = content.replace(/<[^>]*>/g, '')
    
    // Decode HTML entities
    const textarea = document.createElement('textarea')
    textarea.innerHTML = content
    content = textarea.value
    
    // Clean up extra whitespace
    content = content.trim()
    // Replace multiple consecutive newlines with double newline
    content = content.replace(/\n{3,}/g, '\n\n')
    // Clean up spaces before newlines
    content = content.replace(/ +\n/g, '\n')
    // Clean up spaces after newlines
    content = content.replace(/\n +/g, '\n')
    
    console.log('htmlToMarkdown output:', content)
    
    return content
  }

  // Helper function to strip citations from markdown text
  const stripCitations = (text: string): string => {
    // Replace [n](url#metadata) with just [n]
    return text.replace(/\[(\d+)\]\([^)]+\)/g, '[$1]')
  }

  // Helper function to get plain text without any markdown or citations
  const getPlainText = (text: string): string => {
    // First strip citations to simple format
    let plain = stripCitations(text)
    // Then remove all markdown formatting
    plain = plain.replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    plain = plain.replace(/\*([^*]+)\*/g, '$1') // Italic
    plain = plain.replace(/`([^`]+)`/g, '$1') // Code
    plain = plain.replace(/\[(\d+)\]/g, '[$1]') // Keep citation numbers
    plain = plain.replace(/[#_~]/g, '') // Other markdown chars
    return plain.trim()
  }

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
      
      // Create offscreen canvas
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas')
      }
      
      const canvas = canvasRef.current!
      const offscreenCanvas = offscreenCanvasRef.current!
      const dpr = window.devicePixelRatio || 1
      
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      offscreenCanvas.width = canvas.width
      offscreenCanvas.height = canvas.height
      
      const ctx = canvas.getContext('2d')!
      const offscreenCtx = offscreenCanvas.getContext('2d')!
      
      ctx.scale(dpr, dpr)
      offscreenCtx.scale(dpr, dpr)
      
      // Clear both canvases initially
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)
      
      // Setup offscreen canvas for drawing at full opacity
      offscreenCtx.lineCap = 'round'
      offscreenCtx.lineJoin = 'round'
      offscreenCtx.strokeStyle = 'rgba(255, 235, 59, 1)' // yellow at full opacity
      offscreenCtx.globalAlpha = 1
      offscreenCtx.lineWidth = 20
      
      // Function to update visible canvas from offscreen
      const updateVisibleCanvas = () => {
        console.log('Updating visible canvas')
        // Clear at full canvas size
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
        ctx.globalAlpha = 0.4 // 40% opacity when copying to visible
        // Draw the offscreen canvas scaled down
        ctx.drawImage(offscreenCanvas, 0, 0, offscreenCanvas.width, offscreenCanvas.height, 0, 0, canvas.width / dpr, canvas.height / dpr)
      }

      let drawing = false

      const onPointerDown = (e: PointerEvent) => {
        console.log('Pointer down at:', e.clientX, e.clientY)
        drawing = true
        document.body.classList.add('drawing')
        offscreenCtx.beginPath()
        offscreenCtx.moveTo(e.clientX, e.clientY)
      }
      const onPointerMove = (e: PointerEvent) => {
        if (!drawing) return
        offscreenCtx.lineTo(e.clientX, e.clientY)
        offscreenCtx.stroke()
        updateVisibleCanvas()
      }
      const onPointerUp = () => {
        drawing = false
        document.body.classList.remove('drawing')
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
        document.body.classList.remove('drawing')
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
    const offscreenCanvas = offscreenCanvasRef.current
    let selectedContent = ''
    const highlightedMessageIndices: number[] = []
    
    if (canvas && offscreenCanvas) {
      const dpr = window.devicePixelRatio || 1
      const offscreenCtx = offscreenCanvas.getContext('2d')!
      const assistantElems = Array.from(document.querySelectorAll('[data-role="assistant"]')) as HTMLElement[]
      console.log('Assistant elements found:', assistantElems.length)
      
      // Process each assistant message bubble
      assistantElems.forEach((bubble, bubbleIndex) => {
        // Get the React Markdown content
        const contentElement = bubble.querySelector('.prose') as HTMLElement
        if (!contentElement) return
        
        // Get all text nodes and their positions
        const textNodes: Array<{node: Node, rect: DOMRect, text: string}> = []
        const walker = document.createTreeWalker(
          contentElement,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT
              return NodeFilter.FILTER_ACCEPT
            }
          }
        )
        
        let textNode: Node | null
        while (textNode = walker.nextNode()) {
          const range = document.createRange()
          range.selectNodeContents(textNode)
          const rect = range.getBoundingClientRect()
          textNodes.push({
            node: textNode,
            rect: rect,
            text: textNode.textContent || ''
          })
        }
        
        // Check which elements contain highlighted text
        const highlightedElements = new Set<Element>()
        
        // Check each text node for highlight
        textNodes.forEach(({node, rect}) => {
          // Sample multiple points across the text node
          const samples: number[][] = []
          const step = 3
          
          for (let x = rect.left; x <= rect.right; x += step) {
            for (let y = rect.top; y <= rect.bottom; y += step) {
              samples.push([x, y])
            }
          }
          
          // Check if any sample point has highlight
          for (const [x, y] of samples) {
            const pixelData = offscreenCtx.getImageData(Math.floor(x * dpr), Math.floor(y * dpr), 1, 1).data
            if (pixelData[3] > 0) {
              // This text node is highlighted, find its parent block element
              let parent = node.parentElement
              while (parent && parent !== contentElement) {
                // Look for block-level elements
                if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE', 'DIV'].includes(parent.tagName)) {
                  highlightedElements.add(parent)
                  break
                }
                parent = parent.parentElement
              }
              break
            }
          }
        })
        
        // Now extract the markdown content from highlighted elements
        if (highlightedElements.size > 0) {
          console.log(`Found ${highlightedElements.size} highlighted elements in bubble ${bubbleIndex}`)
          
          // Get the original message content
          const messageIndex = parseInt(bubble.getAttribute('data-index') || '0')
          const originalMessage = messages[messageIndex]
          if (originalMessage && originalMessage.role === 'assistant') {
            // Track which message indices have highlighted content
            highlightedMessageIndices.push(messageIndex)
            
            // Parse the markdown to find the corresponding sections
            const lines = originalMessage.content.split('\n')
            const selectedLines: string[] = []
            
            // Convert highlighted elements to their text content for matching
            const highlightedTexts = Array.from(highlightedElements).map(el => 
              el.textContent?.trim() || ''
            ).filter(text => text.length > 0)
            
            // Go through each line and check if it's part of highlighted content
            for (const line of lines) {
              // Get plain text version of the line for comparison
              const linePlainText = getPlainText(line)
              
              // Check if this line matches any highlighted text
              const isHighlighted = highlightedTexts.some(highlightedText => {
                // Normalize the highlighted text too (remove extra spaces, etc)
                const normalizedHighlight = highlightedText.replace(/\s+/g, ' ').trim()
                const normalizedLine = linePlainText.replace(/\s+/g, ' ').trim()
                
                // Check for matches (partial or full)
                return normalizedHighlight.includes(normalizedLine) || 
                       normalizedLine.includes(normalizedHighlight) ||
                       // Also check if they share significant overlap
                       (normalizedLine.length > 10 && normalizedHighlight.length > 10 && 
                        (normalizedLine.includes(normalizedHighlight.substring(0, 20)) ||
                         normalizedHighlight.includes(normalizedLine.substring(0, 20))))
              })
              
              if (isHighlighted && line.trim()) {
                // Push the original line with full citations preserved
                selectedLines.push(line)
              }
            }
            
            // Join selected lines with proper spacing
            if (selectedLines.length > 0) {
              if (selectedContent) {
                selectedContent += '\n\n' // Add spacing between different selections
              }
              selectedContent += selectedLines.join('\n')
            }
          }
        }
      })
    }

    selectedContent = selectedContent.trim()
    console.log('Selected content with markdown:', selectedContent)
    
    // Find user contexts based on highlighted message indices
    let userContext = ''
    if (highlightedMessageIndices.length > 0) {
      const userContexts: string[] = []
      
      // For each highlighted assistant message, find its preceding user message
      highlightedMessageIndices.forEach(assistantIndex => {
        // Look backwards from this assistant message to find the user message
        for (let i = assistantIndex - 1; i >= 0; i--) {
          if (messages[i].role === 'user') {
            // Add this user message if we haven't already added it
            if (!userContexts.includes(messages[i].content)) {
              userContexts.push(messages[i].content)
            }
            break
          }
        }
      })
      
      // Join all user contexts with line breaks
      if (userContexts.length > 1) {
        userContext = userContexts.map((context, index) => `${index + 1}. ${context}`).join('\n\n')
      } else if (userContexts.length === 1) {
        userContext = userContexts[0]
      }
    }
    console.log('Detected user contexts:', userContext)

    // clear and remove canvas
    if (canvas && offscreenCanvas) {
      const ctx = canvas.getContext('2d')!
      const offscreenCtx = offscreenCanvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)
    }

    if (selectedContent) {
      // Show review modal instead of immediately pushing
      setReviewContent(selectedContent)
      setReviewContext(userContext)
      setReviewModalOpen(true)
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
      // Don't start highlight mode if review modal is open
      if (e.key === 'Shift' && !highlightMode && !reviewModalOpen) {
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
  }, [highlightMode, messages, reviewModalOpen])

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

  // Auto-focus chat input on component mount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!initialLoading && textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [initialLoading])

  // Initialize the editor content when modal opens
  useEffect(() => {
    if (reviewModalOpen && reviewEditorRef.current && reviewContent) {
      // Use the shared function to convert markdown to HTML
      const html = markdownToHtml(reviewContent)
      
      // Set the HTML content
      reviewEditorRef.current.innerHTML = html
      
      // Focus and place cursor at end
      reviewEditorRef.current.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(reviewEditorRef.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [reviewModalOpen, reviewContent])

  // Handle keyboard shortcuts in review modal
  useEffect(() => {
    if (!reviewModalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault()
        setReviewModalOpen(false)
        setReviewContent('')
        setReviewContext('')
      }
      
      // Cmd/Ctrl + Enter to push
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        
        // Get content from the editor
        if (reviewEditorRef.current) {
          const content = htmlToMarkdown(reviewEditorRef.current.innerHTML)
          console.log('CMD+Enter - content:', content)
          console.log('CMD+Enter - reviewContext:', reviewContext)
          
          if (content.trim() && onHighlight) {
            setPushingBlock(true)
            Promise.resolve(onHighlight(content.trim(), reviewContext))
              .then(() => {
                toast.success('Block pushed to document!')
                setReviewModalOpen(false)
                setReviewContent('')
                setReviewContext('')
              })
              .catch((error) => {
                console.error('Failed to push block:', error)
                toast.error('Failed to push block')
              })
              .finally(() => {
                setPushingBlock(false)
              })
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [reviewModalOpen, reviewContent, reviewContext, onHighlight])

  const handlePolish = async () => {
    if (polishingContent || (!reviewContext && !reviewContent && !reviewEditorRef.current)) return
    
    setPolishingContent(true)
    
    try {
      // Get current content from the editor
      let currentContent = reviewContent
      if (reviewEditorRef.current) {
        currentContent = htmlToMarkdown(reviewEditorRef.current.innerHTML)
      }
      
      const response = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: reviewContext,
          content: currentContent,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to polish content')
      }
      
      const data = await response.json()
      
      if (data.content || data.context) {
        // Update context if provided
        if (data.context) {
          setReviewContext(data.context)
        }
        // Update content if provided
        if (data.content && reviewEditorRef.current) {
          setReviewContent(data.content)
          
          // Convert the polished markdown to HTML and update the editor
          const html = markdownToHtml(data.content)
          
          // Update the editor
          reviewEditorRef.current.innerHTML = html
          
          // Place cursor at end
          reviewEditorRef.current.focus()
          const range = document.createRange()
          const sel = window.getSelection()
          range.selectNodeContents(reviewEditorRef.current)
          range.collapse(false)
          sel?.removeAllRanges()
          sel?.addRange(range)
        }
        
        toast.success('Content enhanced!')
      } else {
        throw new Error('No polished content received')
      }
    } catch (error) {
      console.error('Error polishing content:', error)
      toast.error('Failed to enhance content')
    } finally {
      setPolishingContent(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex flex-col h-full bg-background border border-border">
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
    <div className="flex flex-col h-full bg-background border border-border">
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
                className={`assistant-bubble max-w-[80%] p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
                data-role={message.role}
                data-index={i}
                data-message-role={message.role}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-p:mb-3 prose-p:leading-relaxed prose-strong:text-gray-900 prose-em:text-gray-700 prose-code:text-gray-800 prose-code:bg-gray-200 prose-code:px-1 prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-ul:mb-3 prose-ol:mb-3 prose-li:mb-1 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-hr:my-4 prose-table:my-4 prose-thead:bg-gray-50 prose-th:border prose-th:border-gray-300 prose-th:px-3 prose-th:py-2 prose-th:font-semibold prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-2">
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
                        blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-gray-300">{children}</blockquote>,
                        hr: () => <hr className="my-6 border-gray-300" />,
                        a: ({ href, children }) => {
                          // Extract text content from children
                          let childText = ''
                          if (typeof children === 'string') {
                            childText = children
                          } else if (Array.isArray(children)) {
                            childText = children.join('')
                          } else if (children && typeof children === 'object' && 'props' in children && typeof (children as any).props?.children !== 'undefined') {
                            childText = String((children as any).props.children)
                          } else {
                            childText = String(children || '')
                          }
                          
                          // Check if this is a citation - just a number
                          const isCitation = /^\d+$/.test(childText.trim())
                          
                          if (isCitation && href) {
                            const citationNumber = childText.trim()
                            
                            // Parse metadata from URL hash parameters
                            let metadata = { url: href, title: undefined as string | undefined, date: undefined as string | undefined }
                            try {
                              const url = new URL(href, window.location.origin)
                              const hashParams = new URLSearchParams(url.hash.slice(1))
                              metadata.url = url.origin + url.pathname + url.search
                              if (hashParams.has('title')) {
                                metadata.title = hashParams.get('title') || undefined
                              }
                              if (hashParams.has('date')) {
                                metadata.date = hashParams.get('date') || undefined
                              }
                            } catch (e) {
                              metadata.url = href
                            }
                            
                            return (
                              <span className="inline-flex items-center justify-center ml-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-blue-100 rounded-full no-underline">
                                {citationNumber}
                              </span>
                            )
                          }
                          
                          // Regular link
                          return (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                              {children}
                            </a>
                          )
                        },
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
            <div className="bg-muted p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2 items-center">
          {/* Mobile highlight toggle */}
          {isMobile() && (
            <Button
              type="button"
              size="icon"
              variant={highlightMode ? 'secondary' : 'ghost'}
              onClick={() => {
                // Don't toggle highlight mode if review modal is open
                if (reviewModalOpen) return
                
                if (highlightMode) {
                  finishHighlight()
                } else {
                  startHighlight()
                }
              }}
              disabled={reviewModalOpen}
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
            className="flex-1 resize-none bg-card text-foreground border border-border p-2 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            rows={1}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50" 
            onClick={() => {
              setReviewModalOpen(false)
              setReviewContent('')
              setReviewContext('')
            }}
          />
          
          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-900 shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Review & Edit Block</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setReviewModalOpen(false)
                  setReviewContent('')
                  setReviewContext('')
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Context input field */}
            <div className="mb-4">
              <label htmlFor="context" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What question/comment triggered this response?
              </label>
              <textarea
                id="context"
                value={reviewContext}
                onChange={(e) => setReviewContext(e.target.value)}
                placeholder="Enter the question or comment that led to this response..."
                className="w-full p-3 bg-card text-foreground border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                rows={2}
                disabled={pushingBlock || polishingContent}
              />
            </div>

            <div className="flex-1 overflow-y-auto mb-4 relative">
              <div
                ref={reviewEditorRef}
                contentEditable={!pushingBlock && !polishingContent}
                suppressContentEditableWarning
                onKeyDown={(e) => {
                  // Cmd/Ctrl + B for bold
                  if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    document.execCommand('bold', false)
                  }
                  // Cmd/Ctrl + I for italic
                  if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    document.execCommand('italic', false)
                  }
                  // Cmd/Ctrl + Enter to push
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    const content = htmlToMarkdown(e.currentTarget.innerHTML)
                    if (content.trim() && onHighlight) {
                      setPushingBlock(true)
                      Promise.resolve(onHighlight(content.trim(), reviewContext))
                        .then(() => {
                          toast.success('Block pushed to document!')
                          setReviewModalOpen(false)
                          setReviewContent('')
                          setReviewContext('')
                        })
                        .catch((error) => {
                          console.error('Failed to push block:', error)
                          toast.error('Failed to push block')
                        })
                        .finally(() => {
                          setPushingBlock(false)
                        })
                    }
                  }
                }}
                className="w-full h-full min-h-[300px] p-4 bg-card text-foreground border border-border focus:outline-none focus:border-gray-400 prose prose-sm max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-900 dark:prose-p:text-gray-100 prose-p:mb-3 prose-p:leading-relaxed prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-em:text-gray-700 dark:prose-em:text-gray-300 prose-code:text-gray-800 dark:prose-code:text-gray-200 prose-code:bg-gray-200 dark:prose-code:bg-gray-700 prose-code:px-1 prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-ul:mb-3 prose-ol:mb-3 prose-li:mb-1 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-4 prose-blockquote:italic prose-hr:my-4"
                style={{
                  minHeight: '300px'
                }}
              />
              
              {/* Polish with AI button positioned inside the text editor area */}
              <div className="absolute bottom-2 right-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePolish}
                  disabled={pushingBlock || polishingContent || (!reviewContext && !reviewContent)}
                  onMouseEnter={() => setShowPolishTooltip(true)}
                  onMouseLeave={() => setShowPolishTooltip(false)}
                >
                  {polishingContent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </Button>
                {showPolishTooltip && (
                  <div className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded whitespace-nowrap pointer-events-none">
                    Enhance with AI
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setReviewModalOpen(false)
                  setReviewContent('')
                  setReviewContext('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              
              {/* Push Block button with hover state */}
              <Button
                onClick={() => {
                  if (reviewEditorRef.current) {
                    const content = htmlToMarkdown(reviewEditorRef.current.innerHTML)
                    console.log('Push block - raw HTML:', reviewEditorRef.current.innerHTML)
                    console.log('Push block - converted markdown:', content)
                    console.log('Push block - reviewContext:', reviewContext)
                    
                    if (content.trim() && onHighlight) {
                      setPushingBlock(true)
                      Promise.resolve(onHighlight(content.trim(), reviewContext))
                        .then(() => {
                          toast.success('Block pushed to document!')
                          setReviewModalOpen(false)
                          setReviewContent('')
                          setReviewContext('')
                        })
                        .catch((error) => {
                          console.error('Failed to push block:', error)
                          toast.error('Failed to push block')
                        })
                        .finally(() => {
                          setPushingBlock(false)
                        })
                    }
                  }
                }}
                className="flex-1 gap-2 group"
                disabled={pushingBlock}
              >
                {pushingBlock ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="group-hover:hidden">Push Block</span>
                    <span className="hidden group-hover:inline">⌘↵</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 