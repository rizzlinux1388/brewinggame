'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/cn'

type NavUser = {
  id: string
  name?: string | null
  email?: string | null
  username?: string | null
  image?: string | null
}

const navLinks = [
  { href: '/lobby', label: 'Lobby' },
  { href: '/games', label: 'Games' },
  { href: '/builder', label: 'Create' },
]

export function MainNav({ user }: { user: NavUser }) {
  const pathname = usePathname()

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/lobby" className="flex items-center gap-2">
            <span className="text-xl">🃏</span>
            <span className="font-bold text-emerald-400 hidden sm:inline">BrewingGame</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  pathname.startsWith(link.href)
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="text-sm text-gray-400 hover:text-gray-100 transition-colors"
          >
            {user.username || user.name || user.email}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
