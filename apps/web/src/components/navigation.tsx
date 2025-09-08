'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3, 
  Heart, 
  Home, 
  Activity, 
  AlertTriangle, 
  DollarSign,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Animals', href: '/animals', icon: Heart },
  { name: 'Sensors', href: '/sensors', icon: Activity },
  { name: 'Predictions', href: '/predictions', icon: BarChart3 },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { name: 'Financial', href: '/financial', icon: DollarSign },
]

interface NavigationProps {
  className?: string
}

export function Navigation({ className }: NavigationProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={cn(
        'fixed top-0 left-0 h-full w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out z-40',
        'lg:translate-x-0',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        className
      )}>
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center px-6 py-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Livestock</h1>
                <p className="text-xs text-muted-foreground">Health Platform</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link
                  key={item.name}
                  href={item.href as any}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-xs font-medium">AI</span>
              </div>
              <div>
                <p className="text-sm font-medium">AI Assistant</p>
                <p className="text-xs text-muted-foreground">v1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}

interface NavigationLayoutProps {
  children: React.ReactNode
}

export function NavigationLayout({ children }: NavigationLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:ml-64 min-h-screen">
        <div className="lg:hidden h-16" /> {/* Spacer for mobile menu button */}
        {children}
      </main>
    </div>
  )
}