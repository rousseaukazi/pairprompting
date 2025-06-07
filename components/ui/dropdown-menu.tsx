import * as React from "react"
import { useEffect, useRef, useState } from "react"

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

interface DropdownMenuItemProps {
  onClick?: () => void
  children: React.ReactNode
  className?: string
  destructive?: boolean
}

export function DropdownMenu({ trigger, children, align = 'right', className = '' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div 
          className={`absolute top-full mt-1 z-50 min-w-[120px] bg-background border border-border rounded-md shadow-lg overflow-hidden ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="py-1">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export function DropdownMenuItem({ onClick, children, className = '', destructive = false }: DropdownMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${
        destructive 
          ? 'text-destructive hover:bg-destructive/10 hover:text-destructive' 
          : 'text-foreground'
      } ${className}`}
    >
      {children}
    </button>
  )
} 