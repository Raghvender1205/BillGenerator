'use client'

import { signOut } from '../auth/actions'
import { clearLandlordCache } from '../lib/landlord-cache'
import { clearChargeRateCache } from '../lib/use-charge-rates'

export default function SignOutForm() {
  return (
    <form
      action={signOut}
      onSubmit={() => {
        clearLandlordCache()
        clearChargeRateCache()
      }}
    >
      <button className="text-button" type="submit">
        Sign out
      </button>
    </form>
  )
}
