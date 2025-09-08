import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { HealthStatus } from '@livestock/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatHealthStatus(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'Healthy'
    case 'at_risk':
      return 'At Risk'
    case 'sick':
      return 'Sick'
    case 'critical':
      return 'Critical'
    default:
      return 'Unknown'
  }
}

export function getHealthStatusStyles(status: HealthStatus) {
  switch (status) {
    case 'healthy':
      return 'healthy'
    case 'at_risk':
      return 'at-risk'
    case 'sick':
      return 'sick'
    case 'critical':
      return 'critical'
    default:
      return 'default'
  }
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getAnimalAvatarUrl(animalId: string): string {
  // Generate a consistent avatar based on animal ID
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500']
  const colorIndex = animalId.length % colors.length
  return colors[colorIndex]
}