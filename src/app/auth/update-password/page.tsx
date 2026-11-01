import AuthForm from '@/components/auth-form'
import { requireUser } from '../../lib/supabase/server'
export default async function UpdatePassword() {
  await requireUser()
  return <AuthForm mode="update" configured />
}
