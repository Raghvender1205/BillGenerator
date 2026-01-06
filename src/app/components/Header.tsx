'use client'

import Link from 'next/link'
import { ModeToggle } from '@/app/components/mode-toggle'
import { FileText } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-gray-900 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">RentFlow</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
          >
            About
          </Link>
          <ModeToggle />
        </nav>
      </div>
    </header>
  )
}