import { User } from 'lucide-react'

type UserInfo = {
  fullName: string
  emojiAvatar: string
}

type UserAvatarProps = {
  user: UserInfo | null
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
  isLoading?: boolean
}

export function UserAvatar({ user, size = 'sm', showName = true, className = '', isLoading = false }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  }

  const avatarClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 text-lg overflow-hidden ${className}`

  // Show loading state
  if (isLoading || !user) {
    return (
      <div className="flex items-center gap-2">
        <div className={`${avatarClasses} animate-pulse bg-gray-200`}>
          <User className="w-3 h-3 text-gray-400" />
        </div>
        {showName && (
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className={avatarClasses}>
        <span>{user.emojiAvatar}</span>
      </div>
      {showName && (
        <span className="text-sm text-gray-600">
          {user.fullName}
        </span>
      )}
    </div>
  )
} 