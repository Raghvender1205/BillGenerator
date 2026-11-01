import { siteUrl } from './supabase/config'
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    const url = new URL(origin)
    return (
      origin === siteUrl() ||
      origin === new URL(request.url).origin ||
      ((url.protocol === 'http:' || url.protocol === 'https:') &&
        url.host === request.headers.get('host'))
    )
  } catch {
    return false
  }
}
