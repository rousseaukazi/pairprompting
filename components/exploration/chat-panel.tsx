'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2, ArrowUpRight, Highlighter, Check, X, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
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

  // Helper function to render plain text with citations
  const renderTextWithCitations = (content: string) => {
    // Split the content by citation patterns
    const parts = content.split(/(\[\d+\](?:\([^)]+\))?)/g)
    
    return parts.map((part, index) => {
      // Check if this is a citation with URL
      const citationWithUrlMatch = part.match(/^\[(\d+)\]\(([^)]+)\)$/)
      if (citationWithUrlMatch) {
        const [, num, url] = citationWithUrlMatch
        
        // Parse metadata from URL hash parameters
        let metadata = { url, title: undefined as string | undefined, date: undefined as string | undefined }
        try {
          const urlObj = new URL(url, window.location.origin)
          const hashParams = new URLSearchParams(urlObj.hash.slice(1))
          metadata.url = urlObj.origin + urlObj.pathname + urlObj.search
          if (hashParams.has('title')) {
            metadata.title = hashParams.get('title') || undefined
          }
          if (hashParams.has('date')) {
            metadata.date = hashParams.get('date') || undefined
          }
        } catch (e) {
          metadata.url = url
        }
        
        return (
          <span key={index} className="inline-flex items-center group relative">
            <a
              href={metadata.url}
              target="_blank"
              rel="noopener noreferrer"
              className="citation-pill inline-flex items-center justify-center ml-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-blue-100 rounded-full hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors duration-200 no-underline"
              onClick={(e) => {
                // Ensure we're navigating to the clean URL
                e.preventDefault()
                window.open(metadata.url, '_blank', 'noopener,noreferrer')
              }}
            >
              {num}
            </a>
            
            {/* Enhanced hover preview */}
            <span className="absolute bottom-full left-0 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
              <span className="bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80 max-w-sm block">
                {/* Title */}
                {metadata.title && (
                  <span 
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block truncate"
                  >
                    {metadata.title}
                  </span>
                )}
                
                {/* Domain and date */}
                <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span className="text-blue-600 dark:text-blue-400">
                    {(() => {
                      try {
                        return new URL(metadata.url).hostname.replace('www.', '')
                      } catch {
                        return 'Source'
                      }
                    })()}
                  </span>
                  {metadata.date && (
                    <>
                      <span>•</span>
                      <span>
                        {(() => {
                          try {
                            const date = new Date(metadata.date)
                            const now = new Date()
                            const diffTime = Math.abs(now.getTime() - date.getTime())
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                            
                            if (diffDays === 0) return 'Today'
                            if (diffDays === 1) return 'Yesterday'
                            if (diffDays < 7) return `${diffDays} days ago`
                            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
                            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
                            
                            return date.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                            })
                          } catch {
                            return metadata.date
                          }
                        })()}
                      </span>
                    </>
                  )}
                </span>
                
                {/* Preview text or fallback */}
                <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed block">
                  {metadata.title ? (
                    <span className="italic">Click to read the full article</span>
                  ) : (
                    <span>Source {num}</span>
                  )}
                </span>
              </span>
            </span>
          </span>
        )
      }
      
      // Check if this is a plain citation
      const plainCitationMatch = part.match(/^\[(\d+)\]$/)
      if (plainCitationMatch) {
        const [, num] = plainCitationMatch
        return (
          <span
            key={index}
            className="inline-flex items-center justify-center ml-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-blue-100 rounded-full"
          >
            {num}
          </span>
        )
      }
      
      // Regular text - preserve line breaks
      return part.split('\n').map((line, lineIndex) => (
        <span key={`${index}-${lineIndex}`}>
          {lineIndex > 0 && <br />}
          {line}
        </span>
      ))
    })
  }

  // Helper function to convert plain text to HTML for contentEditable
  const textToHtml = (text: string): string => {
    let html = text
    
    // Clean up any zero-width spaces or invisible characters
    html = html.replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    
    // Process citations with URLs - make them non-editable
    html = html.replace(/\[(\d+)\]\(([^)]+)\)/g, (match: string, num: string, url: string) => {
      return `<span class="inline-flex items-center justify-center ml-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-blue-100 rounded-full" contenteditable="false" data-citation-url="${url.replace(/"/g, '&quot;')}">${num}</span>`
    })
    
    // Process plain citations - make them non-editable
    html = html.replace(/\[(\d+)\]/g, '<span class="inline-flex items-center justify-center ml-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-blue-100 rounded-full" contenteditable="false">$1</span>')
    
    // Process line breaks to paragraphs
    const lines = html.split('\n')
    let processedLines = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Skip completely empty lines that only have whitespace
      if (!line) {
        processedLines.push('<p><br></p>')
        continue
      }
      
      // Wrap lines in paragraphs
      processedLines.push('<p>' + line + '</p>')
    }
    
    return processedLines.join('')
  }

  // Helper function to convert HTML from contentEditable to plain text
  const htmlToText = (html: string): string => {
    let content = html
    
    console.log('htmlToText input:', html)
    
    // First, handle citation spans with URLs - preserve the full citation format
    content = content.replace(/<span[^>]*data-citation-url="([^"]*)"[^>]*>(\d+)<\/span>/g, (match: string, url: string, num: string) => {
      const decodedUrl = url.replace(/&quot;/g, '"')
      return `[${num}](${decodedUrl})`
    })
    
    // Handle plain citation spans
    content = content.replace(/<span[^>]*class="[^"]*rounded-full[^"]*"[^>]*>(\d+)<\/span>/g, '[$1]')
    
    // Convert paragraphs to newlines
    content = content.replace(/<p[^>]*>(.*?)<\/p>/gi, (match, text) => {
      const trimmed = text.trim()
      // Skip empty paragraphs or those with just <br>
      if (!trimmed || trimmed === '<br>') return ''
      return trimmed + '\n\n'
    })
    
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
    
    console.log('htmlToText output:', content)
    
    return content
  }

  // Helper function to strip citations from text
  const stripCitations = (text: string): string => {
    // Replace [n](url#metadata) with just [n]
    return text.replace(/\[(\d+)\]\([^)]+\)/g, '[$1]')
  }

  // Helper function to get plain text without any citations
  const getPlainText = (text: string): string => {
    // First strip citations to simple format
    let plain = stripCitations(text)
    // Then remove citation numbers
    plain = plain.replace(/\[(\d+)\]/g, '[$1]') // Keep citation numbers
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
    
    console.log('Canvas exists:', !!canvas)
    console.log('Offscreen canvas exists:', !!offscreenCanvas)
    
    if (canvas && offscreenCanvas) {
      const dpr = window.devicePixelRatio || 1
      const offscreenCtx = offscreenCanvas.getContext('2d')!
      const assistantElems = Array.from(document.querySelectorAll('[data-role="assistant"]')) as HTMLElement[]
      console.log('Assistant elements found:', assistantElems.length)
      
      // Process each assistant message bubble
      assistantElems.forEach((bubble, bubbleIndex) => {
        console.log(`Processing bubble ${bubbleIndex}`)
        // Get the text content container (first div child of the bubble)
        const contentElement = bubble.querySelector('div') as HTMLElement
        console.log(`Content element found in bubble ${bubbleIndex}:`, !!contentElement)
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
        
        console.log(`Bubble ${bubbleIndex} has ${textNodes.length} text nodes`)
        
        // Get the original message content
        const messageIndex = parseInt(bubble.getAttribute('data-index') || '0')
        const originalMessage = messages[messageIndex]
        if (originalMessage && originalMessage.role === 'assistant') {
          // Get the full content
          const fullContent = originalMessage.content
          
          // Track which character positions in the original content are highlighted
          const highlightedPositions = new Set<number>()
          
          // Check each text node for highlight
          textNodes.forEach(({node, rect, text}) => {
            // Sample multiple points across the text node
            const samples: number[][] = []
            const step = 3
            
            for (let x = rect.left; x <= rect.right; x += step) {
              for (let y = rect.top; y <= rect.bottom; y += step) {
                samples.push([x, y])
              }
            }
            
            // Check if any sample point has highlight
            let isHighlighted = false
            for (const [x, y] of samples) {
              const pixelData = offscreenCtx.getImageData(Math.floor(x * dpr), Math.floor(y * dpr), 1, 1).data
              if (pixelData[3] > 0) {
                isHighlighted = true
                break
              }
            }
            
            if (isHighlighted) {
              console.log(`Highlighted text node: "${text}"`)
              
              // Find all positions of this text in the full content
              let searchStart = 0
              let position = fullContent.indexOf(text, searchStart)
              
              while (position !== -1) {
                // Mark all character positions in this range as highlighted
                for (let i = position; i < position + text.length; i++) {
                  highlightedPositions.add(i)
                }
                
                searchStart = position + 1
                position = fullContent.indexOf(text, searchStart)
              }
            }
          })
          
          console.log(`Total highlighted character positions: ${highlightedPositions.size}`)
          
          // Only proceed if we actually found highlighted content
          if (highlightedPositions.size > 0) {
            // NOW track this message index as having highlighted content
            highlightedMessageIndices.push(messageIndex)

            // Function to find all sentences in the content
            const findAllSentences = (text: string): Array<{start: number, end: number, text: string}> => {
              const sentences: Array<{start: number, end: number, text: string}> = []
              
              // First, let's handle the text character by character to find sentence boundaries
              let currentSentenceStart = 0
              let i = 0
              
              while (i < text.length) {
                const char = text[i]
                
                // Check if this is a sentence-ending punctuation
                if (char === '.' || char === '!' || char === '?') {
                  // Look ahead to see if this is really the end of a sentence
                  let isEndOfSentence = false
                  
                  // Check what comes after
                  if (i === text.length - 1) {
                    // End of text
                    isEndOfSentence = true
                  } else if (i + 1 < text.length) {
                    const nextChar = text[i + 1]
                    const nextNextChar = i + 2 < text.length ? text[i + 2] : ''
                    
                    // Check for common cases where period is NOT end of sentence
                    if (char === '.' && i > 0 && /\d/.test(text[i - 1]) && /\d/.test(nextChar)) {
                      // Decimal number like 3.14
                      isEndOfSentence = false
                    } else if (char === '.' && /[a-z]/.test(nextChar)) {
                      // Possible abbreviation if followed by lowercase
                      isEndOfSentence = false
                    } else if (nextChar === ' ' && /[A-Z]/.test(nextNextChar)) {
                      // Space followed by capital letter - likely new sentence
                      isEndOfSentence = true
                    } else if (nextChar === '\n') {
                      // Line break after punctuation
                      isEndOfSentence = true
                    } else if (nextChar === ' ' || nextChar === '"' || nextChar === ')' || nextChar === ']') {
                      // Space or closing quote/bracket after punctuation
                      isEndOfSentence = true
                    }
                  }
                  
                  if (isEndOfSentence) {
                    // Extract the sentence
                    const sentenceEnd = i + 1
                    const sentenceText = text.substring(currentSentenceStart, sentenceEnd).trim()
                    
                    if (sentenceText) {
                      sentences.push({
                        start: currentSentenceStart,
                        end: sentenceEnd,
                        text: sentenceText
                      })
                      console.log(`Found sentence: "${sentenceText}"`)
                    }
                    
                    // Move to start of next sentence
                    currentSentenceStart = sentenceEnd
                    
                    // Skip any whitespace after the sentence
                    while (currentSentenceStart < text.length && /\s/.test(text[currentSentenceStart])) {
                      currentSentenceStart++
                    }
                    i = currentSentenceStart - 1 // -1 because loop will increment
                  }
                } 
                // Also check for double line breaks as sentence boundaries
                else if (char === '\n' && i + 1 < text.length && text[i + 1] === '\n') {
                  // Double line break - treat as sentence boundary
                  const sentenceText = text.substring(currentSentenceStart, i).trim()
                  
                  if (sentenceText) {
                    sentences.push({
                      start: currentSentenceStart,
                      end: i,
                      text: sentenceText
                    })
                    console.log(`Found sentence (paragraph break): "${sentenceText}"`)
                  }
                  
                  // Skip the line breaks
                  currentSentenceStart = i + 2
                  while (currentSentenceStart < text.length && /\s/.test(text[currentSentenceStart])) {
                    currentSentenceStart++
                  }
                  i = currentSentenceStart - 1
                }
                
                i++
              }
              
              // Handle any remaining text as a sentence
              if (currentSentenceStart < text.length) {
                const remainingText = text.substring(currentSentenceStart).trim()
                if (remainingText) {
                  sentences.push({
                    start: currentSentenceStart,
                    end: text.length,
                    text: remainingText
                  })
                  console.log(`Found sentence (end of text): "${remainingText}"`)
                }
              }
              
              return sentences
            }
            
            // Now find all sentences that contain highlighted characters
            const sentences = findAllSentences(fullContent)
            const selectedSentences = new Set<string>()
            
            sentences.forEach(sentence => {
              // Check if this sentence contains any highlighted characters
              let containsHighlight = false
              for (let pos = sentence.start; pos < sentence.end; pos++) {
                if (highlightedPositions.has(pos)) {
                  containsHighlight = true
                  break
                }
              }
              
              if (containsHighlight) {
                console.log(`Sentence contains highlight: "${sentence.text}"`)
                selectedSentences.add(sentence.text)
              }
            })
            
            // Sort sentences by their appearance order
            const orderedSentences = Array.from(selectedSentences).sort((a, b) => {
              const aIndex = fullContent.indexOf(a)
              const bIndex = fullContent.indexOf(b)
              return aIndex - bIndex
            })
            
            console.log('Final selected sentences:', orderedSentences)
            
            // Add to selected content preserving paragraph structure
            if (orderedSentences.length > 0) {
              if (selectedContent) {
                selectedContent += '\n\n'
              }
              
              // Instead of joining with spaces, preserve the original structure
              // by finding the positions of sentences and including the text between them
              if (orderedSentences.length === 1) {
                selectedContent += orderedSentences[0]
              } else {
                // Find the start and end positions of all selected sentences
                let minStart = fullContent.length
                let maxEnd = 0
                
                orderedSentences.forEach(sentenceText => {
                  const start = fullContent.indexOf(sentenceText)
                  if (start !== -1) {
                    minStart = Math.min(minStart, start)
                    maxEnd = Math.max(maxEnd, start + sentenceText.length)
                  }
                })
                
                // Extract the content from first sentence to last sentence
                // This preserves newlines and formatting between sentences
                selectedContent += fullContent.substring(minStart, maxEnd).trim()
              }
            }
          }
        }
      })
    }

    selectedContent = selectedContent.trim()
    console.log('=== Highlighting Complete ===')
    console.log('selectedContent:', selectedContent)
    console.log('selectedContent length:', selectedContent.length)
    console.log('Contains citations:', /\[\d+\]/.test(selectedContent))
    
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

    console.log('About to check if selectedContent exists:', !!selectedContent)
    if (selectedContent) {
      console.log('Setting review content and opening modal')
      // Show review modal instead of immediately pushing
      setReviewContent(selectedContent)
      setReviewContext(userContext)
      setReviewModalOpen(true)
      console.log('Modal should now be open')
    } else {
      console.log('No content selected, not opening modal')
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
      
      // Log the final assistant message
      console.log('Final assistant message:', assistantMessage)
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
      console.log('Initializing editor with content:', reviewContent)
      // Use the shared function to convert text to HTML
      const html = textToHtml(reviewContent)
      console.log('Converted to HTML:', html)
      
      // Set the HTML content
      reviewEditorRef.current.innerHTML = html
      
      // Disable all execCommand formatting
      const preventFormat = (e: Event) => {
        e.preventDefault()
        return false
      }
      
      // Override document.execCommand to prevent formatting
      const originalExecCommand = document.execCommand
      document.execCommand = function(command: string, showUI?: boolean, value?: string) {
        // Allow only non-formatting commands
        const allowedCommands = ['delete', 'insertText', 'insertLineBreak', 'insertParagraph']
        if (allowedCommands.includes(command)) {
          return originalExecCommand.call(document, command, showUI!, value!)
        }
        return false
      }
      
      // Focus and place cursor at end
      reviewEditorRef.current.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(reviewEditorRef.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
      
      // Cleanup function to restore execCommand
      return () => {
        document.execCommand = originalExecCommand
      }
    }
  }, [reviewModalOpen, reviewContent])

  // Handle keyboard shortcuts in review modal
  useEffect(() => {
    if (!reviewModalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if the target is a button or the push is already in progress
      if ((e.target as HTMLElement).tagName === 'BUTTON' || pushingBlock) {
        return
      }
      
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
        
        // Prevent double submission
        if (pushingBlock) return
        
        // Get content from the editor
        if (reviewEditorRef.current) {
          const content = htmlToText(reviewEditorRef.current.innerHTML)
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
  }, [reviewModalOpen, reviewContent, reviewContext, onHighlight, pushingBlock])

  const handlePolish = async () => {
    if (polishingContent || (!reviewContext && !reviewContent && !reviewEditorRef.current)) return
    
    setPolishingContent(true)
    
    try {
      // Get current content from the editor
      let currentContent = reviewContent
      if (reviewEditorRef.current) {
        currentContent = htmlToText(reviewEditorRef.current.innerHTML)
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
          
          // Convert the polished text to HTML and update the editor
          const html = textToHtml(data.content)
          
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
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {renderTextWithCitations(message.content)}
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
                onPaste={(e) => {
                  // Prevent default paste to strip formatting
                  e.preventDefault()
                  
                  // Get plain text from clipboard
                  const text = e.clipboardData.getData('text/plain')
                  
                  // Insert plain text at cursor position
                  const selection = window.getSelection()
                  if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0)
                    range.deleteContents()
                    
                    // Split text by newlines and create proper structure
                    const lines = text.split('\n')
                    lines.forEach((line, index) => {
                      if (index > 0) {
                        // Add a new paragraph for each line
                        const br = document.createElement('br')
                        range.insertNode(br)
                      }
                      if (line) {
                        const textNode = document.createTextNode(line)
                        range.insertNode(textNode)
                      }
                    })
                    
                    // Move cursor to end of pasted content
                    range.collapse(false)
                    selection.removeAllRanges()
                    selection.addRange(range)
                  }
                }}
                onBeforeInput={(e: any) => {
                  // Prevent formatting commands
                  if (e.inputType && e.inputType.startsWith('format')) {
                    e.preventDefault()
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent all formatting shortcuts
                  if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    return
                  }
                  if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    return
                  }
                  if (e.key === 'u' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    return
                  }
                  
                  // Cmd/Ctrl + Enter to push
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    
                    // Prevent double submission
                    if (pushingBlock) return
                    
                    const content = htmlToText(e.currentTarget.innerHTML)
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
                className="w-full h-full min-h-[300px] p-4 bg-card text-foreground border border-border focus:outline-none focus:border-gray-400"
                style={{
                  minHeight: '300px',
                  // Force plain text appearance
                  fontWeight: 'normal',
                  fontStyle: 'normal',
                  textDecoration: 'none'
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
                  // Prevent double-clicking
                  if (pushingBlock) return
                  
                  if (reviewEditorRef.current) {
                    const content = htmlToText(reviewEditorRef.current.innerHTML)
                    console.log('Push block - raw HTML:', reviewEditorRef.current.innerHTML)
                    console.log('Push block - converted text:', content)
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