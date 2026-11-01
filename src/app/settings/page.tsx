import Link from 'next/link'
import { requireUser } from '../lib/supabase/server'
import ProfileSettings from '../components/profile-settings'

export default async function Settings() {
  const user = await requireUser()
  return (
    <div className="workspace settings-page">
      <div className="history-heading">
        <div>
          <h1>Profile settings</h1>
          <p>
            Your landlords, tenants, and default charge rates, saved privately
            to your account.
          </p>
        </div>
        <Link className="text-button" href="/">
          Back to invoice builder
        </Link>
      </div>
      <ProfileSettings key={user.id} userId={user.id} />
    </div>
  )
}
