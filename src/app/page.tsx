import { Check, LockKeyhole } from 'lucide-react'
import BillGenerator from '@/components/bill-generator'
import { currentUser, createClient } from './lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
export default async function Home() {
  const user = await currentUser()
  if (user) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('rentflow_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error)
      return (
        <div className="workspace settings-page">
          <h1>We couldn’t load your account</h1>
          <p role="alert">
            Please try again once your account settings are available.
          </p>
          <Link href="/" className="text-button">
            Try again
          </Link>
        </div>
      )
    if (!data) redirect('/onboarding')
  }
  return (
    <div className="workspace">
      <h1 className="sr-only">Rent invoice builder</h1>
      <div className="workflow-strip" aria-label="How it works">
        <span>
          <b>01</b> Add the details
        </span>
        <i />
        <span>
          <b>02</b> Review your invoice
        </span>
        <i />
        <span>
          <b>03</b> Download & share
        </span>
        <small>
          <LockKeyhole size={13} aria-hidden="true" />{' '}
          {user ? 'Private workspace' : 'No sign-up needed'}
        </small>
      </div>
      <BillGenerator key={user?.id || 'guest'} userId={user?.id} />
      <div className="workspace-assurance">
        <span>
          <Check size={14} aria-hidden="true" /> Free to use
        </span>
        <span>
          <Check size={14} aria-hidden="true" />{' '}
          {user ? 'Saved to your account' : 'Saved in this browser'}
        </span>
        <span>
          <LockKeyhole size={13} aria-hidden="true" />{' '}
          {user ? 'Private invoice history' : 'No account required'}
        </span>
      </div>
    </div>
  )
}
