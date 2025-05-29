import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, MessageSquare, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">P</span>
          </div>
          <span className="text-xl font-bold">PairPrompting</span>
        </div>
        
        <div className="flex items-center gap-4">
          <SignedOut>
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button>Dashboard</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Explore Topics Together with AI
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The best place to explore topics and share insights from your AI conversations with friends. 
            Collaborate asynchronously and build knowledge together.
          </p>
          
          <div className="flex gap-4 justify-center mb-16">
            <SignedOut>
              <Link href="/sign-up">
                <Button size="lg" className="gap-2">
                  Start Exploring <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/explore/new">
                <Button size="lg" className="gap-2">
                  Create New Exploration <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </SignedIn>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Collaborative Exploration</h3>
              <p className="text-gray-600">
                Create explorations and invite friends with a simple link. Everyone gets their own AI chat.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Push Key Insights</h3>
              <p className="text-gray-600">
                Highlight important discoveries and push them to the shared document with Cmd+Enter.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Engagement</h3>
              <p className="text-gray-600">
                Get notifications when friends share insights. Comment and build on each other's discoveries.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 