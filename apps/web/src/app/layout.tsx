import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/lib/providers'
import { NavigationLayout } from '@/components/navigation'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Livestock Health Platform',
  description: 'Smart livestock health monitoring and financial risk assessment platform',
  keywords: ['livestock', 'health', 'monitoring', 'agriculture', 'IoT'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <NavigationLayout>
            {children}
          </NavigationLayout>
        </Providers>
      </body>
    </html>
  )
}