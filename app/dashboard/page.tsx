import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Users, Clock } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'

async function getExplorations(userId: string) {
  const { data: memberships } = await supabaseAdmin
    .from('memberships')
    .select(`
      exploration_id,
      role,
      joined_at,
      explorations (
        id,
        title,
        created_at,
        owner_id
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })

  return memberships || []
}

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    return <div>Not authenticated</div>
  }

  const explorations = await getExplorations(userId)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">P</span>
                </div>
                <span className="text-xl font-bold">PairPrompting</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Explorations</h1>
          <Link href="/explore/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Exploration
            </Button>
          </Link>
        </div>

        {explorations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No explorations yet</h3>
            <p className="text-gray-600 mb-4">Create your first exploration to start collaborating with AI and friends.</p>
            <Link href="/explore/new">
              <Button>Create Exploration</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {explorations.map((membership: any) => (
              <Link 
                key={membership.exploration_id} 
                href={`/e/${membership.exploration_id}`}
                className="block"
              >
                <div className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">
                    {membership.explorations.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{membership.role}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(membership.explorations.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
} 