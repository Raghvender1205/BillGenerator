import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, requireUser } from '../lib/supabase/server'
import OnboardingForm from '../components/onboarding-form'

export default async function Onboarding() {
  const user = await requireUser()
  const supabase = await createClient()
  const [profile, rates] = await Promise.all([
    supabase
      .from('rentflow_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('rentflow_charge_rates')
      .select('id, name, unit, rate, mode, enabled')
      .eq('user_id', user.id)
      .order('name'),
  ])
  if (profile.data) redirect('/')
  if (profile.error || rates.error)
    return (
      <div className="workspace settings-page">
        <h1>We couldn’t load your setup</h1>
        <p role="alert">
          Please try again after the account settings are available.
        </p>
        <Link className="text-button" href="/onboarding">
          Try again
        </Link>
      </div>
    )
  return (
    <div className="workspace onboarding-page">
      <OnboardingForm
        userId={user.id}
        initialRates={rates.data.map((row) => ({
          ...row,
          rate: String(row.rate),
          mode: row.mode as 'per_unit' | 'fixed',
        }))}
      />
    </div>
  )
}
