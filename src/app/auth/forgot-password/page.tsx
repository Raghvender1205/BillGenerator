import AuthForm from '@/components/auth-form'
import { authConfigured } from '../../lib/supabase/config'
export default function ForgotPassword() {
  return <AuthForm mode="forgot" configured={authConfigured()} />
}
