import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const token_hash = params.get('token_hash')
  const type = params.get('type')
  if (token_hash && (type === 'email' || type === 'recovery')) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) redirect(type === 'recovery' ? '/auth/update-password' : '/')
  }
  redirect('/login?error=link')
}
