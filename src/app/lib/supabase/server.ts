import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { authConfigured, supabaseConfig } from './config'
import type { Database } from './database.types'

export async function createClient() {
  const store = await cookies()
  const { url, key } = supabaseConfig()
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          )
        } catch {
          /* Server Components cannot write cookies; proxy refreshes them. */
        }
      },
    },
  })
}
export const currentUser = cache(async () => {
  if (!authConfigured()) return null
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return error ? null : user
})
export async function requireUser() {
  const user = await currentUser()
  if (!user) redirect('/login')
  return user
}
