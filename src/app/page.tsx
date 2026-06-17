import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🃏</span>
          <span className="font-bold text-xl text-emerald-400">BrewingGame</span>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link href="/lobby" className="btn-secondary text-sm">
                Play Now
              </Link>
              <Link href="/profile" className="text-sm text-gray-400 hover:text-gray-100">
                {session.user.name || session.user.email}
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm text-gray-400 hover:text-gray-100">
                Sign In
              </Link>
              <Link href="/sign-up" className="btn-primary text-sm">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-5xl font-bold mb-4 text-white">
          Play Cards. <span className="text-emerald-400">Create Games.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-xl mb-10">
          Classic card games online with friends — or build your own game using simple tools or
          just plain English.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href={session ? '/lobby' : '/sign-up'} className="btn-primary text-lg px-8 py-3">
            Start Playing
          </Link>
          <Link href="/games" className="btn-secondary text-lg px-8 py-3">
            Browse Games
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 pb-24 max-w-5xl mx-auto w-full">
        {[
          {
            icon: '🎮',
            title: 'Classic Games',
            desc: 'Hearts, Spades, Go Fish, Crazy Eights, and War — ready to play instantly.',
          },
          {
            icon: '🤖',
            title: 'AI Game Creator',
            desc: 'Describe your game in plain English. Our AI generates the full rule set.',
          },
          {
            icon: '🛠️',
            title: 'Visual Builder',
            desc: 'Step-by-step wizard to craft custom card games without writing any code.',
          },
        ].map((f) => (
          <div key={f.title} className="card-panel text-center">
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
