import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next =
    url.searchParams.get('next') === '/auth/update-password'
      ? '/auth/update-password'
      : '/'
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) redirect(next)
  }
  redirect('/login?error=link')
}
