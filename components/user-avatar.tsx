import { User } from 'lucide-react'

type UserInfo = {
  fullName: string
  emojiAvatar: string
  backgroundColor?: string
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

  const getBorderColor = (bgColor?: string) => {
    if (!bgColor) return 'border-blue-200'
    
    if (bgColor.includes('blue')) return 'border-blue-200'
    if (bgColor.includes('green')) return 'border-green-200'
    if (bgColor.includes('purple')) return 'border-purple-200'
    if (bgColor.includes('orange')) return 'border-orange-200'
    if (bgColor.includes('teal')) return 'border-teal-200'
    if (bgColor.includes('rose')) return 'border-rose-200'
    if (bgColor.includes('indigo')) return 'border-indigo-200'
    if (bgColor.includes('gray')) return 'border-gray-200'
    
    return 'border-blue-200'
  }

  const backgroundClass = user?.backgroundColor 
    ? `bg-gradient-to-br ${user.backgroundColor}` 
    : 'bg-gradient-to-br from-blue-50 to-purple-50'
  
  const borderClass = getBorderColor(user?.backgroundColor)
  
  const avatarClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center ${backgroundClass} border-2 ${borderClass} text-lg overflow-hidden ${className}`

  // Show loading state
  if (isLoading || !user) {
    return (
      <div className="flex items-center gap-2">
        <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center animate-pulse bg-gray-200 border-2 border-gray-300 overflow-hidden ${className}`}>
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