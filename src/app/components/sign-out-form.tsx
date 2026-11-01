'use client'

import { signOut } from '../auth/actions'
import { clearLandlordCache } from '../lib/landlord-cache'

export default function SignOutForm() {
  return (
    <form action={signOut} onSubmit={clearLandlordCache}>
      <button className="text-button" type="submit">
        Sign out
      </button>
    </form>
  )
}
