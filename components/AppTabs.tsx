'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AppTabs() {
  const pathname = usePathname()

  const isFinal = pathname.startsWith('/final')

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-2xl mx-auto px-4 flex gap-0">
        <Link
          href="/"
          className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
            !isFinal
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Planejamentos
        </Link>
        <Link
          href="/final"
          className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
            isFinal
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Aprovação Final
        </Link>
      </div>
    </div>
  )
}
