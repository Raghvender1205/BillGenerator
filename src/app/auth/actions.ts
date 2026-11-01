'use server'
import { redirect } from 'next/navigation'
import { createClient, currentUser } from '../lib/supabase/server'
import { authConfigured, siteUrl } from '../lib/supabase/config'

export type AuthState = { error?: string; message?: string }
export type AuthMode = 'login' | 'signup' | 'forgot' | 'update'

export async function authenticate(
  mode: AuthMode,
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  if (!authConfigured())
    return {
      error: 'Sign-in is not configured yet. Please contact the site owner.',
    }
  if (!['login', 'signup', 'forgot', 'update'].includes(mode))
    return { error: 'Invalid request.' }
  const email = String(form.get('email') || '').trim()
  const password = String(form.get('password') || '')
  if (
    mode !== 'update' &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
  )
    return { error: 'Enter a valid email address.' }
  if (
    mode !== 'forgot' &&
    (!password ||
      password.length > 128 ||
      (mode !== 'login' && password.length < 8))
  )
    return { error: 'Use a password between 8 and 128 characters.' }
  if (
    (mode === 'signup' || mode === 'update') &&
    password !== form.get('confirmPassword')
  )
    return { error: 'The passwords do not match.' }
  const supabase = await createClient()
  if (mode === 'forgot') {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/auth/update-password`,
    })
    if (error)
      return {
        error:
          'We could not send a reset link. Please wait a moment and try again.',
      }
    return {
      message:
        'If an account exists for this email, a password reset link is on its way. Check your inbox and spam folder.',
    }
  }
  if (mode === 'signup') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
    })
    if (error)
      return {
        error:
          error.code === 'over_email_send_rate_limit'
            ? 'Too many email requests. Please wait before trying again.'
            : 'We could not create your account. Check your details or try signing in.',
      }
    if (!data.session)
      return {
        message:
          'Check your inbox to confirm your email, then sign in. You can close this page.',
      }
  } else if (mode === 'update') {
    if (!(await currentUser()))
      return {
        error: 'Your reset link has expired. Request a new link to continue.',
      }
    const { error } = await supabase.auth.updateUser({ password })
    if (error)
      return {
        error:
          'We could not update your password. Try a different password or request a new reset link.',
      }
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error)
      return {
        error:
          error.code === 'email_not_confirmed'
            ? 'Confirm your email address before signing in. Check your inbox.'
            : 'Could not sign in. Check your email and password, or reset your password.',
      }
  }
  redirect('/')
}
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) redirect('/login?error=signout')
  redirect('/')
}
