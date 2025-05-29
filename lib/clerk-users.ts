import { createClerkClient } from '@clerk/nextjs/server'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

export async function getClerkUser(userId: string) {
  try {
    const user = await clerkClient.users.getUser(userId)
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      emailAddress: user.emailAddresses[0]?.emailAddress,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || 'Unknown User',
    }
  } catch (error) {
    console.error('Error fetching user:', error)
    return {
      id: userId,
      firstName: null,
      lastName: null,
      imageUrl: null,
      emailAddress: null,
      fullName: 'Unknown User',
    }
  }
}

export async function getClerkUsers(userIds: string[]) {
  try {
    const users = await Promise.all(userIds.map(id => getClerkUser(id)))
    return users.reduce((acc, user) => {
      acc[user.id] = user
      return acc
    }, {} as Record<string, Awaited<ReturnType<typeof getClerkUser>>>)
  } catch (error) {
    console.error('Error fetching users:', error)
    return {}
  }
} 