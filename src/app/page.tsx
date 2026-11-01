import { Check, LockKeyhole } from 'lucide-react'
import BillGenerator from '@/components/bill-generator'
import { currentUser } from './lib/supabase/server'
export default async function Home() {
  const user = await currentUser()
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
