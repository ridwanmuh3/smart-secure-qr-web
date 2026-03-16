import type { H3Event } from 'h3'

export function ok<T>(data: T) {
  return { success: true as const, data }
}

export function fail(message: string, statusCode = 400): never {
  throw createError({ statusCode, statusMessage: message })
}

export function getClientIP(event: H3Event): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return getHeader(event, 'x-real-ip') || ''
}
