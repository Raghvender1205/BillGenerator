import { redirect } from 'next/navigation'
import AuthForm from '@/components/auth-form'
import { currentUser } from '../../lib/supabase/server'
import { authConfigured } from '../../lib/supabase/config'
export default async function SignUp() {
  if (await currentUser()) redirect('/')
  return <AuthForm mode="signup" configured={authConfigured()} />
}
