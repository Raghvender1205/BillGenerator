import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { authConfigured, supabaseConfig } from './app/lib/supabase/config'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  // Authenticated HTML and cookie responses must never enter a shared cache.
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  if (!authConfigured()) return response
  const { url, key } = supabaseConfig()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values, headers) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value))
        const next = NextResponse.next({ request })
        response.cookies.getAll().forEach((cookie) => next.cookies.set(cookie))
        values.forEach(({ name, value, options }) =>
          next.cookies.set(name, value, options),
        )
        Object.entries(headers).forEach(([name, value]) =>
          next.headers.set(name, value),
        )
        next.headers.set('Cache-Control', 'private, no-store, max-age=0')
        response = next
      },
    },
  })
  await supabase.auth.getClaims()
  return response
}
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|ico)$).*)',
  ],
}
