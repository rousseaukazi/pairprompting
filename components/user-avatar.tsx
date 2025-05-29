import { User } from 'lucide-react'

type UserInfo = {
  fullName: string
  imageUrl: string | null
}

type UserAvatarProps = {
  user: UserInfo | null
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}

export function UserAvatar({ user, size = 'sm', showName = true, className = '' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  }

  const avatarClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center bg-gray-200 text-gray-600 font-medium overflow-hidden ${className}`

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="flex items-center gap-2">
      <div className={avatarClasses}>
        {user?.imageUrl ? (
          <img 
            src={user.imageUrl} 
            alt={user.fullName}
            className="w-full h-full object-cover"
          />
        ) : user?.fullName ? (
          <span>{getInitials(user.fullName)}</span>
        ) : (
          <User className="w-3 h-3" />
        )}
      </div>
      {showName && (
        <span className="text-sm text-gray-600">
          {user?.fullName || 'Unknown User'}
        </span>
      )}
    </div>
  )
} 