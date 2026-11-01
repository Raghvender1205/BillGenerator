import Link from 'next/link'
import { Layers2, ArrowUpRight } from 'lucide-react'
import { ModeToggle } from './mode-toggle'
import { currentUser } from '../lib/supabase/server'
import SignOutForm from './sign-out-form'
export default async function Header() {
  const user = await currentUser()
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="RentFlow home">
          <span className="brand-symbol">
            <Layers2 size={23} strokeWidth={1.8} aria-hidden="true" />
          </span>
          rentflow<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link className="nav-current" href="/#invoice-editor">
            Invoice builder
          </Link>
          <Link className="nav-help" href="/history">
            Invoice history <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
          <span className="nav-divider" />
          {user ? (
            <div className="account-menu">
              <span className="account-email" title={user.email}>
                {user.email}
              </span>
              <SignOutForm />
            </div>
          ) : (
            <Link href="/login">Sign in</Link>
          )}
          <ModeToggle />
        </nav>
      </div>
    </header>
  )
}
