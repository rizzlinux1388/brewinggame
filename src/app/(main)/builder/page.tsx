import Link from 'next/link'

export default function BuilderPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Create a Card Game</h1>
      <p className="text-gray-400 mb-10">
        Design your own card game. Choose how you want to create it:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/builder/ai" className="group card-panel hover:border-emerald-600 border border-gray-800 transition-all">
          <div className="text-4xl mb-4">🤖</div>
          <h2 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
            AI Creator
          </h2>
          <p className="text-gray-400 text-sm">
            Describe your game in plain English. Our AI generates the full rule set in seconds.
          </p>
          <div className="mt-4 text-emerald-400 text-sm font-medium">
            Try it →
          </div>
        </Link>

        <Link href="/builder/wizard" className="group card-panel hover:border-blue-600 border border-gray-800 transition-all">
          <div className="text-4xl mb-4">🛠️</div>
          <h2 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
            Visual Builder
          </h2>
          <p className="text-gray-400 text-sm">
            Step-by-step wizard to configure deck, rules, scoring, and win conditions — no coding required.
          </p>
          <div className="mt-4 text-blue-400 text-sm font-medium">
            Start building →
          </div>
        </Link>
      </div>
    </div>
  )
}
