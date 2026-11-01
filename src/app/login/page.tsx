import { redirect } from 'next/navigation'
import AuthForm from '@/components/auth-form'
import { currentUser } from '../lib/supabase/server'
import { authConfigured } from '../lib/supabase/config'
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  if (await currentUser()) redirect('/')
  return (
    <AuthForm
      mode="login"
      configured={authConfigured()}
      linkError={Boolean((await searchParams).error)}
    />
  )
}
