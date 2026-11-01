'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { authenticate, type AuthMode } from '../auth/actions'

const content = {
  login: {
    title: 'Welcome back',
    description: 'Sign in to access your rent invoices.',
    action: 'Sign in',
  },
  signup: {
    title: 'Create your account',
    description: 'Keep your invoices together, wherever you work.',
    action: 'Create account',
  },
  forgot: {
    title: 'Forgot your password?',
    description: 'We’ll email you a link to reset it.',
    action: 'Send reset link',
  },
  update: {
    title: 'Choose a new password',
    description: 'Use at least 8 characters to secure your account.',
    action: 'Save new password',
  },
}
export default function AuthForm({
  mode,
  configured,
  linkError = false,
}: {
  mode: AuthMode
  configured: boolean
  linkError?: boolean
}) {
  const [state, action, pending] = useActionState(
    authenticate.bind(null, mode),
    {},
  )
  const copy = content[mode]
  return (
    <div className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <span className="auth-symbol">
          <LockKeyhole size={23} aria-hidden="true" />
        </span>
        <h1 id="auth-title">{copy.title}</h1>
        <p className="auth-description">{copy.description}</p>
        {!configured ? (
          <p className="form-error" role="alert">
            Sign-in is not configured yet. The site owner needs to connect
            Supabase.
          </p>
        ) : null}
        {linkError ? (
          <p className="form-error" role="alert">
            This link is invalid or has expired. Request a new link or sign in
            again.
          </p>
        ) : null}
        <form action={action}>
          <fieldset disabled={pending || !configured}>
            {mode !== 'update' ? (
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                />
              </label>
            ) : null}
            {mode !== 'forgot' ? (
              <>
                <label>
                  {mode === 'update' ? 'New password' : 'Password'}
                  <input
                    name="password"
                    type="password"
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                    required
                    minLength={mode === 'login' ? 1 : 8}
                    maxLength={128}
                    aria-describedby={
                      mode !== 'login' ? 'password-hint' : undefined
                    }
                  />
                </label>
                {mode !== 'login' ? (
                  <p className="password-hint" id="password-hint">
                    At least 8 characters.
                  </p>
                ) : null}
              </>
            ) : null}
            {mode === 'signup' || mode === 'update' ? (
              <label>
                Confirm password
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                />
              </label>
            ) : null}
            {state.error ? (
              <p className="form-error" role="alert">
                {state.error}
              </p>
            ) : null}
            {state.message ? (
              <p className="auth-message" role="status">
                <Mail size={18} aria-hidden="true" />
                {state.message}
              </p>
            ) : null}
            <button
              className="primary-button"
              type="submit"
              disabled={pending || !configured}
            >
              {pending ? (
                <LoaderCircle size={17} className="spin" aria-hidden="true" />
              ) : null}
              {pending ? 'Please wait…' : copy.action}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </fieldset>
        </form>
        <div className="auth-links">
          {mode === 'login' ? (
            <>
              <Link href="/auth/forgot-password">Forgot password?</Link>
              <p>
                New to RentFlow?{' '}
                <Link href="/auth/sign-up">Create an account</Link>
              </p>
            </>
          ) : (
            <Link href="/login">Back to sign in</Link>
          )}
        </div>
        {mode !== 'update' ? (
          <div className="auth-links">
            <Link href="/">Continue without an account</Link>
          </div>
        ) : null}
      </section>
    </div>
  )
}
