'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function NewExplorationPage() {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { userId } = useAuth()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (loading) return // Prevent double submission

    setLoading(true)

    try {
      const response = await fetch('/api/explorations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, userId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create exploration')
      }

      const { id } = await response.json()
      router.push(`/e/${id}`)
      // Don't reset loading state here - let the page navigate away
    } catch (error) {
      console.error('Error creating exploration:', error)
      toast.error('Failed to create exploration')
      setLoading(false) // Only reset on error
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Create New Exploration</h1>
        
        <form onSubmit={handleCreate}>
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Exploration Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              placeholder="e.g., AI Ethics Discussion"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Exploration'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 