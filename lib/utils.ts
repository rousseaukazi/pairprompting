import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false
  // Matches devices where primary input is coarse (touch)
  return window.matchMedia('(pointer: coarse)').matches
} 